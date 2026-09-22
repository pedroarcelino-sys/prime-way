<?php

declare(strict_types=1);

function primewayProfessorContexto(
    PDO $pdo,
    array $usuario
): array {

    $stmt =
        $pdo->prepare(
            "
                SELECT
                    pr.id AS professor_id,
                    pr.registro_funcional,
                    pr.status,
                    pr.admissao_em,

                    pe.id AS pessoa_id,
                    pe.nome,
                    pe.email_contato,
                    pe.telefone,
                    pe.documento,
                    pe.data_nascimento

                FROM usuarios u

                INNER JOIN pessoas pe
                    ON pe.id = u.pessoa_id

                INNER JOIN professores pr
                    ON pr.pessoa_id = pe.id

                WHERE u.id = :usuario_id
                  AND u.perfil = 'professor'
                  AND u.ativo = 1

                LIMIT 1
            "
        );

    $stmt->execute([
        ':usuario_id' =>
            (int) $usuario['id']
    ]);

    $perfil =
        $stmt->fetch();

    if (!$perfil) {
        primewayResponderJson(
            [
                'success' => false,
                'message' =>
                    'Conta sem cadastro de professor vinculado.'
            ],
            404
        );
    }

    $ano =
        $pdo->query(
            "
                SELECT
                    id,
                    ano,
                    data_inicio,
                    data_fim

                FROM anos_letivos

                WHERE ativo = 1

                ORDER BY ano DESC

                LIMIT 1
            "
        )->fetch()
        ?: null;

    return [
        'profile' => [
            'professorId' =>
                (int) $perfil['professor_id'],

            'personId' =>
                (int) $perfil['pessoa_id'],

            'name' =>
                (string) $perfil['nome'],

            'email' =>
                (string) (
                    $perfil['email_contato']
                    ?? $usuario['email']
                ),

            'phone' =>
                (string) (
                    $perfil['telefone']
                    ?? ''
                ),

            'document' =>
                (string) (
                    $perfil['documento']
                    ?? ''
                ),

            'birthDate' =>
                $perfil['data_nascimento'],

            'registration' =>
                (string) (
                    $perfil['registro_funcional']
                    ?? ''
                ),

            'status' =>
                (string) $perfil['status'],

            'admissionDate' =>
                $perfil['admissao_em']
        ],

        'schoolYear' =>
            $ano
                ? [
                    'id' =>
                        (int) $ano['id'],

                    'year' =>
                        (int) $ano['ano'],

                    'startDate' =>
                        (string) $ano['data_inicio'],

                    'endDate' =>
                        (string) $ano['data_fim']
                ]
                : null
    ];
}
