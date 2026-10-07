# Limpeza do estado legado

Branch `feature/limpeza-estado-legado`, iniciada após confirmar o merge de Notificações `c286c2b` em `main`.

## Diagnóstico por chave

| Chave | Estado encontrado | Resultado |
| --- | --- | --- |
| `primewayGuardians` | Núcleo/API de estado ainda sincronizavam; página Responsáveis já usava API própria. | Sincronização removida; chave limpa e bloqueada. |
| `primewayClasses` | Turmas escrevia cache; Alunos lia cache e aceitava eventos `storage`, embora ambos tivessem APIs próprias. | Dados em memória oriundos das APIs; cache e sobrescrita entre abas removidos. |
| `primewayChatProfessor` | Chat antigo acessível pelo menu Admin gravava coleção genérica; demais portais tinham backend próprio. | Central Admin usa conversas/mensagens relacionais em que já participa; coleção genérica removida. |
| `primewayNotifications` | Já aposentada; referência no núcleo para limpeza/bloqueio. | Tratamento mantido na lista de chaves aposentadas. |
| `primewayCalendarEvents` | Sem consumidor real. | Limpeza e bloqueio explícitos. |
| `primewaySubjects` | Sem consumidor real. | Limpeza e bloqueio explícitos. |
| `primewayStudents` | Alunos ainda mantinha funções de cache e aceitava atualização via `storage`. | Cache/fallback/evento legado removidos; somente API própria. |

Também foram aposentados `primewaySettings` (o login lia uma configuração local antiga) e `primewayDataModelVersion` (controle da antiga limpeza/hidratação). A página inicial do Admin é consultada pela API de Configurações, respeitando a lista existente de destinos permitidos. Demais perfis mantêm seus destinos.

## Núcleo, compatibilidade e banco

Não há mais `PrimeWayStorage` JavaScript, consumidores de `.ready`, lista de chaves gerenciadas, hidratação, debounce de sincronização ou chamadas do frontend a `api/estado/`. O núcleo preserva CSRF, feedback e confirmações; remove somente as chaves aposentadas do localStorage e bloqueia `setItem` nelas. Outras preferências e sessionStorage permanecem preservados.

`api/estado/index.php` é apenas uma resposta de compatibilidade para interfaces antigas: GET autenticado devolve objeto vazio, nenhuma chave gravável e `retired: true`; POST exige autenticação/CSRF e retorna 422. Não executa SQL de estado. Perfis anônimos recebem 401; POST sem CSRF recebe 403.

`estado_aplicacao`, seus dois registros locais e a migration 010 foram preservados para recuperação dos payloads antigos e continuidade do histórico de schema/migrations. Nenhum consumidor de produção lê/grava a tabela. Não houve migration, importação, recriação do banco, alterações de usuários ou senhas. Migrations 002–018 conferidas, sem pendências ou divergências.

A pasta física chamada `PrimeWayStorage`, usada pelo backend para anexos do Chat fora da pasta pública, continua necessária. Ela não é o objeto JavaScript aposentado; seus arquivos não foram removidos.

## Integração do Chat antigo

A central Admin mantém a página e as classes CSS existentes, mas usa `api/chat/central.php`, a checagem existente de participante ativo e os componentes compartilhados de mensagens/anexos. Apenas conversas relacionais em que o Admin já participa são consultáveis; enviar texto e marcar leitura exigem CSRF, autorização PHP e transação. Anexos continuam na API própria já existente. Conversas alheias, encerradas ou de participante inativo/que saiu são rejeitadas.

Não foi criada permissão para iniciar novas conversas, listar contatos gerais, limpar/excluir conversas ou importar mensagens locais. Os controles antigos dessas ações não suportadas foram desativados. Professor, Secretaria, Aluno e Responsável que abrirem a URL antiga são encaminhados aos respectivos portais relacionais; os endpoints próprios mantêm seus guards. Payloads antigos do estado continuam preservados no banco para recuperação, sem virar mensagens oficiais automaticamente.

## Testes

