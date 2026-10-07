<?php

declare(strict_types=1);
require_once __DIR__.'/../../notificacoes/_notificacoes.php';

require_once __DIR__ . '/../../_bootstrap.php';
require_once __DIR__ . '/../_contexto.php';

primewayExigirMetodo('GET');

$usuario =
    primewayExigirPerfis([
        'professor'
    ]);

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

    $usuarioId =
        (int) $usuario['id'];

    $anoId =
        (int) (
            $contexto[
                'schoolYear'
            ][
                'id'
            ]
            ?? 0
        );

    $classes =
        [];

    if ($anoId > 0) {

        $stmtTurmas =
            $pdo->prepare(
                "
                    SELECT DISTINCT
                        t.id,
                        t.nome,
                        t.serie,
                        t.turno

                    FROM turmas t

                    LEFT JOIN turma_disciplinas td
                        ON td.turma_id = t.id
                       AND td.professor_id =
                           :professor_disciplina
                       AND td.status = 'Ativa'

                    WHERE t.ano_letivo_id =
                        :ano_letivo_id

                      AND t.status = 'Ativa'

                      AND (
                            t.professor_id =
                                :professor_regente

                            OR

                            td.professor_id =
                                :professor_filtro
                          )

                    ORDER BY t.nome ASC
                "
            );

        $stmtTurmas->execute([
            ':professor_disciplina' =>
                $professorId,

            ':ano_letivo_id' =>
                $anoId,

            ':professor_regente' =>
                $professorId,

            ':professor_filtro' =>
                $professorId
        ]);

        $classes =
            array_map(
                static fn (
                    array $row
                ): array => [
                    'id' =>
                        (int) $row['id'],

                    'name' =>
                        (string) $row['nome'],

                    'series' =>
                        (string) $row['serie'],

                    'shift' =>
                        (string) $row['turno']
                ],
                $stmtTurmas->fetchAll()
            );
    }

    $inbox=primewayNotificationList($pdo,$usuario,$_GET);

    $stmtSent =
        $pdo->prepare(
            "
                SELECT
                    n.id,
                    n.titulo,
                    n.tipo,
                    n.publico,
                    n.mensagem,
                    n.status,

                    COALESCE(
                        n.publicada_em,
                        n.criado_em
                    ) AS data_notificacao,

                    (
                        SELECT COUNT(*)

                        FROM notificacao_destinatarios nd2

                        WHERE nd2.notificacao_id = n.id
                          AND nd2.excluida_em IS NULL
                    ) AS destinatarios,

                    (
                        SELECT COUNT(*)

                        FROM notificacao_destinatarios nd3

                        WHERE nd3.notificacao_id = n.id
                          AND nd3.excluida_em IS NULL
                          AND nd3.lida_em IS NOT NULL
                    ) AS lidas

                FROM notificacoes n

                WHERE n.criado_por_usuario_id =
                    :usuario_id

                ORDER BY
                    n.criado_em DESC,
                    n.id DESC

                LIMIT 100
            "
        );

    $stmtSent->execute([
        ':usuario_id' =>
            $usuarioId
    ]);

    $sent =
        array_map(
            static fn (
                array $row
            ): array => [
                'id' =>
                    (int) $row['id'],

                'title' =>
                    (string) $row['titulo'],

                'type' =>
                    (string) $row['tipo'],

                'audience' =>
                    (string) $row['publico'],

                'message' =>
                    (string) $row['mensagem'],

                'status' =>
                    (string) $row['status'],

                'date' =>
                    (string) $row['data_notificacao'],

                'recipients' =>
                    (int) $row['destinatarios'],

                'readCount' =>
                    (int) $row['lidas']
            ],
            $stmtSent->fetchAll()
        );

    primewayResponderJson([
        'success' => true,
        'profile' =>
            $contexto['profile'],
        'schoolYear' =>
            $contexto['schoolYear'],
        'classes' =>
            $classes,
        'inbox' =>
            $inbox,
        'sent' =>
            $sent,
        'csrfToken' =>
            primewayTokenCsrf()
    ]);

} catch (Throwable $erro) {

    error_log(
        'PrimeWay Professor Notificações GET: ' .
        $erro->getMessage()
    );

    primewayResponderJson(
        [
            'success' => false,
            'message' =>
                'Não foi possível carregar as notificações.'
        ],
        500
    );
}
