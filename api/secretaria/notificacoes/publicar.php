<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';

primewayExigirMetodo('POST');

$usuario =
    primewayExigirPerfis([
        'secretaria'
    ]);

primewayExigirCsrf();

$dados =
    primewayLerJson();

function primewaySecretariaNotificacaoFalha(
    string $mensagem,
    int $status = 422
): never {

    primewayResponderJson([
        'success' =>
            false,

        'message' =>
            $mensagem
    ], $status);
}

$title =
    trim(
        (string) (
            $dados['title']
            ?? ''
        )
    );

$type =
    trim(
        (string) (
            $dados['type']
            ?? 'Comunicado'
        )
    );

$audience =
    trim(
        (string) (
            $dados['audience']
            ?? ''
        )
    );

$message =
    trim(
        (string) (
            $dados['message']
            ?? ''
        )
    );

$classId =
    primewayIdPositivo(
        $dados['classId']
        ?? null
    );

if ($title === '') {
    primewaySecretariaNotificacaoFalha(
        'Informe o título do comunicado.'
    );
}

if (
    mb_strlen(
        $title
    ) > 190
) {
    primewaySecretariaNotificacaoFalha(
        'O título deve possuir no máximo 190 caracteres.'
    );
}

if ($message === '') {
    primewaySecretariaNotificacaoFalha(
        'Digite a mensagem do comunicado.'
    );
}

if (
    mb_strlen(
        $message
    ) > 10000
) {
    primewaySecretariaNotificacaoFalha(
        'A mensagem está muito longa.'
    );
}

if (
    $type === ''
    ||
    mb_strlen(
        $type
    ) > 60
) {
    primewaySecretariaNotificacaoFalha(
        'Tipo de comunicado inválido.'
    );
}

$audiencesAllowed = [
    'all',
    'students',
    'guardians',
    'professors',
    'class_students',
    'class_guardians',
    'class_both'
];

if (
    !in_array(
        $audience,
        $audiencesAllowed,
        true
    )
) {
    primewaySecretariaNotificacaoFalha(
        'Público do comunicado inválido.'
    );
}

$classAudiences = [
    'class_students',
    'class_guardians',
    'class_both'
];

if (
    in_array(
        $audience,
        $classAudiences,
        true
    )
    &&
    $classId === null
) {
    primewaySecretariaNotificacaoFalha(
        'Selecione uma turma.'
    );
}

