<?php
declare(strict_types=1);
require_once __DIR__.'/../_bootstrap.php';
require_once __DIR__.'/../_chat_access.php';
require_once __DIR__.'/../secretaria/chat/_chat.php';
require_once __DIR__.'/_message_attachments.php';

// Central Admin: somente conversas em que já é participante ativo.
// Sem criação de conversa nem lista ampliada de contatos.
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? ''));
if (!in_array($method, ['GET','POST'], true)) {
    header('Allow: GET, POST');
    primewayResponderJson(['success'=>false,'message'=>'Método não permitido.'],405);
}
$user = primewayExigirPerfis(['admin']);
if ($method === 'POST') primewayExigirCsrf();
$data = $method === 'POST' ? primewayLerJson() : $_GET;
try {
    $pdo = primewayPdo();
    $userId = (int)$user['id'];
    if (!isset($data['conversationId']) && $method === 'GET') {
        $stmt = $pdo->prepare("SELECT c.id,
            (SELECT COUNT(*) FROM mensagens m WHERE m.conversa_id=c.id AND m.excluida_em IS NULL
             AND m.remetente_usuario_id<>:sender AND NOT EXISTS
             (SELECT 1 FROM mensagem_leituras ml WHERE ml.mensagem_id=m.id AND ml.usuario_id=:reader)) AS unread
            FROM conversas c JOIN conversa_participantes cp ON cp.conversa_id=c.id
            WHERE c.ativo=1 AND cp.usuario_id=:viewer AND cp.ativo=1 AND cp.saiu_em IS NULL
            ORDER BY c.atualizado_em DESC,c.id DESC");
        $stmt->execute(['sender'=>$userId,'reader'=>$userId,'viewer'=>$userId]);
        $items=[];
        foreach ($stmt->fetchAll() as $row) {
            $conversation=primewaySecretariaChatConversa($pdo,$userId,(int)$row['id']);
            if ($conversation) $items[]=[...$conversation,'unread'=>(int)$row['unread']];
        }
        primewayResponderJson(['success'=>true,'conversations'=>$items,'csrfToken'=>primewayTokenCsrf()]);
    }
    $id=primewayIdPositivo($data['conversationId'] ?? null);
    if ($id===null) throw new RuntimeException('Conversa inválida.',422);
    $conversation=primewaySecretariaChatConversa($pdo,$userId,$id);
    if (!$conversation) throw new RuntimeException('Conversa não encontrada.',404);
    if ($method==='GET') {
        $stmt=$pdo->prepare("SELECT m.*,COALESCE(pe.nome,u.nome,u.email) AS sender_name
            FROM mensagens m JOIN usuarios u ON u.id=m.remetente_usuario_id
            LEFT JOIN pessoas pe ON pe.id=u.pessoa_id
            WHERE m.conversa_id=? AND m.excluida_em IS NULL ORDER BY m.enviada_em DESC,m.id DESC LIMIT 200");
        $stmt->execute([$id]);$rows=array_reverse($stmt->fetchAll());
        $attachments=primewayChatAttachmentsByMessage($pdo,array_column($rows,'id'));
        $messages=array_map(static fn(array $row):array=>[
            'id'=>(int)$row['id'],'senderUserId'=>(int)$row['remetente_usuario_id'],
            'senderName'=>$row['sender_name'],'content'=>$row['conteudo'],'type'=>$row['tipo'],
            'sentAt'=>$row['enviada_em'],'editedAt'=>$row['editada_em'],'pinned'=>$row['fixada_em']!==null,
            'pinnedAt'=>$row['fixada_em'],'pinnedByUserId'=>$row['fixada_por_usuario_id'],
            'own'=>(int)$row['remetente_usuario_id']===$userId,'attachments'=>$attachments[$row['id']] ?? []
        ],$rows);
        primewayResponderJson(['success'=>true,'conversation'=>$conversation,'messages'=>$messages]);
    }
    $action=$data['action'] ?? '';
    if (!in_array($action,['read','send'],true)) throw new RuntimeException('Ação inválida.',422);
    if ($action==='send') {
        primewayChatExigirDisponivel($pdo,$userId);
        if ($conversation['userId']) primewayChatExigirDisponivel($pdo,$conversation['userId']);
        $content=$data['content'] ?? null;
        if (!is_string($content) || trim($content)==='' || mb_strlen(trim($content))>5000)
            throw new RuntimeException('Digite uma mensagem de até 5000 caracteres.',422);
    }
    $pdo->beginTransaction();
    $stmt=$pdo->prepare('SELECT cp.id FROM conversa_participantes cp JOIN conversas c ON c.id=cp.conversa_id
        WHERE cp.conversa_id=? AND cp.usuario_id=? AND cp.ativo=1 AND cp.saiu_em IS NULL AND c.ativo=1 FOR UPDATE');
    $stmt->execute([$id,$userId]);
    if (!$stmt->fetchColumn()) throw new RuntimeException('Conversa não encontrada.',404);
    if ($action==='send') {
        $pdo->prepare("INSERT INTO mensagens(conversa_id,remetente_usuario_id,tipo,conteudo,enviada_em)
            VALUES (?,?,'texto',?,CURRENT_TIMESTAMP)")->execute([$id,$userId,trim($content)]);
        $messageId=(int)$pdo->lastInsertId();
        $pdo->prepare('INSERT IGNORE INTO mensagem_leituras(mensagem_id,usuario_id,lida_em)
            VALUES (?,?,CURRENT_TIMESTAMP)')->execute([$messageId,$userId]);
        $pdo->prepare('UPDATE conversas SET atualizado_em=CURRENT_TIMESTAMP WHERE id=?')->execute([$id]);
    } else {
        $pdo->prepare('INSERT IGNORE INTO mensagem_leituras(mensagem_id,usuario_id,lida_em)
            SELECT id,?,CURRENT_TIMESTAMP FROM mensagens WHERE conversa_id=? AND excluida_em IS NULL
            AND remetente_usuario_id<>?')->execute([$userId,$id,$userId]);
        $pdo->prepare('UPDATE conversa_participantes SET ultima_visualizacao_em=CURRENT_TIMESTAMP
            WHERE conversa_id=? AND usuario_id=?')->execute([$id,$userId]);
    }
    $pdo->commit();
    primewayResponderJson(['success'=>true,'messageId'=>$messageId ?? null],$action==='send'?201:200);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    $status=in_array($error->getCode(),[404,422],true)?$error->getCode():500;
    if ($status===500) error_log('PrimeWay Chat central: '.$error->getMessage());
    primewayResponderJson(['success'=>false,'message'=>$status===500?'Não foi possível processar o Chat.':$error->getMessage()],$status);
}
