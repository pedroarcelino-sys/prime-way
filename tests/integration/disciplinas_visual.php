<?php
declare(strict_types=1);
// Snapshot somente leitura para o navegador isolado. Não é endpoint web nem sessão autenticada.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__, 2) . '/config/database.php';
require_once dirname(__DIR__, 2) . '/api/disciplinas/_disciplinas.php';
$pdo = primewayPdo();
$subjects = primewayDisciplinasListar($pdo);
$classes = $pdo->query('SELECT t.id, t.nome AS name, t.status, a.ano AS schoolYear FROM turmas t JOIN anos_letivos a ON a.id=t.ano_letivo_id')->fetchAll();
$professors = $pdo->query("SELECT p.id, pe.nome AS name, (p.status='ativo' AND pe.ativo=1) AS available FROM professores p JOIN pessoas pe ON pe.id=p.pessoa_id")->fetchAll();
echo json_encode(compact('subjects','classes','professors'), JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
