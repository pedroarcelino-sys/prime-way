<?php

declare(strict_types=1);

require_once __DIR__ . '/../_bootstrap.php';

primewayExigirMetodo('POST');
primewayExigirCsrf();
$usuario = primewayExigirPerfis(['admin']);
$dados = primewayLerJson();

$nome = trim((string) ($dados['name'] ?? ''));
$email = mb_strtolower(trim((string) ($dados['email'] ?? '')));
$senha = (string) ($dados['password'] ?? '');
$telefone = trim((string) ($dados['phone'] ?? ''));
$documento = trim((string) ($dados['document'] ?? ''));
$nascimento = trim((string) ($dados['birthDate'] ?? ''));
$registro = trim((string) ($dados['registration'] ?? ''));
$admissao = trim((string) ($dados['admissionDate'] ?? ''));

if ($nome === '' || mb_strlen($nome) > 120) {
    primewayResponderJson(['success' => false, 'message' => 'Informe um nome válido.'], 422);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
    primewayResponderJson(['success' => false, 'message' => 'Informe um e-mail válido.'], 422);
}

if (mb_strlen($senha) < 8 || mb_strlen($senha) > 200) {
    primewayResponderJson(['success' => false, 'message' => 'A senha inicial deve ter pelo menos 8 caracteres.'], 422);
}

$dataValida = static function (string $valor): ?string {
    if ($valor === '') {
        return null;
    }
    $data = DateTimeImmutable::createFromFormat('!Y-m-d', $valor);
    return $data && $data->format('Y-m-d') === $valor ? $valor : null;
};

$nascimentoFinal = $dataValida($nascimento);
$admissaoFinal = $dataValida($admissao);

if (($nascimento !== '' && $nascimentoFinal === null) || ($admissao !== '' && $admissaoFinal === null)) {
    primewayResponderJson(['success' => false, 'message' => 'Informe datas válidas.'], 422);
}

try {
    $pdo = primewayPdo();
    $pdo->beginTransaction();

    $pessoaStmt = $pdo->prepare(
        "
            INSERT INTO pessoas (nome, email_contato, telefone, documento, data_nascimento, ativo)
            VALUES (:nome, :email, :telefone, :documento, :nascimento, 1)
        "
    );
    $pessoaStmt->execute([
        'nome' => $nome,
        'email' => $email,
        'telefone' => $telefone !== '' ? $telefone : null,
        'documento' => $documento !== '' ? $documento : null,
        'nascimento' => $nascimentoFinal
    ]);
    $pessoaId = (int) $pdo->lastInsertId();

    $professorStmt = $pdo->prepare(
        "
            INSERT INTO professores (pessoa_id, registro_funcional, status, admissao_em)
            VALUES (:pessoa_id, :registro, 'ativo', :admissao)
        "
    );
    $professorStmt->execute([
        'pessoa_id' => $pessoaId,
        'registro' => $registro !== '' ? $registro : null,
        'admissao' => $admissaoFinal
    ]);
    $professorId = (int) $pdo->lastInsertId();

    $contaStmt = $pdo->prepare(
        "
            INSERT INTO usuarios (pessoa_id, nome, email, senha_hash, perfil, ativo)
            VALUES (:pessoa_id, :nome, :email, :senha_hash, 'professor', 1)
        "
    );
    $contaStmt->execute([
        'pessoa_id' => $pessoaId,
        'nome' => $nome,
        'email' => $email,
        'senha_hash' => password_hash($senha, PASSWORD_DEFAULT)
    ]);

    $auditoriaStmt = $pdo->prepare(
        "
            INSERT INTO auditoria (
                usuario_id, acao, entidade, registro_id, descricao,
                dados_novos, endereco_ip, user_agent
            ) VALUES (
                :usuario_id, 'CRIAR_PROFESSOR', 'professores', :registro_id,
                'Professor e conta de acesso cadastrados.', :dados_novos,
                :endereco_ip, :user_agent
            )
        "
    );
    $auditoriaStmt->execute([
        'usuario_id' => $usuario['id'],
        'registro_id' => $professorId,
        'dados_novos' => json_encode([
            'nome' => $nome,
            'email' => $email,
            'registro_funcional' => $registro !== '' ? $registro : null
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'endereco_ip' => $_SERVER['REMOTE_ADDR'] ?? null,
        'user_agent' => isset($_SERVER['HTTP_USER_AGENT'])
            ? mb_substr((string) $_SERVER['HTTP_USER_AGENT'], 0, 500)
            : null
    ]);

    $pdo->commit();

    primewayResponderJson([
        'success' => true,
        'message' => 'Professor cadastrado com sucesso.',
        'professorId' => $professorId
    ], 201);
} catch (PDOException $erro) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if ((string) $erro->getCode() === '23000') {
        primewayResponderJson([
            'success' => false,
            'message' => 'E-mail, documento ou registro funcional já cadastrado.'
        ], 409);
    }

    error_log('PrimeWay Professor POST: ' . $erro->getMessage());
    primewayResponderJson(['success' => false, 'message' => 'Não foi possível cadastrar o professor.'], 500);
} catch (Throwable $erro) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('PrimeWay Professor POST: ' . $erro->getMessage());
    primewayResponderJson(['success' => false, 'message' => 'Não foi possível cadastrar o professor.'], 500);
}
