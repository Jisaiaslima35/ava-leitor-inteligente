# PRD — AVA (Portal do Aluno / Professor) do Leitor Inteligente

Base: auditoria read-only do repositório + banco de produção (19/11/2026).
Objetivo: o frontend do AVA é gerado por um serviço externo (Google AI Studio) e deve ser um espelho dos dados REAIS do Leitor. Este PRD diz o que existe, o que falta e o contrato.

---

## 0. Contexto obrigatório antes de gerar qualquer tela

1. **O Leitor NÃO é um app Next.js.** A pasta `app/` do repositório é outro produto (CRM, gitignored, modelo `organizations`). O Leitor de verdade é: SPA Vite/React em `src/` (router por hash) + microserviços Python em `api/` + Postgres/Supabase.
2. **A porta de entrada do dado é a API Python** (`Authorization: Bearer <access_token>` do Supabase). O front do AVA deve consumir `/api/ava/*` e **nunca** PostgREST direto.
3. **Multi-tenant é por slug**: `/t/:slug` ou `?tenant=slug`. `tenants.slug` é a chave pública; `tenants.id` é o uuid interno. Toda query filtra por `tenant_id` **no servidor**.

---

## 1. DADOS E TABELAS QUE JÁ EXISTEM HOJE (nomes exatos)

### 1.1 Gestor / Instituição
`tenants` — `id` (uuid, PK), `slug` (UNIQUE, chave pública), `name`, `type` ('common'|'school'|'radio'), `edition` ('common'|'radio_embed'|'academic_premium' = fonte de verdade), `admin_email`, `owner_user_id`, `logo_url`, `slogan`, `gate_mode` ('always_open'|'scheduled'|'manual_closed'), `gate_schedule` (jsonb `{start,end,days}`), `gate_custom_message`, `gate_restrict_enrolled`, `attendance_restrict_enrolled` (bool), `embed_allowlist` (text[]), `created_at`, `updated_at`, `archived_at`
- hoje: 5 tenants — `devocional`, `radio-devocional-12`, `raiz`, `faculdade-js`, `juventude-10`. Os 2 school são `academic_premium`.

`user_tenants` — `user_id`, `tenant_id`, `role` CHECK IN ('student','teacher','admin','owner'), `joined_at`. PK composta (`user_id`,`tenant_id`). 5 linhas.
`tenant_members` — é uma **VIEW** que espelha `user_tenants` (não é tabela).
`profiles` — `id` (= `auth.users.id`), `email`, `full_name`, `avatar_url`, `role` CHECK IN ('user'|'admin'), `current_tenant_id`, `last_login_at`, `deleted_at`, `created_at`, `updated_at`. 8 linhas.
- `profiles.role` = admin de **PLATAFORMA** (não institucional). Papel institucional vem de `user_tenants.role` + `GET /api/institution/check-role` → `super_admin | institution_manager | professor | none`.

### 1.2 Professores
`institution_professors` — `id`, `tenant_id`, `email` (NOT NULL), `status` ('active'), `created_at`, `name`, `document`, `subject_or_book`. 4 linhas.
- Cadastro hoje: modal `InstitutionManagerModal` → `POST /api/institution/professors` (`api/payment_server.py:1750`, roda com service_role). Valida formato do e-mail, idempotente por tenant+e-mail, trava em 10 licenças.
- **E-mail JÁ É OBRIGATÓRIO** (3 camadas: `required` no HTML, guarda no JS, 400 no backend). 4/4 têm e-mail.
- O cadastro **NÃO cria usuário no auth**. Não existe `user_id` em `institution_professors` — o vínculo professor↔conta hoje é só por e-mail (jwt `email` ↔ `institution_professors.email`). Dois professores têm `document` placeholder `00000000000`.

