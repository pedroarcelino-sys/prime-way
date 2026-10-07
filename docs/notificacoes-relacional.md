# Notificações relacionais

Implementação na branch `feature/notificacoes-relacional`, baseada no merge do Calendário `159bdc0` em `main`.

## Fonte de dados e acesso

`notificacoes` e `notificacao_destinatarios` são a única fonte de verdade. Todas as caixas de entrada, painéis e contadores usam o mesmo escopo PHP. Nenhuma consulta depende do conteúdo ou da presença de eventos em uma consulta de Calendário.

| Perfil | Comportamento preservado |
| --- | --- |
| Admin | Gerencia a central inteira, publica Aviso/Sistema para os públicos existentes, marca sua leitura/não leitura e cancela sem excluir fisicamente. Consulta canceladas pelo filtro Histórico. |
| Secretaria | Mantém publicação global ou por turma nos públicos já permitidos pela API existente, consulta recebidas/enviadas e marca suas leituras. |
| Professor | Central compartilhada somente leitura. No portal próprio mantém publicação para alunos/responsáveis de suas turmas, consulta recebidas/enviadas e marca suas leituras. |
| Aluno | Consulta suas notificações e marca uma ou todas como lidas. |
| Responsável | Consulta suas notificações e marca uma ou todas como lidas. |

Destinatários explícitos são autoritativos; `publico` não permite acessar um comunicado enviado somente a outra conta. Notificações antigas **sem nenhum destinatário** continuam consultáveis pelo campo estruturado `publico`; a primeira leitura materializa os destinatários ativos desse público em uma transação, preservando a leitura individual. Registros com destinatários parciais não são ampliados automaticamente. Exclusões individuais existentes continuam respeitadas pelos perfis destinatários.

As escritas exigem sessão, perfil autorizado e CSRF. Consultas parametrizadas, transações, a unicidade existente de destinatários e auditoria preservam publicação, leitura e cancelamento. O vínculo opcional com `eventos_calendario` é mantido, inclusive no histórico.

## Compatibilidade

`primewayNotifications` saiu da lista gerenciada de `core.js` e das listas de leitura/escrita de `api/estado/index.php`. O núcleo limpa somente essa chave de compatibilidade do navegador e ignora tentativas de `setItem` nela. A API de estado rejeita sua escrita. Os registros relacionais e eventuais dados antigos de `estado_aplicacao` não são apagados nem importados automaticamente; registros existentes somente no navegador não passam a ser dados oficiais.

Não houve migration. Antes da integração, o banco local foi conferido: migrations 002–018 aplicadas, sem pendências ou divergências. Banco, usuários e senhas não foram recriados ou alterados.

## Validação

- `php tests/integration/notificacoes_relacional.php --rollback`: 66 verificações de isolamento, leitura individual, duplicidade, publicação, evento opcional, filtros, contador, histórico e auditoria; snapshot antes/depois confirmado.
- `php tests/notificacoes_api.php`: 96 verificações de rotas e guards reais dos cinco perfis, CSRF, publicação permitida/proibida, navegação e painéis. Corpo HTTP é injetado no processo CLI; commits são substituídos por rollback no teste, com snapshot confirmado.
- `node tests/browser.mjs`: páginas reais e APIs simuladas; 66 verificações de Notificações incluindo desktop 1440 px/mobile 390 px, ações por perfil, histórico e bloqueio da chave antiga. Regressões Calendário, Disciplinas, Chat e Saída Segura.
- `php tests/run.php`: 58 verificações gerais.
- `php tests/saida_segura_backend.php`: 40 verificações isoladas.
- `php tests/integration/calendario_relacional.php --rollback --fixtures`: 60 verificações; `php tests/calendario_api.php`: 31 verificações.
- Lint de 174 arquivos PHP e sintaxe de 57 arquivos JavaScript/MJS; `git diff --check`.

## Limitações e homologação

Homologação manual completa permanece para o final do projeto, conforme solicitado. A interface automatizada usa respostas simuladas; as integrações e rotas usam MySQL local com rollback. Os três eventos originais do outro computador não existem neste banco: a regressão do Calendário usou três fixtures temporárias e preservou os dados locais. Não houve alteração funcional em Chat, GPS/Saída Segura, Disciplinas ou Calendário; os ajustes de integração se limitam ao consumo de notificações em painéis/navegação e à expectativa do teste do Calendário para a chave aposentada.

## Arquivos

Nova API compartilhada: `api/notificacoes/_notificacoes.php`, `index.php`, `publicar.php`, `leitura.php`, `marcar_todas_lidas.php`, `cancelar.php`.

Consumo e leitura por perfil: `api/aluno/notificacoes/`, `api/professor/notificacoes/`, `api/responsavel/notificacoes/`, `api/secretaria/notificacoes/`; publicação do Professor recebeu auditoria.

Painéis/contadores: `api/aluno/index.php`, `api/aluno/navegacao.php`, `api/dashboard/index.php`, `api/professor/navegacao.php`, `api/responsavel/index.php`, `api/responsavel/navegacao.php`, `api/secretaria/index.php`, `api/secretaria/navegacao.php`.

Interface e compatibilidade: `pages/notificacoes.html`, `css/notificacoes.css`, `js/notificacoes.js`, `js/core.js`, `api/estado/index.php`.

Testes: `tests/integration/notificacoes_relacional.php`, `tests/notificacoes_api.php`, `tests/notificacoes.html`, `tests/browser.mjs`, `tests/calendario.html`. Documentação: este arquivo.
