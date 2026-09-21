<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';


primewayExigirMetodo('POST');

$usuario =
    primewayExigirPerfis([
        'professor'
    ]);

primewayExigirCsrf();

$dados =
    primewayLerJson();


/*====================================================
                FUNÇÕES AUXILIARES
====================================================*/

function primewayProfessorNotasFalha(
    string $mensagem,
    int $status = 400
): never {

    primewayResponderJson(
        [
            'success' => false,
            'message' => $mensagem
        ],
        $status
    );
}


function primewayProfessorNotasTexto(
    mixed $valor
): string {

    return is_string($valor)
        ? trim($valor)
        : '';
}


function primewayProfessorNotasDecimal(
    mixed $valor,
    string $campo
): float {

    if (
        is_string($valor)
    ) {
        $valor =
            str_replace(
                ',',
                '.',
                trim($valor)
            );
    }


    if (
        $valor === '' ||
        $valor === null ||
        !is_numeric($valor)
    ) {

        primewayProfessorNotasFalha(
            sprintf(
                '%s inválido.',
                $campo
            ),
            422
        );
    }


    $numero =
        round(
            (float) $valor,
            2
        );


    if (
        !is_finite($numero)
    ) {

        primewayProfessorNotasFalha(
            sprintf(
                '%s inválido.',
                $campo
            ),
            422
        );
    }


    return $numero;
}


function primewayProfessorNotasData(
    mixed $valor
): ?string {

    if (
        $valor === null ||
        $valor === ''
    ) {
        return null;
    }


    if (
        !is_string($valor)
    ) {

        primewayProfessorNotasFalha(
            'Data da avaliação inválida.',
            422
        );
    }


    $valor =
        trim($valor);


    $data =
        DateTimeImmutable::createFromFormat(
            '!Y-m-d',
            $valor
        );


    if (
        $data === false ||
        $data->format('Y-m-d') !== $valor
    ) {

        primewayProfessorNotasFalha(
            'Data da avaliação inválida.',
            422
        );
    }


    return $valor;
}


/*====================================================
                    CAMPOS
====================================================*/

$idInformado =
    $dados['id'] ??
    null;

$id =
    primewayIdPositivo(
        $idInformado
    );


if (
    $idInformado !== null &&
    $idInformado !== '' &&
    $id === null
) {

    primewayProfessorNotasFalha(
        'Identificador da avaliação inválido.',
        422
    );
}


$turmaDisciplinaId =
    primewayIdPositivo(
        $dados[
            'classSubjectId'
        ] ??
        null
    );


$periodoId =
    primewayIdPositivo(
        $dados[
            'periodId'
        ] ??
        null
    );


$atividadeIdInformada =
    $dados[
        'activityId'
    ] ??
    null;


$atividadeId =
    primewayIdPositivo(
        $atividadeIdInformada
    );


if (
    $atividadeIdInformada !== null &&
    $atividadeIdInformada !== '' &&
    $atividadeId === null
) {

    primewayProfessorNotasFalha(
        'Identificador da atividade inválido.',
        422
    );
}


$titulo =
    primewayProfessorNotasTexto(
        $dados[
            'title'
        ] ??
        ''
    );


$descricao =
    primewayProfessorNotasTexto(
        $dados[
            'description'
        ] ??
        ''
    );


$tipo =
    primewayProfessorNotasTexto(
        $dados[
            'type'
        ] ??
        ''
    );


$status =
    primewayProfessorNotasTexto(
        $dados[
            'status'
        ] ??
        'Planejada'
    );


$valorMaximo =
    primewayProfessorNotasDecimal(
        $dados[
            'maximumValue'
        ] ??
        null,
        'Valor máximo'
    );


$peso =
    primewayProfessorNotasDecimal(
        $dados[
            'weight'
        ] ??
        1,
        'Peso'
    );


$dataAvaliacao =
    primewayProfessorNotasData(
        $dados[
            'date'
        ] ??
        null
    );


/*====================================================
                    VALIDAÇÃO
====================================================*/

if (
    $turmaDisciplinaId === null
) {

    primewayProfessorNotasFalha(
        'Selecione a turma e a disciplina.',
        422
    );
}