### 1.3 Alunos
`academic_students` — `id`, `tenant_id`, `name`, `identifier` (NOT NULL), `email` (NULLABLE), `class_group`, `professor_id`, `subject_id`, `created_at`, `updated_at`. 10 linhas.
- `identifier` é o campo ÚNICO que guarda CPF **ou** matrícula — formatos misturados hoje (`505050`, `7654321`, `MAT-MUG8RPZ3`, `guest_9447_muf02arp`). O backend já normaliza removendo `.` `-` `/` ao comparar.
- **E-mail do aluno hoje é OPCIONAL** (o label diz "E-mail (opcional)") e só 1 dos 10 tem e-mail.
- Cadastro hoje: `src/pages/AcademicManagerPage.tsx:1219-1259` faz INSERT **direto do navegador**, com a sessão do gestor. Não passa pelo backend.
- `class_group` hoje guarda o **NOME DA DISCIPLINA**, não o nome da turma (confunde turma com disciplina).
- Não existe `user_id`: o aluno não tem identidade de auth. O "login" atual do aluno é a identificação do Portão (`StudentIdentificationModal`), validando nome+matrícula contra `academic_students` e guardando em localStorage.

### 1.4 Disciplinas
`academic_subjects` — `id`, `tenant_id`, `name`, `code`, `professor_id`, `created_at`. 5 linhas.
- PITFALL: `academic_subjects.professor_id` é o `profiles.id` de quem criou (o gestor logado), **não** o `institution_professors.id`. E `academic_students.subject_id` aponta pra cá: hoje cada aluno tem exatamente **uma** disciplina — turma não existe.

### 1.5 Livros e Módulos
`ebooks` — `id`, `slug`, `title`, `author`, `description`, `cover_url`, `pdf_storage_path`, `total_pages`, `chapter_count`, `price_cents`, `is_published`, `owner_user_id`, `shareable`, `categoria`, `skill_generated`, `skill_generated_at`, `is_global`, `toc` (jsonb), `modo_mentor_habilitado`, `prompt_mentor`, `hook_abertura`, `voz_id`, `tenant_id`, `is_public`, `created_at`, `updated_at`. 44 livros.
`ebook_pages` — `id`, `ebook_id`, `page_number`, `chapter_number`, `chapter_title`, `page_text`, `word_count`, `embedding`, `created_at`.
`academic_modules` — `id`, `tenant_id`, `title`, `description`, `order_index`, `is_active`, `created_at`. 1 linha.
`module_courses` — `id`, `tenant_id`, `module_id`, `ebook_id`, `created_at`. 0 linhas — o vínculo módulo↔livro existe no schema mas nunca foi usado.

### 1.6 Planos de aula
**NÃO EXISTE.** Não há tabela, tipo ou rota de "plano de aula" no repositório (grep sem resultado). O material mais próximo hoje é a soma de `academic_gate_rooms` (disciplina + capítulo + faixa de páginas + horário) + `academic_modules`/`module_courses` (grade) + `academic_assessments` (avaliação).
→ Não desenhar no front uma entidade "plano de aula" que o banco não tem. Proposta de tabela nova em 2.2.

### 1.7 Aulas ao vivo (salas)
`academic_gate_rooms` — `id`, `tenant_id`, `room_id` (texto 16/32 hex = o próprio token de acesso), `discipline_id`, `discipline_name`, `professor_name`, `teacher_name`, `subject_id`, `subject_name`, `module_id`, `module_name`, `book_slug`, `book_title`, `chapter`, `chapter_label`, `page_start`, `page_end`, `starts_at`, `expires_at`, `duration_hours`, `is_official_exam`, `is_gate_room`, `active`, `is_active`, `restricted`, `restrict_enrolled`, `grade_period`, `created_by`, `created_at`, `updated_at`. 3 linhas.
- Link ao vivo hoje: `{origin}/t/{tenant.slug}#/reader/{book_slug}?room={room_id}&modo=portao`
- A sala de verdade é WebSocket/Yjs (`api/collab_server.py`, porta 2006, rota `/ws/collab`). Não existe token assinado: o `room_id` **é** o segredo.
- `sala_messages` — 29 linhas e **nenhum código usa** (grep no repo inteiro). Não há chat persistente.
- `collab_snapshots` — persiste o estado da sessão.

### 1.8 Avaliações
`academic_assessments` — `id`, `tenant_id`, `ebook_id`, `title`, `questions` (jsonb: `[{id, question, options[], correctIndex, explanation}]`), `chapter_title`, `page_range`, `module_id`, `grade_period`, `created_by`, `host_email`, `created_at`. 24 linhas.
- `grade_period` CHECK IN ('N1','N2','N3','N4','REC') — existe em 4 tabelas e está **100% NULL** no banco.

