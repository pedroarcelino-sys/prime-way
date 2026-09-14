<?php

declare(strict_types=1);

require_once __DIR__ . '/_atividade.php';


primewayExigirMetodo('POST');

$usuario =
    primewayExigirPerfis([
        'aluno'
    ]);

primewayExigirCsrf();


$dados =
    primewayLerJson();


$atividadeId =
    primewayIdPositivo(
        $dados['activityId']
        ?? null
    );


$comentario =
    trim(
        (string) (
            $dados['comment']
            ?? ''
        )
    );


if ($atividadeId === null) {

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Atividade inválida.'
        ],
        400
    );
}


if (
    $comentario === '' ||
    strlen($comentario) > 5000
) {

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Escreva um comentário válido.'
        ],
        422
    );
}


try {

    $pdo =
        primewayPdo();


    $contexto =
        primewayAtividadesContextoAluno(
            $pdo,
            $usuario
        );


    $matricula =
        $contexto['enrollment'];


    if ($matricula === null) {

        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'O aluno não possui matrícula ativa.'
            ],
            409
        );
    }


    $atividade =
        primewayObterAtividadeAluno(
            $pdo,
            $contexto,
            $atividadeId
        );


    if (
        (int) $atividade[
            'permite_comentarios'
        ] !== 1
    ) {

        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Os comentários estão desativados nesta atividade.'
            ],
            403
        );
    }


    $pdo->beginTransaction();


    $entrega =
        primewayObterEntregaAtividadeAluno(
            $pdo,
            (int) $matricula['id'],
            $atividadeId,
            true
        );


    /*
        Criamos uma entrega "Pendente" caso o aluno
        ainda não tenha iniciado a atividade.

        Isso permite que os comentários fiquem
        vinculados somente àquele aluno.
    */
    if ($entrega === null) {

        $stmt =
            $pdo->prepare(
                "INSERT INTO entregas_atividades (
                    atividade_id,
                    matricula_id,
                    status,
                    ultima_versao
                 )
                 VALUES (
                    :atividade_id,
                    :matricula_id,
                    'Pendente',
                    0
                 )"
            );


        $stmt->execute([
            ':atividade_id' =>
                $atividadeId,

            ':matricula_id' =>
                (int) $matricula['id']
        ]);


        $entregaId =
            (int) $pdo->lastInsertId();

    } else {

        $entregaId =
            (int) $entrega['id'];
    }


    $stmt =
        $pdo->prepare(
            "INSERT INTO atividade_comentarios (
                entrega_id,
                usuario_id,
                comentario
             )
             VALUES (
                :entrega_id,
                :usuario_id,
                :comentario
             )"
        );


    $stmt->execute([
        ':entrega_id' =>
            $entregaId,

        ':usuario_id' =>
            (int) $usuario['id'],

        ':comentario' =>
            $comentario
    ]);


    $comentarioId =
        (int) $pdo->lastInsertId();


    primewayAuditarAtividade(
        $pdo,
        (int) $usuario['id'],
        'COMENTAR_ATIVIDADE',
        $entregaId,
        'Aluno comentou em uma atividade.',
        null,
        [
            'commentId' =>
                $comentarioId
        ]
    );


    $pdo->commit();


    primewayResponderJson([
        'success' => true,

        'message' =>
            'Comentário enviado.',

        'comment' => [

            'id' =>
                $comentarioId,

            'author' => [

                'id' =>
                    (int) $usuario['id'],

                'name' =>
                    (string) $contexto[
                        'student'
                    ]['name'],

                'role' =>
                    'aluno'
            ],

            'text' =>
                $comentario,

            'createdAt' =>
                date('Y-m-d H:i:s'),

            'editedAt' =>
                null
        ]
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
        'PrimeWay Comentário Atividade: ' .
        $erro->getMessage()
    );


    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível enviar o comentário.'
        ],
        500
    );
}