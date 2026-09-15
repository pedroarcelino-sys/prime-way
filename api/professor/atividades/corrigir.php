<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';


primewayExigirMetodo('POST');

$usuario =
    primewayExigirPerfis([
        'professor'
    ]);

primewayExigirCsrf();


/*====================================================
                    JSON
====================================================*/

$dados =
    primewayLerJson();


$atividadeId =
    primewayIdPositivo(
        $dados['activityId']
        ?? null
    );


$entregaId =
    primewayIdPositivo(
        $dados['submissionId']
        ?? null
    );


$nota =
    isset(
        $dados['grade']
    )
        ? (float) $dados['grade']
        : null;


$valorMaximo =
    isset(
        $dados['maximum']
    )
        ? (float) $dados['maximum']
        : null;


$feedback =
    trim(
        (string) (
            $dados['feedback']
            ?? ''
        )
    );


/*====================================================
                    VALIDAR
====================================================*/

if (
    $atividadeId === null ||
    $entregaId === null
) {

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Atividade ou entrega inválida.'
        ],
        400
    );
}


if (
    $nota === null ||
    !is_finite($nota)
) {

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Informe uma nota válida.'
        ],
        400
    );
}


if (
    $valorMaximo === null ||
    !is_finite($valorMaximo) ||
    $valorMaximo <= 0
) {

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Informe um valor máximo válido.'
        ],
        400
    );
}


if (
    $nota < 0 ||
    $nota > $valorMaximo
) {

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'A nota deve estar entre 0 e o valor máximo.'
        ],
        400
    );
}


if (
    strlen($feedback) >
    5000
) {

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'O feedback é muito longo.'
        ],
        400
    );
}


/*====================================================
                    PROCESSAR
====================================================*/

