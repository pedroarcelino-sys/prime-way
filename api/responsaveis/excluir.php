<?php

declare(strict_types=1);

require_once __DIR__ . '/../_bootstrap.php';

primewayExigirMetodo('POST');
primewayExigirCsrf();
$usuario = primewayExigirPerfis(['admin']);
$dados = primewayLerJson();
$id = primewayIdPositivo($dados['id'] ?? null);

if ($id === null) {
    primewayResponderJson(['success' => false, 'message' => 'Responsável inválido.'], 422);
}

try {
    $pdo = primewayPdo();
    $pdo->beginTransaction();
    $stmt = $pdo->prepare('SELECT pessoa_id FROM responsaveis WHERE id=:id FOR UPDATE');
    $stmt->execute(['id' => $id]);
    $pessoaId = (int) $stmt->fetchColumn();
    if ($pessoaId < 1) {
        throw new DomainException('Responsável não encontrado.');
    }

    $pdo->prepare("UPDATE responsaveis SET status='inativo' WHERE id=:id")->execute(['id' => $id]);
    $pdo->prepare('UPDATE pessoas SET ativo=0 WHERE id=:id')->execute(['id' => $pessoaId]);
    $pdo->prepare('UPDATE usuarios SET ativo=0 WHERE pessoa_id=:id')->execute(['id' => $pessoaId]);
    $pdo->prepare('UPDATE aluno_responsavel SET ativo=0 WHERE responsavel_id=:id')->execute(['id' => $id]);
    $pdo->prepare(
        "INSERT INTO auditoria (usuario_id, acao, entidade, registro_id, descricao)
         VALUES (:usuario, 'INATIVAR_RESPONSAVEL', 'responsaveis', :registro, 'Responsável e acesso inativados.')"
    )->execute(['usuario' => $usuario['id'], 'registro' => $id]);
    $pdo->commit();

    primewayResponderJson(['success' => true, 'message' => 'Responsável inativado com sucesso.']);
} catch (DomainException $erro) {
    if (isset($pdo) && $pdo->inTransaction()) { $pdo->rollBack(); }
    primewayResponderJson(['success' => false, 'message' => $erro->getMessage()], 404);
} catch (Throwable $erro) {
    if (isset($pdo) && $pdo->inTransaction()) { $pdo->rollBack(); }
    error_log('PrimeWay Responsavel DELETE: ' . $erro->getMessage());
    primewayResponderJson(['success' => false, 'message' => 'Não foi possível inativar o responsável.'], 500);
}
