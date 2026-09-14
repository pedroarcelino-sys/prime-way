<?php

declare(strict_types=1);

require_once __DIR__ . '/_contexto.php';


/*====================================================
        OBTER ATIVIDADE DISPONÍVEL AO ALUNO
====================================================*/

function primewayObterAtividadeAluno(
    PDO $pdo,
    array $contexto,
    int $atividadeId
): array {

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


    $stmt =
        $pdo->prepare(
            "SELECT
                atv.id,
                atv.titulo,
                atv.tipo_entrega,
                atv.data_publicacao,
                atv.data_entrega,
                atv.status,

                atv.permite_atraso,
                atv.permite_reenvio,
                atv.permite_comentarios,
                atv.max_arquivos,
                atv.tamanho_maximo_arquivo_mb,

                td.id AS turma_disciplina_id,
                td.turma_id,

                d.id AS disciplina_id,
                d.nome AS disciplina_nome,

                CASE
                    WHEN
                        atv.data_entrega IS NOT NULL
                        AND atv.data_entrega < NOW()
                    THEN 1
                    ELSE 0
                END AS prazo_encerrado

             FROM atividades atv

             INNER JOIN turma_disciplinas td
                ON td.id =
                   atv.turma_disciplina_id

             INNER JOIN disciplinas d
                ON d.id =
                   td.disciplina_id

             WHERE
                atv.id =
                :atividade_id

                AND
                td.turma_id =
                :turma_id

                AND
                td.status =
                'Ativa'

                AND
                d.status =
                'Ativa'

                AND
                atv.status IN (
                    'Publicada',
                    'Encerrada'
                )

                AND (
                    atv.data_publicacao IS NULL
                    OR
                    atv.data_publicacao <= NOW()
                )

             LIMIT 1"
        );


    $stmt->execute([
        ':atividade_id' =>
            $atividadeId,

        ':turma_id' =>
            (int) $matricula['classId']
    ]);


    $atividade =
        $stmt->fetch();


    if (!$atividade) {

        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Atividade não encontrada ou não disponível para este aluno.'
            ],
            404
        );
    }


    return $atividade;
}


/*====================================================
                OBTER ENTREGA
====================================================*/

function primewayObterEntregaAtividadeAluno(
    PDO $pdo,
    int $matriculaId,
    int $atividadeId,
    bool $bloquear = false
): ?array {

    $sql =
        "SELECT *
         FROM entregas_atividades

         WHERE
            atividade_id =
            :atividade_id

            AND
            matricula_id =
            :matricula_id

         LIMIT 1";


    if ($bloquear) {
        $sql .= " FOR UPDATE";
    }


    $stmt =
        $pdo->prepare(
            $sql
        );


    $stmt->execute([
        ':atividade_id' =>
            $atividadeId,

        ':matricula_id' =>
            $matriculaId
    ]);


    $entrega =
        $stmt->fetch();


    return $entrega ?: null;
}


/*====================================================
                ÚLTIMA VERSÃO
====================================================*/

function primewayUltimaVersaoEntrega(
    PDO $pdo,
    int $entregaId,
    bool $bloquear = false
): ?array {

    $sql =
        "SELECT *
         FROM entrega_atividade_versoes

         WHERE
            entrega_id =
            :entrega_id

         ORDER BY
            numero_versao DESC

         LIMIT 1";


    if ($bloquear) {
        $sql .= " FOR UPDATE";
    }


    $stmt =
        $pdo->prepare(
            $sql
        );


    $stmt->execute([
        ':entrega_id' =>
            $entregaId
    ]);


    $versao =
        $stmt->fetch();


    return $versao ?: null;
}


/*====================================================
            QUANTIDADE DE ARQUIVOS
====================================================*/

