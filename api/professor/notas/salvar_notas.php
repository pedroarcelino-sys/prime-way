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

function primewayLancamentoNotasFalha(
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


function primewayLancamentoNotasTexto(
    mixed $valor
): string {

    return is_string($valor)
        ? trim($valor)
        : '';
}


function primewayLancamentoNotasValor(
    mixed $valor
): ?float {

    if (
        $valor === null ||
        $valor === ''
    ) {
        return null;
    }


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
        !is_numeric($valor)
    ) {

        primewayLancamentoNotasFalha(
            'Uma das notas informadas é inválida.',
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

        primewayLancamentoNotasFalha(
            'Uma das notas informadas é inválida.',
            422
        );
    }


    return $numero;
}


/*====================================================
                    CAMPOS
====================================================*/

$avaliacaoId =
    primewayIdPositivo(
        $dados[
            'evaluationId'
        ] ??
        null
    );


if (
    $avaliacaoId === null
) {

    primewayLancamentoNotasFalha(
        'Avaliação inválida.',
        422
    );
}


$notasRecebidas =
    $dados[
        'grades'
    ] ??
    null;


if (
    !is_array($notasRecebidas)
) {

    primewayLancamentoNotasFalha(
        'Envie a lista de notas.',
        422
    );
}


if (
    count($notasRecebidas) >
    500
) {

    primewayLancamentoNotasFalha(
        'A lista de notas excede o limite permitido.',
        422
    );
}


/*====================================================
                NORMALIZAR ENTRADAS
====================================================*/

$notas =
    [];

$matriculasVistas =
    [];


foreach (
    $notasRecebidas
    as $indice => $item
) {

    if (
        !is_array($item)
    ) {

        primewayLancamentoNotasFalha(
            sprintf(
                'Registro de nota inválido na posição %d.',
                $indice + 1
            ),
            422
        );
    }


    $matriculaId =
        primewayIdPositivo(
            $item[
                'enrollmentId'
            ] ??
            null
        );


    if (
        $matriculaId === null
    ) {

        primewayLancamentoNotasFalha(
            sprintf(
                'Matrícula inválida na posição %d.',
                $indice + 1
            ),
            422
        );
    }


    if (
        isset(
            $matriculasVistas[
                $matriculaId
            ]
        )
    ) {

        primewayLancamentoNotasFalha(
            'A mesma matrícula foi enviada mais de uma vez.',
            422
        );
    }


    $matriculasVistas[
        $matriculaId
    ] =
        true;


    $valor =
        primewayLancamentoNotasValor(
            $item[
                'value'
            ] ??
            null
        );


    $observacao =
        primewayLancamentoNotasTexto(
            $item[
                'observation'
            ] ??
            ''
        );


    if (
        mb_strlen($observacao) >
        2000
    ) {

        primewayLancamentoNotasFalha(
            'A observação de uma nota deve possuir no máximo 2000 caracteres.',
            422
        );
    }


    $notas[] = [

        'enrollmentId' =>
            $matriculaId,

        'value' =>
            $valor,

        'observation' =>
            $observacao
    ];
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

        primewayLancamentoNotasFalha(
            'Professor não encontrado ou inativo.',
            404
        );
    }


    $professorId =
        (int) $professor[
            'professor_id'
        ];


    /*================================================
                AVALIAÇÃO / AUTORIZAÇÃO
    ================================================*/

    $stmtAvaliacao =
        $pdo->prepare(
            "
                SELECT
                    av.id,
                    av.turma_disciplina_id,
                    av.titulo,
                    av.valor_maximo,
                    av.status,

                    td.turma_id

                FROM avaliacoes av

                INNER JOIN turma_disciplinas td
                    ON td.id =
                       av.turma_disciplina_id

                WHERE av.id =
                    :avaliacao_id

                  AND td.professor_id =
                    :professor_id

                  AND td.status =
                    'Ativa'

                LIMIT 1

                FOR UPDATE
            "
        );


    $stmtAvaliacao->execute([
        ':avaliacao_id' =>
            $avaliacaoId,

        ':professor_id' =>
            $professorId
    ]);


    $avaliacao =
        $stmtAvaliacao->fetch();


    if (!$avaliacao) {

        $pdo->rollBack();

        primewayLancamentoNotasFalha(
            'Avaliação não encontrada ou sem permissão de acesso.',
            404
        );
    }


    if (
        (string) $avaliacao[
            'status'
        ] ===
        'Cancelada'
    ) {

        $pdo->rollBack();

        primewayLancamentoNotasFalha(
            'Não é possível lançar notas em uma avaliação cancelada.',
            409
        );
    }


    $valorMaximo =
        (float) $avaliacao[
            'valor_maximo'
        ];


    /*================================================
                MATRÍCULAS VÁLIDAS
    ================================================*/

    $stmtMatriculas =
        $pdo->prepare(
            "
                SELECT
                    m.id

                FROM matriculas m

                WHERE m.turma_id =
                    :turma_id

                  AND m.situacao =
                    'Ativa'
            "
        );


    $stmtMatriculas->execute([
        ':turma_id' =>
            (int) $avaliacao[
                'turma_id'
            ]
    ]);


    $matriculasValidas =
        [];


    foreach (
        $stmtMatriculas->fetchAll()
        as $linha
    ) {

        $matriculasValidas[
            (int) $linha['id']
        ] =
            true;
    }


    foreach (
        $notas
        as $nota
    ) {

        if (
            !isset(
                $matriculasValidas[
                    $nota[
                        'enrollmentId'
                    ]
                ]
            )
        ) {

            $pdo->rollBack();

            primewayLancamentoNotasFalha(
                'Uma das matrículas não pertence à turma desta avaliação.',
                403
            );
        }


        if (
            $nota['value'] !== null &&
            (
                $nota['value'] < 0 ||
                $nota['value'] >
                    $valorMaximo
            )
        ) {

            $pdo->rollBack();

            primewayLancamentoNotasFalha(
                sprintf(
                    'As notas devem ficar entre 0 e %.2f.',
                    $valorMaximo
                ),
                422
            );
        }
    }


    /*================================================
                    PREPARED STATEMENTS
    ================================================*/

    $stmtSalvar =
        $pdo->prepare(
            "
                INSERT INTO notas (
                    avaliacao_id,
                    matricula_id,
                    valor,
                    observacao,
                    lancada_em
                )
                VALUES (
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
                        CURRENT_TIMESTAMP
            "
        );


    $stmtExcluir =
        $pdo->prepare(
            "
                DELETE FROM notas

                WHERE avaliacao_id =
                    :avaliacao_id

                  AND matricula_id =
                    :matricula_id
            "
        );


    $salvas =
        0;

    $removidas =
        0;


    /*================================================
                    SALVAR / REMOVER
    ================================================*/

    foreach (
        $notas
        as $nota
    ) {

        if (
            $nota['value'] === null
        ) {

            $stmtExcluir->execute([
                ':avaliacao_id' =>
                    $avaliacaoId,

                ':matricula_id' =>
                    $nota[
                        'enrollmentId'
                    ]
            ]);


            if (
                $stmtExcluir->rowCount() > 0
            ) {
                $removidas++;
            }


            continue;
        }


        $stmtSalvar->execute([
            ':avaliacao_id' =>
                $avaliacaoId,

            ':matricula_id' =>
                $nota[
                    'enrollmentId'
                ],

            ':valor' =>
                number_format(
                    $nota['value'],
                    2,
                    '.',
                    ''
                ),

            ':observacao' =>
                $nota[
                    'observation'
                ] !== ''
                    ? $nota[
                        'observation'
                    ]
                    : null
        ]);


        $salvas++;
    }


    $pdo->commit();


    primewayResponderJson([
        'success' =>
            true,

        'message' =>
            'Notas salvas com sucesso.',

        'evaluationId' =>
            $avaliacaoId,

        'saved' =>
            $salvas,

        'removed' =>
            $removidas
    ]);


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
        'PrimeWay Professor Notas POST: ' .
        $erro->getMessage()
    );


    primewayResponderJson(
        [
            'success' =>
                false,

            'message' =>
                'Não foi possível salvar as notas.'
        ],
        500
    );
}
