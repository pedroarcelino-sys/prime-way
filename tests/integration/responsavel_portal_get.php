<?php

declare(strict_types=1);

final class PrimewayResponsavelPortalSessaoMemoria implements SessionHandlerInterface
{
    public function open(string $path, string $name): bool { return true; }
    public function close(): bool { return true; }
    public function read(string $id): string|false { return ''; }
    public function write(string $id, string $data): bool { return true; }
    public function destroy(string $id): bool { return true; }
    public function gc(int $max_lifetime): int|false { return 0; }
}

$raiz = dirname(__DIR__, 2);
require_once $raiz . '/config/database.php';
require_once $raiz . '/config/session.php';
session_set_save_handler(new PrimewayResponsavelPortalSessaoMemoria(), true);
primewayIniciarSessao();
$pdo = primewayPdo();
$pdo->beginTransaction();
$sufixo = bin2hex(random_bytes(6));
$pdo->prepare('INSERT INTO pessoas(nome,email_contato,ativo) VALUES(?,?,1)')->execute(['Responsável Teste', "responsavel-$sufixo@local.invalid"]);
$pessoaResponsavel = (int) $pdo->lastInsertId();
$pdo->prepare("INSERT INTO responsaveis(pessoa_id,status) VALUES(?,'ativo')")->execute([$pessoaResponsavel]);
$responsavelId = (int) $pdo->lastInsertId();
$pdo->prepare("INSERT INTO usuarios(pessoa_id,nome,email,senha_hash,perfil,ativo) VALUES(?,?,?,?, 'responsavel',1)")
    ->execute([$pessoaResponsavel,'Responsável Teste',"responsavel-$sufixo@local.invalid",password_hash('teste-seguro',PASSWORD_DEFAULT)]);
$usuarioId = (int) $pdo->lastInsertId();
$pdo->prepare('INSERT INTO pessoas(nome,ativo) VALUES(?,1)')->execute(['Aluno Teste']);
$pessoaAluno = (int) $pdo->lastInsertId();
$pdo->prepare("INSERT INTO alunos(pessoa_id,matricula,status) VALUES(?,?,'ativo')")->execute([$pessoaAluno,"TESTE-$sufixo"]);
$alunoId = (int) $pdo->lastInsertId();
$pdo->prepare("INSERT INTO aluno_responsavel(aluno_id,responsavel_id,parentesco,ativo) VALUES(?,?,'Tutor',1)")->execute([$alunoId,$responsavelId]);
$_SESSION['usuario_id']=$usuarioId;
$_SESSION['usuario_nome']='Responsável Teste';
$_SESSION['usuario_email']="responsavel-$sufixo@local.invalid";
$_SESSION['usuario_perfil']='responsavel';
$_SERVER['REQUEST_METHOD']='GET';
require $raiz . '/api/responsavel/index.php';