function primewayQuantidadeArquivosVersao(
    PDO $pdo,
    int $versaoId
): int {

    $stmt =
        $pdo->prepare(
            "SELECT COUNT(*)

             FROM entrega_atividade_arquivos

             WHERE
                versao_id =
                :versao_id"
        );


    $stmt->execute([
        ':versao_id' =>
            $versaoId
    ]);


    return (int) $stmt->fetchColumn();
}


/*====================================================
            VALIDAR CONTEÚDO DA ENTREGA
====================================================*/

function primewayValidarConteudoAtividade(
    string $tipo,
    string $conteudo,
    string $link,
    int $quantidadeArquivos
): void {

    $conteudo =
        trim($conteudo);

    $link =
        trim($link);


    switch ($tipo) {

        case 'Texto':

            if ($conteudo === '') {

                primewayResponderJson(
                    [
                        'success' => false,
                        'message' =>
                            'Esta atividade exige uma resposta em texto.'
                    ],
                    422
                );
            }

            break;


        case 'Arquivo':

            if ($quantidadeArquivos < 1) {

                primewayResponderJson(
                    [
                        'success' => false,
                        'message' =>
                            'Esta atividade exige pelo menos um arquivo.'
                    ],
                    422
                );
            }

            break;


        case 'Texto e arquivo':

            if (
                $conteudo === '' ||
                $quantidadeArquivos < 1
            ) {

                primewayResponderJson(
                    [
                        'success' => false,
                        'message' =>
                            'Esta atividade exige texto e pelo menos um arquivo.'
                    ],
                    422
                );
            }

            break;


        case 'Link':

            if (
                $link === '' ||
                filter_var(
                    $link,
                    FILTER_VALIDATE_URL
                ) === false
            ) {

                primewayResponderJson(
                    [
                        'success' => false,
                        'message' =>
                            'Informe um link válido para entregar esta atividade.'
                    ],
                    422
                );
            }

            break;


        case 'Livre':

            if (
                $conteudo === '' &&
                $link === '' &&
                $quantidadeArquivos === 0
            ) {

                primewayResponderJson(
                    [
                        'success' => false,
                        'message' =>
                            'Adicione uma resposta, link ou arquivo antes de enviar.'
                    ],
                    422
                );
            }

            break;
    }
}


/*====================================================
                    AUDITORIA
====================================================*/

function primewayAuditarAtividade(
    PDO $pdo,
    int $usuarioId,
    string $acao,
    int $registroId,
    string $descricao,
    ?array $dadosAnteriores = null,
    ?array $dadosNovos = null
): void {

    $stmt =
        $pdo->prepare(
            "INSERT INTO auditoria (
                usuario_id,
                acao,
                entidade,
                registro_id,
                descricao,
                dados_anteriores,
                dados_novos,
                endereco_ip,
                user_agent
             )
             VALUES (
                :usuario_id,
                :acao,
                'entregas_atividades',
                :registro_id,
                :descricao,
                :dados_anteriores,
                :dados_novos,
                :endereco_ip,
                :user_agent
             )"
        );


    $stmt->execute([

        ':usuario_id' =>
            $usuarioId,

        ':acao' =>
            $acao,

        ':registro_id' =>
            $registroId,

        ':descricao' =>
            $descricao,

        ':dados_anteriores' =>
            $dadosAnteriores !== null
                ? json_encode(
                    $dadosAnteriores,
                    JSON_UNESCAPED_UNICODE |
                    JSON_UNESCAPED_SLASHES
                )
                : null,

        ':dados_novos' =>
            $dadosNovos !== null
                ? json_encode(
                    $dadosNovos,
                    JSON_UNESCAPED_UNICODE |
                    JSON_UNESCAPED_SLASHES
                )
                : null,

        ':endereco_ip' =>
            (string) (
                $_SERVER['REMOTE_ADDR']
                ?? ''
            ),

        ':user_agent' =>
            substr(
                (string) (
                    $_SERVER['HTTP_USER_AGENT']
                    ?? ''
                ),
                0,
                500
            )
    ]);
}