if (
    $periodoId === null
) {

    primewayProfessorNotasFalha(
        'Selecione o período letivo.',
        422
    );
}


if (
    $titulo === ''
) {

    primewayProfessorNotasFalha(
        'Informe o título da avaliação.',
        422
    );
}


if (
    mb_strlen($titulo) >
    190
) {

    primewayProfessorNotasFalha(
        'O título deve possuir no máximo 190 caracteres.',
        422
    );
}


if (
    mb_strlen($descricao) >
    5000
) {

    primewayProfessorNotasFalha(
        'A descrição está muito longa.',
        422
    );
}


$tiposPermitidos = [
    'Prova',
    'Trabalho',
    'Atividade',
    'Projeto',
    'Recuperação',
    'Outro'
];


if (
    !in_array(
        $tipo,
        $tiposPermitidos,
        true
    )
) {

    primewayProfessorNotasFalha(
        'Tipo de avaliação inválido.',
        422
    );
}


$statusPermitidos = [
    'Planejada',
    'Aplicada',
    'Finalizada',
    'Cancelada'
];


if (
    !in_array(
        $status,
        $statusPermitidos,
        true
    )
) {

    primewayProfessorNotasFalha(
        'Status da avaliação inválido.',
        422
    );
}


if (
    $valorMaximo <= 0 ||
    $valorMaximo > 9999.99
) {

    primewayProfessorNotasFalha(
        'O valor máximo deve ser maior que zero e menor ou igual a 9999,99.',
        422
    );
}


