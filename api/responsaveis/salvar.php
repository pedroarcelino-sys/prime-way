<?php

declare(strict_types=1);

require_once __DIR__ . '/../_bootstrap.php';

primewayExigirMetodo('POST');
primewayExigirCsrf();
$usuario = primewayExigirPerfis(['admin']);
$dados = primewayLerJson();

$id = primewayIdPositivo($dados['id'] ?? null);
$nome = trim((string) ($dados['name'] ?? ''));
$email = mb_strtolower(trim((string) ($dados['email'] ?? '')));
$senha = (string) ($dados['password'] ?? '');
$telefone = trim((string) ($dados['phone'] ?? ''));
$documento = trim((string) ($dados['document'] ?? ''));
$nascimento = trim((string) ($dados['birthDate'] ?? ''));
$status = mb_strtolower(trim((string) ($dados['status'] ?? 'ativo')));
$parentesco = trim((string) ($dados['relationship'] ?? ''));
$alunosRecebidos = is_array($dados['studentIds'] ?? null) ? $dados['studentIds'] : [];
$alunoIds = [];

foreach ($alunosRecebidos as $alunoRecebido) {
    $alunoId = primewayIdPositivo($alunoRecebido);
    if ($alunoId !== null) {
        $alunoIds[$alunoId] = $alunoId;
    }
}
$alunoIds = array_values($alunoIds);

