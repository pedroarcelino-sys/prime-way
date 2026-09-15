<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';


/*====================================================
        SALVAR ATIVIDADE DO PROFESSOR
====================================================*/

primewayExigirMetodo(
    'POST'
);


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

function primewayProfessorAtividadeTexto(
    mixed $valor
): string {

    return is_string($valor)
        ? trim($valor)
        : '';
}


function primewayProfessorAtividadeFalha(
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


function primewayProfessorAtividadeBooleano(
    mixed $valor,
    bool $padrao = false
): bool {

    if ($valor === null) {
        return $padrao;
    }

    if (is_bool($valor)) {
        return $valor;
    }

    if (
        $valor === 1 ||
        $valor === '1'
    ) {
        return true;
    }

    if (
        $valor === 0 ||
        $valor === '0'
    ) {
        return false;
    }

    return $padrao;
}


function primewayProfessorAtividadeDataHora(
    mixed $valor
): ?string {

    if (
        $valor === null ||
        $valor === ''
    ) {
        return null;
    }

    if (!is_string($valor)) {

        primewayProfessorAtividadeFalha(
            'Data e hora inválidas.',
            422
        );
    }

    $valor =
        trim($valor);

    $formatos = [
        'Y-m-d\TH:i',
        'Y-m-d\TH:i:s',
        'Y-m-d H:i',
        'Y-m-d H:i:s'
    ];

    foreach (
        $formatos
        as $formato
    ) {

        $data =
            DateTimeImmutable::createFromFormat(
                '!' . $formato,
                $valor
            );

        if (
            $data !== false &&
            $data->format($formato) === $valor
        ) {

            return $data->format(
                'Y-m-d H:i:s'
            );
        }
    }

    primewayProfessorAtividadeFalha(
        'Data e hora inválidas.',
        422
    );
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

    primewayProfessorAtividadeFalha(
        'Identificador da atividade inválido.'
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


$titulo =
    primewayProfessorAtividadeTexto(
        $dados[
            'title'
        ] ??
        ''
    );


$descricao =
    primewayProfessorAtividadeTexto(
        $dados[
            'description'
        ] ??
        ''
    );


$instrucoes =
    primewayProfessorAtividadeTexto(
        $dados[
            'instructions'
        ] ??
        ''
    );


$tipoEntrega =
    primewayProfessorAtividadeTexto(
        $dados[
            'submissionType'
        ] ??
        'Livre'
    );


$statusRecebido =
    primewayProfessorAtividadeTexto(
        $dados[
            'status'
        ] ??
        'Rascunho'
    );


$dataPublicacao =
    primewayProfessorAtividadeDataHora(
        $dados[
            'publishAt'
        ] ??
        null
    );


$dataEntrega =
    primewayProfessorAtividadeDataHora(
        $dados[
            'dueAt'
        ] ??
        null
    );


$permiteAtraso =
    primewayProfessorAtividadeBooleano(
        $dados[
            'allowsLateSubmission'
        ] ??
        null,
        false
    );


$permiteReenvio =
    primewayProfessorAtividadeBooleano(
        $dados[
            'allowsResubmission'
        ] ??
        null,
        true
    );


$permiteComentarios =
    primewayProfessorAtividadeBooleano(
        $dados[
            'allowsComments'
        ] ??
        null,
        true
    );


$maxArquivos =
    filter_var(
        $dados[
            'maxFiles'
        ] ??
        5,
        FILTER_VALIDATE_INT
    );


$tamanhoMaximoArquivoMb =
    filter_var(
        $dados[
            'maxFileSizeMb'
        ] ??
        20,
        FILTER_VALIDATE_INT
    );


/*====================================================
                    VALIDAÇÃO
====================================================*/

if ($turmaDisciplinaId === null) {

    primewayProfessorAtividadeFalha(
        'Selecione a turma e a disciplina.',
        422
    );
}


if ($periodoId === null) {

    primewayProfessorAtividadeFalha(
        'Selecione o período letivo.',
        422
    );
}


if ($titulo === '') {

    primewayProfessorAtividadeFalha(
        'Informe o título da atividade.',
        422
    );
}


if (
    mb_strlen($titulo) >
    190
) {

    primewayProfessorAtividadeFalha(
        'O título deve possuir no máximo 190 caracteres.',
        422
    );
}


$tiposEntregaPermitidos = [
    'Texto',
    'Arquivo',
    'Texto e arquivo',
    'Link',
    'Livre'
];


if (
    !in_array(
        $tipoEntrega,
        $tiposEntregaPermitidos,
        true
    )
) {

    primewayProfessorAtividadeFalha(
        'Tipo de entrega inválido.',
        422
    );
}


$statusPermitidos = [
    'Rascunho',
    'Agendada',
    'Publicada'
];


if (
    !in_array(
        $statusRecebido,
        $statusPermitidos,
        true
    )
) {

    primewayProfessorAtividadeFalha(
        'Status da atividade inválido.',
        422
    );
}


if (
    $maxArquivos === false ||
    $maxArquivos < 1 ||
    $maxArquivos > 10
) {

    primewayProfessorAtividadeFalha(
        'A quantidade máxima de arquivos deve ficar entre 1 e 10.',
        422
    );
}


if (
    $tamanhoMaximoArquivoMb === false ||
    $tamanhoMaximoArquivoMb < 1 ||
    $tamanhoMaximoArquivoMb > 100
) {

    primewayProfessorAtividadeFalha(
        'O tamanho máximo por arquivo deve ficar entre 1 MB e 100 MB.',
        422
    );
}


/*====================================================
            REGRAS DE PUBLICAÇÃO
====================================================*/

$agora =
    new DateTimeImmutable();


if (
    $statusRecebido ===
    'Publicada'
) {

    if (
        $dataPublicacao ===
        null
    ) {

        $dataPublicacao =
            $agora->format(
                'Y-m-d H:i:s'
            );

    } else {

        $publicacao =
            new DateTimeImmutable(
                $dataPublicacao
            );

        if (
            $publicacao >
            $agora
        ) {

            primewayProfessorAtividadeFalha(
                'Para uma publicação futura, utilize o status Agendada.',
                422
            );
        }
    }
}


if (
    $statusRecebido ===
    'Agendada'
) {

    if (
        $dataPublicacao ===
        null
    ) {

        primewayProfessorAtividadeFalha(
            'Informe a data de publicação da atividade agendada.',
            422
        );
    }

    $publicacao =
        new DateTimeImmutable(
            $dataPublicacao
        );

    if (
        $publicacao <=
        $agora
    ) {

        primewayProfessorAtividadeFalha(
            'A publicação agendada precisa ser uma data futura.',
            422
        );
    }
}


if (
    $dataPublicacao !== null &&
    $dataEntrega !== null
) {

    $publicacao =
        new DateTimeImmutable(
            $dataPublicacao
        );

    $entrega =
        new DateTimeImmutable(
            $dataEntrega
        );

    if (
        $entrega <
        $publicacao
    ) {

        primewayProfessorAtividadeFalha(
            'A data de entrega não pode ser anterior à publicação.',
            422
        );
    }
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
            (int) $usuario[
                'id'
            ]
    ]);


    $professor =
        $stmtProfessor->fetch();


    if (!$professor) {

        $pdo->rollBack();

        primewayProfessorAtividadeFalha(
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

                    t.nome AS turma_nome,
                    t.ano_letivo_id,

                    d.nome AS disciplina_nome

                FROM turma_disciplinas td

                INNER JOIN turmas t
                    ON t.id =
                       td.turma_id

                INNER JOIN disciplinas d
                    ON d.id =
                       td.disciplina_id

                WHERE td.id =
                    :turma_disciplina_id

                  AND td.professor_id =
                    :professor_id

                  AND td.status =
                    'Ativa'

                  AND t.status =
                    'Ativa'

                  AND d.status =
                    'Ativa'

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

        primewayProfessorAtividadeFalha(
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
                    ano_letivo_id

                FROM periodos_letivos

                WHERE id =
                    :periodo_id

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

        primewayProfessorAtividadeFalha(
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

        primewayProfessorAtividadeFalha(
            'O período selecionado não pertence ao mesmo ano letivo da turma.',
            422
        );
    }


    /*================================================
                ATIVIDADE EXISTENTE
    ================================================*/

    $atividadeAnterior =
        null;


    if (
        $id !== null
    ) {

        $stmtExistente =
            $pdo->prepare(
                "
                    SELECT
                        atv.*

                    FROM atividades atv

                    INNER JOIN turma_disciplinas td
                        ON td.id =
                           atv.turma_disciplina_id

                    WHERE atv.id =
                        :atividade_id

                      AND td.professor_id =
                        :professor_id

                    LIMIT 1

                    FOR UPDATE
                "
            );


        $stmtExistente->execute([
            ':atividade_id' =>
                $id,

            ':professor_id' =>
                $professorId
        ]);


        $atividadeAnterior =
            $stmtExistente->fetch();


        if (!$atividadeAnterior) {

            $pdo->rollBack();

            primewayProfessorAtividadeFalha(
                'Atividade não encontrada.',
                404
            );
        }


        if (
            in_array(
                (string) $atividadeAnterior[
                    'status'
                ],
                [
                    'Encerrada',
                    'Cancelada'
                ],
                true
            )
        ) {

            $pdo->rollBack();

            primewayProfessorAtividadeFalha(
                'Uma atividade encerrada ou cancelada não pode ser alterada.',
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
                    INSERT INTO atividades (
                        turma_disciplina_id,
                        periodo_letivo_id,
                        criado_por_usuario_id,
                        titulo,
                        descricao,
                        instrucoes,
                        tipo_entrega,
                        data_publicacao,
                        data_entrega,
                        permite_atraso,
                        permite_reenvio,
                        permite_comentarios,
                        max_arquivos,
                        tamanho_maximo_arquivo_mb,
                        status
                    )
                    VALUES (
                        :turma_disciplina_id,
                        :periodo_letivo_id,
                        :criado_por_usuario_id,
                        :titulo,
                        :descricao,
                        :instrucoes,
                        :tipo_entrega,
                        :data_publicacao,
                        :data_entrega,
                        :permite_atraso,
                        :permite_reenvio,
                        :permite_comentarios,
                        :max_arquivos,
                        :tamanho_maximo_arquivo_mb,
                        :status
                    )
                "
            );


        $stmtSalvar->execute([

            ':turma_disciplina_id' =>
                $turmaDisciplinaId,

            ':periodo_letivo_id' =>
                $periodoId,

            ':criado_por_usuario_id' =>
                (int) $usuario['id'],

            ':titulo' =>
                $titulo,

            ':descricao' =>
                $descricao !== ''
                    ? $descricao
                    : null,

            ':instrucoes' =>
                $instrucoes !== ''
                    ? $instrucoes
                    : null,

            ':tipo_entrega' =>
                $tipoEntrega,

            ':data_publicacao' =>
                $dataPublicacao,

            ':data_entrega' =>
                $dataEntrega,

            ':permite_atraso' =>
                $permiteAtraso
                    ? 1
                    : 0,

            ':permite_reenvio' =>
                $permiteReenvio
                    ? 1
                    : 0,

            ':permite_comentarios' =>
                $permiteComentarios
                    ? 1
                    : 0,

            ':max_arquivos' =>
                $maxArquivos,

            ':tamanho_maximo_arquivo_mb' =>
                $tamanhoMaximoArquivoMb,

            ':status' =>
                $statusRecebido
        ]);


        $id =
            (int) $pdo->lastInsertId();


        $mensagem =
            $statusRecebido === 'Publicada'
                ? 'Atividade publicada com sucesso.'
                : (
                    $statusRecebido === 'Agendada'
                        ? 'Atividade agendada com sucesso.'
                        : 'Rascunho salvo com sucesso.'
                );

    } else {

        /*================================================
                        UPDATE
        ================================================*/

        $stmtSalvar =
            $pdo->prepare(
                "
                    UPDATE atividades

                    SET
                        turma_disciplina_id =
                            :turma_disciplina_id,

                        periodo_letivo_id =
                            :periodo_letivo_id,

                        titulo =
                            :titulo,

                        descricao =
                            :descricao,

                        instrucoes =
                            :instrucoes,

                        tipo_entrega =
                            :tipo_entrega,

                        data_publicacao =
                            :data_publicacao,

                        data_entrega =
                            :data_entrega,

                        permite_atraso =
                            :permite_atraso,

                        permite_reenvio =
                            :permite_reenvio,

                        permite_comentarios =
                            :permite_comentarios,

                        max_arquivos =
                            :max_arquivos,

                        tamanho_maximo_arquivo_mb =
                            :tamanho_maximo_arquivo_mb,

                        status =
                            :status

                    WHERE id =
                        :atividade_id
                "
            );


        $stmtSalvar->execute([

            ':turma_disciplina_id' =>
                $turmaDisciplinaId,

            ':periodo_letivo_id' =>
                $periodoId,

            ':titulo' =>
                $titulo,

            ':descricao' =>
                $descricao !== ''
                    ? $descricao
                    : null,

            ':instrucoes' =>
                $instrucoes !== ''
                    ? $instrucoes
                    : null,

            ':tipo_entrega' =>
                $tipoEntrega,

            ':data_publicacao' =>
                $dataPublicacao,

            ':data_entrega' =>
                $dataEntrega,

            ':permite_atraso' =>
                $permiteAtraso
                    ? 1
                    : 0,

            ':permite_reenvio' =>
                $permiteReenvio
                    ? 1
                    : 0,

            ':permite_comentarios' =>
                $permiteComentarios
                    ? 1
                    : 0,

            ':max_arquivos' =>
                $maxArquivos,

            ':tamanho_maximo_arquivo_mb' =>
                $tamanhoMaximoArquivoMb,

            ':status' =>
                $statusRecebido,

            ':atividade_id' =>
                $id
        ]);


        $mensagem =
            'Atividade atualizada com sucesso.';
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
                $mensagem,

            'activityId' =>
                $id
        ],
        $atividadeAnterior === null
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
        'PrimeWay Professor Atividades POST: ' .
        $erro->getMessage()
    );


    primewayResponderJson(
        [
            'success' =>
                false,

            'message' =>
                'Não foi possível salvar a atividade.'
        ],
        500
    );
}