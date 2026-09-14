<?php

declare(strict_types=1);

/*====================================================
        PROFESSORES API - PRIMEWAY SCHOOL
        GET /api/professores/index.php
====================================================*/

require_once
    __DIR__ .
    '/../_bootstrap.php';


/*====================================================
                    REQUISIÇÃO
====================================================*/

primewayExigirMetodo(
    'GET'
);


primewayExigirPerfis([
    'admin'
]);


/*====================================================
                    BANCO
====================================================*/

try {

    $pdo =
        primewayPdo();


    /*================================================
                LISTAR PROFESSORES
    ================================================*/

    $stmt =
        $pdo->query(
            '
                SELECT
                    p.id,
                    p.registro_funcional,
                    p.status,

                    pe.nome,
                    pe.email_contato,
                    pe.telefone,
                    pe.ativo AS pessoa_ativa,

                    (
                        SELECT COUNT(DISTINCT turma_vinculada.id)
                        FROM turmas turma_vinculada
                        LEFT JOIN turma_disciplinas disciplina_vinculada
                            ON disciplina_vinculada.turma_id = turma_vinculada.id
                           AND disciplina_vinculada.professor_id = p.id
                           AND disciplina_vinculada.status = \'Ativa\'
                        WHERE turma_vinculada.professor_id = p.id
                           OR disciplina_vinculada.professor_id = p.id
                    ) AS turma_count

                FROM professores p

                INNER JOIN pessoas pe
                    ON pe.id = p.pessoa_id

                ORDER BY
                    pe.nome ASC,
                    p.id ASC
            '
        );


    $professores =
        [];


    while (
        $linha =
            $stmt->fetch()
    ) {

        $status =
            (string) $linha[
                'status'
            ];


        $pessoaAtiva =
            (int) $linha[
                'pessoa_ativa'
            ] === 1;


        $disponivel =
            $status ===
                'ativo' &&
            $pessoaAtiva;


        $professores[] = [

            'id' =>
                (int) $linha[
                    'id'
                ],

            'name' =>
                (string) $linha[
                    'nome'
                ],

            'registration' =>
                (string) (
                    $linha[
                        'registro_funcional'
                    ] ??
                    ''
                ),

            'email' =>
                (string) (
                    $linha[
                        'email_contato'
                    ] ??
                    ''
                ),

            'phone' =>
                (string) (
                    $linha[
                        'telefone'
                    ] ??
                    ''
                ),

            'status' =>
                $status,

            'personActive' =>
                $pessoaAtiva,

            /*
                Um professor só pode ser sugerido para
                novas atribuições quando:

                professores.status = ativo
                pessoas.ativo      = 1
            */
            'available' =>
                $disponivel,

            'classCount' =>
                (int) $linha[
                    'turma_count'
                ]
        ];
    }


    /*================================================
                    RESPOSTA
    ================================================*/

    primewayResponderJson(
        [
            'success' =>
                true,

            'professors' =>
                $professores
        ]
    );

} catch (
    Throwable $erro
) {

    error_log(
        'PrimeWay Professores GET: ' .
        $erro->getMessage()
    );


    primewayResponderJson(
        [
            'success' =>
                false,

            'message' =>
                'Não foi possível carregar os professores.'
        ],
        500
    );
}
