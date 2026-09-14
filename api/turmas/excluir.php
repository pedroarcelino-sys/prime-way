<?php

declare(strict_types=1);

/*====================================================
        EXCLUIR TURMA - PRIMEWAY SCHOOL
        POST /api/turmas/excluir.php
====================================================*/

require_once
    __DIR__ .
    '/../_bootstrap.php';


/*====================================================
                    REQUISIÇÃO
====================================================*/

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


/*====================================================
                    ID
====================================================*/

$id =
    primewayIdPositivo(
        $dados[
            'id'
        ] ??
        null
    );


if (
    $id ===
    null
) {

    primewayResponderJson(
        [
            'success' =>
                false,

            'message' =>
                'Identificador da turma inválido.'
        ],
        400
    );
}


/*====================================================
                    BANCO
====================================================*/

try {

    $pdo =
        primewayPdo();


    $pdo->beginTransaction();


    /*================================================
                LOCALIZAR TURMA
    ================================================*/

    $stmtTurma =
        $pdo->prepare(
            '
                SELECT
                    t.id,
                    t.nome,
                    t.serie,
                    t.turno,
                    t.sala,
                    t.capacidade,
                    t.status,
                    t.professor_id,
                    al.ano AS ano_letivo

                FROM turmas t

                INNER JOIN anos_letivos al
                    ON al.id = t.ano_letivo_id

                WHERE t.id = :id

                FOR UPDATE
            '
        );


    $stmtTurma->execute([
        ':id' =>
            $id
    ]);


    $turma =
        $stmtTurma->fetch();


    if (
        !$turma
    ) {

        $pdo->rollBack();


        primewayResponderJson(
            [
                'success' =>
                    false,

                'message' =>
                    'Turma não encontrada.'
            ],
            404
        );
    }


    /*================================================
                MATRÍCULAS VINCULADAS
    ================================================*/

    /*
        Contamos TODAS as matrículas, não apenas
        as ativas.

        Uma matrícula concluída, transferida ou
        cancelada também faz parte do histórico
        acadêmico da turma.
    */

    $stmtMatriculas =
        $pdo->prepare(
            '
                SELECT
                    COUNT(*)
                FROM matriculas
                WHERE turma_id = :turma_id
            '
        );


    $stmtMatriculas->execute([
        ':turma_id' =>
            $id
    ]);


    $quantidadeMatriculas =
        (int) $stmtMatriculas
            ->fetchColumn();


    /*================================================
                DISCIPLINAS VINCULADAS
    ================================================*/

    $stmtDisciplinas =
        $pdo->prepare(
            '
                SELECT
                    COUNT(*)
                FROM turma_disciplinas
                WHERE turma_id = :turma_id
            '
        );


    $stmtDisciplinas->execute([
        ':turma_id' =>
            $id
    ]);


    $quantidadeDisciplinas =
        (int) $stmtDisciplinas
            ->fetchColumn();


    /*================================================
                EVENTOS VINCULADOS
    ================================================*/

    $stmtEventos =
        $pdo->prepare(
            '
                SELECT
                    COUNT(*)
                FROM eventos_calendario
                WHERE turma_id = :turma_id
            '
        );


    $stmtEventos->execute([
        ':turma_id' =>
            $id
    ]);


    $quantidadeEventos =
        (int) $stmtEventos
            ->fetchColumn();


    /*================================================
                    DEPENDÊNCIAS
    ================================================*/

    if (
        $quantidadeMatriculas > 0 ||
        $quantidadeDisciplinas > 0 ||
        $quantidadeEventos > 0
    ) {

        $pdo->rollBack();


        primewayResponderJson(
            [
                'success' =>
                    false,

                'message' =>
                    'Esta turma possui histórico vinculado e não pode ser excluída. Altere seu status para Inativa.',

                'dependencies' => [
                    'enrollments' =>
                        $quantidadeMatriculas,

                    'subjects' =>
                        $quantidadeDisciplinas,

                    'calendarEvents' =>
                        $quantidadeEventos
                ]
            ],
            409
        );
    }


    /*================================================
                    AUDITORIA
    ================================================*/

    /*
        Registramos o estado anterior da turma antes
        de apagá-la.

        auditoria.registro_id não possui FK para turmas,
        portanto continua preservando o ID histórico.
    */

    $stmtAuditoria =
        $pdo->prepare(
            '
                INSERT INTO auditoria (
                    usuario_id,
                    acao,
                    entidade,
                    registro_id,
                    descricao,
                    dados_anteriores
                )
                VALUES (
                    :usuario_id,
                    :acao,
                    :entidade,
                    :registro_id,
                    :descricao,
                    :dados_anteriores
                )
            '
        );


    $stmtAuditoria->execute([
        ':usuario_id' =>
            $usuario[
                'id'
            ],

        ':acao' =>
            'EXCLUIR_TURMA',

        ':entidade' =>
            'turmas',

        ':registro_id' =>
            $id,

        ':descricao' =>
            'Turma sem vínculos excluída.',

        ':dados_anteriores' =>
            json_encode(
                $turma,
                JSON_UNESCAPED_UNICODE |
                JSON_UNESCAPED_SLASHES
            )
    ]);


    /*================================================
                    EXCLUSÃO
    ================================================*/

    $stmtExcluir =
        $pdo->prepare(
            '
                DELETE FROM turmas
                WHERE id = :id
            '
        );


    $stmtExcluir->execute([
        ':id' =>
            $id
    ]);


    if (
        $stmtExcluir->rowCount() !==
        1
    ) {

        throw new RuntimeException(
            'A turma não pôde ser excluída.'
        );
    }


    $pdo->commit();


    /*================================================
                    RESPOSTA
    ================================================*/

    primewayResponderJson(
        [
            'success' =>
                true,

            'message' =>
                'Turma excluída com sucesso.',

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
        'PrimeWay Turmas DELETE: ' .
        $erro->getMessage()
    );


    primewayResponderJson(
        [
            'success' =>
                false,

            'message' =>
                'Não foi possível excluir a turma.'
        ],
        500
    );
}
