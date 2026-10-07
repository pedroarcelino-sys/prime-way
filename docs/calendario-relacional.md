# Calendário relacional — retomada em 06/10/2026

Branch: `feature/calendario-relacional`. Base preservada: `1c90944` (WIP).
Antes de alterações, Git estava limpo e sincronizado com a mesma branch no remoto.

## Comportamento revisado

- Admin consulta e altera `eventos_calendario` pelas APIs relacionais, com CSRF, transação e auditoria de criação, edição e status.
- Professor tem somente leitura. O PHP valida perfil, cadastro ativo e vínculo por regência ou `turma_disciplinas`; filtros enviados pelo cliente não ampliam o escopo. Eventos globais permanecem disponíveis.
- Turmas e vínculos históricos inativos permanecem nas consultas. Novas atribuições exigem turma e ano ativos; edição pode conservar a turma histórica. A resposta após salvar também informa o status da turma.
- Conclusão e cancelamento conservam registros e bloqueiam novas edições. Consultar outro mês não elimina eventos.
- O WIP já havia retirado os consumidores de `primewayCalendarEvents`, inclusive de `core.js` e `api/estado/index.php`. A busca final em `js`, `api` e `pages` confirmou ausência de consumidores; referências restantes são fixtures/testes de rejeição do legado.
- `primewayNotifications` continua gerenciado e autorizado no estado genérico. Foi retirado somente da limpeza inicial de demonstração do core, para preservar avisos existentes e sua leitura. Notificações de eventos ausentes continuam visíveis.
- Em mobile, os filtros cabem na largura disponível; a grade mensal mantém rolagem horizontal interna. Eventos têm indicação de foco por teclado.

## Banco deste computador

A inspeção foi somente leitura antes de qualquer integração. Havia dez migrations registradas, de `002` a `011`, sem divergências de checksum. A estrutura real de Saída Segura já correspondia ao resultado de `012`/`013`, sem coordenadas e sem `locais_saida_segura`.

Após autorização, o executor existente `database/migrate.php --baseline=013` registrou `012`/`013` e aplicou `014` a `018`. Não foi criado banco, importado schema nem criada migration de Calendário. Usuários e credenciais não foram alterados.

O ENUM local do Calendário estava incorreto: `Conclu├¡do`. Com a tabela comprovadamente vazia e autorização específica, foi corrigida somente a definição para `Agendado`, `Concluído`, `Cancelado`, conforme a migration `005`. O script temporário de reparo foi removido. `schema_status.php` agora detecta também essa divergência estrutural, além de migrations pendentes e checksums.

Estado final: 17 migrations registradas (`002`–`018`), nenhuma pendente, nenhum checksum divergente, ENUM correto e `ready=true`.

## Validação

| Teste | Resultado |
|---|---|
| `php tests/integration/calendario_relacional.php --rollback --fixtures` | 60 verificações; criação, edição, conclusão, cancelamento, auditoria, escopo, regência, disciplina com vínculo inativo, turma inativa, Aluno e Responsável |
| `php tests/calendario_api.php` | 31 verificações das rotas e guards reais, com sessões isoladas e usuários existentes; nenhuma escrita autorizada enviada |
| `php tests/run.php` | 58 verificações, incluindo CSRF, autenticação, regras de áudio do Chat e distância da Saída Segura |
| `php tests/saida_segura_backend.php` | 40 verificações isoladas de backend |
| `node tests/browser.mjs --calendar-visual` | Calendário/Notificações: 29; Disciplinas: 32; Chat (compositor, mensagens, visibilidade) e Saída Segura aprovados |
| Capturas Chrome em 1440 e 390 pixels | Página e modal inspecionados; 42 dias, filtros dentro do painel e nenhum transbordamento da página da aplicação |
| PHP lint / JavaScript `node --check` | Aprovados |
| `git diff --check` | Aprovado |

O teste de navegador carrega HTML, CSS, core e scripts reais com APIs simuladas e nunca encaminha POST ao banco. A validação de regras e consultas relacionais ocorre separadamente no MySQL real. Fontes/ícones externos foram omitidos no harness para evitar dependência de CDN.

Os testes de integração usam uma transação e `finally` com rollback. A comparação integral antes/depois confirmou preservação de eventos, auditoria, notificações, estado, turmas, matrículas, disciplinas, vínculos e usuários. Contadores AUTO_INCREMENT podem avançar mesmo após rollback; não permanecem linhas de teste.

## Limitações de dados

O GitHub sincronizou o código, mas este MySQL não contém os três eventos originais (`2`, `3`, `4`) nem turmas. O modo estrito original foi preservado e ainda exige esses registros. `--fixtures` exige calendário vazio e cria três eventos, turmas, vínculo de disciplina e matrícula apenas dentro da transação, reutilizando Professor, Admin e alunos/responsáveis existentes. Isso valida operações e contratos, mas não comprova a preservação dos registros do outro computador.

As regressões MySQL antigas de Disciplinas foram executadas e não completaram: `disciplinas_relacional.php` encontrou cinco disciplinas sem o vínculo esperado; `disciplinas_historico.php` não encontrou vínculo com atividade, avaliação e aula. A regressão de interface passou. Não foram fabricados históricos nem alterados esses testes para ocultar a diferença de dados.

Quando os dados originais estiverem disponíveis em ambiente autorizado, executar novamente o teste estrito de Calendário e as duas integrações de Disciplinas. Nenhum push foi realizado.
