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

function primewayProfessorNotificacaoFalha(
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

$classId =
    primewayIdPositivo(
        $dados['classId']
        ?? null
    );

$title =
    is_string(
        $dados['title']
        ?? null
    )
        ? trim(
            $dados['title']
        )
        : '';

$type =
    is_string(
        $dados['type']
        ?? null
    )
        ? trim(
            $dados['type']
        )
        : 'Comunicado';

$audience =
    is_string(
        $dados['audience']
        ?? null
    )
        ? trim(
            $dados['audience']
        )
        : '';

$message =
    is_string(
        $dados['message']
        ?? null
    )
        ? trim(
            $dados['message']
        )
        : '';

if ($classId === null) {
    primewayProfessorNotificacaoFalha(
        'Selecione uma turma.'
    );
}

if ($title === '') {
    primewayProfessorNotificacaoFalha(
        'Informe o título do comunicado.'
    );
}

if (mb_strlen($title) > 190) {
    primewayProfessorNotificacaoFalha(
        'O título deve possuir no máximo 190 caracteres.'
    );
}

if ($message === '') {
    primewayProfessorNotificacaoFalha(
        'Digite a mensagem do comunicado.'
    );
}

if (mb_strlen($message) > 10000) {
    primewayProfessorNotificacaoFalha(
        'A mensagem está muito longa.'
    );
}

if (mb_strlen($type) > 60) {
    primewayProfessorNotificacaoFalha(
        'Tipo de comunicado inválido.'
    );
}

$audienciasPermitidas = [
    'students',
    'guardians',
    'students_guardians'
];

if (
    !in_array(
        $audience,
        $audienciasPermitidas,
        true
    )
) {
    primewayProfessorNotificacaoFalha(
        'Público do comunicado inválido.'
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

    $anoId =
        (int) (
            $contexto[
                'schoolYear'
            ][
                'id'
            ]
            ?? 0
        );

    $stmtTurma =
        $pdo->prepare(
            "
                SELECT
                    t.id,
                    t.nome

                FROM turmas t

                LEFT JOIN turma_disciplinas td
                    ON td.turma_id = t.id
                   AND td.professor_id =
                       :professor_disciplina
                   AND td.status = 'Ativa'

                WHERE t.id =
                    :turma_id

                  AND t.ano_letivo_id =
                    :ano_letivo_id

                  AND t.status = 'Ativa'

                  AND (
                        t.professor_id =
                            :professor_regente

                        OR

                        td.professor_id =
                            :professor_filtro
                      )

                LIMIT 1
            "
        );

    $stmtTurma->execute([
        ':professor_disciplina' =>
            $professorId,

        ':turma_id' =>
            $classId,

        ':ano_letivo_id' =>
            $anoId,

        ':professor_regente' =>
            $professorId,

        ':professor_filtro' =>
            $professorId
    ]);

    $turma =
        $stmtTurma->fetch();

    if (!$turma) {
        primewayProfessorNotificacaoFalha(
            'Você não possui permissão para comunicar esta turma.',
            403
        );
    }

    $destinatarios =
        [];

    if (
        $audience === 'students'
        ||
        $audience ===
            'students_guardians'
    ) {

        $stmtAlunos =
            $pdo->prepare(
                "
                    SELECT DISTINCT
                        u.id

                    FROM matriculas m

                    INNER JOIN alunos a
                        ON a.id = m.aluno_id
                       AND a.status = 'ativo'

                    INNER JOIN pessoas pe
                        ON pe.id = a.pessoa_id
                       AND pe.ativo = 1

                    INNER JOIN usuarios u
                        ON u.pessoa_id = pe.id
                       AND u.perfil = 'aluno'
                       AND u.ativo = 1

                    WHERE m.turma_id =
                        :turma_id

                      AND m.situacao =
                        'Ativa'
                "
            );

        $stmtAlunos->execute([
            ':turma_id' =>
                $classId
        ]);

        foreach (
            $stmtAlunos->fetchAll()
            as $row
        ) {
            $destinatarios[
                (int) $row['id']
            ] = true;
        }
    }

    if (
        $audience === 'guardians'
        ||
        $audience ===
            'students_guardians'
    ) {

        $stmtResponsaveis =
            $pdo->prepare(
                "
                    SELECT DISTINCT
                        u.id

                    FROM matriculas m

                    INNER JOIN aluno_responsavel ar
                        ON ar.aluno_id = m.aluno_id
                       AND ar.ativo = 1

                    INNER JOIN responsaveis r
                        ON r.id = ar.responsavel_id
                       AND r.status <> 'inativo'

                    INNER JOIN pessoas pe
                        ON pe.id = r.pessoa_id
                       AND pe.ativo = 1

                    INNER JOIN usuarios u
                        ON u.pessoa_id = pe.id
                       AND u.perfil = 'responsavel'
                       AND u.ativo = 1

                    WHERE m.turma_id =
                        :turma_id

                      AND m.situacao =
                        'Ativa'
                "
            );

        $stmtResponsaveis->execute([
            ':turma_id' =>
                $classId
        ]);

        foreach (
            $stmtResponsaveis->fetchAll()
            as $row
        ) {
            $destinatarios[
                (int) $row['id']
            ] = true;
        }
    }

    if ($destinatarios === []) {
        primewayProfessorNotificacaoFalha(
            'Não existem destinatários ativos para este comunicado.',
            409
        );
    }

    $publico =
        match ($audience) {
            'students' =>
                'Alunos da turma',

            'guardians' =>
                'Responsáveis da turma',

            default =>
                'Alunos e responsáveis da turma'
        };

    $pdo->beginTransaction();

    $stmtCriar =
        $pdo->prepare(
            "
                INSERT INTO notificacoes (
                    criado_por_usuario_id,
                    titulo,
                    tipo,
                    publico,
                    mensagem,
                    origem,
                    status,
                    publicada_em
                )
                VALUES (
                    :usuario_id,
                    :titulo,
                    :tipo,
                    :publico,
                    :mensagem,
                    'Manual',
                    'Publicada',
                    CURRENT_TIMESTAMP
                )
            "
        );

    $stmtCriar->execute([
        ':usuario_id' =>
            (int) $usuario['id'],

        ':titulo' =>
            $title,

        ':tipo' =>
            $type,

        ':publico' =>
            $publico,

        ':mensagem' =>
            $message
    ]);

    $notificationId =
        (int) $pdo->lastInsertId();

    $stmtDestinatario =
        $pdo->prepare(
            "
                INSERT INTO notificacao_destinatarios (
                    notificacao_id,
                    usuario_id,
                    recebida_em
                )
                VALUES (
                    :notificacao_id,
                    :usuario_id,
                    CURRENT_TIMESTAMP
                )
            "
        );

    foreach (
        array_keys(
            $destinatarios
        )
        as $destinatarioId
    ) {

        $stmtDestinatario->execute([
            ':notificacao_id' =>
                $notificationId,

            ':usuario_id' =>
                (int) $destinatarioId
        ]);
    }

    $pdo->commit();

    primewayResponderJson(
        [
            'success' => true,
            'message' =>
                'Comunicado publicado com sucesso.',
            'notificationId' =>
                $notificationId,
            'recipients' =>
                count($destinatarios)
        ],
        201
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
        'PrimeWay Professor Notificação Publicar POST: ' .
        $erro->getMessage()
    );

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível publicar o comunicado.'
        ],
        500
    );
}
