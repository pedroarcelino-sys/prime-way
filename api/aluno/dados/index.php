<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/../_contexto.php';

primewayExigirMetodo('GET');

$usuario =
    primewayExigirPerfis([
        'aluno'
    ]);

try {

    $pdo =
        primewayPdo();

    $contexto =
        primewayAlunoContexto(
            $pdo,
            $usuario
        );

    $stmtResponsaveis =
        $pdo->prepare(
            "
                SELECT
                    r.id,
                    pe.nome,
                    pe.email_contato,
                    pe.telefone,
                    ar.parentesco,
                    ar.autorizado_retirada,
                    ar.contato_principal,
                    ar.responsavel_financeiro

                FROM aluno_responsavel ar

                INNER JOIN responsaveis r
                    ON r.id = ar.responsavel_id

                INNER JOIN pessoas pe
                    ON pe.id = r.pessoa_id

                WHERE ar.aluno_id = :aluno_id
                  AND ar.ativo = 1
                  AND r.status <> 'inativo'
                  AND pe.ativo = 1

                ORDER BY
                    ar.contato_principal DESC,
                    pe.nome ASC
            "
        );

    $stmtResponsaveis->execute([
        ':aluno_id' =>
            (int) $contexto[
                'profile'
            ][
                'studentId'
            ]
    ]);

    $guardians =
        array_map(
            static fn (
                array $row
            ): array => [
                'id' =>
                    (int) $row['id'],

                'name' =>
                    (string) $row['nome'],

                'email' =>
                    (string) (
                        $row['email_contato']
                        ?? ''
                    ),

                'phone' =>
                    (string) (
                        $row['telefone']
                        ?? ''
                    ),

                'relationship' =>
                    (string) $row['parentesco'],

                'authorizedPickup' =>
                    (int) $row['autorizado_retirada']
                    === 1,

                'mainContact' =>
                    (int) $row['contato_principal']
                    === 1,

                'financial' =>
                    (int) $row['responsavel_financeiro']
                    === 1
            ],
            $stmtResponsaveis->fetchAll()
        );

    primewayResponderJson([
        'success' => true,
        'profile' =>
            $contexto['profile'],
        'schoolYear' =>
            $contexto['schoolYear'],
        'enrollment' =>
            $contexto['enrollment'],
        'guardians' =>
            $guardians
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Aluno Dados GET: ' .
        $erro->getMessage()
    );

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível carregar os dados do aluno.'
        ],
        500
    );
}
