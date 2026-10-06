# Revisão funcional do Chat — 06/10/2026

Branch: `wip/chat-revisao-2026-10-06`.
Base publicada: `21a51e1`. Preservados `d344543` e o WIP `f25fc77`.

## Problemas reproduzidos e corrigidos

| Problema | Reprodução | Correção |
|---|---|---|
| Banner encontra o próprio banner | Banner e mensagem compartilham `data-message-id`; o destaque não chegava ao artigo | Restringir o seletor à mensagem decorada (`d344543`) |
| Consulta periódica perde posição e interrompe áudio | Executar a atualização de 15 segundos nas quatro páginas reconstruía o player e rolava ao final | Reutilizar mensagens inalteradas e preservar a posição; WIP `f25fc77`, complementado pelo cache da Secretaria em `40cf703` |
| Aba oculta registra leitura | A atualização chamava `marcar_lida.php` mesmo com `visibilityState=hidden` | Conferir visibilidade e conversa atual; atualizar leitura ao retornar (`309b220`) |
| Upload antigo aceita áudio com texto | Com dependências simuladas, o fluxo de `api/secretaria/chat/upload.php` chegava ao armazenamento | Ambas as rotas validam a mesma regra antes do armazenamento e classificam áudio como `audio` (`b0ca576`) |

Sem alteração de schema, migrations, dados, senhas ou usuários. Nenhum push desta revisão.

## Verificação executada

Os testes de navegador usaram as páginas e os scripts reais de Aluno, Professor,
Responsável e Secretaria, com sessão e APIs simuladas. Gravação e reprodução usaram
as APIs reais do Chrome, com microfone sintético. Não foram testes autenticados
contra o PHP/MySQL da aplicação.

| Item | Resultado nas quatro páginas |
|---|---|
| Enviada / entregue / lida | Um ícone cinza / dois cinza / dois azuis; respostas de status simuladas |
| Fixar mensagem antiga | Um clique mostra e destaca o artigo; posição mantida após atualização |
| Desafixar | Banner removido corretamente |
| Atualização e áudio | Mesmo elemento continua tocando, inclusive com chegada de outra mensagem |
| Gravação | Iniciar, contador, cancelar, repetir, parar; tracks encerradas após cancelamento/parada |
| Reprodução | Tocar, pausar, seek, término, reproduzir novamente; velocidades 1x, 1.5x e 2x |
| Áudio separado de texto | Texto impede gravação; áudio preparado limpa e bloqueia o campo |
| Anexos | Seleção, envio simulado, apresentação e download de PNG, PDF e TXT; previews de imagem e PDF |
| Menu | Copiar, baixar, fixar/desafixar; opção de excluir somente na própria mensagem e confirmação de exclusão |
| Leitura oculta | Nenhum POST de leitura durante a atualização oculta; leitura retomada ao voltar |
| Layout | 1440px e 390px sem overflow horizontal; poucas mensagens com lista de 150/140px e formulário adjacente; 40 mensagens com scroll interno de 430px no desktop |

Verificações locais aprovadas: 148 arquivos no lint PHP, 55 arquivos no verificador
de sintaxe JavaScript, 54 verificações em `tests/run.php` e `git diff --check`.
Os testes PHP incluem rejeição de áudio com texto e preservação de legendas nos
outros tipos de anexos. Os dois fluxos de upload também foram exercitados
isoladamente com dependências simuladas: ambos rejeitaram áudio com texto com 422,
antes da etapa de storage.

### Backend revisado

- `api/chat/_message_status.php` calcula entrega a partir de `mensagem_entregas`
  e leitura a partir de `mensagem_leituras`, excluindo o remetente. Leitura tem
  precedência; para múltiplos destinatários, todos os participantes ativos devem
  satisfazer o estado. As tabelas não são confundidas.
- Consulta somente de leitura do cálculo real sobre 20 mensagens existentes:
  12 enviadas e 8 lidas. Essa amostra não valida a transição entre duas sessões.
- `api/chat/arquivo.php` exige sessão e participação ativa, exclui mensagens
  apagadas e resolve o caminho dentro do storage. Download usa
  `Content-Disposition`; streaming implementa Range. A configuração local aponta
  para storage fora do projeto.
- `api/chat/mensagem_acao.php` verifica participação e rejeita excluir mensagem
  de outro remetente com 403.
