# Saída Segura — mapa em tempo real, Fase 1

Branch: `feature/saida-segura-mapa`. Base: `73ce4e8` (revisão do Chat).
Preservados `d034c33` (referência da escola na API autenticada) e
`bc36a25` (integração do mapa e testes iniciais).

## Implementação

- O GET autenticado `api/responsavel/saida_segura/index.php` acrescenta
  `location.latitude` e `location.longitude`, obtidos exclusivamente da
  configuração já validada por `_config.php`. O raio também continua configurável.
- Leaflet **1.9.4**, carregado com integridade SRI somente nesta página,
  utiliza tiles HTTPS do OpenStreetMap e mantém a atribuição visível.
- A tela mostra escola, círculo do raio e um marcador azul do responsável.
  A primeira posição enquadra escola e responsável; as seguintes movem o mesmo
  marcador, preservando zoom/pan. Não há trilha, ETA ou histórico de posições.
- Distância visual: até o raio, “Dentro do raio de X m”; até três vezes o raio,
  “Aproximando-se”; além disso, “Fora do raio”. Precisão informada em metros.
- O estado oficial continua vindo do PHP: `Aguardando → No raio → Preparando →
  Liberado`. Estar visualmente dentro do círculo não promove o estado.
- O aviso de entrada identifica o estudante e o aviso transitório é emitido
  somente uma vez por solicitação nesta página, após `staffNotified` do backend.
  O backend mantém seu bloqueio transacional e a notificação única já existentes.
- `watchPosition` começa pela ação do responsável, inclusive ao iniciar a
  solicitação, e termina ao parar, confirmar cancelamento, sair/logout, receber
  encerramento ou encontrar falha de GPS/conexão. Cancelar para o GPS antes do POST.
  Retornar pelo histórico do navegador não reativa o acompanhamento sozinho.
- Status é consultado a cada 7 segundos e ao retornar à aba. O encerramento
  remoto é reconhecido na próxima resposta; rede e limitação de timers em segundo
  plano podem aumentar esse intervalo. Não é uma conexão push.
- Envios de coordenadas limitados a um por 5 segundos, sem sobreposição no mesmo
  acompanhamento. Tokens de geração descartam callbacks e respostas de GPS
  anteriores a uma parada/cancelamento. Respostas antigas não regridem o status.

## Privacidade e compatibilidade

Coordenadas do responsável existem apenas na memória do navegador e no POST de
cálculo. Não são gravadas em MySQL, localStorage ou sessionStorage. Ao parar, são
removidos marcador e posição corrente; permanece somente a referência da escola.
As rotas de cálculo, início, cancelamento e Secretaria mantêm autenticação, CSRF,
restrição por responsável, autorização de retirada e histórico de status existentes.

Não houve escrita no banco durante esta implementação/validação, criação de
usuários, alteração de senhas ou alteração/execução de migrations. Os testes de
backend substituem PDO e contexto; não abrem conexão ao MySQL. O Chat não foi alterado.

CDN e tiles dependem de internet. Falha na biblioteca mostra uma alternativa
textual e mantém GPS/distância e cancelamento; falha de tiles mantém o mapa e os
controles disponíveis com aviso. Os provedores externos recebem IP e pedidos de
blocos da região visualizada, conforme informado na página. Não há geocodificação
nem envio da coordenada exata como parâmetro para esses serviços.

Em celular, testar via HTTPS. HTTP em endereço de rede local não equivale à
exceção de segurança de `localhost` para acesso ao GPS. A precisão e a frequência
dos callbacks dependem do dispositivo/navegador. A distância é em linha reta.

## Validação executada

| Verificação | Resultado |
|---|---|
| `php tests/run.php` | 58 verificações aprovadas |
| `php tests/saida_segura_backend.php` | 40 verificações isoladas aprovadas |
| `php tests/lint.php` | 149 arquivos PHP válidos |
| `node --check` nos arquivos de `js/` | 56 arquivos válidos |
| `tests/saida_segura_mapa.html` | 36 verificações aprovadas no Chrome |
| `tests/saida_segura_mapa.html?real=1` | 9 verificações com Leaflet real aprovadas |
| Tiles bloqueados pela rede do Chrome | Suíte Leaflet real aprovada, página funcional |
| Layout com Leaflet e tiles reais | 1440 px: mapa 1094 × 520; 390 px: mapa 320 × 380; sem overflow horizontal |
| Regressões existentes do Chat | Composer, mensagens/fixação e visibilidade aprovados; arquivos preservados |
| `git diff --check` | Aprovado |

Os testes de navegador carregam HTML/CSS/JavaScript reais da página, com sessão,
API e geolocalização simuladas. O modo `real=1` carrega Leaflet real; o modo padrão
também simula Leaflet e falha de CDN. Foram conferidos marcador único, círculo,
enquadramento, zoom/pan, proximidade, autoridade do PHP, aviso único, ausência de
storage, parada, cancelamento, encerramento remoto, respostas atrasadas, permissão
negada, GPS indisponível/timeout, ausência de geolocation e retorno pelo histórico.

O teste PHP executa as rotas reais com dependências simuladas. Confere configuração
da escola, chamadas às guardas, filtro por responsável, raio decidido no PHP,
notificação/histórico únicos, rejeição de ID/coordenadas inválidos e solicitação
alheia/encerrada, além da ausência de coordenadas nas escritas capturadas. Isso não
substitui testes de autenticação e integração com o banco real.

## Repetir e aceitar manualmente

Na raiz do projeto, executar os três comandos PHP acima. Com
`php -S 127.0.0.1:8000`, abrir:

- `http://127.0.0.1:8000/tests/saida_segura_mapa.html` (sem internet/GPS/banco).
- `http://127.0.0.1:8000/tests/saida_segura_mapa.html?real=1` (biblioteca e tiles externos, GPS/API simulados).

Pendências para o responsável pelo teste, usando contas existentes e sem alterar
senhas ou criar usuários:

1. Conferir se coordenadas e raio na configuração local correspondem à escola real.
2. Em celular com HTTPS, autenticar como Responsável, escolher aluno autorizado e
   iniciar retirada. Permitir GPS, conferir distância/precisão, círculo e marcador.
3. Caminhar para atualizar a posição; alterar zoom/pan e verificar que permanecem.
   Testar negar permissão, tentar novamente, parar e reativar GPS.
4. Entrar no raio real. Conferir uma notificação na Secretaria e uma mensagem de
   entrada no Responsável. Atualizações posteriores não devem repetir o aviso.
5. Na Secretaria, marcar “Preparando” e depois “Liberado”. Conferir progresso e
   encerramento do GPS no Responsável após a sincronização. Validar o histórico.
6. Em outra solicitação, cancelar durante atualizações e depois sair/voltar à página.
   O marcador deve desaparecer e o GPS não deve reiniciar automaticamente.
7. Validar sessão expirada, CSRF inválido e ID de solicitação de outro responsável:
   os endpoints devem negar acesso sem modificar a solicitação. Conferir também
   que aluno sem autorização de retirada não pode iniciar solicitação.
8. Testar a página autenticada em desktop e celular, com rede lenta e bloqueio de
   CDN/tiles. GPS e cancelamento devem continuar acessíveis quando apenas o mapa falha.

A implementação está validada de forma isolada. GPS físico, fluxo autenticado
Responsável/Secretaria e entrega real de notificações permanecem para aceite manual.
