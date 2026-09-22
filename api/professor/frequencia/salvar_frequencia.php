<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/../_contexto.php';

primewayExigirMetodo('POST');

$usuario =
    primewayExigirPerfis([
        'professor'
    ]);

primewayExigirCsrf();

$dados =
    primewayLerJson();

function primewayProfessorFrequenciaFalha(
    string $mensagem,
    int $status = 422
): never {
    primewayResponderJson(
        [
            'success' => false,
            'message' => $mensagem
        ],
        $status
    );
}

$lessonId =
    primewayIdPositivo(
        $dados['lessonId']
        ?? null
    );

$records =
    $dados['records']
    ?? null;

if ($lessonId === null) {
    primewayProfessorFrequenciaFalha(
        'Aula inválida.'
    );
}

if (!is_array($records)) {
    primewayProfessorFrequenciaFalha(
        'Envie a lista de frequência.'
    );
}

if (count($records) > 500) {
    primewayProfessorFrequenciaFalha(
        'A lista de frequência excede o limite permitido.'
    );
}

$permitidos = [
    'Presente',
    'Falta',
    'Justificada',
    'Atraso'
];

$normalizados =
    [];

$vistos =
    [];

foreach (
    $records
    as $indice => $item
) {

    if (!is_array($item)) {
        primewayProfessorFrequenciaFalha(
            'Registro de frequência inválido.'
        );
    }

    $enrollmentId =
        primewayIdPositivo(
            $item['enrollmentId']
            ?? null
        );

    $status =
        is_string(
            $item['status']
            ?? null
        )
            ? trim(
                $item['status']
            )
            : '';

    $observation =
        is_string(
            $item['observation']
            ?? null
        )
            ? trim(
                $item['observation']
            )
            : '';

    if ($enrollmentId === null) {
        primewayProfessorFrequenciaFalha(
            sprintf(
                'Matrícula inválida na posição %d.',
                $indice + 1
            )
        );
    }

    if (isset($vistos[$enrollmentId])) {
        primewayProfessorFrequenciaFalha(
            'A mesma matrícula foi enviada mais de uma vez.'
        );
    }

    $vistos[$enrollmentId] =
        true;

    if (
        !in_array(
            $status,
            $permitidos,
            true
        )
    ) {
        primewayProfessorFrequenciaFalha(
            'Situação de frequência inválida.'
        );
    }

    if (mb_strlen($observation) > 500) {
        primewayProfessorFrequenciaFalha(
            'A observação deve possuir no máximo 500 caracteres.'
        );
    }

    $normalizados[] = [
        'enrollmentId' =>
            $enrollmentId,

        'status' =>
            $status,

        'observation' =>
            $observation
    ];
}

try {

    $pdo =
        primewayPdo();

    $contexto =
        primewayProfessorContexto(
            $pdo,
            $usuario
        );

    $professorId =
        (int) $contexto[
            'profile'
        ][
            'professorId'
        ];

    $pdo->beginTransaction();

    $stmtAula =
        $pdo->prepare(
            "
                SELECT
                    au.id,
                    au.status,
                    td.turma_id

                FROM aulas au

                INNER JOIN turma_disciplinas td
                    ON td.id =
                       au.turma_disciplina_id

                WHERE au.id =
                    :aula_id

                  AND td.professor_id =
                    :professor_id

                  AND td.status = 'Ativa'

                LIMIT 1

                FOR UPDATE
            "
        );

    $stmtAula->execute([
        ':aula_id' =>
            $lessonId,

        ':professor_id' =>
            $professorId
    ]);

    $aula =
        $stmtAula->fetch();

    if (!$aula) {

        $pdo->rollBack();

        primewayProfessorFrequenciaFalha(
            'Aula não encontrada ou sem permissão.',
            404
        );
    }

    if (
        (string) $aula['status']
        ===
        'Cancelada'
    ) {

        $pdo->rollBack();

        primewayProfessorFrequenciaFalha(
            'Não é possível registrar frequência em uma aula cancelada.',
            409
        );
    }

    $stmtMatriculas =
        $pdo->prepare(
            "
                SELECT
                    id

                FROM matriculas

                WHERE turma_id =
                    :turma_id

                  AND situacao =
                    'Ativa'
            "
        );

    $stmtMatriculas->execute([
        ':turma_id' =>
            (int) $aula['turma_id']
    ]);

    $validas =
        [];

    foreach (
        $stmtMatriculas->fetchAll()
        as $row
    ) {
        $validas[
            (int) $row['id']
        ] = true;
    }

    foreach (
        $normalizados
        as $record
    ) {

        if (
            !isset(
                $validas[
                    $record['enrollmentId']
                ]
            )
        ) {

            $pdo->rollBack();

            primewayProfessorFrequenciaFalha(
                'Uma das matrículas não pertence à turma desta aula.',
                403
            );
        }
    }

    $stmtSalvar =
        $pdo->prepare(
            "
                INSERT INTO frequencias (
                    aula_id,
                    matricula_id,
                    situacao,
                    observacao,
                    registrado_em
                )
                VALUES (
                    :aula_id,
                    :matricula_id,
                    :situacao,
                    :observacao,
                    CURRENT_TIMESTAMP
                )

                ON DUPLICATE KEY UPDATE
                    situacao =
                        VALUES(situacao),

                    observacao =
                        VALUES(observacao),

                    registrado_em =
                        CURRENT_TIMESTAMP
            "
        );

    foreach (
        $normalizados
        as $record
    ) {

        $stmtSalvar->execute([
            ':aula_id' =>
                $lessonId,

            ':matricula_id' =>
                $record['enrollmentId'],

            ':situacao' =>
                $record['status'],

            ':observacao' =>
                $record['observation'] !== ''
                    ? $record['observation']
                    : null
        ]);
    }

    $stmtStatus =
        $pdo->prepare(
            "
                UPDATE aulas

                SET status = 'Realizada'

                WHERE id = :aula_id
                  AND status = 'Planejada'
            "
        );

    $stmtStatus->execute([
        ':aula_id' =>
            $lessonId
    ]);

    $pdo->commit();

    primewayResponderJson([
        'success' => true,
        'message' =>
            'Frequência salva com sucesso.',
        'saved' =>
            count($normalizados)
    ]);

} catch (Throwable $erro) {

    if (
        isset($pdo) &&
        $pdo instanceof PDO &&
        $pdo->inTransaction()
    ) {
        $pdo->rollBack();
    }

    error_log(
        'PrimeWay Professor Frequência POST: ' .
        $erro->getMessage()
    );

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível salvar a frequência.'
        ],
        500
    );
}
