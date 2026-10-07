# Fechamento funcional do PrimeWay

Branch: `feature/fechamento-funcional`. Base: `main` sincronizada, com merge da limpeza do estado legado `a2a4767`. Auditoria de 7 de outubro de 2026.

## Critério e alcance

As páginas foram examinadas junto com seus scripts, rotas e tabelas. A classificação considera funcionamento por APIs próprias, autorização PHP e persistência MySQL. “Concluída” significa fluxo implementado e cobertura automatizada descrita abaixo; a homologação manual completa permanece uma etapa independente.

Não foram criados usuários, alteradas senhas, apagados registros históricos ou reintroduzidas coleções locais. Nenhuma migration foi criada ou aplicada nesta etapa. A conferência inicial do banco confirmou as 17 migrations existentes, de `002` a `018`, sem pendências ou divergência de checksum.

## Diagnóstico e correções

| Área | Classificação inicial | Resultado |
| --- | --- | --- |
| Autenticação e sessão | Incompleta: perfil/atividade da conta continuavam dependentes da sessão antiga | Cada autorização consulta o usuário atual no banco; conta inexistente/inativa ou pessoa inativa perde acesso; perfil atualizado substitui o da sessão. Sessão anônima recebe CSRF para o login. |
| Recuperação de acesso | Somente visual: link com mensagem provisória | Orienta contato com a Secretaria, conforme decisão do usuário. Recuperação automática continua pendente. |
| Dashboard Admin | Incompleta: limites acadêmicos fixos | Média e frequência mínimas vêm das configurações persistidas. Contadores e avaliações sem lançamento continuam calculados por SQL. |
| Redirecionamento entre perfis | Quebrada para Secretaria nos portais Professor/Aluno/Responsável | Destino corrigido para `secretaria.html`, com versões de cache atualizadas. Permissões das APIs preservadas. |
| Correção de atividades | Incompleta: conversão permissiva de nota e máximo compartilhado sem proteção | Validação numérica finita, feedback textual e bloqueio da redução de máximo abaixo de nota existente. Transação e auditoria existentes preservadas. |
| Boletim | Não implementada: não havia emissão/consulta própria | Relatório imprimível de notas por avaliação e frequência, com escopo do Aluno e dos estudantes vinculados ao Responsável. Reutiliza as relações e os contextos existentes. |
| Documentação de persistência | Legado residual | README deixou de descrever sincronização genérica/localStorage como fonte de dados ou modo offline. |
| Cadastros, turmas, disciplinas e portais | Concluída na superfície examinada | APIs próprias e relações por ID preservadas; leituras autenticadas e bloqueios anônimos exercitados. |
| Calendário, Notificações, Chat e Saída Segura | Concluída, conforme etapas anteriores | Regressão automatizada; sem redesenho ou mudança de regras. |

O boletim reproduz registros existentes, incluindo avaliações ainda sem nota. Não decide aprovação, recuperação, conselho de classe ou fechamento oficial. A consulta usa o ano/matrícula selecionados pelos contextos já existentes; não acrescenta seleção de anos históricos aos portais.

## Checklist por perfil

### Todos os perfis

- [x] Sessão PHP, logout com CSRF e autorização no servidor.
- [x] Perfil/conta atual consultados no banco, sem confiar no perfil antigo da sessão.
- [x] Menus, links locais, scripts e referências literais de API verificados.
- [x] Contadores de navegação e dados oriundos de APIs próprias.
- [x] Sem dependência JavaScript de `PrimeWayStorage` ou coleções genéricas.
- [ ] Homologação manual completa com contas reais e dispositivos finais.

### Admin

- [x] Dashboard, contadores SQL e limites acadêmicos configuráveis.
- [x] Professores, alunos, responsáveis, turmas e vínculos de matrícula.
- [x] Disciplinas relacionais e configurações persistidas.
- [x] Calendário, auditoria e preservação de histórico.
- [x] Notificações relacionais e leitura individual.
- [x] Chat limitado às conversas de que o usuário participa.

### Secretaria

- [x] Dashboard e contadores da sua API.
- [x] Consulta de alunos, professores, responsáveis e turmas dentro das permissões existentes.
- [x] Matrículas por API própria.
- [x] Calendário e notificações conforme permissões existentes.
- [x] Chat e operação de Saída Segura pelo backend existente.
- [x] Redirecionamento para sua área ao acessar portal de outro perfil.

### Professor

- [x] Dashboard, dados cadastrais e turmas com escopo PHP.
- [x] Criação de atividades, consulta de entregas e correção relacional.
- [x] Criação de avaliações e lançamento de notas.
- [x] Criação de aulas e lançamento de frequência.
- [x] Calendário em leitura, notificações e Chat existentes preservados.
- [x] Escritas acadêmicas protegidas por perfil e CSRF.

### Aluno

- [x] Dashboard, dados cadastrais e matrícula próprios.
- [x] Atividades, salvamento de rascunho e envio persistidos.
- [x] Notas, filtros, contadores e frequência próprios.
- [x] Boletim de leitura, impressão/salvamento PDF pelo navegador.
- [x] Notificações individuais e Chat existentes.
- [x] Bloqueio de boletim de outro estudante no PHP.

### Responsável

- [x] Dashboard e estudantes vinculados por ID.
- [x] Consulta de atividades, notas e frequência dos estudantes vinculados.
- [x] Boletim acompanha a seleção de estudante, com autorização PHP independente da interface.
- [x] Dados cadastrais, notificações individuais e Chat existentes.
- [x] Saída Segura com progressão oficial no servidor e integração GPS preservada.
- [x] Bloqueio de estudante sem vínculo e validação de ID no boletim.