try {

    $pdo =
        primewayPdo();


    $pdo->beginTransaction();


    /*================================================
                    PROFESSOR
    ================================================*/

    $stmtProfessor =
        $pdo->prepare(
            "SELECT
                pr.id

             FROM usuarios u

             INNER JOIN pessoas pe
                ON pe.id =
                   u.pessoa_id

             INNER JOIN professores pr
                ON pr.pessoa_id =
                   pe.id

             WHERE
                u.id =
                :usuario_id

             LIMIT 1"
        );


    $stmtProfessor->execute([
        ':usuario_id' =>
            (int) $usuario['id']
    ]);


    $professor =
        $stmtProfessor->fetch();


    if (!$professor) {

        $pdo->rollBack();


        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Esta conta não está vinculada a um professor.'
            ],
            404
        );
    }


    $professorId =
        (int) $professor['id'];


    /*================================================
            ENTREGA + AUTORIZAÇÃO
    ================================================*/

    $stmtEntrega =
        $pdo->prepare(
            "SELECT

                ea.id,
                ea.matricula_id,
                ea.status AS entrega_status,

                atv.id AS atividade_id,
                atv.titulo,
                atv.turma_disciplina_id,
                atv.periodo_letivo_id,

                td.professor_id

             FROM entregas_atividades ea

             INNER JOIN atividades atv
                ON atv.id =
                   ea.atividade_id

             INNER JOIN turma_disciplinas td
                ON td.id =
                   atv.turma_disciplina_id

             WHERE
                ea.id =
                :entrega_id

                AND
                atv.id =
                :atividade_id

                AND
                td.professor_id =
                :professor_id

             LIMIT 1

             FOR UPDATE"
        );


    $stmtEntrega->execute([
        ':entrega_id' =>
            $entregaId,

        ':atividade_id' =>
            $atividadeId,

        ':professor_id' =>
            $professorId
    ]);


    $entrega =
        $stmtEntrega->fetch();


    if (!$entrega) {

        $pdo->rollBack();


        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Entrega não encontrada ou acesso não autorizado.'
            ],
            404
        );
    }


    /*================================================
                STATUS DA ENTREGA
    ================================================*/

    $statusPermitidos = [
        'Entregue',
        'Atrasada',
        'Reenviada',
        'Corrigida'
    ];


    if (
        !in_array(
            (string) $entrega[
                'entrega_status'
            ],
            $statusPermitidos,
            true
        )
    ) {

        $pdo->rollBack();


        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Esta entrega ainda não pode ser corrigida.'
            ],
            409
        );
    }


    $matriculaId =
        (int) $entrega[
            'matricula_id'
        ];


    /*================================================
                    AVALIAÇÃO
    ================================================*/

    $stmtAvaliacao =
        $pdo->prepare(
            "SELECT
                id,
                valor_maximo

             FROM avaliacoes

             WHERE
                atividade_id =
                :atividade_id

                AND
                status <>
                'Cancelada'

             ORDER BY
                id DESC

             LIMIT 1

             FOR UPDATE"
        );


    $stmtAvaliacao->execute([
        ':atividade_id' =>
            $atividadeId
    ]);


    $avaliacao =
        $stmtAvaliacao->fetch();


    /*================================================
            CRIAR AVALIAÇÃO SE NÃO EXISTIR
    ================================================*/

    if (!$avaliacao) {

        $stmtCriarAvaliacao =
            $pdo->prepare(
                "INSERT INTO avaliacoes (

                    turma_disciplina_id,
                    periodo_letivo_id,
                    atividade_id,
                    titulo,
                    descricao,
                    tipo,
                    valor_maximo,
                    peso,
                    data_avaliacao,
                    status

                 ) VALUES (

                    :turma_disciplina_id,
                    :periodo_letivo_id,
                    :atividade_id,
                    :titulo,
                    :descricao,
                    'Atividade',
                    :valor_maximo,
                    1.00,
                    CURRENT_DATE,
                    'Finalizada'
                 )"
            );


        $stmtCriarAvaliacao->execute([
            ':turma_disciplina_id' =>
                (int) $entrega[
                    'turma_disciplina_id'
                ],

            ':periodo_letivo_id' =>
                (int) $entrega[
                    'periodo_letivo_id'
                ],

            ':atividade_id' =>
                $atividadeId,

            ':titulo' =>
                (string) $entrega[
                    'titulo'
                ],

            ':descricao' =>
                'Avaliação gerada automaticamente pela correção da atividade.',

            ':valor_maximo' =>
                $valorMaximo
        ]);


        $avaliacaoId =
            (int) $pdo->lastInsertId();


    } else {

        $avaliacaoId =
            (int) $avaliacao[
                'id'
            ];


        /*============================================
            ATUALIZAR VALOR MÁXIMO
        ============================================*/

        $stmtAtualizarAvaliacao =
            $pdo->prepare(
                "UPDATE avaliacoes

                 SET
                    valor_maximo =
                        :valor_maximo,

                    status =
                        'Finalizada',

                    atualizado_em =
                        CURRENT_TIMESTAMP

                 WHERE
                    id =
                    :avaliacao_id"
            );


        $stmtAtualizarAvaliacao->execute([
            ':valor_maximo' =>
                $valorMaximo,

            ':avaliacao_id' =>
                $avaliacaoId
        ]);
    }


    /*================================================
                    NOTA
    ================================================*/

    $stmtNota =
        $pdo->prepare(
            "INSERT INTO notas (

                avaliacao_id,
                matricula_id,
                valor,
                observacao,
                lancada_em

             ) VALUES (

                :avaliacao_id,
                :matricula_id,
                :valor,
                :observacao,
                CURRENT_TIMESTAMP

             )

             ON DUPLICATE KEY UPDATE

                valor =
                    VALUES(valor),

                observacao =
                    VALUES(observacao),

                lancada_em =
                    CURRENT_TIMESTAMP,

                atualizado_em =
                    CURRENT_TIMESTAMP"
        );


    $stmtNota->execute([
        ':avaliacao_id' =>
            $avaliacaoId,

        ':matricula_id' =>
            $matriculaId,

        ':valor' =>
            $nota,

        ':observacao' =>
            $feedback !== ''
                ? $feedback
                : null
    ]);


    /*================================================
                CORRIGIR ENTREGA
    ================================================*/

    $stmtCorrigir =
        $pdo->prepare(
            "UPDATE entregas_atividades

             SET

                status =
                    'Corrigida',

                corrigida_em =
                    CURRENT_TIMESTAMP,

                corrigido_por_professor_id =
                    :professor_id,

                correcao_publicada_em =
                    CURRENT_TIMESTAMP,

                feedback =
                    :feedback,

                atualizado_em =
                    CURRENT_TIMESTAMP

             WHERE
                id =
                :entrega_id"
        );


    $stmtCorrigir->execute([
        ':professor_id' =>
            $professorId,

        ':feedback' =>
            $feedback !== ''
                ? $feedback
                : null,

        ':entrega_id' =>
            $entregaId
    ]);


    /*================================================
                    COMMIT
    ================================================*/

    $pdo->commit();


    primewayResponderJson(
        [
            'success' =>
                true,

            'message' =>
                'Correção publicada com sucesso.',

            'correction' => [

                'submissionId' =>
                    $entregaId,

                'evaluationId' =>
                    $avaliacaoId,

                'status' =>
                    'Corrigida',

                'grade' =>
                    round(
                        $nota,
                        2
                    ),

                'maximum' =>
                    round(
                        $valorMaximo,
                        2
                    ),

                'normalized' =>
                    round(
                        (
                            $nota /
                            $valorMaximo
                        ) * 10,
                        1
                    ),

                'feedback' =>
                    $feedback
            ]
        ]
    );


} catch (Throwable $erro) {

    if (
        isset($pdo) &&
        $pdo instanceof PDO &&
        $pdo->inTransaction()
    ) {

        $pdo->rollBack();
    }


    error_log(
        'PrimeWay Professor Corrigir Atividade: ' .
        $erro->getMessage()
    );


    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível publicar a correção.'
        ],
        500
    );
}