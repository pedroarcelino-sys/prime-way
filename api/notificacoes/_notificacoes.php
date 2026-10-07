<?php
declare(strict_types=1);
require_once __DIR__.'/../_bootstrap.php';

final class PrimewayNotificationError extends RuntimeException {}
function primewayNotificationFail(string $message, int $status=422): never { throw new PrimewayNotificationError($message,$status); }
function primewayNotificationId(mixed $value): int {
    if ((!is_int($value)&&!is_string($value)) || !preg_match('/^[1-9][0-9]*$/D',(string)$value) || filter_var($value,FILTER_VALIDATE_INT)===false) primewayNotificationFail('Notificação inválida.');
    return (int)$value;
}
function primewayNotificationAudiences(string $role): array {
    return match($role) {
        'admin'=>['todos'], 'secretaria'=>['todos','secretaria','secretária'],
        'professor'=>['todos','professores','professor'], 'aluno'=>['todos','alunos','aluno'],
        'responsavel'=>['todos','responsáveis','responsaveis','responsável','responsavel'],
        default=>primewayNotificationFail('Acesso não autorizado.',403)
    };
}
function primewayNotificationScope(array $user, array &$params): string {
    $audiences=primewayNotificationAudiences($user['perfil']);
    // Admin já gerenciava toda a central; leitura, porém, pertence somente à sua conta.
    if ($user['perfil']==='admin') return '1=1';
    $keys=[];
    foreach($audiences as $i=>$audience) { $keys[]=':audience'.$i; $params['audience'.$i]=$audience; }
    // Destinatários explícitos são autoritativos. Só avisos antigos sem destinatários
    // usam o campo público estruturado; nunca título, mensagem ou resultado do calendário.
    return '(nd.id IS NOT NULL AND nd.excluida_em IS NULL OR (nd.id IS NULL AND NOT EXISTS
        (SELECT 1 FROM notificacao_destinatarios recipients WHERE recipients.notificacao_id=n.id)
        AND LOWER(n.publico) IN ('.implode(',',$keys).')))';
}
function primewayNotificationRows(PDO $pdo,array $user,array $filters=[],?int $limit=null): array {
    $params=['viewer'=>(int)$user['id']];$scope=primewayNotificationScope($user,$params);
    $history=($filters['history']??'')==='1' && $user['perfil']==='admin';
    $where=[$scope,$history?"n.status IN ('Publicada','Cancelada')":"n.status='Publicada'",
        'COALESCE(n.publicada_em,n.criado_em)<=CURRENT_TIMESTAMP'];
    if(($filters['type']??'')!=='') {if(!is_string($filters['type'])||mb_strlen($filters['type'])>60)primewayNotificationFail('Tipo inválido.');$where[]='n.tipo=:type';$params['type']=$filters['type'];}
    if(($filters['read']??'')!=='') {
        if(!in_array($filters['read'],['read','unread'],true))primewayNotificationFail('Filtro de leitura inválido.');
        $where[]='nd.lida_em IS '.($filters['read']==='read'?'NOT NULL':'NULL');
    }
    if(($filters['search']??'')!=='') {
        if(!is_string($filters['search'])||mb_strlen($filters['search'])>190)primewayNotificationFail('Pesquisa inválida.');
        $where[]='(n.titulo LIKE :searchTitle OR n.mensagem LIKE :searchMessage)';
        $params['searchTitle']=$params['searchMessage']='%'.$filters['search'].'%';
    }
    if(isset($filters['id'])) {$where[]='n.id=:id';$params['id']=primewayNotificationId($filters['id']);}
    $sql='SELECT n.*,COALESCE(n.publicada_em,n.criado_em) AS data_notificacao,
        nd.id AS destinatario_id,nd.lida_em,nd.excluida_em,COALESCE(pe.nome,u.nome,\'Sistema\') AS autor_nome,COALESCE(u.perfil,\'sistema\') AS autor_perfil
        FROM notificacoes n LEFT JOIN notificacao_destinatarios nd ON nd.notificacao_id=n.id AND nd.usuario_id=:viewer
        LEFT JOIN usuarios u ON u.id=n.criado_por_usuario_id LEFT JOIN pessoas pe ON pe.id=u.pessoa_id
        WHERE '.implode(' AND ',$where).' ORDER BY COALESCE(n.publicada_em,n.criado_em) DESC,n.id DESC';
    if($limit!==null) $sql.=' LIMIT '.max(1,min(150,$limit));
    $stmt=$pdo->prepare($sql);$stmt->execute($params);return $stmt->fetchAll();
}
function primewayNotificationMap(array $row): array {
    return ['id'=>(int)$row['id'],'title'=>$row['titulo'],'type'=>$row['tipo'],'audience'=>$row['publico'],
        'message'=>$row['mensagem'],'origin'=>$row['origem'],'source'=>$row['evento_calendario_id']!==null?'calendar':'manual',
        'eventId'=>$row['evento_calendario_id']===null?null:(int)$row['evento_calendario_id'],
        'status'=>$row['status'],'date'=>$row['data_notificacao'],'author'=>$row['autor_nome'],'authorRole'=>$row['autor_perfil'],'read'=>$row['lida_em']!==null];
}
function primewayNotificationList(PDO $pdo,array $user,array $filters=[],?int $limit=null): array {
    return array_map('primewayNotificationMap',primewayNotificationRows($pdo,$user,$filters,$limit));
}
function primewayNotificationUnread(PDO $pdo,array $user): int {
    $params=['viewer'=>(int)$user['id']];$scope=primewayNotificationScope($user,$params);
    $stmt=$pdo->prepare("SELECT COUNT(*) FROM notificacoes n LEFT JOIN notificacao_destinatarios nd
        ON nd.notificacao_id=n.id AND nd.usuario_id=:viewer WHERE $scope AND n.status='Publicada'
        AND COALESCE(n.publicada_em,n.criado_em)<=CURRENT_TIMESTAMP AND nd.lida_em IS NULL");
    $stmt->execute($params);return (int)$stmt->fetchColumn();
}
function primewayNotificationTransaction(PDO $pdo): void { if(!$pdo->inTransaction())throw new LogicException('Operação de notificação exige transação.'); }
function primewayNotificationAudit(PDO $pdo,array $user,string $action,int $id,?array $before,array $after): void {
    $stmt=$pdo->prepare("INSERT INTO auditoria(usuario_id,acao,entidade,registro_id,dados_anteriores,dados_novos)
        VALUES (:user,:action,'notificacoes',:id,:before,:after)");
    $stmt->execute(['user'=>$user['id'],'action'=>$action,'id'=>$id,
        'before'=>$before===null?null:json_encode($before,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),
        'after'=>json_encode($after,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);
}
function primewayNotificationDeliver(PDO $pdo,int $id,array $recipients): void {
    primewayNotificationTransaction($pdo);
    $stmt=$pdo->prepare('INSERT INTO notificacao_destinatarios(notificacao_id,usuario_id) VALUES (?,?) ON DUPLICATE KEY UPDATE id=id');
    foreach(array_unique($recipients) as $userId)$stmt->execute([$id,primewayNotificationId($userId)]);
}
function primewayNotificationLegacyRecipients(PDO $pdo,array $row): void {
    $stmt=$pdo->prepare('SELECT id FROM notificacao_destinatarios WHERE notificacao_id=? LIMIT 1');$stmt->execute([$row['id']]);
    if($stmt->fetchColumn())return;
    $roles=match(mb_strtolower($row['publico'])) {
        'todos'=>['admin','secretaria','professor','aluno','responsavel'],
        'alunos','aluno'=>['aluno'], 'professores','professor'=>['professor'],
        'responsáveis','responsaveis','responsável','responsavel'=>['responsavel'],
        'secretaria','secretária'=>['secretaria'],default=>[]
    };
    if(!$roles)return;
    $stmt=$pdo->prepare('SELECT id FROM usuarios WHERE ativo=1 AND perfil IN ('.implode(',',array_fill(0,count($roles),'?')).')');$stmt->execute($roles);
    primewayNotificationDeliver($pdo,(int)$row['id'],$stmt->fetchAll(PDO::FETCH_COLUMN));
}
function primewayNotificationRead(PDO $pdo,array $user,int $id,bool $read=true): void {
    primewayNotificationTransaction($pdo);
    if(!$read && $user['perfil']!=='admin')primewayNotificationFail('Este perfil só pode marcar como lida.',403);
    // Serializa com cancelamento e com a materialização dos destinatários legados.
    $stmt=$pdo->prepare('SELECT id FROM notificacoes WHERE id=? FOR UPDATE');$stmt->execute([$id]);
    $rows=primewayNotificationRows($pdo,$user,['id'=>$id]);if(!$rows)primewayNotificationFail('Notificação não encontrada.',404);
    $row=$rows[0];primewayNotificationLegacyRecipients($pdo,$row);
    primewayNotificationDeliver($pdo,$id,[(int)$user['id']]);
    $stmt=$pdo->prepare('SELECT lida_em FROM notificacao_destinatarios WHERE notificacao_id=? AND usuario_id=? FOR UPDATE');$stmt->execute([$id,$user['id']]);$before=$stmt->fetchColumn();
    $stmt=$pdo->prepare('UPDATE notificacao_destinatarios SET lida_em='.($read?'COALESCE(lida_em,CURRENT_TIMESTAMP)':'NULL').' WHERE notificacao_id=? AND usuario_id=?');$stmt->execute([$id,$user['id']]);
    if(($before!==null)!==$read)primewayNotificationAudit($pdo,$user,'ALTERAR_LEITURA_NOTIFICACAO',$id,['read'=>$before!==null],['read'=>$read,'usuario_id'=>(int)$user['id']]);
}
function primewayNotificationReadAll(PDO $pdo,array $user): int {
    primewayNotificationTransaction($pdo);$rows=primewayNotificationRows($pdo,$user,['read'=>'unread']);
    foreach($rows as $row)primewayNotificationRead($pdo,$user,(int)$row['id']);return count($rows);
}
function primewayNotificationAdmin(array $user): void {if($user['perfil']!=='admin')primewayNotificationFail('Somente Admin pode gerenciar esta central.',403);}
function primewayNotificationCreate(PDO $pdo,array $user,array $data): int {
    primewayNotificationAdmin($user);primewayNotificationTransaction($pdo);
    foreach(['title'=>190,'message'=>500] as $key=>$max) {
        if(!is_string($data[$key]??null)||trim($data[$key])===''||mb_strlen(trim($data[$key]))>$max)primewayNotificationFail('Título ou mensagem inválidos.');
        $data[$key]=trim($data[$key]);
    }
    if(!in_array($data['type']??null,['Aviso','Sistema'],true))primewayNotificationFail('Tipo inválido.');
    $roles=match($data['audience']??null) {'Todos'=>['admin','professor','secretaria','aluno','responsavel'],
        'Alunos'=>['aluno'],'Responsáveis'=>['responsavel'],'Professores'=>['professor'],'Secretaria'=>['secretaria'],
        default=>primewayNotificationFail('Público inválido.')};
    $event=($data['eventId']??null)===null||($data['eventId']??'')===''?null:primewayNotificationId($data['eventId']);
    if($event!==null){$stmt=$pdo->prepare('SELECT id FROM eventos_calendario WHERE id=?');$stmt->execute([$event]);if(!$stmt->fetchColumn())primewayNotificationFail('Evento não encontrado.',404);}
    $stmt=$pdo->prepare('SELECT id FROM usuarios WHERE ativo=1 AND perfil IN ('.implode(',',array_fill(0,count($roles),'?')).')');$stmt->execute($roles);$recipients=$stmt->fetchAll(PDO::FETCH_COLUMN);
    if(!$recipients)primewayNotificationFail('Nenhum destinatário ativo.',409);
    $stmt=$pdo->prepare("INSERT INTO notificacoes(criado_por_usuario_id,evento_calendario_id,titulo,tipo,publico,mensagem,origem,status,publicada_em)
        VALUES (?,?,?,?,?,?,?,'Publicada',CURRENT_TIMESTAMP)");
    $stmt->execute([$user['id'],$event,$data['title'],$data['type'],$data['audience'],$data['message'],$event===null?'Manual':'Calendario']);$id=(int)$pdo->lastInsertId();
    primewayNotificationDeliver($pdo,$id,$recipients);
    primewayNotificationAudit($pdo,$user,'PUBLICAR_NOTIFICACAO_ADMIN',$id,null,['title'=>$data['title'],'audience'=>$data['audience'],'eventId'=>$event,'recipients'=>count($recipients)]);return $id;
}
function primewayNotificationCancel(PDO $pdo,array $user,int $id): void {
    primewayNotificationAdmin($user);primewayNotificationTransaction($pdo);
    $stmt=$pdo->prepare('SELECT status,evento_calendario_id FROM notificacoes WHERE id=? FOR UPDATE');$stmt->execute([$id]);$before=$stmt->fetch();
    if(!$before)primewayNotificationFail('Notificação não encontrada.',404);
    if($before['status']!=='Publicada')primewayNotificationFail('Notificação não está publicada.',409);
    $pdo->prepare("UPDATE notificacoes SET status='Cancelada' WHERE id=?")->execute([$id]);
    primewayNotificationAudit($pdo,$user,'CANCELAR_NOTIFICACAO_ADMIN',$id,$before,[...$before,'status'=>'Cancelada']);
}
function primewayNotificationErrorResponse(Throwable $error,?PDO $pdo=null): never {
    if($pdo?->inTransaction())$pdo->rollBack();
    if($error instanceof PrimewayNotificationError)primewayResponderJson(['success'=>false,'message'=>$error->getMessage()],$error->getCode());
    error_log('PrimeWay Notificações: '.$error->getMessage());primewayResponderJson(['success'=>false,'message'=>'Não foi possível processar as notificações.'],500);
}