if ($nome === '' || mb_strlen($nome) > 120) {
    primewayResponderJson(['success' => false, 'message' => 'Informe um nome válido.'], 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
    primewayResponderJson(['success' => false, 'message' => 'Informe um e-mail válido.'], 422);
}
if ($id === null && mb_strlen($senha) < 8) {
    primewayResponderJson(['success' => false, 'message' => 'A senha inicial deve ter pelo menos 8 caracteres.'], 422);
}
if ($senha !== '' && (mb_strlen($senha) < 8 || mb_strlen($senha) > 200)) {
    primewayResponderJson(['success' => false, 'message' => 'A senha deve ter entre 8 e 200 caracteres.'], 422);
}
if (!in_array($status, ['ativo', 'pendente', 'inativo'], true)) {
    primewayResponderJson(['success' => false, 'message' => 'Status inválido.'], 422);
}
if ($alunoIds === [] || $parentesco === '' || mb_strlen($parentesco) > 50) {
    primewayResponderJson(['success' => false, 'message' => 'Selecione ao menos um aluno e informe o parentesco.'], 422);
}

$nascimentoFinal = null;
if ($nascimento !== '') {
    $data = DateTimeImmutable::createFromFormat('!Y-m-d', $nascimento);
    if (!$data || $data->format('Y-m-d') !== $nascimento) {
        primewayResponderJson(['success' => false, 'message' => 'Data de nascimento inválida.'], 422);
    }
    $nascimentoFinal = $nascimento;
}

try {
    $pdo = primewayPdo();
    $pdo->beginTransaction();

    $marcadores = implode(',', array_fill(0, count($alunoIds), '?'));
    $alunosStmt = $pdo->prepare("SELECT id FROM alunos WHERE id IN ($marcadores)");
    $alunosStmt->execute($alunoIds);
    if (count($alunosStmt->fetchAll()) !== count($alunoIds)) {
        throw new DomainException('Um dos alunos selecionados não existe.');
    }

    if ($id === null) {
        $pessoaStmt = $pdo->prepare(
            'INSERT INTO pessoas (nome, email_contato, telefone, documento, data_nascimento, ativo)
             VALUES (:nome, :email, :telefone, :documento, :nascimento, 1)'
        );
        $pessoaStmt->execute([
            'nome' => $nome,
            'email' => $email,
            'telefone' => $telefone !== '' ? $telefone : null,
            'documento' => $documento !== '' ? $documento : null,
            'nascimento' => $nascimentoFinal
        ]);
        $pessoaId = (int) $pdo->lastInsertId();

        $responsavelStmt = $pdo->prepare(
            'INSERT INTO responsaveis (pessoa_id, status) VALUES (:pessoa_id, :status)'
        );
        $responsavelStmt->execute(['pessoa_id' => $pessoaId, 'status' => $status]);
        $id = (int) $pdo->lastInsertId();

        $usuarioStmt = $pdo->prepare(
            "INSERT INTO usuarios (pessoa_id, nome, email, senha_hash, perfil, ativo)
             VALUES (:pessoa_id, :nome, :email, :senha, 'responsavel', :ativo)"
        );
        $usuarioStmt->execute([
            'pessoa_id' => $pessoaId,
            'nome' => $nome,
            'email' => $email,
            'senha' => password_hash($senha, PASSWORD_DEFAULT),
            'ativo' => $status === 'ativo' ? 1 : 0
        ]);
        $acao = 'CRIAR_RESPONSAVEL';
        $mensagem = 'Responsável e conta de acesso cadastrados.';
    } else {
        $existenteStmt = $pdo->prepare(
            'SELECT pessoa_id FROM responsaveis WHERE id = :id FOR UPDATE'
        );
        $existenteStmt->execute(['id' => $id]);
        $pessoaId = (int) $existenteStmt->fetchColumn();
        if ($pessoaId < 1) {
            throw new DomainException('Responsável não encontrado.');
        }

        $pessoaStmt = $pdo->prepare(
            'UPDATE pessoas SET nome=:nome, email_contato=:email, telefone=:telefone,
             documento=:documento, data_nascimento=:nascimento, ativo=:ativo WHERE id=:id'
        );
        $pessoaStmt->execute([
            'nome' => $nome, 'email' => $email,
            'telefone' => $telefone !== '' ? $telefone : null,
            'documento' => $documento !== '' ? $documento : null,
            'nascimento' => $nascimentoFinal,
            'ativo' => $status === 'ativo' ? 1 : 0,
            'id' => $pessoaId
        ]);
        $pdo->prepare('UPDATE responsaveis SET status=:status WHERE id=:id')
            ->execute(['status' => $status, 'id' => $id]);

        $sqlUsuario = 'UPDATE usuarios SET nome=:nome, email=:email, ativo=:ativo';
        $paramsUsuario = [
            'nome' => $nome, 'email' => $email,
            'ativo' => $status === 'ativo' ? 1 : 0,
            'pessoa_id' => $pessoaId
        ];
        if ($senha !== '') {
            $sqlUsuario .= ', senha_hash=:senha';
            $paramsUsuario['senha'] = password_hash($senha, PASSWORD_DEFAULT);
        }
        $sqlUsuario .= " WHERE pessoa_id=:pessoa_id AND perfil='responsavel'";
        $pdo->prepare($sqlUsuario)->execute($paramsUsuario);

        $pdo->prepare('UPDATE aluno_responsavel SET ativo=0 WHERE responsavel_id=:id')
            ->execute(['id' => $id]);
        $acao = 'ATUALIZAR_RESPONSAVEL';
        $mensagem = 'Cadastro e vínculos do responsável atualizados.';
    }

    $vinculoStmt = $pdo->prepare(
        'INSERT INTO aluno_responsavel (
            aluno_id, responsavel_id, parentesco, autorizado_retirada,
            contato_principal, responsavel_financeiro, ativo
         ) VALUES (
            :aluno_id, :responsavel_id, :parentesco, :retirada, :principal, :financeiro, 1
         ) ON DUPLICATE KEY UPDATE
            parentesco=VALUES(parentesco), autorizado_retirada=VALUES(autorizado_retirada),
            contato_principal=VALUES(contato_principal),
            responsavel_financeiro=VALUES(responsavel_financeiro), ativo=1'
    );
    foreach ($alunoIds as $alunoId) {
        $vinculoStmt->execute([
            'aluno_id' => $alunoId,
            'responsavel_id' => $id,
            'parentesco' => $parentesco,
            'retirada' => !empty($dados['authorizedPickup']) ? 1 : 0,
            'principal' => !empty($dados['primaryContact']) ? 1 : 0,
            'financeiro' => !empty($dados['financial']) ? 1 : 0
        ]);
    }

    $auditoria = $pdo->prepare(
        'INSERT INTO auditoria (usuario_id, acao, entidade, registro_id, descricao, dados_novos, endereco_ip, user_agent)
         VALUES (:usuario, :acao, \'responsaveis\', :registro, :descricao, :dados, :ip, :agent)'
    );
    $auditoria->execute([
        'usuario' => $usuario['id'], 'acao' => $acao, 'registro' => $id,
        'descricao' => $mensagem,
        'dados' => json_encode(['nome' => $nome, 'email' => $email, 'alunos' => $alunoIds], JSON_UNESCAPED_UNICODE),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
        'agent' => isset($_SERVER['HTTP_USER_AGENT']) ? mb_substr((string) $_SERVER['HTTP_USER_AGENT'], 0, 500) : null
    ]);

    $pdo->commit();
    primewayResponderJson(['success' => true, 'message' => $mensagem, 'guardianId' => $id], $acao === 'CRIAR_RESPONSAVEL' ? 201 : 200);
} catch (DomainException $erro) {
    if (isset($pdo) && $pdo->inTransaction()) { $pdo->rollBack(); }
    primewayResponderJson(['success' => false, 'message' => $erro->getMessage()], 422);
} catch (PDOException $erro) {
    if (isset($pdo) && $pdo->inTransaction()) { $pdo->rollBack(); }
    if ((string) $erro->getCode() === '23000') {
        primewayResponderJson(['success' => false, 'message' => 'E-mail ou documento já cadastrado.'], 409);
    }
    error_log('PrimeWay Responsavel POST: ' . $erro->getMessage());
    primewayResponderJson(['success' => false, 'message' => 'Não foi possível salvar o responsável.'], 500);
} catch (Throwable $erro) {
    if (isset($pdo) && $pdo->inTransaction()) { $pdo->rollBack(); }
    error_log('PrimeWay Responsavel POST: ' . $erro->getMessage());
    primewayResponderJson(['success' => false, 'message' => 'Não foi possível salvar o responsável.'], 500);
}
