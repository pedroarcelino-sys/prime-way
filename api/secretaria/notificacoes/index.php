<?php

declare(strict_types=1);
require_once __DIR__.'/../../notificacoes/_notificacoes.php';

require_once __DIR__ . '/../../_bootstrap.php';

primewayExigirMetodo('GET');

$usuario =
    primewayExigirPerfis([
        'secretaria'
    ]);

try {

    $pdo =
        primewayPdo();

    $usuarioId =
        (int) $usuario['id'];

    /*====================================================
                    ANO LETIVO ATIVO
    ====================================================*/

    $stmtAno =
        $pdo->query(
            "
                SELECT
                    id,
                    ano

                FROM anos_letivos

                WHERE ativo = 1

                ORDER BY
                    ano DESC,
                    id DESC

                LIMIT 1
            "
        );

    $ano =
        $stmtAno->fetch()
        ?: null;

    $anoLetivoId =
        $ano !== null
            ? (int) $ano['id']
            : 0;

    /*====================================================
                    TURMAS ATIVAS
    ====================================================*/

    $stmtTurmas =
        $pdo->prepare(
            "
                SELECT
                    id,
                    nome,
                    serie,
                    turno

                FROM turmas

                WHERE ano_letivo_id =
                    :ano_letivo_id

                  AND status =
                    'Ativa'

                ORDER BY
                    nome ASC
            "
        );

    $stmtTurmas->execute([
        ':ano_letivo_id' =>
            $anoLetivoId
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

    /*====================================================
                    CAIXA DE ENTRADA
    ====================================================*/

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

                  AND n.origem =
                    'Secretaria'

                  AND LOWER(n.tipo) NOT IN (
                    'saída segura',
                    'saida segura'
                  )

                ORDER BY
                    n.criado_em DESC,
                    n.id DESC

                LIMIT 120
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
        'success' =>
            true,

        'schoolYear' =>
            $ano === null
                ? null
                : [
                    'id' =>
                        (int) $ano['id'],

                    'year' =>
                        (int) $ano['ano']
                ],

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
        'PrimeWay Secretaria Notificações GET: ' .
        $erro->getMessage()
    );

    primewayResponderJson([
        'success' =>
            false,

        'message' =>
            'Não foi possível carregar as notificações da Secretaria.'
    ], 500);
}