if (
    $peso <= 0 ||
    $peso > 9999.99
) {

    primewayProfessorNotasFalha(
        'O peso deve ser maior que zero e menor ou igual a 9999,99.',
        422
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
                PROFESSOR LOGADO
    ================================================*/

    $stmtProfessor =
        $pdo->prepare(
            "
                SELECT
                    pr.id AS professor_id

                FROM usuarios u

                INNER JOIN pessoas pe
                    ON pe.id = u.pessoa_id

                INNER JOIN professores pr
                    ON pr.pessoa_id = pe.id

                WHERE u.id = :usuario_id
                  AND u.perfil = 'professor'
                  AND u.ativo = 1
                  AND pr.status = 'ativo'

                LIMIT 1

                FOR UPDATE
            "
        );


    $stmtProfessor->execute([
        ':usuario_id' =>
            (int) $usuario['id']
    ]);


    $professor =
        $stmtProfessor->fetch();


    if (!$professor) {

        $pdo->rollBack();

        primewayProfessorNotasFalha(
            'Professor não encontrado ou inativo.',
            404
        );
    }


    $professorId =
        (int) $professor[
            'professor_id'
        ];


    /*================================================
                VALIDAR VÍNCULO
    ================================================*/

    $stmtVinculo =
        $pdo->prepare(
            "
                SELECT
                    td.id,
                    td.turma_id,
                    td.disciplina_id,

                    t.ano_letivo_id,
                    t.nome AS turma_nome,

                    d.nome AS disciplina_nome

                FROM turma_disciplinas td

                INNER JOIN turmas t
                    ON t.id = td.turma_id

                INNER JOIN disciplinas d
                    ON d.id = td.disciplina_id

                WHERE td.id = :turma_disciplina_id
                  AND td.professor_id = :professor_id
                  AND td.status = 'Ativa'
                  AND t.status = 'Ativa'
                  AND d.status = 'Ativa'

                LIMIT 1

                FOR UPDATE
            "
        );


    $stmtVinculo->execute([
        ':turma_disciplina_id' =>
            $turmaDisciplinaId,

        ':professor_id' =>
            $professorId
    ]);


    $vinculo =
        $stmtVinculo->fetch();


    if (!$vinculo) {

        $pdo->rollBack();

        primewayProfessorNotasFalha(
            'Você não possui vínculo ativo com esta turma e disciplina.',
            403
        );
    }


    /*================================================
                VALIDAR PERÍODO
    ================================================*/

    $stmtPeriodo =
        $pdo->prepare(
            "
                SELECT
                    id,
                    nome,
                    ano_letivo_id,
                    data_inicio,
                    data_fim

                FROM periodos_letivos

                WHERE id = :periodo_id

                LIMIT 1

                FOR UPDATE
            "
        );


    $stmtPeriodo->execute([
        ':periodo_id' =>
            $periodoId
    ]);


    $periodo =
        $stmtPeriodo->fetch();


    if (!$periodo) {

        $pdo->rollBack();

        primewayProfessorNotasFalha(
            'Período letivo não encontrado.',
            404
        );
    }


    if (
        (int) $periodo[
            'ano_letivo_id'
        ] !==
        (int) $vinculo[
            'ano_letivo_id'
        ]
    ) {

        $pdo->rollBack();

        primewayProfessorNotasFalha(
            'O período selecionado não pertence ao mesmo ano letivo da turma.',
            422
        );
    }


    if (
        $dataAvaliacao !== null &&
        (
            $dataAvaliacao <
                (string) $periodo[
                    'data_inicio'
                ] ||
            $dataAvaliacao >
                (string) $periodo[
                    'data_fim'
                ]
        )
    ) {

        $pdo->rollBack();

        primewayProfessorNotasFalha(
            'A data da avaliação precisa estar dentro do período letivo selecionado.',
            422
        );
    }


    /*================================================
                VALIDAR ATIVIDADE
    ================================================*/

    if (
        $atividadeId !== null
    ) {

        $stmtAtividade =
            $pdo->prepare(
                "
                    SELECT
                        atv.id

                    FROM atividades atv

                    INNER JOIN turma_disciplinas td
                        ON td.id =
                           atv.turma_disciplina_id

                    WHERE atv.id =
                        :atividade_id

                      AND atv.turma_disciplina_id =
                        :turma_disciplina_id

                      AND atv.periodo_letivo_id =
                        :periodo_id

                      AND td.professor_id =
                        :professor_id

                    LIMIT 1

                    FOR UPDATE
                "
            );


        $stmtAtividade->execute([
            ':atividade_id' =>
                $atividadeId,

            ':turma_disciplina_id' =>
                $turmaDisciplinaId,

            ':periodo_id' =>
                $periodoId,

            ':professor_id' =>
                $professorId
        ]);


        if (
            !$stmtAtividade->fetch()
        ) {

            $pdo->rollBack();

            primewayProfessorNotasFalha(
                'A atividade vinculada não pertence à mesma turma, disciplina e período.',
                422
            );
        }
    }


    /*================================================
                AVALIAÇÃO EXISTENTE
    ================================================*/

    $avaliacaoAnterior =
        null;


    if (
        $id !== null
    ) {

        $stmtAvaliacao =
            $pdo->prepare(
                "
                    SELECT
                        av.*,
                        td.turma_id

                    FROM avaliacoes av

                    INNER JOIN turma_disciplinas td
                        ON td.id =
                           av.turma_disciplina_id

                    WHERE av.id =
                        :avaliacao_id

                      AND td.professor_id =
                        :professor_id

                    LIMIT 1

                    FOR UPDATE
                "
            );


        $stmtAvaliacao->execute([
            ':avaliacao_id' =>
                $id,

            ':professor_id' =>
                $professorId
        ]);


        $avaliacaoAnterior =
            $stmtAvaliacao->fetch();


        if (!$avaliacaoAnterior) {

            $pdo->rollBack();

            primewayProfessorNotasFalha(
                'Avaliação não encontrada.',
                404
            );
        }


        $stmtResumoNotas =
            $pdo->prepare(
                "
                    SELECT
                        COUNT(*) AS total,
                        MAX(valor) AS maior_nota

                    FROM notas

                    WHERE avaliacao_id =
                        :avaliacao_id
                "
            );


        $stmtResumoNotas->execute([
            ':avaliacao_id' =>
                $id
        ]);


        $resumoNotas =
            $stmtResumoNotas->fetch()
            ?: [
                'total' => 0,
                'maior_nota' => null
            ];


        $totalNotas =
            (int) $resumoNotas[
                'total'
            ];


        if (
            $totalNotas > 0 &&
            (int) $avaliacaoAnterior[
                'turma_disciplina_id'
            ] !==
            $turmaDisciplinaId
        ) {

            $pdo->rollBack();

            primewayProfessorNotasFalha(
                'Não é possível trocar a turma e disciplina de uma avaliação que já possui notas.',
                409
            );
        }


        if (
            $resumoNotas[
                'maior_nota'
            ] !== null &&
            $valorMaximo <
                (float) $resumoNotas[
                    'maior_nota'
                ]
        ) {

            $pdo->rollBack();

            primewayProfessorNotasFalha(
                'O novo valor máximo não pode ser menor que uma nota já lançada.',
                409
            );
        }
    }


    /*================================================
                        INSERT
    ================================================*/

    if (
        $id === null
    ) {

        $stmtSalvar =
            $pdo->prepare(
                "
                    INSERT INTO avaliacoes (
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
                    )
                    VALUES (
                        :turma_disciplina_id,
                        :periodo_letivo_id,
                        :atividade_id,
                        :titulo,
                        :descricao,
                        :tipo,
                        :valor_maximo,
                        :peso,
                        :data_avaliacao,
                        :status
                    )
                "
            );


        $stmtSalvar->execute([
            ':turma_disciplina_id' =>
                $turmaDisciplinaId,

            ':periodo_letivo_id' =>
                $periodoId,

            ':atividade_id' =>
                $atividadeId,

            ':titulo' =>
                $titulo,

            ':descricao' =>
                $descricao !== ''
                    ? $descricao
                    : null,

            ':tipo' =>
                $tipo,

            ':valor_maximo' =>
                number_format(
                    $valorMaximo,
                    2,
                    '.',
                    ''
                ),

            ':peso' =>
                number_format(
                    $peso,
                    2,
                    '.',
                    ''
                ),

            ':data_avaliacao' =>
                $dataAvaliacao,

            ':status' =>
                $status
        ]);


        $id =
            (int) $pdo->lastInsertId();


        $mensagem =
            'Avaliação criada com sucesso.';

    } else {

        /*================================================
                        UPDATE
        ================================================*/

        $stmtSalvar =
            $pdo->prepare(
                "
                    UPDATE avaliacoes

                    SET
                        turma_disciplina_id =
                            :turma_disciplina_id,

                        periodo_letivo_id =
                            :periodo_letivo_id,

                        atividade_id =
                            :atividade_id,

                        titulo =
                            :titulo,

                        descricao =
                            :descricao,

                        tipo =
                            :tipo,

                        valor_maximo =
                            :valor_maximo,

                        peso =
                            :peso,

                        data_avaliacao =
                            :data_avaliacao,

                        status =
                            :status

                    WHERE id =
                        :avaliacao_id
                "
            );


        $stmtSalvar->execute([
            ':turma_disciplina_id' =>
                $turmaDisciplinaId,

            ':periodo_letivo_id' =>
                $periodoId,

            ':atividade_id' =>
                $atividadeId,

            ':titulo' =>
                $titulo,

            ':descricao' =>
                $descricao !== ''
                    ? $descricao
                    : null,

            ':tipo' =>
                $tipo,

            ':valor_maximo' =>
                number_format(
                    $valorMaximo,
                    2,
                    '.',
                    ''
                ),

            ':peso' =>
                number_format(
                    $peso,
                    2,
                    '.',
                    ''
                ),

            ':data_avaliacao' =>
                $dataAvaliacao,

            ':status' =>
                $status,

            ':avaliacao_id' =>
                $id
        ]);


        $mensagem =
            'Avaliação atualizada com sucesso.';
    }


    $pdo->commit();


    primewayResponderJson(
        [
            'success' =>
                true,

            'message' =>
                $mensagem,

            'evaluationId' =>
                $id
        ],
        $avaliacaoAnterior === null
            ? 201
            : 200
    );


} catch (
    Throwable $erro
) {

    if (
        isset($pdo) &&
        $pdo instanceof PDO &&
        $pdo->inTransaction()
    ) {
        $pdo->rollBack();
    }


    error_log(
        'PrimeWay Professor Avaliação POST: ' .
        $erro->getMessage()
    );


    primewayResponderJson(
        [
            'success' =>
                false,

            'message' =>
                'Não foi possível salvar a avaliação.'
        ],
        500
    );
}
