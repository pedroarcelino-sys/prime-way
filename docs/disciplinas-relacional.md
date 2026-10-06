# Disciplinas relacional — validação final

Data: 06/10/2026. Branch: `feature/disciplinas-relacional`.
Base preservada: `51b0d70` (Saída Segura), `98cea81` (APIs relacionais) e `59e5b53` (WIP da implementação).

## Resultado

Disciplinas usa exclusivamente as tabelas existentes `disciplinas` e `turma_disciplinas`.
Nenhuma migration ou alteração de schema foi criada. Não houve push nesta conclusão.
`primewaySubjects` saiu do módulo, da lista gerenciada do `core.js` e das chaves permitidas de `api/estado/index.php`.
Um POST legado é rejeitado com HTTP 422; o GET não retorna essa chave. Dados legados não são importados automaticamente nem apagados.

As quatro rotas de Disciplinas exigem Admin no PHP. Escritas exigem CSRF e usam transações/prepared statements.
Identidade e vínculo são separados. O código é único globalmente; a combinação turma/disciplina também é única.
Os selects utilizam IDs dos cadastros reais. Não existe exclusão física neste módulo.
Trocar turma, disciplina ou professor de um vínculo com atividades, avaliações ou aulas é bloqueado.
Notas, entregas, anexos e frequências dependem desses registros por FK.

## Cinco registros existentes

| Código | Disciplina | Vínculo exibido |
|---|---|---|
| ART01 | Arte | Disciplina sem turma |
| CIE01 | Ciências | Disciplina sem turma |
| HIS01 | História | Disciplina sem turma |
| POR01 | Língua Portuguesa | Disciplina sem turma |
| MAT01 | Matemática | 5° ano A / 2026; Elaine Sousa Arcelino; 80h |

Indicadores: 5 disciplinas, 5 ativas, 80h e 1 turma vinculada.
O vínculo de Matemática mantém `turma_disciplinas.id=2`, `turmaId=3`, `disciplinaId=1`, `professorId=3`.
O modal identifica o histórico e bloqueia os três campos estruturais.

Inspeção visual em Chrome, larguras de 1440 e 390 pixels, com snapshot somente leitura do MySQL e interface real.
Tabela, pesquisa, filtros e modais foram conferidos. A tabela mantém scroll horizontal interno no celular.
Foi corrigido o espaço excessivo entre filtros mobile causado pelo `flex-basis` herdado do desktop.
Rótulos distinguem edição da disciplina e do vínculo, inclusive “Salvar vínculo”.

## Consumidores acadêmicos

- Aluno: atividade/listagem/detalhes/anexos e frequência continuam consultáveis com disciplina ou vínculo inativo. Permissões de novas interações ficam desabilitadas, com validação PHP.
- Responsável: frequência histórica não desaparece após inativação.
- Professor: Notas, Frequência e Turmas mantêm os vínculos históricos nas consultas. As opções indisponíveis de novos lançamentos ficam desabilitadas; filtros de histórico continuam utilizáveis.
- Escritas de notas, aulas, frequência e correção de atividades exigem disciplina/vínculo/turma ativos. O teste reproduziu a seleção indevida de entrega na correção e confirmou seu bloqueio após o ajuste.
- Consultas de atribuições atuais e opções de criação que já exigiam vínculo ativo permanecem com esse filtro. Não houve refatoração geral desses módulos nem alteração de arquivos do Chat ou da Saída Segura.

## Testes executados

| Comando / teste | Resultado |
|---|---|
| `php tests/lint.php` | 158 arquivos PHP válidos |
| `node --check` em todos os arquivos de `js/` | 56 arquivos válidos |
| `php tests/run.php` | 58 verificações |
| `php tests/disciplinas_api.php` | 31 verificações: rotas/guards reais, Admin, CSRF, cinco registros e rejeição do estado legado |
| `php tests/integration/disciplinas_relacional.php --rollback` | 39 verificações |
| `php tests/integration/disciplinas_historico.php --rollback` | 60 verificações; ampliado das 56 anteriores para cobrir correção de atividades |
| `php tests/saida_segura_backend.php` | 40 verificações |
| `node tests/browser.mjs --visual --leaflet-real` | Todas as páginas abaixo aprovadas e capturas desktop/mobile |
| `tests/disciplinas.html` | 32 verificações de interface |
| `tests/chat_composer.html` | 21 verificações |
| `tests/chat_messages.html` | 12 verificações |
| `tests/chat_visibility.html` | 4 verificações, uma por perfil |
| `tests/saida_segura_mapa.html` | 36 verificações |
| `tests/saida_segura_mapa.html?real=1` | 9 verificações com Leaflet real |
| Integrações `alunos_get`, `dashboard_get`, `estado_get`, `responsaveis_get`, `responsavel_portal_get`, `schema_status` | 6 consultas aprovadas |
| `git diff --check` | Sem erros |

O teste do portal do Responsável passou a usar uma conta existente, com sessão apenas em memória e consultas de leitura. Não cria usuários/pessoas/vínculos nem altera senhas.
Os testes relacionais e de histórico fazem escritas temporárias numa transação e executam rollback. Comparações antes/depois confirmaram preservação dos registros, incluindo entregas.
Contadores AUTO_INCREMENT podem avançar mesmo após rollback; nenhuma linha de teste permanece.

O teste de navegador utiliza a página e o `core.js` reais com transporte de API simulado, incluindo respostas de rejeição e falhas.
As regras de negócio são testadas separadamente no MySQL real; a visualização dos cinco registros usa o snapshot CLI somente leitura.
O servidor de teste não executa endpoints PHP nem encaminha POST às APIs reais. `disciplinas_visual.php` só funciona em CLI.

## Arquivos alterados na migração

- APIs dedicadas: `api/disciplinas/_disciplinas.php`, `index.php`, `salvar.php`, `salvar_vinculo.php`, `status.php`.
- Estado e interface: `api/estado/index.php`, `js/core.js`, `js/disciplinas.js`, `css/disciplinas.css`, `pages/disciplinas.html`.
- Aluno: `api/aluno/index.php`, `api/aluno/frequencia/index.php`, `api/aluno/atividades/_atividade.php`, `_contexto.php`, `index.php`, `visualizar.php`.
- Responsável: `api/responsavel/frequencia/index.php`.
- Professor: `api/professor/turmas/index.php`, `api/professor/notas/index.php`, `salvar_notas.php`, `api/professor/frequencia/index.php`, `salvar_aula.php`, `salvar_frequencia.php`, `api/professor/atividades/corrigir.php`.
- Interfaces acadêmicas: `js/professor_notas.js`, `js/professor_frequencia.js`, `pages/professor_notas.html`, `pages/professor_frequencia.html`.
- Testes: `tests/browser.mjs`, `tests/disciplinas.html`, `tests/disciplinas_api.php`, `tests/integration/disciplinas_relacional.php`, `disciplinas_historico.php`, `disciplinas_visual.php`, `responsavel_portal_get.php`.
- Relatório: `docs/disciplinas-relacional.md`.

## Limites e aceite manual

Não foi realizado login com senha real no navegador, nem escrita persistente autenticada de ponta a ponta.
Permanece o aceite manual com conta Admin existente: criar/editar uma disciplina e um vínculo, recarregar a página e verificar persistência; conferir histórico com contas acadêmicas autorizadas.
Os testes que verificam exatamente cinco registros refletem a base local desta entrega; cadastros novos permanentes exigirão atualizar essa expectativa.
