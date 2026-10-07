# PrimeWay School

Sistema acadêmico para gerenciamento escolar, com áreas administrativas e de professor.

## Tecnologias

- HTML, CSS e JavaScript sem framework;
- PHP 8.2 ou superior;
- MySQL 8/MariaDB compatível;
- sessões PHP com cookie `HttpOnly` e `SameSite=Lax`.

## Instalação local

Para implantação pública, seguir [docs/preparacao-producao.md](docs/preparacao-producao.md). Os modelos de servidor/PHP estão em `deploy/`; `.env` não é carregado automaticamente. Não enviar configurações locais, dados de desenvolvimento ou anexos junto ao código.

1. Inicie Apache e MySQL pelo XAMPP.
2. Para uma instalação nova, importe `database/primeway.sql` no MySQL.
3. Copie `config/database.local.example.php` para `config/database.local.php`.
4. Informe usuário, senha e nome do banco no arquivo local. Esse arquivo é ignorado pelo Git.
5. Sirva a pasta do projeto pelo Apache ou execute:

```powershell
C:\xampp\php\php.exe -S 127.0.0.1:8000 -t C:\PROJETO
```

6. Abra `http://127.0.0.1:8000/`.

Também é possível configurar o banco com as variáveis descritas em `.env.example`. O PHP precisa receber essas variáveis do servidor; o projeto não carrega arquivos `.env` automaticamente.

## Banco de dados

- `database/primeway.sql`: schema consolidado para instalação limpa;
- `database/migrations/`: evolução incremental de uma instalação existente;
- `database/migrations/010_estado_aplicacao.sql`: migration histórica preservada; a sincronização genérica foi aposentada.

Não execute o schema consolidado sobre um banco existente. Para atualizar a instalação atual, aplique somente as migrations ainda não executadas, em ordem.

O executor registra checksums na tabela `schema_migrations`:

```powershell
C:\xampp\php\php.exe database\migrate.php
```

O usuário usado para migrations precisa das permissões `CREATE` e `ALTER`. Mantenha o usuário restrito da aplicação no uso diário. Quando necessário, copie `config/database.migration.local.example.php` para `config/database.migration.local.php`, informe uma conta administrativa, execute a atualização e remova o arquivo local. Também podem ser usadas `PRIMEWAY_MIGRATION_DB_USER` e `PRIMEWAY_MIGRATION_DB_PASS`.

Em um banco antigo criado antes do controle de migrations, confirme qual foi a última migration aplicada e registre a linha de base uma única vez. Por exemplo, para um banco que já possua a estrutura até `009`:

```powershell
C:\xampp\php\php.exe database\migrate.php --baseline=009
```

O executor registra `002` a `009` e aplica automaticamente as posteriores. Não use `--baseline` em um banco vazio.

## Persistência da interface

Os cinco perfis utilizam APIs próprias em PHP, com MySQL como fonte de verdade e autorização no servidor. Turmas, alunos, responsáveis, disciplinas, calendário, notificações, chat e registros acadêmicos não dependem de coleções em `localStorage` nem de `PrimeWayStorage`.

`api/estado/index.php` permanece somente como barreira para clientes antigos: não publica coleções e rejeita gravações de chaves aposentadas. O navegador remove e impede a regravação dessas chaves; os registros relacionais permanecem intactos. Não há modo offline de dados acadêmicos.

O checklist por perfil e os limites da validação automatizada estão em [docs/fechamento-funcional.md](docs/fechamento-funcional.md). A recuperação de acesso orienta contato com a Secretaria; não há recuperação automática de senha.

## Segurança

- consultas utilizam prepared statements;
- operações de escrita utilizam token CSRF;
- o ID da sessão é regenerado após o login;
- cinco falhas de login na mesma sessão bloqueiam novas tentativas por até 15 minutos;
- credenciais locais não devem ser versionadas;
- a conta administrativa criada pelo schema é somente para desenvolvimento e precisa ter a senha alterada antes da publicação.

Em produção, use HTTPS, desative `display_errors`, configure logs fora da raiz pública e acrescente limitação de login por IP em proxy, servidor web ou Redis.

## Qualidade

Com o Composer disponível:

```powershell
composer check
```

Sem Composer:

```powershell
C:\xampp\php\php.exe tests\lint.php
C:\xampp\php\php.exe tests\run.php
```

Para validar JavaScript:

```powershell
Get-ChildItem js -Filter *.js | ForEach-Object { node --check $_.FullName }
```

Para verificar a regressão do travamento do áudio, abra
`http://127.0.0.1:8000/tests/chat_composer.html` com o servidor local iniciado.
O teste usa o DOM e o `MutationObserver` do navegador, intercepta as consultas
de entrega e não acessa o banco nem o microfone. Todos os resultados devem ser `[OK]`.

Os testes `tests/chat_messages.html` e `tests/chat_visibility.html` verificam
mensagens fixadas, preservação do player/scroll e leitura em segundo plano.
Veja os resultados e o roteiro autenticado em [Revisão do Chat](docs/chat-revisao-2026-10-06.md).

Para a Fase 1 do mapa da Saída Segura, execute `php tests/saida_segura_backend.php`
e abra `tests/saida_segura_mapa.html` pelo servidor local. O parâmetro `?real=1`
testa também o Leaflet real, com GPS e APIs simulados. Resultados, privacidade e
roteiro autenticado: [Mapa da Saída Segura](docs/saida-segura-mapa-fase-1.md).

Com o banco local configurado, a consulta relacional de Alunos pode ser testada sem alterar dados:

```powershell
C:\xampp\php\php.exe tests\integration\alunos_get.php
C:\xampp\php\php.exe tests\integration\estado_get.php
C:\xampp\php\php.exe tests\integration\schema_status.php
```

O workflow `.github/workflows/ci.yml` executa essas verificações em pushes e pull requests.

## Estrutura

```text
api/          APIs PHP
config/       conexão e sessão
css/          estilos das páginas
database/     schema e migrations
img/          imagens da interface
js/           comportamento e núcleo compartilhado
pages/        páginas internas
tests/        verificações automatizadas
```