## Validação automatizada

- `tests/fechamento_auditoria.mjs`: todas as 47 páginas, 56 scripts e 132 endpoints públicos; IDs duplicados, links/assets locais, referências literais de API, guards/CSRF e dependências de estado legado.
- `tests/fechamento_api.php`: 155 verificações. Leituras dos cinco perfis e bloqueios anônimos; sessão com perfil divergente/usuário inexistente; CSRF anônimo para login; logout; boletim relacional e isolamento; parâmetros acadêmicos do dashboard e avaliação sem nota pendente; correção e validação de nota/feedback/máximo; notas, frequência, rascunho e envio; criação autorizada de atividade, avaliação e aula; perfil não autorizado e CSRF.
- O teste acadêmico executa rotas reais em processos CLI com sessões em memória. Adapta apenas entrada JSON, diretório e abertura/commit de transações para usar fixtures temporárias e rollback. Compara o conteúdo de TODAS as tabelas antes/depois; sequências AUTO_INCREMENT podem avançar mesmo com rollback, sem criar registros permanentes.
- `tests/estado_legado_api.php`: 110 verificações, incluindo rejeição de chaves antigas e escopo de Chat Admin; rollback integral.
- `tests/browser.mjs`: testes headless com páginas reais e APIs simuladas em servidor isolado. Novo `fechamento.html`: 21 verificações de notas, filtros, contadores e boletim em 1440/390 px. Inclui as regressões anteriores de estado legado (44), Notificações (66), Calendário (29), Disciplinas (32), Chat (composição, mensagens e visibilidade) e mapa de Saída Segura.

- `tests/run.php`: 58 verificações aprovadas de CSRF, autenticação, integração e regras de Chat/GPS.
- `tests/saida_segura_backend.php`: 40 verificações aprovadas.
- `tests/integration/notificacoes_relacional.php --rollback`: 66 verificações aprovadas; `tests/notificacoes_api.php`: 96 aprovadas.
- `tests/integration/calendario_relacional.php --rollback --fixtures`: 60 verificações aprovadas; `tests/calendario_api.php`: 31 aprovadas.
- `tests/disciplinas_api.php --local-data`: 30 verificações aprovadas. O harness agora identifica uma conta existente por perfil, porque a sessão deixou de aceitar um perfil arbitrário associado ao ID do Admin.
- Lint PHP: 179 arquivos válidos. JavaScript: 56 scripts válidos, mais os executores MJS. Auditoria: 573 links/assets locais e 159 referências literais de API válidas. `git diff --check` aprovado.

## Pendências e limites reais

- Recuperação automática de acesso exige um fluxo separado; nesta etapa foi adotada a orientação à Secretaria, sem alterar senhas.
- Homologação manual completa, permissões de microfone/GPS em dispositivos reais, impressão final e ambiente de produção ficaram para o fim do projeto.
- Fechamento acadêmico oficial, critérios de aprovação/conselho e emissão formal assinada não foram inventados pelo relatório de leitura.
- A cobertura de interface utiliza respostas simuladas; os testes PHP verificam banco/rotas e não substituem uma sessão HTTP completa no servidor final.
- O banco local não contém os três eventos originais do outro computador; o teste de Calendário usa três eventos temporários relacionais com rollback. Disciplinas usa `--local-data`, pois o modo estrito antigo depende de um conjunto específico de disciplinas sem vínculos que não existe aqui.
- `api/estado/index.php` e a tabela histórica permanecem como na limpeza anterior: endpoint rejeita escritas antigas, tabela sem consumidor funcional. O núcleo conserva somente a barreira de limpeza/bloqueio das chaves aposentadas.

## Arquivos alterados

Produção: `_bootstrap`, sessão, dashboard, correção de atividades; novo helper de boletim e rotas Aluno/Responsável; login, redirecionamentos dos três portais e link de boletim do Responsável. Páginas desses portais receberam somente atualização de versão dos scripts, além dos dois links novos em Notas. README e este checklist documentam o estado atual.

Testes novos: `fechamento_api.php`, `fechamento_auditoria.mjs`, `fechamento.html`; executor `browser.mjs` inclui a nova página.

Manifesto completo (42 arquivos):

```text
api/_bootstrap.php
api/aluno/boletim/index.php
api/auth/session.php
api/boletim/_boletim.php
api/dashboard/index.php
api/professor/atividades/corrigir.php
api/responsavel/boletim/index.php
docs/fechamento-funcional.md
js/aluno_common.js
js/login.js
js/professor_common.js
js/responsavel_common.js
js/responsavel_notas.js
pages/aluno_atividades.html
pages/aluno_chat.html
pages/aluno_dados.html
pages/aluno_frequencia.html
pages/aluno_notas.html
pages/aluno_notificacoes.html
pages/aluno_portal.html
pages/login.html
pages/professor_chat.html
pages/professor_dados.html
pages/professor_frequencia.html
pages/professor_notificacoes.html
pages/professor_turmas.html
pages/professor.html
pages/responsavel_alunos.html
pages/responsavel_atividades.html
pages/responsavel_chat.html
pages/responsavel_dados.html
pages/responsavel_frequencia.html
pages/responsavel_notas.html
pages/responsavel_notificacoes.html
pages/responsavel_saida_segura.html
pages/responsavel.html
README.md
tests/browser.mjs
tests/disciplinas_api.php
tests/fechamento_api.php
tests/fechamento_auditoria.mjs
tests/fechamento.html
```
