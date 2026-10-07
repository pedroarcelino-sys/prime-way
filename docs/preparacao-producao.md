# Preparação para produção do PrimeWay

Data: 7 de outubro de 2026. Branch: `feature/preparacao-producao`, a partir de `main` com fechamento funcional `5cd2262`/`d9946a3`.

Esta etapa prepara a implantação; não publica o sistema nem configura um provedor real. Não altera contas, senhas, histórico ou regras acadêmicas. Não cria migration, recuperação automática de acesso ou fechamento acadêmico oficial.

## Requisitos do servidor

- Apache 2.4 com `ssl`, `rewrite`, `headers` e PHP, ou Nginx com PHP-FPM. Os modelos estão em `deploy/`. Não usar `php -S` em servidor público.
- PHP 8.2 é o mínimo do código; preferir PHP 8.4/8.5 atualizado e mantido pelo provedor. Conferir a [política oficial de suporte PHP](https://www.php.net/supported-versions.php).
- Extensões: PDO, `pdo_mysql`, `fileinfo`, `mbstring`, Phar e zlib. Sessão, JSON, hash, filter, PCRE e funções de data devem estar disponíveis. Habilitar suporte OpenSSL/TLS no driver para MySQL remoto. OPcache é recomendado.
- MySQL 8 com InnoDB, foreign keys, CHECK, `utf8mb4` e `utf8mb4_unicode_ci`. MariaDB precisa ser validado com as migrations no provedor; não foi testado nesta etapa.
- PHP e MySQL devem usar o mesmo fuso operacional da escola. Configurar `America/Sao_Paulo` no PHP; conferir o fuso do MySQL com o provedor, inclusive conexões da aplicação, para preservar datas/horários.
- Storage persistente privado para Chat e atividades, pasta privada de sessões, logs fora da raiz pública, backup externo e espaço para crescimento dos anexos.
- CLI PHP e cliente MySQL para instalação/migrations; Node 22+ e Chrome apenas no ambiente de testes, não são dependências da aplicação publicada.

## Domínio, DNS e HTTPS

1. Definir domínio canônico e document root, preferencialmente domínio dedicado à escola.
2. Configurar A/AAAA/CNAME conforme o provedor; publicar AAAA somente se IPv6 e HTTPS funcionarem.
3. Instalar certificado válido, cadeia completa e renovação automática, com TLS 1.2/1.3. Ajustar desafio ACME antes de habilitar redirecionamento obrigatório.
4. Redirecionar HTTP para o domínio HTTPS canônico no servidor, sem construir o destino com Host recebido do cliente.
5. Testar raiz, `escola.html`, `pages/login.html`, assets, APIs e logout no domínio real.

As URLs da interface são relativas. A auditoria não encontrou dependência de localhost, loopback ou paths Windows nos scripts/páginas. `127.0.0.1` nos modelos de banco significa MySQL local ao servidor, não endereço público da interface. Testes e ferramentas locais usam loopback de propósito.

Modelos: `deploy/apache.conf.example`, `deploy/nginx.conf.example`, `deploy/php.ini.example`. Substituir domínio, paths, certificados, socket FPM e logs; não copiar exemplos sem ajuste. Se publicar sob subpasta, adaptar as locations do Nginx e validar a aplicação nesse prefixo. Apache aplica `.htaccess` relativamente à pasta do projeto.

## Configuração de ambiente

O projeto NÃO carrega `.env` automaticamente. Definir variáveis no painel do provedor, serviço/container ou pool PHP-FPM. Conferir que elas chegam ao PHP; o FPM pode limpar o ambiente. Não colocar senhas em comandos, Git, URLs ou pasta pública.

| Variável | Uso |
| --- | --- |
| `PRIMEWAY_APP_ENV=production` | Ativa requisitos de produção para cookie, credenciais e storage. |
| `PRIMEWAY_DB_HOST`, `PRIMEWAY_DB_PORT`, `PRIMEWAY_DB_NAME` | Endereço/porta/nome reais fornecidos pelo provedor. |
| `PRIMEWAY_DB_USER`, `PRIMEWAY_DB_PASS` | Conta existente restrita à aplicação; root, usuário vazio e senha vazia são recusados em produção. |
| `PRIMEWAY_DB_SSL_CA` | CA privada/readable do MySQL remoto; habilita TLS e verificação de certificado. |
| `PRIMEWAY_STORAGE_DIR` | Caminho absoluto, existente, gravável, persistente e fora da raiz pública. |
| `PRIMEWAY_SESSION_SECURE` | Opção explícita para TLS no desenvolvimento/proxy. Produção sempre força Secure mesmo se esta variável for `0`. |
| `PRIMEWAY_MIGRATION_DB_USER`, `PRIMEWAY_MIGRATION_DB_PASS` | Conta de migrations disponibilizada somente na manutenção; omitir quando não usada. |

`config/database.local.php`, se existir, prevalece sobre o ambiente. Não copiar o arquivo local de desenvolvimento. Se o provedor exigir configuração em arquivo, usar os exemplos com credenciais reais somente na cópia ignorada pelo Git, protegida pelo servidor e com leitura restrita. Nunca versionar `.local.php`, `.env`, certificados privados ou configurações de credenciais do cliente MySQL.

A conexão mantém charset `utf8mb4`, exceptions PDO e prepared statements nativos. Quando uma CA é configurada, o certificado é verificado e a aplicação exige cipher TLS negociado; não aceita downgrade silencioso. Para MySQL remoto, usar TLS verificado e firewall/rede privada; não expor a porta MySQL à internet inteira. Para banco no mesmo host/rede isolada, documentar a proteção do transporte com o provedor. Consulte o [driver PDO MySQL](https://www.php.net/manual/en/ref.pdo-mysql.php).

A conta da aplicação deve ter apenas os privilégios necessários (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) no seu banco, sem `FILE`, `GRANT`, DDL ou privilégios globais. A conta de migrations precisa dos privilégios de DDL e rotinas usados pelos scripts existentes, além de gravar `schema_migrations`. O provedor disponibiliza essas contas; esta etapa não cria ou modifica usuários MySQL/aplicação.

## Instalação e migrations

### Implantar os dados existentes em servidor limpo

É o caminho preferido para preservar o PrimeWay atual:

1. Entrar em manutenção e bloquear escritas antes de gerar um backup consistente de banco e anexos.
2. Criar, pelo provedor, um banco vazio com charset/collation adequados.
3. Restaurar o backup nesse banco vazio, incluindo `schema_migrations` e hashes das contas existentes, sem recriar usuários.
4. Configurar conexão e storage; copiar anexos para os locais privados descritos abaixo.
5. Executar o executor existente com a conta de manutenção. Ele confere checksums e pula migrations registradas:

```bash
php database/migrate.php
php tests/integration/schema_status.php
```

O status deve mostrar `ready=true`, sem pendências ou checksums divergentes. Os testes são CLI e devem permanecer inacessíveis pela web. Não usar baseline arbitrária em backup que já contém `schema_migrations`.

### Instalação estrutural nova, sem dados de desenvolvimento

Somente para banco comprovadamente vazio, diferente de qualquer banco em uso:

```bash
# Produz SQL estrutural sem conexão ao banco e sem seed de usuários/senhas.
php database/export_schema.php > /private/primeway/schema-producao.sql
mysql --defaults-extra-file=/private/mysql-install.cnf --default-character-set=utf8mb4 NOME_BANCO_VAZIO < /private/primeway/schema-producao.sql
php database/migrate.php
php tests/integration/schema_status.php
```

O exportador usa o schema de referência até `010` e registra os checksums de `002`–`010`, cujas estruturas já estão incluídas. O executor aplica `011`–`018` em ordem; repetir o executor pula o que já está registrado. O exportador não cria banco, não escolhe nome fixo e não gera Admin, ano letivo, turmas ou outros dados fictícios. Remover o artefato SQL privado após instalação/armazená-lo no backup restrito, nunca no document root.

Não importar `database/primeway.sql` diretamente em produção: ele contém dados/conta de desenvolvimento. Não importá-lo sobre banco existente. Uma instalação sem dados não terá conta de acesso; provisionamento autorizado de contas/dados institucionais fica a cargo do responsável, fora desta etapa. Para conservar contas atuais, usar o backup homologado.

MySQL faz commit implícito em muitas operações DDL: não presumir rollback transacional de migrations. Em falha parcial, interromper a atualização e inspecionar/restaurar um banco de homologação antes de tentar novamente. Não apagar registros de `schema_migrations` nem reaplicar migrations manualmente. Não editar migrations históricas para adaptar o provedor.

O exportador foi validado estruturalmente; não foi criada/restaurada uma base nova nesta etapa. Ensaiar instalação/restauração no banco vazio de homologação do provedor antes da publicação.

## Pastas, permissões e anexos

Exemplo de organização:

```text
/var/www/primeway/releases/<commit>/   código imutável
/var/www/primeway/current              release ativa
/var/lib/primeway/storage/chat/        anexos/mídias do Chat
/var/lib/primeway/storage/atividades/  arquivos acadêmicos
/var/lib/primeway/sessions/            sessões PHP
/var/log/primeway/                     logs privados
/private/backups/                     backups restritos
```

Definir `PRIMEWAY_STORAGE_DIR=/var/lib/primeway/storage`. Criar a pasta base antes de iniciar a aplicação; produção rejeita caminho relativo, pasta ausente/não gravável, temporário implícito e caminho dentro do checkout público, inclusive por symlink.

Código/config: somente leitura para o processo PHP. Sugestão: diretórios 0750, arquivos 0640, proprietário de deploy e grupo do servidor. Storage: diretórios 0770, arquivos 0660/0640 conforme umask; sessões e logs graváveis exclusivamente pelo usuário/grupo de serviço. Segredos/client config de backup: 0600. Adaptar ownership ao provedor; nunca usar 0777. Configurar umask restritivo no serviço PHP.

Somente storage, pasta de sessões, pasta temporária de uploads do PHP e logs precisam de escrita em execução normal. A pasta do código não precisa ser gravável pelo PHP. Sessões não entram no backup de histórico; encerrar/invalidar sessões após restauração operacional conforme procedimento do provedor.

Chat mantém referências relativas `ano/mês/nome`; atividades mantêm `atividades/nome`. Na transferência, copiar o Chat do storage privado atual para `storage/chat` e os arquivos acadêmicos de `storage/atividades` do checkout antigo para o storage privado novo, sem alterar IDs/metadados do banco. No desenvolvimento, os caminhos antigos continuam como fallback quando `PRIMEWAY_STORAGE_DIR` não está definida. Se definir essa variável localmente, ela passa a apontar também as atividades para o novo local; copiar arquivos antes da troca.

Não apagar os diretórios de origem até conferir hashes, quantidade, permissões e abertura autenticada dos anexos. Nenhum arquivo existente foi movido ou apagado automaticamente nesta etapa.

## Uploads e segurança

- Chat: até 10 MB por arquivo, extensão permitida, MIME real por fileinfo e correspondência extensão/conteúdo. Nome físico aleatório; nome original normalizado; sem caminhos fornecidos pelo cliente.
- Office moderno: pacote real com estruturas DOCX/XLSX/PPTX; ZIP genérico e macros disfarçadas são recusados. Phar/zlib precisam estar disponíveis. A mesma verificação é aplicada aos anexos acadêmicos, preservando os limites por atividade.
- Atividades: limite continua vindo do registro da atividade. Modelo PHP aceita até 20 MB por arquivo e POST de 22 MB; alinhar também limite do Nginx/proxy/provedor. Se houver atividades configuradas acima desse limite, ajustar infraestrutura antes da publicação; não truncar dados.
- PHP, HTML/SVG e extensões executáveis não pertencem à lista de uploads permitidos. Storage fica fora do document root e não tem alias público; downloads passam por autorização PHP. `storage/.htaccess` continua negando acesso ao storage antigo.
- Erros de validação retornam mensagem segura; erros de PDO/disco/storage não são confundidos com validação e retornam erro genérico, com detalhes somente no log privado.
- Ficheiros Office/PDF/áudio permitidos não equivalem a conteúdo livre de malware. Usar antivírus/scanner no provedor se a política institucional exigir; não foi implementado scanner nesta etapa. A aplicação nunca executa o anexo no servidor.
- `display_errors`/`display_startup_errors` desligados no runtime web e no modelo PHP; configurar também o PHP/FPM, pois erros anteriores ao bootstrap não podem ser protegidos pela aplicação. Logs não devem conter corpos de pedidos, senhas ou coordenadas GPS.

## Sessões, headers e servidor

Cookies são host-only, `HttpOnly`, `SameSite=Lax`, com strict mode e CSRF preservados. `Secure` é obrigatório em produção. PHP não confia isoladamente em `X-Forwarded-Proto`; proxy TLS deve configurar `HTTPS` no servidor de origem, sem aceitar esse valor de clientes arbitrários. O backend não deve ficar acessível diretamente por HTTP público. Consulte a [configuração de sessões PHP](https://www.php.net/manual/en/session.configuration.php).

Apache exige `.htaccess` ativo e módulos rewrite/headers; falta de módulo não pode deixar regras de proteção silenciosamente desativadas. Nginx ignora `.htaccess`: aplicar as locations do modelo. Bloquear `config/`, `database/`, `tests/`, `docs/`, `deploy/`, `storage/`, arquivos ocultos/Git, dumps e arquivos privados. Desabilitar directory listing. Validar com `apachectl configtest` ou `nginx -t` antes de recarregar o servidor.

Headers: nosniff, SAMEORIGIN, referrer policy, permissions policy permitindo GPS/microfone/câmera apenas na origem e CSP compatível com a interface atual. HSTS somente no HTTPS público, sem preload ou includeSubDomains automáticos. Os modelos do servidor aplicam headers também às páginas HTML estáticas; só configurar o PHP não protege a página pública.

A CSP permite inline porque a interface existente depende dele; remover isso exigiria outra etapa. Scripts externos são limitados aos CDNs utilizados. Manter fontes/Leaflet e previews blob compatíveis; não habilitar `unsafe-eval`. Apache `Header always` e PHP-FPM podem ter tabelas de headers distintas: conferir que o domínio final não envia valores duplicados/conflitantes, conforme [documentação Apache](https://httpd.apache.org/docs/2.4/mod/mod_headers.html). O modelo Nginx oculta duplicações do upstream.

Limitação de login por sessão permanece. Configurar rate limiting por IP/rota no proxy/WAF do provedor, com limites compatíveis com acesso simultâneo da escola; não ampliar permissões nem substituir CSRF. Desabilitar exposição de versão PHP no servidor.

Não foi criado health check público novo: página inicial e sessão anônima permitem testar servidor/PHP; a saúde do banco/schema é conferida por CLI privado. Monitorar 5xx, disponibilidade, espaço, backups e renovação TLS no provedor.

## GPS, Leaflet e OpenStreetMap

GPS e microfone exigem contexto seguro e permissão do navegador. Publicar com HTTPS válido e manter Permissions-Policy da própria origem. Conferir a configuração privada `config/saida_segura.local.php` com coordenadas reais e raio autorizados; não usar as coordenadas fictícias do exemplo. A ausência de configuração continua retornando erro seguro.

Leaflet 1.9.4 e tiles usam HTTPS; não há chave local hardcoded. Atribuição OpenStreetMap permanece. O endpoint público tem capacidade/política própria: respeitar atribuição, cache HTTP, Referer e ausência de download em massa/offline; avaliar capacidade/provedor de tiles conforme tráfego. O modo textual de GPS continua disponível em falha de mapa/CDN. Ver [política de tiles OSM](https://operations.osmfoundation.org/policies/tiles/) e [política de geolocalização](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/geolocation).

## Backups e restauração

Definir RPO/RTO, frequência, retenção e responsáveis com a escola. Guardar backups criptografados fora do servidor público, com acesso restrito e teste periódico de restauração. Não versionar dumps, certificados, logs ou anexos.

Com aplicação em manutenção/sem escritas, usar conta e arquivo de cliente privados (0600). Exemplo MySQL:

```bash
set -euo pipefail
mysqldump --defaults-extra-file=/private/mysql-backup.cnf --single-transaction --routines --triggers --events --hex-blob --default-character-set=utf8mb4 NOME_BANCO | gzip > /private/backups/primeway-db.sql.gz
tar -czf /private/backups/primeway-anexos.tar.gz -C /var/lib/primeway storage
sha256sum /private/backups/primeway-db.sql.gz /private/backups/primeway-anexos.tar.gz > /private/backups/SHA256SUMS
```

Incluir `schema_migrations`, auditoria, históricos, contas/hashes e vínculos. Guardar também commit/release e cópia protegida da configuração necessária; chaves privadas ficam no cofre do provedor. Não incluir sessões ou temporários no backup de anexos. A manutenção alinha o snapshot de banco aos arquivos; `--single-transaction` sozinho não sincroniza o filesystem nem garante consistência durante DDL.

Restauração: verificar hashes, criar um banco/diretório vazios de destino, restaurar o dump e anexos correspondentes, aplicar permissões, apontar a configuração, executar status de schema e validar acesso aos arquivos pelos IDs. Exemplo, exclusivamente destino vazio:

```bash
gzip -dc /private/backups/primeway-db.sql.gz | mysql --defaults-extra-file=/private/mysql-restore.cnf --default-character-set=utf8mb4 BANCO_DESTINO_VAZIO
tar -xzf /private/backups/primeway-anexos.tar.gz -C /var/lib/primeway-restauracao
```

Inspecionar o pacote e o diretório alvo antes da extração; jamais restaurar sobre a base atual automaticamente. Para trocar um ambiente em uso, bloquear escritas, arquivar seu estado mais recente e avaliar registros posteriores ao backup; qualquer perda de dados exige decisão expressa do responsável. Não aplicar schema consolidado sobre backup restaurado. Backups de outra origem/versionamento exigem conferência antes das migrations.

## Deploy e rollback

1. Escolher commit/tag revisado, gerar release por `git archive` e conferir manifesto. Arquivo Git não inclui `.git` nem configurações/anexos ignorados. Não enviar cópia indiscriminada da pasta do computador.
2. Montar nova release com código imutável; injetar segredos/configuração fora do Git e apontar o storage compartilhado privado.
3. Fazer backup consistente; validar configuração Apache/Nginx/PHP e schema de homologação.
4. Em manutenção, executar somente migrations pendentes com conta dedicada; retirar credenciais de manutenção do processo web após uso.
5. Trocar release ativa, recarregar FPM/OPcache e realizar smoke test curto: página inicial, sessão/login/logout, headers, bloqueio de paths privados e abertura de um anexo autorizado. Homologação manual completa permanece separada.
6. Monitorar erros/espaço/latência e retirar manutenção após checks. Não executar migrations automaticamente em cada requisição ou boot.

Esta etapa não muda o schema. Rollback de código: voltar à release anterior compatível, preservar configuração/storage e recarregar FPM/OPcache. Não resetar banco, contas, leitura de notificações, notas ou histórico. Se uma implantação futura mudar schema, planejar compatibilidade e backup antes do deploy; restauração é operação separada, com avaliação de perda de dados, nunca um DROP/reset automático.

## Checklist pré-publicação

- [x] Fechamento funcional confirmado em main; branch isolada, sem push para main.
- [x] Modelos sem senhas; `.gitignore` cobre segredos, dumps, logs e anexos.
- [x] Erros internos não expostos; CSRF e permissões preservados.
- [x] Cookies/headers/storage/upload revisados e cobertos por testes.
- [x] Exportação estrutural sem usuário de desenvolvimento e migrations documentadas.
- [x] Regressão automatizada e lint executados, conforme resultados abaixo.
- [ ] Provedor, domínio, DNS, certificado/renovação e redirect HTTPS configurados.
- [ ] Versão/extensões/INI/FPM, fuso e CA/rede MySQL conferidos no servidor final.
- [ ] Conta restrita e storage/sessões/logs privados configurados; anexos antigos copiados e conferidos.
- [ ] Regras Apache/Nginx validadas e paths privados comprovadamente inacessíveis no domínio real.
- [ ] Backup/restauração e instalação nova ensaiados em destinos vazios de homologação.
- [ ] Contas/dados institucionais autorizados; nenhum Admin de desenvolvimento publicado.
- [ ] Configuração real da Saída Segura, permissões GPS/microfone e impressão final verificadas em dispositivos reais.
- [ ] Rate limiting, retenção de logs/backups, monitoramento e rollback atribuídos ao operador.
- [ ] Homologação manual completa antes de liberar uso público.

## Testes e limitações

Novos testes: `tests/producao.php` (40 verificações), `tests/producao_http.mjs` (26 HTTP/multipart), `tests/producao_auditoria.mjs` (116 verificações de versionamento/URLs/ignore). `tests/browser.mjs --production-headers` passou nas páginas reais com fixtures e CSP proposta, incluindo desktop/mobile e módulos preservados.

Lint: 184 arquivos PHP e 60 JS/MJS válidos. Auditoria funcional: 47 páginas, 132 endpoints públicos, 573 links/assets e 159 referências de API válidos. `git diff --check` aprovado.

Regressão PHP: fechamento 155, estado legado/Chat Admin 110, Saída Segura 40, Notificações relacional/API 66/96, Calendário relacional/API 60/31, Disciplinas com dados locais 30 e suíte geral 58. Escritas usam rollback; snapshot do fechamento preserva todas as tabelas, usuários, senhas e históricos. Banco local: 17 migrations, nenhuma pendência/checksum divergente.

O HTTP de segurança usa router exclusivamente de teste em loopback, sem escrita no banco, simulando headers estáticos; não substitui teste de configuração do Apache/Nginx real. Os testes de interface simulam APIs; regras relacionais são exercitadas separadamente. Não foram usados domínio/certificado/CA MySQL reais, nem servidor Linux/MariaDB novo. Apache/Nginx não estão disponíveis para validar os modelos aqui. TLS MySQL foi testado quanto a opções/cipher e rejeição de downgrade, sem conexão TLS real a um provedor.

Os três eventos originais do outro computador não existem neste banco: Calendário usa fixtures temporárias. Disciplinas usa `--local-data`. Nenhuma migration foi criada/aplicada localmente, nenhum dump de dados foi produzido e nenhum anexo existente foi movido/apagado. Os ajustes são configuração/segurança e integrações mínimas de storage/validação, sem novas funcionalidades.

## Manifesto de arquivos alterados

34 arquivos:

```text
.env.example
.gitignore
.htaccess
api/_bootstrap.php
api/aluno/atividades/arquivo.php
api/aluno/atividades/remover-arquivo.php
api/aluno/atividades/upload.php
api/chat/_attachments.php
api/chat/upload.php
api/professor/atividades/arquivo.php
api/secretaria/chat/upload.php
config/.htaccess
config/database.local.example.php
config/database.migration.local.example.php
config/database.php
config/runtime.php
config/session.php
config/storage.php
database/.htaccess
database/export_schema.php
database/migrate.php
deploy/.htaccess
deploy/apache.conf.example
deploy/nginx.conf.example
deploy/php.ini.example
docs/.htaccess
docs/preparacao-producao.md
README.md
tests/.htaccess
tests/browser.mjs
tests/producao_auditoria.mjs
tests/producao_http.mjs
tests/producao_router.php
tests/producao.php
```
