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

function primewayProfessorAulaFalha(
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

$id =
    primewayIdPositivo(
        $dados['id']
        ?? null
    );

$criando =
    $id === null;

$classSubjectId =
    primewayIdPositivo(
        $dados['classSubjectId']
        ?? null
    );

$periodId =
    primewayIdPositivo(
        $dados['periodId']
        ?? null
    );

$date =
    is_string(
        $dados['date']
        ?? null
    )
        ? trim(
            $dados['date']
        )
        : '';

$startTime =
    is_string(
        $dados['startTime']
        ?? null
    )
        ? trim(
            $dados['startTime']
        )
        : '';

$endTime =
    is_string(
        $dados['endTime']
        ?? null
    )
        ? trim(
            $dados['endTime']
        )
        : '';

$content =
    is_string(
        $dados['content']
        ?? null
    )
        ? trim(
            $dados['content']
        )
        : '';

$notes =
    is_string(
        $dados['notes']
        ?? null
    )
        ? trim(
            $dados['notes']
        )
        : '';

$status =
    is_string(
        $dados['status']
        ?? null
    )
        ? trim(
            $dados['status']
        )
        : 'Planejada';

if ($classSubjectId === null) {
    primewayProfessorAulaFalha(
        'Selecione a turma e a disciplina.'
    );
}

if ($periodId === null) {
    primewayProfessorAulaFalha(
        'Selecione o período letivo.'
    );
}

$dataObj =
    DateTimeImmutable::createFromFormat(
        '!Y-m-d',
        $date
    );

if (
    !$dataObj ||
    $dataObj->format('Y-m-d') !==
        $date
) {
    primewayProfessorAulaFalha(
        'Data da aula inválida.'
    );
}

foreach (
    [
        'startTime' =>
            $startTime,

        'endTime' =>
            $endTime
    ]
    as $nome => $valor
) {

    if ($valor === '') {
        continue;
    }

    $hora =
        DateTimeImmutable::createFromFormat(
            '!H:i',
            $valor
        );

    if (
        !$hora ||
        $hora->format('H:i') !==
            $valor
    ) {
        primewayProfessorAulaFalha(
            $nome === 'startTime'
                ? 'Horário inicial inválido.'
                : 'Horário final inválido.'
        );
    }
}

if (
    $startTime !== '' &&
    $endTime !== '' &&
    $endTime <= $startTime
) {
    primewayProfessorAulaFalha(
        'O horário final precisa ser posterior ao horário inicial.'
    );
}

if (mb_strlen($content) > 5000) {
    primewayProfessorAulaFalha(
        'O conteúdo da aula está muito longo.'
    );
}

if (mb_strlen($notes) > 5000) {
    primewayProfessorAulaFalha(
        'As observações estão muito longas.'
    );
}

$statusPermitidos = [
    'Planejada',
    'Realizada',
    'Cancelada'
];

if (
    !in_array(
        $status,
        $statusPermitidos,
        true
    )
) {
    primewayProfessorAulaFalha(
        'Status da aula inválido.'
    );
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

    $stmtVinculo =
        $pdo->prepare(
            "
                SELECT
                    td.id,
                    t.ano_letivo_id

                FROM turma_disciplinas td

                INNER JOIN turmas t
                    ON t.id = td.turma_id

                WHERE td.id =
                    :turma_disciplina_id

                  AND td.professor_id =
                    :professor_id

                  AND td.status = 'Ativa'
                  AND t.status = 'Ativa'

                LIMIT 1
            "
        );

    $stmtVinculo->execute([
        ':turma_disciplina_id' =>
            $classSubjectId,

        ':professor_id' =>
            $professorId
    ]);

    $vinculo =
        $stmtVinculo->fetch();

    if (!$vinculo) {
        primewayProfessorAulaFalha(
            'Você não possui vínculo com esta turma e disciplina.',
            403
        );
    }

    $stmtPeriodo =
        $pdo->prepare(
            "
                SELECT
                    id,
                    ano_letivo_id,
                    data_inicio,
                    data_fim

                FROM periodos_letivos

                WHERE id =
                    :periodo_id

                LIMIT 1
            "
        );

    $stmtPeriodo->execute([
        ':periodo_id' =>
            $periodId
    ]);

    $periodo =
        $stmtPeriodo->fetch();

    if (
        !$periodo ||
        (int) $periodo['ano_letivo_id']
        !==
        (int) $vinculo['ano_letivo_id']
    ) {
        primewayProfessorAulaFalha(
            'Período letivo incompatível com a turma.'
        );
    }

    if (
        $date <
            (string) $periodo['data_inicio']
        ||
        $date >
            (string) $periodo['data_fim']
    ) {
        primewayProfessorAulaFalha(
            'A data da aula precisa estar dentro do período selecionado.'
        );
    }

    if ($id !== null) {

        $stmtExistente =
            $pdo->prepare(
                "
                    SELECT
                        au.id,
                        au.turma_disciplina_id,

                        (
                            SELECT COUNT(*)

                            FROM frequencias f

                            WHERE f.aula_id = au.id
                        ) AS frequencias_lancadas

                    FROM aulas au

                    INNER JOIN turma_disciplinas td
                        ON td.id =
                           au.turma_disciplina_id

                    WHERE au.id =
                        :aula_id

                      AND td.professor_id =
                        :professor_id

                    LIMIT 1
                "
            );

        $stmtExistente->execute([
            ':aula_id' =>
                $id,

            ':professor_id' =>
                $professorId
        ]);

        $aulaExistente =
            $stmtExistente->fetch();

        if (!$aulaExistente) {
            primewayProfessorAulaFalha(
                'Aula não encontrada.',
                404
            );
        }

        if (
            (int) $aulaExistente['frequencias_lancadas'] > 0
            &&
            (int) $aulaExistente['turma_disciplina_id'] !==
                $classSubjectId
        ) {
            primewayProfessorAulaFalha(
                'Não é possível trocar a turma e disciplina de uma aula que já possui frequência registrada.',
                409
            );
        }

        $stmtSalvar =
            $pdo->prepare(
                "
                    UPDATE aulas

                    SET
                        turma_disciplina_id =
                            :turma_disciplina_id,

                        periodo_letivo_id =
                            :periodo_id,

                        data_aula =
                            :data_aula,

                        horario_inicio =
                            :horario_inicio,

                        horario_fim =
                            :horario_fim,

                        conteudo =
                            :conteudo,

                        observacoes =
                            :observacoes,

                        status =
                            :status

                    WHERE id =
                        :aula_id
                "
            );

        $stmtSalvar->execute([
            ':turma_disciplina_id' =>
                $classSubjectId,

            ':periodo_id' =>
                $periodId,

            ':data_aula' =>
                $date,

            ':horario_inicio' =>
                $startTime !== ''
                    ? $startTime
                    : null,

            ':horario_fim' =>
                $endTime !== ''
                    ? $endTime
                    : null,

            ':conteudo' =>
                $content !== ''
                    ? $content
                    : null,

            ':observacoes' =>
                $notes !== ''
                    ? $notes
                    : null,

            ':status' =>
                $status,

            ':aula_id' =>
                $id
        ]);

        $message =
            'Aula atualizada com sucesso.';

    } else {

        $stmtSalvar =
            $pdo->prepare(
                "
                    INSERT INTO aulas (
                        turma_disciplina_id,
                        periodo_letivo_id,
                        data_aula,
                        horario_inicio,
                        horario_fim,
                        conteudo,
                        observacoes,
                        status
                    )
                    VALUES (
                        :turma_disciplina_id,
                        :periodo_id,
                        :data_aula,
                        :horario_inicio,
                        :horario_fim,
                        :conteudo,
                        :observacoes,
                        :status
                    )
                "
            );

        $stmtSalvar->execute([
            ':turma_disciplina_id' =>
                $classSubjectId,

            ':periodo_id' =>
                $periodId,

            ':data_aula' =>
                $date,

            ':horario_inicio' =>
                $startTime !== ''
                    ? $startTime
                    : null,

            ':horario_fim' =>
                $endTime !== ''
                    ? $endTime
                    : null,

            ':conteudo' =>
                $content !== ''
                    ? $content
                    : null,

            ':observacoes' =>
                $notes !== ''
                    ? $notes
                    : null,

            ':status' =>
                $status
        ]);

        $id =
            (int) $pdo->lastInsertId();

        $message =
            'Aula criada com sucesso.';
    }

    primewayResponderJson(
        [
            'success' => true,
            'message' =>
                $message,
            'lessonId' =>
                $id
        ],
        $criando
            ? 201
            : 200
    );

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Professor Aula POST: ' .
        $erro->getMessage()
    );

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível salvar a aula.'
        ],
        500
    );
}