### 1.9 Notas
`academic_submissions` — `id`, `tenant_id`, `assessment_id`, `room_id`, `user_id`, `academic_student_id`, `student_name`, `student_identifier`, `subject_id`, `subject_name`, `module_id`, `grade_period`, `score`, `total_questions`, `correct_answers`, `passed`, `completed_at`, `answers` (jsonb), `host_user_id`, `host_email`, `created_by`, `ebook_id`, `chapter_title`, `page_range`, `is_restricted_mode`. 35 linhas.
- `score` / `total_questions` / `correct_answers` / `passed` = a nota real (0..N).
- PITFALL: `user_id` preenchido em **0/35**; `academic_student_id` em 12/35; `subject_name` em 2/35. O vínculo aluno↔nota hoje é frágil.
`academic_evaluations` — **0 linhas**. É a tabela que o boletim usa, então o boletim atual voltaria zerado.
`user_quiz_scores` — 35 linhas. `quiz_scores` — 0 linhas.

### 1.10 Frequência
`academic_attendance` — `id`, `tenant_id`, `student_name`, `student_document`, `room_id`, `created_at`. 10 linhas.
- **Sem** `student_id` e **sem** `user_id`: o vínculo é por nome + documento textual (`student_document` = o `identifier` do aluno).
- Só é gravada pelo Portão (`POST /signed-url-api/attendance`), com dedup por (`document`, `room_id`, dia).

### 1.11 Ano letivo / período / tipo de curso
**NÃO EXISTE** nenhuma tabela de ano letivo. O único gancho é a coluna `grade_period` (N1|N2|N3|N4|REC), 100% NULL. O único "tipo" é `tenants.type`/`tenants.edition`, que descreve a natureza do tenant, não o curso.

---

## 2. AMARRAÇÃO ACADÊMICA — ajustes mínimos, sem quebrar

### 2.1 Regra
Tudo **aditivo e nullable**. Nenhuma coluna NOT NULL nova, nenhuma alteração de CHECK existente, nenhuma mudança de tipo. As tabelas novas abaixo são o único acréscimo estrutural. Preserva os dados atuais (10 alunos, 4 professores, 24 avaliações, 35 submissões, 10 presenças) e os 5 tenants.

### 2.2 Bloco novo (fase 0/1) — tudo nullable, retrocompatível
**TABELA NOVA** `academic_years` — `id`, `tenant_id`, `label` ('2026.1'), `starts_on`, `ends_on`, `is_current` (bool), `created_at`
**TABELA NOVA** `academic_courses` — `id`, `tenant_id`, `name`, `kind` CHECK IN ('faculdade','tecnico','curso_livre'), `academic_year_id`, `created_at`
**TABELA NOVA** `academic_enrollments` — `id`, `tenant_id`, `academic_student_id`, `subject_id`, `academic_year_id`, `course_id`, `class_group`, `created_at` (resolve o 1:1 atual aluno↔disciplina e cria a turma de verdade)
**COLUNA** `academic_modules.academic_year_id` (uuid null) + `academic_modules.course_id` (uuid null)
**COLUNA** `academic_subjects.course_id` (uuid null) + `academic_subjects.academic_year_id` (uuid null)
**COLUNA** `academic_students.user_id` (uuid null → `auth.users.id`) + `academic_students.academic_year_id` + `academic_students.course_id`
**COLUNA** `institution_professors.user_id` (uuid null → `auth.users.id`)
**COLUNA** `academic_attendance.academic_student_id` (uuid null) + `academic_attendance.student_user_id` (uuid null)
**COLUNA** `academic_submissions.academic_student_id` (já existe → backfill; sem coluna nova)
**TABELA NOVA** `academic_lesson_plans` (fase 3) — `id`, `tenant_id`, `title`, `subject_id`, `academic_year_id`, `module_id`, `planned_at`, `duration_minutes`, `room_id` (null), `status`

### 2.3 Faculdade / técnico / curso livre
Não criar CHECK novo por tipo. O tipo fica em `academic_courses.kind` e muda o que o front mostra, não o schema:
- **Faculdade**: períodos N1..N4 + REC (usa o `grade_period` que já existe)
- **Técnico**: N1..N4 também, ou bimestre
- **Curso livre**: sem nota obrigatória — nota vem só de quizzes; período pode ficar vazio
Se precisar de bimestre/semestre além de N1..N4, **não mexa no CHECK** de `grade_period`: use uma coluna nova `period_label` (text) em `academic_enrollments`. O CHECK atual já aceita NULL.

