<?php

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';


function primewayAtividadesContextoAluno(
    PDO $pdo,
    array $usuario
): array {

    /*====================================================
                    ALUNO LOGADO
    ====================================================*/

    $stmtAluno =
        $pdo->prepare(
            "SELECT
                a.id AS aluno_id,
                a.matricula,
                a.status AS aluno_status,

                pe.id AS pessoa_id,
                pe.nome,
                pe.email_contato

             FROM usuarios u

             INNER JOIN pessoas pe
                ON pe.id = u.pessoa_id

             INNER JOIN alunos a
                ON a.pessoa_id = pe.id

             WHERE u.id = :usuario_id
               AND u.perfil = 'aluno'
               AND u.ativo = 1

             LIMIT 1"
        );


    $stmtAluno->execute([
        ':usuario_id' =>
            (int) $usuario['id']
    ]);


    $aluno =
        $stmtAluno->fetch();


    if (
        !$aluno
    ) {

        primewayResponderJson(
            [
                'success' =>
                    false,

                'message' =>
                    'A conta autenticada não possui um aluno vinculado.'
            ],
            404
        );
    }


    /*====================================================
                    ANO LETIVO
    ====================================================*/

    $stmtAno =
        $pdo->query(
            "SELECT
                id,
                ano

             FROM anos_letivos

             WHERE ativo = 1

             ORDER BY
                ano DESC,
                id DESC

             LIMIT 1"
        );


    $ano =
        $stmtAno->fetch()
        ?: null;


    /*====================================================
                    MATRÍCULA ATUAL
    ====================================================*/

    $matricula =
        null;


    if (
        $ano !== null
    ) {

        $stmtMatricula =
            $pdo->prepare(
                "SELECT
                    m.id AS matricula_id,
                    m.turma_id,
                    m.numero_chamada,
                    m.data_matricula,
                    m.situacao,

                    t.nome AS turma_nome,
                    t.serie,
                    t.turno,
                    t.sala

                 FROM matriculas m

                 INNER JOIN turmas t
                    ON t.id = m.turma_id

                 WHERE m.aluno_id = :aluno_id
                   AND m.situacao = 'Ativa'
                   AND t.ano_letivo_id = :ano_letivo_id

                 ORDER BY
                    m.id DESC

                 LIMIT 1"
            );


        $stmtMatricula->execute([
            ':aluno_id' =>
                (int) $aluno['aluno_id'],

            ':ano_letivo_id' =>
                (int) $ano['id']
        ]);


        $matricula =
            $stmtMatricula->fetch()
            ?: null;
    }


    /*====================================================
                    CONTEXTO
    ====================================================*/

    return [

        'student' => [

            'id' =>
                (int) $aluno['aluno_id'],

            'personId' =>
                (int) $aluno['pessoa_id'],

            'name' =>
                (string) $aluno['nome'],

            'registration' =>
                (string) $aluno['matricula'],

            'status' =>
                (string) $aluno['aluno_status'],

            'email' =>
                (string) (
                    $aluno['email_contato']
                    ??
                    $usuario['email']
                )
        ],


        'schoolYear' =>
            $ano === null

                ? null

                : [

                    'id' =>
                        (int) $ano['id'],

                    'year' =>
                        (int) $ano['ano']
                ],


        'enrollment' =>
            $matricula === null

                ? null

                : [

                    'id' =>
                        (int) $matricula[
                            'matricula_id'
                        ],

                    'classId' =>
                        (int) $matricula[
                            'turma_id'
                        ],

                    'className' =>
                        (string) $matricula[
                            'turma_nome'
                        ],

                    'series' =>
                        (string) $matricula[
                            'serie'
                        ],

                    'shift' =>
                        (string) $matricula[
                            'turno'
                        ],

                    'room' =>
                        (string) (
                            $matricula[
                                'sala'
                            ] ?? ''
                        ),

                    'callNumber' =>
                        $matricula[
                            'numero_chamada'
                        ] === null

                            ? null

                            : (int) $matricula[
                                'numero_chamada'
                            ],

                    'date' =>
                        (string) $matricula[
                            'data_matricula'
                        ],

                    'status' =>
                        (string) $matricula[
                            'situacao'
                        ]
                ]
    ];
}


/*====================================================
            STATUS PARA EXIBIÇÃO AO ALUNO
====================================================*/

function primewayStatusEntregaAluno(
    ?string $statusBanco,
    bool $prazoEncerrado
): string {

    if (
        $statusBanco === null ||
        $statusBanco === '' ||
        $statusBanco === 'Pendente'
    ) {

        return $prazoEncerrado
            ? 'Não entregue'
            : 'Não iniciada';
    }


    return match (
        $statusBanco
    ) {

        'Rascunho' =>
            'Rascunho',

        'Entregue' =>
            'Entregue',

        'Atrasada' =>
            'Entregue com atraso',

        'Devolvida' =>
            'Devolvida para correção',

        'Reenviada' =>
            'Reenviada',

        'Corrigida' =>
            'Corrigida',

        'Cancelada' =>
            $prazoEncerrado
                ? 'Não entregue'
                : 'Retirada',

        default =>
            $statusBanco
    };
}


/*====================================================
                PERMISSÕES DA ATIVIDADE
====================================================*/

function primewayPermissoesAtividadeAluno(
    array $linha
): array {

    $atividadePublicada =
        (string) $linha[
            'atividade_status'
        ] ===
        'Publicada';


    $prazoEncerrado =
        (int) $linha[
            'prazo_encerrado'
        ] ===
        1;


    $permiteAtraso =
        (int) $linha[
            'permite_atraso'
        ] ===
        1;


    $permiteReenvio =
        (int) $linha[
            'permite_reenvio'
        ] ===
        1;


    $permiteComentarios =
        (int) $linha[
            'permite_comentarios'
        ] ===
        1;


    $correcaoPublicada =
        $linha[
            'correcao_publicada_em'
        ] !== null;


    $statusEntrega =
        $linha[
            'entrega_status'
        ] !== null

            ? (string) $linha[
                'entrega_status'
            ]

            : null;


    $statusBloqueiaEnvio =
        in_array(
            $statusEntrega,
            [
                'Corrigida'
            ],
            true
        );


    $podeEnviar =
        $atividadePublicada &&
        !$correcaoPublicada &&
        !$statusBloqueiaEnvio &&
        (
            !$prazoEncerrado ||
            $permiteAtraso
        );


    $podeRetirar =
        $atividadePublicada &&
        $permiteReenvio &&
        !$prazoEncerrado &&
        !$correcaoPublicada &&
        in_array(
            $statusEntrega,
            [
                'Entregue',
                'Atrasada',
                'Reenviada'
            ],
            true
        );


    return [

        'canSaveDraft' =>
            $podeEnviar,

        'canSubmit' =>
            $podeEnviar,

        'canWithdraw' =>
            $podeRetirar,

        'canComment' =>
            $permiteComentarios,

        'canResubmit' =>
            $podeEnviar &&
            $permiteReenvio
    ];
}