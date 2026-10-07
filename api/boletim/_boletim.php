<?php
declare(strict_types=1);
require_once __DIR__.'/../_bootstrap.php';

// Relatório de leitura: reproduz notas/frequência registradas, sem decidir aprovação.
function primewayBoletim(PDO $pdo,array $student,?int $year): array {
    $result=['student'=>['id'=>$student['studentId'],'name'=>$student['name'],'registration'=>$student['registration']],
        'year'=>$year,'enrollment'=>$student['enrollment'],'grades'=>[],'attendance'=>[]];
    if (!$student['enrollment']) return $result;
    $enrollment=$student['enrollment'];
    $stmt=$pdo->prepare("SELECT d.nome AS subject,pl.nome AS period,av.titulo AS title,av.valor_maximo AS maximum,
        n.valor AS value,n.observacao AS observation
        FROM avaliacoes av JOIN turma_disciplinas td ON td.id=av.turma_disciplina_id
        JOIN disciplinas d ON d.id=td.disciplina_id JOIN periodos_letivos pl ON pl.id=av.periodo_letivo_id
        LEFT JOIN notas n ON n.avaliacao_id=av.id AND n.matricula_id=:enrollment
        WHERE td.turma_id=:class AND av.status<>'Cancelada'
        ORDER BY d.nome,pl.ordem,av.data_avaliacao,av.id");
    $stmt->execute(['enrollment'=>$enrollment['id'],'class'=>$enrollment['classId']]);
    $result['grades']=$stmt->fetchAll();
    $stmt=$pdo->prepare("SELECT d.nome AS subject,COUNT(f.id) AS records,
        SUM(f.situacao='Presente') AS present,SUM(f.situacao='Atraso') AS late,
        SUM(f.situacao='Falta') AS absent,SUM(f.situacao='Justificada') AS justified
        FROM turma_disciplinas td JOIN disciplinas d ON d.id=td.disciplina_id
        LEFT JOIN aulas au ON au.turma_disciplina_id=td.id AND au.status='Realizada'
        LEFT JOIN frequencias f ON f.aula_id=au.id AND f.matricula_id=:enrollment
        WHERE td.turma_id=:class GROUP BY td.id,d.nome ORDER BY d.nome");
    $stmt->execute(['enrollment'=>$enrollment['id'],'class'=>$enrollment['classId']]);
    $result['attendance']=$stmt->fetchAll();return $result;
}
function primewayBoletimResponder(PDO $pdo,array $reports): never {
    $format=$_GET['format'] ?? 'html';
    if ($format==='json') primewayResponderJson(['success'=>true,'reports'=>$reports]);
    if ($format!=='html') primewayResponderJson(['success'=>false,'message'=>'Formato inválido.'],422);
    $school=$pdo->query("SELECT valor FROM configuracoes_sistema WHERE grupo='escola' AND chave='nome' LIMIT 1")->fetchColumn() ?: 'PrimeWay School';
    $h=static fn(mixed $v):string=>htmlspecialchars((string)$v,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
    header('Content-Type: text/html; charset=utf-8');header('Cache-Control: no-store');header('X-Frame-Options: SAMEORIGIN');
    echo '<!DOCTYPE html><html lang="pt-BR"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Boletim</title>
        <style>body{font:16px Arial;margin:24px;color:#17212b}table{border-collapse:collapse;width:100%;margin:16px 0}th,td{border:1px solid #aaa;padding:8px;text-align:left}.report{break-after:page;overflow-x:auto}@media print{button{display:none}body{margin:0}.report:last-child{break-after:auto}}</style>
        <button type="button" onclick="window.print()">Imprimir / salvar PDF</button><h1>'.$h($school).'</h1>';
    foreach ($reports as $r) {
        echo '<section class="report"><h2>Boletim — '.$h($r['student']['name']).'</h2><p>Matrícula '.$h($r['student']['registration']).' • '.$h($r['year']).' • '.$h($r['enrollment']['className'] ?? 'Sem turma ativa').'</p>';
        echo '<p>Resumo dos registros acadêmicos. Não substitui o fechamento oficial de resultados.</p><h3>Notas por avaliação</h3><table><thead><tr><th>Disciplina</th><th>Período</th><th>Avaliação</th><th>Nota / máximo</th><th>Observação</th></tr></thead><tbody>';
        foreach ($r['grades'] as $g) echo '<tr><td>'.$h($g['subject']).'</td><td>'.$h($g['period']).'</td><td>'.$h($g['title']).'</td><td>'.$h($g['value']===null?'Aguardando':$g['value'].' / '.$g['maximum']).'</td><td>'.$h($g['observation']).'</td></tr>';
        if (!$r['grades']) echo '<tr><td colspan="5">Nenhuma avaliação registrada.</td></tr>';
        echo '</tbody></table><h3>Frequência</h3><table><thead><tr><th>Disciplina</th><th>Presenças</th><th>Atrasos</th><th>Faltas</th><th>Justificadas</th></tr></thead><tbody>';
        foreach ($r['attendance'] as $a) echo '<tr><td>'.$h($a['subject']).'</td><td>'.$h($a['present'] ?? 0).'</td><td>'.$h($a['late'] ?? 0).'</td><td>'.$h($a['absent'] ?? 0).'</td><td>'.$h($a['justified'] ?? 0).'</td></tr>';
        if (!$r['attendance']) echo '<tr><td colspan="5">Nenhuma frequência registrada.</td></tr>';
        echo '</tbody></table></section>';
    }
    if (!$reports) echo '<p>Nenhum aluno vinculado disponível.</p>';
    echo '</html>';exit;
}
