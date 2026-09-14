<?php

declare(strict_types=1);

/*====================================================
        EXCLUIR ALUNO - PRIMEWAY SCHOOL
        POST /api/alunos/excluir.php
====================================================*/

require_once
    __DIR__ .
    '/../_bootstrap.php';


primewayExigirMetodo(
    'POST'
);

$usuario =
    primewayExigirPerfis([
        'admin'
    ]);

primewayExigirCsrf();

$dados =
    primewayLerJson();

$id =
    primewayIdPositivo(
        $dados[
            'id'
        ] ??
        null
    );


if (
    $id === null
) {

    primewayResponderJson(
        [
            'success' =>
                false,

            'message' =>
                'Identificador do aluno inválido.'
        ],
        400
    );
}


try {

    $pdo =
        primewayPdo();

    $pdo->beginTransaction();


    $stmtAluno =
        $pdo->prepare(
            '
                SELECT
                    a.id,
                    a.pessoa_id,
                    a.matricula,
                    a.status,
                    a.novo_aluno,
                    a.ingresso_em,
                    pe.nome
                FROM alunos a
                INNER JOIN pessoas pe
                    ON pe.id = a.pessoa_id
                WHERE a.id = :id
                LIMIT 1
                FOR UPDATE
            '
        );

    $stmtAluno->execute([
        ':id' =>
            $id
    ]);

    $aluno =
        $stmtAluno->fetch();


    if (
        !$aluno
    ) {

        $pdo->rollBack();

        primewayResponderJson(
            [
                'success' =>
                    false,

                'message' =>
                    'Aluno não encontrado.'
            ],
            404
        );
    }


    $pessoaId =
        (int) $aluno[
            'pessoa_id'
        ];


    $stmtMatriculas =
        $pdo->prepare(
            '
                SELECT COUNT(*)
                FROM matriculas
                WHERE aluno_id = :aluno_id
            '
        );

    $stmtMatriculas->execute([
        ':aluno_id' =>
            $id
    ]);

    $quantidadeMatriculas =
        (int) $stmtMatriculas
            ->fetchColumn();


    $stmtResponsaveis =
        $pdo->prepare(
            '
                SELECT COUNT(*)
                FROM aluno_responsavel
                WHERE aluno_id = :aluno_id
            '
        );

    $stmtResponsaveis->execute([
        ':aluno_id' =>
            $id
    ]);

    $quantidadeResponsaveis =
        (int) $stmtResponsaveis
            ->fetchColumn();


    $stmtUsuarios =
        $pdo->prepare(
            '
                SELECT COUNT(*)
                FROM usuarios
                WHERE pessoa_id = :pessoa_id
            '
        );

    $stmtUsuarios->execute([
        ':pessoa_id' =>
            $pessoaId
    ]);

    $quantidadeUsuarios =
        (int) $stmtUsuarios
            ->fetchColumn();


    if (
        $quantidadeMatriculas > 0 ||
        $quantidadeResponsaveis > 0 ||
        $quantidadeUsuarios > 0
    ) {

        $pdo->rollBack();

        primewayResponderJson(
            [
                'success' =>
                    false,

                'message' =>
                    'Este aluno possui histórico ou vínculos no sistema e não pode ser excluído. Altere seu status para Inativo.',

                'dependencies' => [
                    'enrollments' =>
                        $quantidadeMatriculas,

                    'responsibles' =>
                        $quantidadeResponsaveis,

                    'users' =>
                        $quantidadeUsuarios
                ]
            ],
            409
        );
    }


    $dadosAnteriores = [
        'id' =>
            (int) $aluno[
                'id'
            ],

        'personId' =>
            $pessoaId,

        'name' =>
            (string) $aluno[
                'nome'
            ],

        'registration' =>
            (string) $aluno[
                'matricula'
            ],

        'status' =>
            (string) $aluno[
                'status'
            ],

        'newStudent' =>
            (int) $aluno[
                'novo_aluno'
            ] === 1,

        'entryDate' =>
            $aluno[
                'ingresso_em'
            ] !== null
                ? (string) $aluno[
                    'ingresso_em'
                ]
                : null
    ];


    $stmtAuditoria =
        $pdo->prepare(
            '
                INSERT INTO auditoria (
                    usuario_id,
                    acao,
                    entidade,
                    registro_id,
                    descricao,
                    dados_anteriores,
                    endereco_ip,
                    user_agent
                )
                VALUES (
                    :usuario_id,
                    :acao,
                    :entidade,
                    :registro_id,
                    :descricao,
                    :dados_anteriores,
                    :endereco_ip,
                    :user_agent
                )
            '
        );

    $stmtAuditoria->execute([
        ':usuario_id' =>
            $usuario[
                'id'
            ],

        ':acao' =>
            'EXCLUIR_ALUNO',

        ':entidade' =>
            'alunos',

        ':registro_id' =>
            $id,

        ':descricao' =>
            'Aluno sem histórico ou vínculos excluído.',

        ':dados_anteriores' =>
            json_encode(
                $dadosAnteriores,
                JSON_UNESCAPED_UNICODE |
                JSON_UNESCAPED_SLASHES
            ),

        ':endereco_ip' =>
            isset(
                $_SERVER[
                    'REMOTE_ADDR'
                ]
            )
                ? substr(
                    (string) $_SERVER[
                        'REMOTE_ADDR'
                    ],
                    0,
                    45
                )
                : null,

        ':user_agent' =>
            isset(
                $_SERVER[
                    'HTTP_USER_AGENT'
                ]
            )
                ? substr(
                    (string) $_SERVER[
                        'HTTP_USER_AGENT'
                    ],
                    0,
                    500
                )
                : null
    ]);


    $stmtExcluirAluno =
        $pdo->prepare(
            '
                DELETE FROM alunos
                WHERE id = :id
            '
        );

    $stmtExcluirAluno->execute([
        ':id' =>
            $id
    ]);


    if (
        $stmtExcluirAluno->rowCount() !== 1
    ) {

        throw new RuntimeException(
            'O aluno não pôde ser excluído.'
        );
    }


    $stmtOutrosPapeis =
        $pdo->prepare(
            '
                SELECT
                    (
                        SELECT COUNT(*)
                        FROM professores
                        WHERE pessoa_id = ?
                    ) +
                    (
                        SELECT COUNT(*)
                        FROM responsaveis
                        WHERE pessoa_id = ?
                    ) +
                    (
                        SELECT COUNT(*)
                        FROM funcionarios
                        WHERE pessoa_id = ?
                    ) +
                    (
                        SELECT COUNT(*)
                        FROM usuarios
                        WHERE pessoa_id = ?
                    )
            '
        );

    $stmtOutrosPapeis->execute([
        $pessoaId,
        $pessoaId,
        $pessoaId,
        $pessoaId
    ]);

    $outrosPapeis =
        (int) $stmtOutrosPapeis
            ->fetchColumn();


    if (
        $outrosPapeis === 0
    ) {

        $stmtExcluirPessoa =
            $pdo->prepare(
                '
                    DELETE FROM pessoas
                    WHERE id = :id
                '
            );

        $stmtExcluirPessoa->execute([
            ':id' =>
                $pessoaId
        ]);
    }


    $pdo->commit();


    primewayResponderJson(
        [
            'success' =>
                true,

            'message' =>
                'Aluno excluído com sucesso.',

            'id' =>
                $id
        ]
    );

} catch (
    Throwable $erro
) {

    if (
        isset(
            $pdo
        ) &&
        $pdo instanceof PDO &&
        $pdo->inTransaction()
    ) {

        $pdo->rollBack();
    }


    error_log(
        'PrimeWay Alunos DELETE: ' .
        $erro->getMessage()
    );


    primewayResponderJson(
        [
            'success' =>
                false,

            'message' =>
                'Não foi possível excluir o aluno.'
        ],
        500
    );
}
