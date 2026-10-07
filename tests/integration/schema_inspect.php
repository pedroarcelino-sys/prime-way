<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__, 2) . '/config/database.php';
$pdo = primewayPdo();
$tables = ['eventos_calendario','solicitacoes_saida_segura','locais_saida_segura','historico_saida_segura','usuarios','mensagens','mensagem_entregas'];
$result = [];
$stmt = $pdo->prepare('SELECT COLUMN_NAME, COLUMN_TYPE, COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION');
foreach ($tables as $table) {
    $stmt->execute([$table]);
    $columns = $stmt->fetchAll();
    $result[$table] = ['columns'=>$columns, 'rows'=>$columns === [] ? null : (int)$pdo->query("SELECT COUNT(*) FROM $table")->fetchColumn()];
}
$result['events'] = $pdo->query('SELECT id,turma_id,tipo,data_evento,status FROM eventos_calendario ORDER BY id')->fetchAll();
$result['classes'] = $pdo->query('SELECT id,ano_letivo_id,status,professor_id FROM turmas')->fetchAll();
$result['years'] = $pdo->query('SELECT id,ano,ativo FROM anos_letivos')->fetchAll();
$result['teachers'] = $pdo->query("SELECT p.id,u.id AS user_id,p.status FROM professores p JOIN usuarios u ON u.pessoa_id=p.pessoa_id WHERE u.perfil='professor'")->fetchAll();
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