- `php tests/estado_legado_api.php`: 110 verificações, cinco perfis, anônimo, sete chaves bloqueadas, CSRF, sessão PHP, acesso a Turmas/Responsáveis/Alunos/Configurações e Chat Admin por participação. Fixtures com rollback; snapshot de todas as tabelas confirmado.
- `node tests/browser.mjs`: 44 verificações novas de limpeza, adulteração de storage, contadores, CSRF, Alunos/Turmas/Responsáveis, Chat Admin desktop/mobile e destinos do login. Notificações 66, Calendário 29, Disciplinas 32; regressões de compositor, mensagens/visibilidade do Chat e GPS/Saída Segura aprovadas.
- `php tests/run.php`: 58 verificações gerais, incluindo CSRF, bloqueio de tentativas de login, sessão, ordem dos scripts e APIs relacionais.
- `php tests/saida_segura_backend.php`: 40 verificações.
- `php tests/integration/notificacoes_relacional.php --rollback`: 66 verificações; `php tests/notificacoes_api.php`: 96.
- `php tests/integration/calendario_relacional.php --rollback --fixtures`: 60 verificações; `php tests/calendario_api.php`: 31.
- `php tests/disciplinas_api.php --local-data`: 30 verificações de IDs/vínculos atuais e guards reais. O modo estrito original continua disponível.
- Consultas reais de Alunos, Responsáveis e dashboard aprovadas; schema conferido.
- Lint PHP: 176 arquivos; sintaxe JavaScript/MJS: 57 arquivos; `git diff --check`.

## Limitações

Homologação manual completa ficou para o final, conforme solicitado. Testes de interface usam páginas reais com APIs simuladas; testes PHP de rotas usam sessão em memória e adaptam somente o corpo CLI/COMMIT para rollback.

O modo estrito antigo de Disciplinas espera quatro disciplinas sem vínculo e uma vinculada, dados ausentes neste banco; ele falhou nessa premissa. O modo `--local-data` verifica os IDs e vínculos reais sem modificar esse conjunto. O teste completo de integração de Disciplinas que exige dois professores/turmas não foi executado nesta etapa. A regressão do Calendário usa três fixtures temporárias porque os três eventos originais do outro computador não existem localmente.

As versões dos scripts nas páginas foram atualizadas para carregar o núcleo sem sincronização e os módulos sem `.ready`; não houve refatoração visual.

## Arquivos alterados

Principais: `js/core.js`, `api/estado/index.php`, `js/alunos.js`, `js/turmas.js`, `js/login.js`, `js/chat.js`, `api/chat/central.php`, `pages/chat-professor.html`. Os demais scripts perderam apenas a espera por `.ready`; páginas receberam versões de cache atualizadas. Testes e esta documentação completam a alteração.

O manifesto abaixo lista todos os arquivos deste trabalho.

```text
api/chat/central.php
api/estado/index.php
css/chat.css
docs/limpeza-estado-legado.md
js/aluno_chat.js
js/aluno_dados.js
js/aluno_frequencia.js
js/aluno_notas.js
js/aluno_notificacoes.js
js/aluno_portal.js
js/alunos.js
js/calendario.js
js/chat.js
js/configuracoes.js
js/core.js
js/dashboard.js
js/disciplinas.js
js/login.js
js/notificacoes.js
js/professor_chat.js
js/professor_dados.js
js/professor_frequencia.js
js/professor_notas.js
js/professor_notificacoes.js
js/professor_turmas.js
js/professor.js
js/professores.js
js/responsaveis.js
js/responsavel_alunos.js
js/responsavel_atividades.js
js/responsavel_chat.js
js/responsavel_dados.js
js/responsavel_frequencia.js
js/responsavel_notas.js
js/responsavel_notificacoes.js
js/responsavel_saida_segura.js
js/responsavel.js
js/turmas.js
pages/aluno_atividades.html
pages/aluno_chat.html
pages/aluno_dados.html
pages/aluno_frequencia.html
pages/aluno_notas.html
pages/aluno_notificacoes.html
pages/aluno_portal.html
pages/alunos.html
pages/calendario.html
pages/chat-professor.html
pages/configuracoes.html
pages/dashboard.html
pages/disciplinas.html
pages/login.html
pages/notificacoes.html
pages/professor_atividades.html
pages/professor_chat.html
pages/professor_dados.html
pages/professor_entregas.html
pages/professor_frequencia.html
pages/professor_notas.html
pages/professor_notificacoes.html
pages/professor_turmas.html
pages/professor.html
pages/professores.html
pages/responsaveis.html
pages/responsavel_alunos.html
pages/responsavel_atividades.html
pages/responsavel_chat.html
pages/responsavel_dados.html
pages/responsavel_frequencia.html
pages/responsavel_notas.html
pages/responsavel_notificacoes.html
pages/responsavel_saida_segura.html
pages/responsavel.html
pages/secretaria_alunos.html
pages/secretaria_calendario.html
pages/secretaria_chat.html
pages/secretaria_matriculas.html
pages/secretaria_notificacoes.html
pages/secretaria_professores.html
pages/secretaria_responsaveis.html
pages/secretaria_saida_segura.html
pages/secretaria_turmas.html
pages/secretaria.html
pages/turmas.html
tests/browser.mjs
tests/calendario.html
tests/disciplinas_api.php
tests/disciplinas.html
tests/estado_legado_api.php
tests/estado_legado.html
tests/run.php
```