- Aluno, Professor e Responsável passam por `primewayChatExigirDisponivel` ao
  iniciar/enviar; upload e ações de mensagem também verificam suspensão. A
  Secretaria é a gestora da suspensão; a API não permite suspender Secretaria.
- Migrations 014 a 018 conferidas por consulta de leitura e checksum; não executadas.

Autorização, suspensão e persistência precisam da confirmação autenticada abaixo.
DOC/DOCX e demais formatos Office não foram enviados no teste isolado de anexos.
As APIs atuais retornam as últimas 200 mensagens; a revisão de fixação cobriu
mensagens antigas dentro do histórico carregado, sem adicionar paginação.

## Repetir os testes sem contas reais

Com `php -S 127.0.0.1:8000` iniciado em `C:\PROJETO`, abrir:

- `http://127.0.0.1:8000/tests/chat_composer.html`
- `http://127.0.0.1:8000/tests/chat_messages.html`
- `http://127.0.0.1:8000/tests/chat_visibility.html`

Todos os resultados devem ser `[OK]`. As páginas de teste interceptam chamadas
às APIs; não usam banco ou microfone. A última carrega os quatro perfis em iframes
com sessão simulada e testa a visibilidade da aba.

## Roteiro autenticado — execução manual pelo responsável

Usar contas existentes em perfis separados do navegador para evitar compartilhar
cookies. Repetir envio/recebimento com Aluno ↔ Professor, Professor ↔ Responsável
e Secretaria ↔ cada perfil, conforme contatos permitidos no banco. Não criar
usuários nem alterar senhas. Registrar perfil, navegador, resultado e erro observado.

| Verificação | Procedimento e resultado esperado |
|---|---|
| Enviada | Destinatário com todas as abas do Chat fechadas; remetente envia e vê ✓ |
| Entregue | Destinatário abre o Chat sem selecionar a conversa; após sincronização, remetente vê ✓✓ cinza |
| Lida | Destinatário abre a conversa; após atualização do status, remetente vê ✓✓ azul |
| Aba oculta | Deixar a conversa selecionada, mudar de aba e receber outra mensagem; não deve ficar azul até retornar à aba do Chat |
| Fixação | Fixar mensagem antiga carregada, aguardar mais de 15 segundos e receber outra mensagem; a posição não deve saltar para o final. Ir ao final e clicar uma vez no banner: mensagem visível e destacada. Desafixar e conferir o banner |
| Áudio | Iniciar, verificar contador, cancelar, gravar novamente por cerca de 30 segundos, parar e enviar. Tocar por mais de 15 segundos, pausar, avançar/voltar, testar 1x/1.5x/2x e reproduzir após o término |
| Texto + áudio | Com texto digitado, gravação deve ser impedida. Com áudio pronto, texto deve ficar vazio/bloqueado. Uma requisição manipulada com áudio e `content` não vazio deve receber 422, tanto na rota compartilhada quanto na antiga da Secretaria |
| Anexos | Enviar imagem, PDF, TXT e DOCX válidos, abrir previews aplicáveis, baixar e comparar os arquivos; testar também documento com legenda |
| Acesso privado | Copiar URL de um anexo: participante acessa; sessão desconectada deve receber 401 e usuário autenticado fora da conversa deve receber 404. Conferir visualização e download |
| Menu | Copiar texto para área de transferência, baixar anexo, fixar/desafixar. Excluir mensagem própria criada para o teste; a exclusão deve aparecer ao outro participante. Tentativa de excluir mensagem alheia deve receber 403 |
| Suspensão | Pela Secretaria, suspender temporariamente um Aluno, Professor e Responsável, um de cada vez. Em cada conta, iniciar conversa, enviar texto e enviar anexo/áudio devem receber 403/`CHAT_SUSPENSO`, inclusive repetindo a requisição fora da interface. Reativar apenas a suspensão aplicada para o teste e confirmar retomada |
| Layout | Poucas mensagens: formulário logo abaixo da lista. Muitas mensagens: scroll interno. Repetir em desktop e largura próxima de 390px, inclusive com áudio preparado e preview aberto |

Os intervalos atuais de sincronização são de 12 e 15 segundos; aguardar um ciclo
antes de avaliar recibos. A revisão ficará funcionalmente encerrada após essa
validação autenticada. Não remover dados anteriores como parte do teste.