try {

    $pdo =
        primewayPdo();

    $class = null;

    if (
        in_array(
            $audience,
            $classAudiences,
            true
        )
    ) {

        $stmtClass =
            $pdo->prepare(
                "
                    SELECT
                        t.id,
                        t.nome

                    FROM turmas t

                    INNER JOIN anos_letivos al
                        ON al.id =
                            t.ano_letivo_id

                    WHERE t.id =
                        :turma_id

                      AND t.status =
                        'Ativa'

                      AND al.ativo =
                        1

                    LIMIT 1
                "
            );

        $stmtClass->execute([
            ':turma_id' =>
                $classId
        ]);

        $class =
            $stmtClass->fetch();

        if (!$class) {
            primewaySecretariaNotificacaoFalha(
                'A turma selecionada não está ativa no ano letivo atual.',
                409
            );
        }
    }

    $recipients = [];

    /*====================================================
                    TODOS
    ====================================================*/

    if ($audience === 'all') {

        $stmtUsers =
            $pdo->prepare(
                "
                    SELECT id
                    FROM usuarios
                    WHERE ativo = 1
                      AND id <> :usuario_id
                      AND perfil IN (
                            'admin',
                            'professor',
                            'secretaria',
                            'aluno',
                            'responsavel'
                      )
                "
            );

        $stmtUsers->execute([
            ':usuario_id' =>
                (int) $usuario['id']
        ]);

        foreach (
            $stmtUsers->fetchAll()
            as $row
        ) {
            $recipients[
                (int) $row['id']
            ] = true;
        }
    }

    /*====================================================
                    ALUNOS DA ESCOLA
    ====================================================*/

    if ($audience === 'students') {

        $stmtUsers =
            $pdo->query(
                "
                    SELECT DISTINCT
                        u.id

                    FROM usuarios u

                    INNER JOIN pessoas pe
                        ON pe.id = u.pessoa_id
                       AND pe.ativo = 1

                    INNER JOIN alunos a
                        ON a.pessoa_id = pe.id
                       AND a.status = 'ativo'

                    WHERE u.perfil = 'aluno'
                      AND u.ativo = 1
                "
            );

        foreach (
            $stmtUsers->fetchAll()
            as $row
        ) {
            $recipients[
                (int) $row['id']
            ] = true;
        }
    }

    /*====================================================
                    RESPONSÁVEIS DA ESCOLA
    ====================================================*/

    if ($audience === 'guardians') {

        $stmtUsers =
            $pdo->query(
                "
                    SELECT DISTINCT
                        u.id

                    FROM usuarios u

                    INNER JOIN pessoas pe
                        ON pe.id = u.pessoa_id
                       AND pe.ativo = 1

                    INNER JOIN responsaveis r
                        ON r.pessoa_id = pe.id
                       AND r.status <> 'inativo'

                    WHERE u.perfil = 'responsavel'
                      AND u.ativo = 1
                "
            );

        foreach (
            $stmtUsers->fetchAll()
            as $row
        ) {
            $recipients[
                (int) $row['id']
            ] = true;
        }
    }

    /*====================================================
                    PROFESSORES
    ====================================================*/

    if ($audience === 'professors') {

        $stmtUsers =
            $pdo->query(
                "
                    SELECT DISTINCT
                        u.id

                    FROM usuarios u

                    INNER JOIN pessoas pe
                        ON pe.id = u.pessoa_id
                       AND pe.ativo = 1

                    INNER JOIN professores p
                        ON p.pessoa_id = pe.id
                       AND p.status = 'ativo'

                    WHERE u.perfil = 'professor'
                      AND u.ativo = 1
                "
            );

        foreach (
            $stmtUsers->fetchAll()
            as $row
        ) {
            $recipients[
                (int) $row['id']
            ] = true;
        }
    }

    /*====================================================
                    ALUNOS DA TURMA
    ====================================================*/

    if (
        $audience === 'class_students'
        ||
        $audience === 'class_both'
    ) {

        $stmtStudents =
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

        $stmtStudents->execute([
            ':turma_id' =>
                $classId
        ]);

        foreach (
            $stmtStudents->fetchAll()
            as $row
        ) {
            $recipients[
                (int) $row['id']
            ] = true;
        }
    }

    /*====================================================
                    RESPONSÁVEIS DA TURMA
    ====================================================*/

    if (
        $audience === 'class_guardians'
        ||
        $audience === 'class_both'
    ) {

        $stmtGuardians =
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

        $stmtGuardians->execute([
            ':turma_id' =>
                $classId
        ]);

        foreach (
            $stmtGuardians->fetchAll()
            as $row
        ) {
            $recipients[
                (int) $row['id']
            ] = true;
        }
    }

    if ($recipients === []) {
        primewaySecretariaNotificacaoFalha(
            'Não existem destinatários ativos para este comunicado.',
            409
        );
    }

    $public =
        match ($audience) {
            'all' =>
                'Todos',

            'students' =>
                'Alunos',

            'guardians' =>
                'Responsáveis',

            'professors' =>
                'Professores',

            'class_students' =>
                'Alunos da turma ' .
                (string) $class['nome'],

            'class_guardians' =>
                'Responsáveis da turma ' .
                (string) $class['nome'],

            default =>
                'Alunos e responsáveis da turma ' .
                (string) $class['nome']
        };

    $pdo->beginTransaction();

    $stmtCreate =
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
                    'Secretaria',
                    'Publicada',
                    CURRENT_TIMESTAMP
                )
            "
        );

    $stmtCreate->execute([
        ':usuario_id' =>
            (int) $usuario['id'],

        ':titulo' =>
            $title,

        ':tipo' =>
            $type,

        ':publico' =>
            $public,

        ':mensagem' =>
            $message
    ]);

    $notificationId =
        (int) $pdo->lastInsertId();

    $stmtRecipient =
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
            $recipients
        )
        as $recipientId
    ) {

        $stmtRecipient->execute([
            ':notificacao_id' =>
                $notificationId,

            ':usuario_id' =>
                (int) $recipientId
        ]);
    }

    $stmtAudit =
        $pdo->prepare(
            "
                INSERT INTO auditoria (
                    usuario_id,
                    acao,
                    entidade,
                    registro_id,
                    descricao,
                    dados_novos
                )
                VALUES (
                    :usuario_id,
                    'PUBLICAR_NOTIFICACAO_SECRETARIA',
                    'notificacoes',
                    :registro_id,
                    'Comunicado publicado pela Secretaria.',
                    :dados_novos
                )
            "
        );

    $stmtAudit->execute([
        ':usuario_id' =>
            (int) $usuario['id'],

        ':registro_id' =>
            $notificationId,

        ':dados_novos' =>
            json_encode(
                [
                    'titulo' =>
                        $title,

                    'tipo' =>
                        $type,

                    'publico' =>
                        $public,

                    'destinatarios' =>
                        count(
                            $recipients
                        )
                ],
                JSON_UNESCAPED_UNICODE
            )
    ]);

    $pdo->commit();

    primewayResponderJson([
        'success' =>
            true,

        'message' =>
            'Comunicado publicado com sucesso.',

        'notificationId' =>
            $notificationId,

        'recipients' =>
            count(
                $recipients
            )
    ], 201);

} catch (Throwable $erro) {

    if (
        isset($pdo)
        &&
        $pdo instanceof PDO
        &&
        $pdo->inTransaction()
    ) {
        $pdo->rollBack();
    }

    error_log(
        'PrimeWay Secretaria Notificação Publicar POST: ' .
        $erro->getMessage()
    );

    primewayResponderJson([
        'success' =>
            false,

        'message' =>
            'Não foi possível publicar o comunicado.'
    ], 500);
}
