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

$acao =
    strtolower(
        trim(
            (string) (
                $dados['action']
                ?? ''
            )
        )
    );

$alunoId =
    primewayIdPositivo(
        $dados['studentId']
        ?? null
    );

$turmaId =
    primewayIdPositivo(
        $dados['classId']
        ?? null
    );

if (
    !in_array(
        $acao,
        ['assign', 'remove'],
        true
    )
) {
    primewayResponderJson([
        'success' =>
            false,

        'message' =>
            'Ação de matrícula inválida.'
    ], 422);
}

if ($alunoId === null) {
    primewayResponderJson([
        'success' =>
            false,

        'message' =>
            'Aluno inválido.'
    ], 422);
}

if ($turmaId === null) {
    primewayResponderJson([
        'success' =>
            false,

        'message' =>
            'Turma inválida.'
    ], 422);
}

try {

    $pdo =
        primewayPdo();

    $pdo->beginTransaction();

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

                FOR UPDATE
            "
        );

    $ano =
        $stmtAno->fetch();

    if (!$ano) {
        $pdo->rollBack();

        primewayResponderJson([
            'success' =>
                false,

            'message' =>
                'Nenhum ano letivo ativo foi encontrado.'
        ], 409);
    }

    $anoLetivoId =
        (int) $ano['id'];

    $stmtAluno =
        $pdo->prepare(
            "
                SELECT
                    a.id,
                    a.matricula,
                    a.status,
                    pe.nome,
                    pe.ativo AS pessoa_ativa

                FROM alunos a

                INNER JOIN pessoas pe
                    ON pe.id = a.pessoa_id

                WHERE a.id = :id

                FOR UPDATE
            "
        );

    $stmtAluno->execute([
        ':id' =>
            $alunoId
    ]);

    $aluno =
        $stmtAluno->fetch();

    if (!$aluno) {
        $pdo->rollBack();

        primewayResponderJson([
            'success' =>
                false,

            'message' =>
                'Aluno não encontrado.'
        ], 404);
    }

    $stmtTurma =
        $pdo->prepare(
            "
                SELECT
                    id,
                    nome,
                    capacidade,
                    status,
                    ano_letivo_id

                FROM turmas

                WHERE id = :id

                FOR UPDATE
            "
        );

    $stmtTurma->execute([
        ':id' =>
            $turmaId
    ]);

    $turma =
        $stmtTurma->fetch();

    if (!$turma) {
        $pdo->rollBack();

        primewayResponderJson([
            'success' =>
                false,

            'message' =>
                'Turma não encontrada.'
        ], 404);
    }

    if (
        (int) $turma['ano_letivo_id']
        !==
        $anoLetivoId
    ) {
        $pdo->rollBack();

        primewayResponderJson([
            'success' =>
                false,

            'message' =>
                'A turma não pertence ao ano letivo ativo.'
        ], 409);
    }

    $stmtAtual =
        $pdo->prepare(
            "
                SELECT
                    m.id,
                    m.turma_id,
                    m.situacao,
                    t.nome AS turma_nome

                FROM matriculas m

                INNER JOIN turmas t
                    ON t.id = m.turma_id

                WHERE m.aluno_id = :aluno_id
                  AND m.situacao = 'Ativa'
                  AND t.ano_letivo_id = :ano_letivo_id

                ORDER BY m.id

                FOR UPDATE
            "
        );

    $stmtAtual->execute([
        ':aluno_id' =>
            $alunoId,

        ':ano_letivo_id' =>
            $anoLetivoId
    ]);

    $ativas =
        $stmtAtual->fetchAll();

    if (count($ativas) > 1) {
        throw new RuntimeException(
            'Aluno possui mais de uma matrícula ativa no mesmo ano letivo.'
        );
    }

    $atual =
        $ativas[0]
        ?? null;

    $auditoriaId =
        null;

    if ($acao === 'remove') {

        if (
            !$atual
            ||
            (int) $atual['turma_id']
            !==
            $turmaId
        ) {
            $pdo->rollBack();

            primewayResponderJson([
                'success' =>
                    false,

                'message' =>
                    'O aluno não está matriculado nesta turma.'
            ], 409);
        }

        $auditoriaId =
            (int) $atual['id'];

        $pdo->prepare(
            "
                UPDATE matriculas

                SET situacao =
                    'Cancelada'

                WHERE id =
                    :id
            "
        )->execute([
            ':id' =>
                $auditoriaId
        ]);

        $acaoAuditoria =
            'SECRETARIA_REMOVER_ALUNO_TURMA';

        $descricao =
            sprintf(
                'Secretaria removeu o aluno da turma "%s".',
                (string) $turma['nome']
            );

        $dadosAnteriores = [
            'studentId' =>
                $alunoId,

            'classId' =>
                $turmaId,

            'className' =>
                (string) $turma['nome'],

            'enrollmentId' =>
                $auditoriaId,

            'status' =>
                'Ativa'
        ];

        $dadosNovos = [
            'studentId' =>
                $alunoId,

            'classId' =>
                null,

            'className' =>
                '',

            'enrollmentId' =>
                $auditoriaId,

            'status' =>
                'Cancelada'
        ];

        $mensagem =
            'Matrícula removida da turma com sucesso.';

    } else {

        if (
            (string) $turma['status']
            !== 'Ativa'
        ) {
            $pdo->rollBack();

            primewayResponderJson([
                'success' =>
                    false,

                'message' =>
                    'Não é possível matricular em uma turma inativa.'
            ], 409);
        }

        if (
            (string) $aluno['status'] === 'inativo'
            ||
            (int) $aluno['pessoa_ativa'] !== 1
        ) {
            $pdo->rollBack();

            primewayResponderJson([
                'success' =>
                    false,

                'message' =>
                    'O aluno está inativo e não pode receber nova matrícula.'
            ], 409);
        }

        if (
            $atual
            &&
            (int) $atual['turma_id']
            ===
            $turmaId
        ) {
            $pdo->commit();

            primewayResponderJson([
                'success' =>
                    true,

                'message' =>
                    'O aluno já está matriculado nesta turma.'
            ]);
        }

        $stmtOcupacao =
            $pdo->prepare(
                "
                    SELECT COUNT(*)

                    FROM matriculas

                    WHERE turma_id =
                        :turma_id

                      AND situacao =
                        'Ativa'
                "
            );

        $stmtOcupacao->execute([
            ':turma_id' =>
                $turmaId
        ]);

        $ocupacao =
            (int) $stmtOcupacao
                ->fetchColumn();

        if (
            $ocupacao >=
            (int) $turma['capacidade']
        ) {
            $pdo->rollBack();

            primewayResponderJson([
                'success' =>
                    false,

                'message' =>
                    'A turma atingiu sua capacidade máxima.'
            ], 409);
        }

        $turmaAnteriorId =
            null;

        $turmaAnteriorNome =
            '';

        if ($atual) {

            $turmaAnteriorId =
                (int) $atual['turma_id'];

            $turmaAnteriorNome =
                (string) $atual['turma_nome'];

            $pdo->prepare(
                "
                    UPDATE matriculas

                    SET situacao =
                        'Transferida'

                    WHERE id =
                        :id
                "
            )->execute([
                ':id' =>
                    (int) $atual['id']
            ]);
        }

        $stmtExistente =
            $pdo->prepare(
                "
                    SELECT
                        id,
                        situacao

                    FROM matriculas

                    WHERE aluno_id =
                        :aluno_id

                      AND turma_id =
                        :turma_id

                    LIMIT 1

                    FOR UPDATE
                "
            );

        $stmtExistente->execute([
            ':aluno_id' =>
                $alunoId,

            ':turma_id' =>
                $turmaId
        ]);

        $destino =
            $stmtExistente->fetch();

        if ($destino) {

            $pdo->prepare(
                "
                    UPDATE matriculas

                    SET
                        situacao =
                            'Ativa'

                    WHERE id =
                        :id
                "
            )->execute([
                ':id' =>
                    (int) $destino['id']
            ]);

            $destinoId =
                (int) $destino['id'];

        } else {

            $stmtInserir =
                $pdo->prepare(
                    "
                        INSERT INTO matriculas (
                            aluno_id,
                            turma_id,
                            numero_chamada,
                            data_matricula,
                            situacao
                        )
                        VALUES (
                            :aluno_id,
                            :turma_id,
                            NULL,
                            CURRENT_DATE,
                            'Ativa'
                        )
                    "
                );

            $stmtInserir->execute([
                ':aluno_id' =>
                    $alunoId,

                ':turma_id' =>
                    $turmaId
            ]);

            $destinoId =
                (int) $pdo
                    ->lastInsertId();
        }

        $auditoriaId =
            $destinoId;

        if ($atual) {

            $acaoAuditoria =
                'SECRETARIA_TRANSFERIR_ALUNO';

            $descricao =
                sprintf(
                    'Secretaria transferiu o aluno de "%s" para "%s".',
                    $turmaAnteriorNome,
                    (string) $turma['nome']
                );

            $mensagem =
                'Aluno transferido com sucesso.';

        } else {

            $acaoAuditoria =
                'SECRETARIA_MATRICULAR_ALUNO';

            $descricao =
                sprintf(
                    'Secretaria matriculou o aluno na turma "%s".',
                    (string) $turma['nome']
                );

            $mensagem =
                'Aluno matriculado com sucesso.';
        }

        $dadosAnteriores = [
            'studentId' =>
                $alunoId,

            'classId' =>
                $turmaAnteriorId,

            'className' =>
                $turmaAnteriorNome,

            'enrollmentId' =>
                $atual
                    ? (int) $atual['id']
                    : null
        ];

        $dadosNovos = [
            'studentId' =>
                $alunoId,

            'classId' =>
                $turmaId,

            'className' =>
                (string) $turma['nome'],

            'enrollmentId' =>
                $destinoId,

            'status' =>
                'Ativa'
        ];
    }

    $stmtAuditoria =
        $pdo->prepare(
            "
                INSERT INTO auditoria (
                    usuario_id,
                    acao,
                    entidade,
                    registro_id,
                    descricao,
                    dados_anteriores,
                    dados_novos
                )
                VALUES (
                    :usuario_id,
                    :acao,
                    'matriculas',
                    :registro_id,
                    :descricao,
                    :dados_anteriores,
                    :dados_novos
                )
            "
        );

    $stmtAuditoria->execute([
        ':usuario_id' =>
            (int) $usuario['id'],

        ':acao' =>
            $acaoAuditoria,

        ':registro_id' =>
            $auditoriaId,

        ':descricao' =>
            $descricao,

        ':dados_anteriores' =>
            json_encode(
                $dadosAnteriores,
                JSON_UNESCAPED_UNICODE |
                JSON_UNESCAPED_SLASHES
            ),

        ':dados_novos' =>
            json_encode(
                $dadosNovos,
                JSON_UNESCAPED_UNICODE |
                JSON_UNESCAPED_SLASHES
            )
    ]);

    $pdo->commit();

    primewayResponderJson([
        'success' =>
            true,

        'message' =>
            $mensagem
    ]);

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
        'PrimeWay Secretaria Matrículas POST: ' .
        $erro->getMessage()
    );

    primewayResponderJson([
        'success' =>
            false,

        'message' =>
            'Não foi possível atualizar a matrícula.'
    ], 500);
}
