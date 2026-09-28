<?php

declare(strict_types=1);

function primewaySecretariaContexto(
    PDO $pdo,
    array $usuario
): array {

    $stmt = $pdo->prepare(
        "
            SELECT
                u.id AS usuario_id,
                u.email AS email_acesso,

                pe.id AS pessoa_id,
                pe.nome,
                pe.email_contato,
                pe.telefone,
                pe.documento,
                pe.data_nascimento,

                f.id AS funcionario_id,
                f.registro_funcional,
                f.cargo,
                f.status AS funcionario_status,

                s.id AS setor_id,
                s.nome AS setor_nome

            FROM usuarios u

            LEFT JOIN pessoas pe
                ON pe.id = u.pessoa_id

            LEFT JOIN funcionarios f
                ON f.pessoa_id = pe.id

            LEFT JOIN setores s
                ON s.id = f.setor_id

            WHERE u.id = :usuario_id
              AND u.perfil = 'secretaria'
              AND u.ativo = 1

            LIMIT 1
        "
    );

    $stmt->execute([
        ':usuario_id' => (int) $usuario['id']
    ]);

    $row = $stmt->fetch();

    if (!$row) {
        primewayResponderJson([
            'success' => false,
            'message' => 'Conta de Secretaria não encontrada.'
        ], 404);
    }

    $name = trim(
        (string) (
            $row['nome']
            ?? $usuario['nome']
            ?? $usuario['email']
        )
    );

    return [
        'userId' => (int) $usuario['id'],

        'personId' => $row['pessoa_id'] !== null
            ? (int) $row['pessoa_id']
            : null,

        'employeeId' => $row['funcionario_id'] !== null
            ? (int) $row['funcionario_id']
            : null,

        'name' => $name !== ''
            ? $name
            : (string) $usuario['email'],

        'accessEmail' => (string) (
            $row['email_acesso']
            ?? $usuario['email']
        ),

        'contactEmail' => (string) (
            $row['email_contato']
            ?? ''
        ),

        'phone' => (string) (
            $row['telefone']
            ?? ''
        ),

        'document' => (string) (
            $row['documento']
            ?? ''
        ),

        'birthDate' => $row['data_nascimento'],

        'registration' => (string) (
            $row['registro_funcional']
            ?? ''
        ),

        'jobTitle' => (string) (
            $row['cargo']
            ?? 'Secretaria'
        ),

        'employeeStatus' => (string) (
            $row['funcionario_status']
            ?? ''
        ),

        'sector' => (string) (
            $row['setor_nome']
            ?? 'Secretaria'
        )
    ];
}
