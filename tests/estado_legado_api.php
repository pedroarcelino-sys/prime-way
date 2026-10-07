<?php
declare(strict_types=1);
if (PHP_SAPI!=='cli') {http_response_code(404);exit;}
require_once dirname(__DIR__).'/api/_bootstrap.php';
function legacySnapshot(PDO $pdo):string {
    $rows=[];
    foreach ($pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $table)
        $rows[$table]=$pdo->query('SELECT * FROM `'.str_replace('`','``',$table).'` ORDER BY 1')->fetchAll();
    return hash('sha256',json_encode($rows,JSON_THROW_ON_ERROR));
}
if ($argc===1) {
    $pdo=primewayPdo();$before=legacySnapshot($pdo);$total=0;
    $check=static function(bool $ok,string $label)use(&$total):void {if(!$ok)throw new RuntimeException($label);$total++;echo "[OK] $label\n";};
    $run=static function(string $route,string $role,string $mode,int $status)use($check):array {
        $proc=proc_open([PHP_BINARY,__FILE__,$route,$role,$mode],[1=>['pipe','w'],2=>['pipe','w']],$pipes);
        $out=stream_get_contents($pipes[1]);$err=stream_get_contents($pipes[2]);fclose($pipes[1]);fclose($pipes[2]);$exit=proc_close($proc);
        if ($exit!==0||$err!=='')throw new RuntimeException($err?:$out);
        $result=json_decode($out,true,512,JSON_THROW_ON_ERROR);$check($result['status']===$status,"$route/$role/$mode: HTTP $status");return $result['data'];
    };
    $keys=['primewayGuardians','primewayClasses','primewayChatProfessor','primewayNotifications','primewayCalendarEvents','primewaySubjects','primewayStudents'];
    foreach (['admin','secretaria','professor','aluno','responsavel'] as $role) {
        $data=$run('estado',$role,'get',200);
        $check($data['state']===[]&&$data['writableKeys']===[]&&$data['retired']===true,'estado vazio, sem chaves graváveis');
        foreach ($keys as $key)$run('estado',$role,$key,422);
        $run('estado',$role,'no-csrf',403);
        foreach (['turmas','responsaveis','configuracoes','alunos'] as $route)$run($route,$role,'get',$role==='admin'?200:403);
        $session=$run('session',$role,'get',200);$check($session['authenticated']&&$session['usuario']['perfil']===$role,'sessão PHP preserva o perfil');
        $run('chat',$role,'get',$role==='admin'?200:403);
    }
    $run('estado','anonimo','get',401);$run('estado','anonimo','primewayClasses',401);
    foreach (['turmas','responsaveis','configuracoes','alunos','chat'] as $route)$run($route,'anonimo','get',401);
    $data=$run('chat','admin','get',200);$check(count($data['conversations'])===1&&$data['conversations'][0]['unread']===1,'Admin lista somente conversa própria e contador');
    $data=$run('chat','admin','messages',200);$check(count($data['messages'])===1&&$data['messages'][0]['content']==='Mensagem relacional','Admin lê mensagem relacional existente');
    foreach (['foreign','inactive','left','closed'] as $mode)$run('chat','admin',$mode,404);
    $run('chat','admin','send',201);$run('chat','admin','read',200);$run('chat','admin','invalid',422);
    $run('chat','admin','no-csrf',403);$run('chat','admin','foreign-send',404);
    foreach (['professor','secretaria','aluno','responsavel'] as $role)$run('chat',$role,'send',403);
    $check(legacySnapshot($pdo)===$before,'rollback preservou TODAS as tabelas, histórico, usuários e estado legado');
    echo "$total verificações aprovadas.\n";exit;
}
final class LegacySession implements SessionHandlerInterface {
    public function open(string $path,string $name):bool{return true;} public function close():bool{return true;}
    public function read(string $id):string|false{return '';} public function write(string $id,string $data):bool{return true;}
    public function destroy(string $id):bool{return true;} public function gc(int $max_lifetime):int|false{return 0;}
}
[$script,$route,$role,$mode]=$argv;$pdo=primewayPdo();session_set_save_handler(new LegacySession(),true);primewayIniciarSessao();
if ($role!=='anonimo') {$stmt=$pdo->prepare('SELECT id FROM usuarios WHERE perfil=? AND ativo=1 ORDER BY id LIMIT 1');$stmt->execute([$role]);$userId=(int)$stmt->fetchColumn();if(!$userId)throw new RuntimeException('Perfil existente necessário: '.$role);$_SESSION=['usuario_id'=>$userId,'usuario_perfil'=>$role,'usuario_email'=>'teste@local.invalid'];}
$pdo->beginTransaction();$data=['key'=>$mode,'value'=>[['id'=>999,'name'=>'Não sobrescrever']]];$_GET=[];
if ($route==='chat') {
    $admin=(int)$pdo->query("SELECT id FROM usuarios WHERE perfil='admin' AND ativo=1 ORDER BY id LIMIT 1")->fetchColumn();
    $other=(int)$pdo->query("SELECT id FROM usuarios WHERE perfil='secretaria' AND ativo=1 ORDER BY id LIMIT 1")->fetchColumn();
    $pdo->prepare("INSERT INTO conversas(titulo,criada_por_usuario_id) VALUES ('Fixture própria',?)")->execute([$admin]);$own=(int)$pdo->lastInsertId();
    $pdo->prepare('INSERT INTO conversa_participantes(conversa_id,usuario_id) VALUES (?,?),(?,?)')->execute([$own,$admin,$own,$other]);
    $pdo->prepare("INSERT INTO mensagens(conversa_id,remetente_usuario_id,tipo,conteudo) VALUES (?,?,'texto','Mensagem relacional')")->execute([$own,$other]);
    $pdo->prepare("INSERT INTO conversas(titulo,criada_por_usuario_id) VALUES ('Fixture alheia',?)")->execute([$other]);$foreign=(int)$pdo->lastInsertId();
    $pdo->prepare('INSERT INTO conversa_participantes(conversa_id,usuario_id) VALUES (?,?)')->execute([$foreign,$other]);
    if ($mode==='inactive')$pdo->prepare('UPDATE conversa_participantes SET ativo=0 WHERE conversa_id=? AND usuario_id=?')->execute([$own,$admin]);
    if ($mode==='left')$pdo->prepare('UPDATE conversa_participantes SET saiu_em=CURRENT_TIMESTAMP WHERE conversa_id=? AND usuario_id=?')->execute([$own,$admin]);
    if ($mode==='closed')$pdo->prepare('UPDATE conversas SET ativo=0 WHERE id=?')->execute([$own]);
    $id=str_starts_with($mode,'foreign')?$foreign:$own;
    if ($mode!=='get')$_GET=['conversationId'=>$id];
    $data=['conversationId'=>$id,'action'=>$mode==='read'?'read':'send','content'=>$mode==='invalid'?'':'Teste rollback'];
}
$files=['estado'=>'api/estado/index.php','chat'=>'api/chat/central.php','session'=>'api/auth/session.php'];
$file=dirname(__DIR__).'/'.($files[$route]??'api/'.$route.'/index.php');
$get=$mode==='get'||in_array($mode,['messages','foreign','inactive','left','closed'],true);
$_SERVER['REQUEST_METHOD']=$get?'GET':'POST';if($mode!=='no-csrf')$_SERVER['HTTP_X_CSRF_TOKEN']=primewayTokenCsrf();
http_response_code(200);ob_start();register_shutdown_function(static function()use($pdo):void {if($pdo->inTransaction())$pdo->rollBack();$data=json_decode(ob_get_clean(),true);echo json_encode(['status'=>http_response_code(),'data'=>$data],JSON_THROW_ON_ERROR);});
// Guards e SQL reais; somente corpo CLI e COMMIT são adaptados para rollback.
$source=str_replace(['__DIR__','primewayLerJson()','$pdo->beginTransaction();','$pdo->commit();'],[var_export(dirname($file),true),var_export($data,true),'','$pdo->rollBack();'],file_get_contents($file));
eval('?>'.$source);