### 2.4 ISOLAMENTO ESTRITO — o que hoje NÃO é possível (achado de auditoria)
Medido no banco de produção:
- **RLS está DESLIGADO** (`relrowsecurity=false`) em `academic_students`, `academic_subjects`, `academic_submissions` e `institution_professors`. Existem policies em `pg_policies`, mas sem RLS ligado elas não são aplicadas.
- O role `anon` tem GRANT de leitura nessas tabelas, e a chave anônima é **pública** (mora no bundle do front). Resultado: a chave anônima lê 10/10 alunos, 4/4 professores, 35/35 submissões, 5/5 `user_tenants`, 3/3 `gate_rooms` e a nota de aluno de **TODOS** os tenants. Verificado empiricamente. `academic_gate_rooms` tem RLS ligado, mas com policy "public ALL true" — wide open.
- `academic_students` não tem `user_id` ⇒ não existe como filtrar "só meus dados" por usuário autenticado.
- `institution_professors` não tem `user_id` ⇒ só dá para casar professor por e-mail.
- Assimetria de escrita: aluno é inserido direto do navegador (`AcademicManagerPage.tsx:1244`); professor passa por service_role (`payment_server.py:1819`).

**Plano mínimo (tudo no backend, sem tocar no front):**
1. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` nas 4 tabelas + policies por `tenant_id` reaproveitando a função `current_tenant_ids()` que já existe na migration `20260923030000`.
2. Policy do aluno: `academic_students.user_id = auth.uid()`; submissions via `academic_student_id` ligado ao `user_id`; attendance idem.
3. Policy do professor: `institution_professors.user_id = auth.uid()` OU e-mail do JWT.
4. **REVOKE** do `anon` nessas tabelas e fazer o AVA ler por API server-side (service_role) com filtro explícito de papel + `tenant_id`.
5. Preencher `user_id` no primeiro login (seção 3).
6. Regra de ouro no backend do AVA: todo SELECT filtra por `tenant_id` **e** papel. Nunca confiar em `tenant_id` vindo do corpo do front.

---

## 3. AUTENTICAÇÃO SIMPLIFICADA (sem Google OAuth)

Estado atual: Supabase Auth com magic link (`signInWithOtp`), senha e Google OAuth. `profiles` + `user_tenants`.

**Regra de ouro:** nunca logar com e-mail + senha sem vínculo. O e-mail sozinho não é identidade de professor nem de aluno.

### 3.1 Professor — o mais simples, já está pronto
Login: **e-mail + senha** (grant password do Supabase). O e-mail já é obrigatório no cadastro e já existe em `institution_professors`.
No 1º login o backend casa `institution_professors.email` = e-mail do JWT, grava `user_id` e devolve papel `professor` + as turmas (`academic_enrollments`) dele.
Senha esquecida: reset por e-mail (Supabase já faz). Não precisa de matrícula aqui.

### 3.2 Aluno — o que precisa mudar
E-mail passa a ser **OBRIGATÓRIO** no cadastro (hoje é nullable e 9 de 10 estão vazios). Dois caminhos:
- (a) **Migração**: backfill dos que falta, ou bloqueio do login desses até o gestor cadastrar o e-mail.
- (b) **Sem backfill**: no 1º acesso o aluno digita e-mail + matrícula/CPF; o backend procura `academic_students` por (`tenant`, `identifier` normalizado) e compara o e-mail; se bater, cria/liga a conta e grava `user_id`.

Login: **e-mail + senha**. A matrícula/CPF é fator de amarração, não senha (senha longa é mais fácil de digitar que CPF, e o backend já normaliza).
Se o usuário quiser literalmente "e-mail + matrícula" como credencial única: aceitável, mas aí a matrícula vira a senha e precisa ser longa/normalizada — não recomendo.

### 3.3 Sessão
Reusar o `access_token` do Supabase como Bearer em toda rota `/api/ava/*`. Guardar em localStorage. 401 ⇒ redireciona para `/ava/entrar`.
ATENÇÃO: o helper atual `api/_auth.py` decodifica o JWT **sem validar assinatura**. No backend do AVA, validar assinatura, expiração e audience (o AVA é a superfície exposta).

### 3.4 Endpoints de auth (novos)
```
POST /api/ava/auth/login {email, senha}   → {ok, token, usuario:{id,email,nome,papel}, tenant:{...}}
POST /api/ava/auth/vincular {identifier}    → {ok, token, aluno:{id,nome,identificador}}   (só aluno, 1º acesso)
GET  /api/ava/me                           → {ok, usuario:{...}, permissoes:[...]}
POST /api/ava/auth/logout                   → {ok}
```

---

## 4. PONTE DE INTEGRAÇÃO E MAPA DE ROTAS DO AVA

### 4.1 O QUE JÁ EXISTE (não reescrever — reusar)
Todos respondem JSON. Auth = header `Authorization: Bearer <access_token>` do Supabase.

| Endpoint | Porta | Serve para o AVA |
|---|---|---|
| `GET /api/institution/professors` | 3019 | lista de professores do tenant |
| `GET /api/institution/check-role` | 3019 | papel do usuário (super_admin/institution_manager/professor/none) |
| `POST /api/institution/professors` | 3019 | cria professor (e-mail obrigatório) |
| `POST /api/academic/submit` | 3019 | grava a submissão/nota |
| `POST /api/quiz/generate` · `/save` · `GET /api/quiz/score` | 3021 | gera questão, grava nota, lê nota |
| `POST /api/academic/generate-assessment` | 3021 | cria avaliação |
| `GET /signed-url-api/gate-status` · `/gate-rooms-public` · `/verify-student` | 9133 | estado do Portão, valida aluno |
| `GET /signed-url-api/attendance` | 9133 | lista de presenças (gestor) |
| `GET /collab/rooms` · `/collab/<roomId>/status` | 2006 | quem está na sala ao vivo |
| `GET /academic/module-summary?tenant_id=&module_id=` | 9131 | boletim N1..N4/REC |

**⚠️ BUG DE PRODUÇÃO:** o nginx manda `^~ /api/academic` para a porta **3019**, que não tem essa rota — o handler está no **9131**. `AcademicManagerPage.tsx:1138` chama `/api/academic/module-summary` e não recebe nada. Corrigir o roteamento antes de usar o boletim no AVA.

### 4.2 O QUE NÃO EXISTE (precisa criar)
Não existe **nenhum** endpoint JSON de leitura para o AVA: listar alunos, listar disciplinas, listar módulos com livros, listar notas por aluno, frequência por aluno, turmas do professor, login do AVA, "minhas notas", calendário. Hoje o front lê direto do PostgREST com a chave do gestor — ou seja, o AVA ainda não tem ponte.

**Proposta:** um serviço novo `api/ava_server.py` (Flask, porta 9150), prefixo `/api/ava`, Bearer em tudo, resposta `{ok:true, ...}` ou `{ok:false, erro:"..."}`.

### 4.3 MAPA DE ROTAS DO AVA (front)
```
/ava/entrar .............. login (e-mail + senha; aluno 1º acesso pede matrícula)
/ava ..................... home / dashboard
/ava/modulos ............. lista de módulos do ano
/ava/modulo/:id .......... detalhe: livros, aulas, avaliações do módulo
/ava/notas ............... minhas notas (aluno) | boletim da turma (professor)
/ava/notas/:alunoId ...... detalhe do aluno (só professor)
/ava/avaliacoes .......... lista de avaliações
/ava/avaliacao/:id ....... responder / ver resultado
/ava/calendario .......... aulas e avaliações agendadas
/ava/frequencia .......... minha frequência (aluno) | da turma (professor)
/ava/turmas .............. só professor
/ava/turma/:id ........... detalhe da turma
/ava/aula/:roomId ........ abre a sala ao vivo (redireciona para /t/:slug#/reader/:book_slug?room=...)
/ava/perfil .............. meus dados / sair
```
Guarda: `/ava/*` exige sessão, exceto `/ava/entrar`. O papel decide o menu — aluno não vê `/ava/turmas`.

### 4.4 CONTRATO DE DADOS POR TELA (JSON, snake_case, datas ISO-8601 UTC, id como string)
```
GET /api/ava/bootstrap → {ok, usuario:{id,email,nome,papel}, tenant:{id,slug,nome,edition,type}, ano:{id,label,atual}, turmas:[...]}

GET /api/ava/modulos → {ok, modulos:[{id,titulo,descricao,ordem,disciplinas:[{id,nome}],livros:[{slug,titulo,paginas}],aulas:[{id,room_id,titulo,capitulo,comeca_em,termina_em,ativa}]}]}

GET /api/ava/notas → {ok, aluno:{id,nome,identificador}, periodos:["N1","N2","N3","N4","REC"], notas:[{disciplina_id,disciplina,n1,n2,n3,n4,rec,media,final,situacao,avaliacoes:[{id,titulo,pontos,total,acertos,concluido_em}]}]}

GET /api/ava/frequencia → {ok, total_sessoes, presentes, frequencia_pct, sessoes:[{room_id,disciplina,capitulo,data,presente}]}

GET /api/ava/calendario → {ok, eventos:[{tipo:"aula"|"avaliacao",id,room_id,titulo,disciplina,comeca_em,termina_em,ativo,url}]}

GET /api/ava/turmas (professor) → {ok, turmas:[{id,disciplina,alunos:[{id,nome,identificador,media,presencas}]}]}

GET /api/ava/turma/:id → {ok, turma:{...}, alunos:[...], avaliacoes:[...]}

GET /api/ava/aula/:roomId → {ok, sala:{room_id,book_slug,capitulo,pagina_inicio,pagina_fim,ativa,acesso:{modo:"portao"|"livre",link}}}

POST /api/ava/auth/login {email,senha} → {ok, token, usuario:{id,email,nome,papel}, tenant:{...}}
POST /api/ava/auth/vincular {identifier} → {ok, token, aluno:{id,nome,identificador}}
GET  /api/ava/me → {ok, usuario:{...}, permissoes:[...]}
```
**Regras do contrato:** HTTP coerente (200/201 ok, 400 entrada, 401 sem sessão, 403 fora do escopo, 404 inexistente, 500 erro); nunca devolver email/document de terceiros; todo endpoint filtra `tenant_id` + papel no servidor.

### 4.5 TEMPO REAL
Sala ao vivo: já existe o WebSocket `/ws/collab` (collab_server, 2006) — o AVA **não reimplementa**, abre com o `room_id` + token.
Notas/frequência: a publication `supabase_realtime` inclui só `academic_submissions`. O painel do gestor usa `postgres_changes` + polling de 5s. Sugestão pro AVA: polling simples de 10-15s em `/ava/notas` e `/ava/frequencia`, e Realtime em `academic_submissions` se quiser instantâneo.

### 4.6 BLOQUEIOS E RISCOS (decidir antes de gerar as telas)
1. **Vazamento cross-tenant**: RLS desligado + GRANT ao `anon` ⇒ qualquer pessoa com a chave anônima (pública) lê aluno, professor e nota de todos os tenants. **BLOQUEADOR** para um AVA exposto.
2. `academic_students` sem `user_id` ⇒ "só meus dados" é impossível sem migration.
3. `/api/academic/module-summary` inalcançável no nginx (3019 vs 9131) ⇒ o boletim atual não abre.
4. `academic_evaluations` está vazia ⇒ boletim voltaria zerado. Recomendação: usar `academic_submissions` (35 linhas reais, tem `score`) como fonte de verdade da nota e gravar `academic_evaluations` ao salvar.
5. `identifier` do aluno não normalizado (CPF com ponto, matrícula alfanumérica, `guest_xxx`) ⇒ canonicalizar sempre (remover `.` `-` `/`, comparar em minúsculas).
6. `academic_students.subject_id` = 1 disciplina por aluno ⇒ turma de verdade exige `academic_enrollments`.
7. A pasta `app/` do repo é outro produto (CRM) — não usar como referência de arquitetura do AVA.

### 4.7 ORDEM SUGERIDA
- **Fase 0 (1 dia, bloqueia o resto)**: corrigir o roteamento do `module-summary`; migration com `user_id`/backfill; ligar RLS nas 4 tabelas; REVOKE do `anon`; canonicalizar `identifier`.
- **Fase 1 (~1 semana)**: `api/ava_server.py` com as 11 rotas do 4.4 + auth do 3.4.
- **Fase 2 (AI Studio)**: gerar o front consumindo `/api/ava/*`, sem tocar no PostgREST.
- **Fase 3**: `academic_lesson_plans` + turmas reais + plano de aula de verdade.
