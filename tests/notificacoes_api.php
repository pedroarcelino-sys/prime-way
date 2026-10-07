<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require_once dirname(__DIR__).'/api/notificacoes/_notificacoes.php';
function notificationApiSnapshot(PDO $pdo): string {
    $data=[];foreach(['notificacoes','notificacao_destinatarios','eventos_calendario','auditoria','estado_aplicacao','turmas','matriculas','usuarios'] as $table)$data[$table]=$pdo->query("SELECT * FROM $table ORDER BY id")->fetchAll();
    return hash('sha256',json_encode($data,JSON_THROW_ON_ERROR));
}
if($argc===1) {
    $pdo=primewayPdo();$before=notificationApiSnapshot($pdo);$total=0;
    $check=static function(bool $ok,string $label)use(&$total):void{if(!$ok)throw new RuntimeException($label);$total++;echo "[OK] $label\n";};
    $run=static function(string $route,string $role,string $mode,int $expected)use($check):void{
        $process=proc_open([PHP_BINARY,__FILE__,$route,$role,$mode],[1=>['pipe','w'],2=>['pipe','w']],$pipes);
        $out=stream_get_contents($pipes[1]);$err=stream_get_contents($pipes[2]);fclose($pipes[1]);fclose($pipes[2]);$exit=proc_close($process);
        if($exit!==0||$err!=='')throw new RuntimeException($err?:$out);
        $result=json_decode($out,true,512,JSON_THROW_ON_ERROR);
        $check($result['status']===$expected,"$route / $role / $mode: HTTP $expected");
        if($expected===200&&str_ends_with($route,'index'))$check(isset($result['data']['notifications'])||isset($result['data']['inbox'])||isset($result['data']['notices']),'contrato da caixa/painel preservado');
    };
    foreach(['admin','professor','secretaria','aluno','responsavel','anonimo'] as $role) {
        $run('central/index',$role,'get',$role==='anonimo'?401:(in_array($role,['admin','professor'],true)?200:403));
        foreach(['publicar','leitura','marcar_todas_lidas','cancelar'] as $route)$run('central/'.$route,$role,'no-csrf',$role==='anonimo'?401:403);
        $run('estado',$role,'valid',$role==='anonimo'?401:422);
    }
    foreach(['aluno','responsavel','professor','secretaria'] as $role) {
        $run($role.'/index',$role,'get',200);$run($role.'/index','admin','get',403);
        $run($role.'/marcar_lida',$role,'valid',200);$run($role.'/marcar_todas_lidas',$role,'valid',200);
        $run($role.'/marcar_lida',$role,'no-csrf',403);
        $run('navigation/'.$role,$role,'get',200);
    }
    foreach(['publicar','leitura','marcar_todas_lidas','cancelar'] as $route)$run('central/'.$route,'admin','valid',$route==='publicar'?201:200);
    foreach(['professor','secretaria','aluno','responsavel'] as $role)
        foreach(['publicar','leitura','marcar_todas_lidas','cancelar'] as $route)$run('central/'.$route,$role,'valid',403);
    $run('secretaria/publicar','secretaria','valid',201);$run('professor/publicar','professor','valid',201);
    $run('professor/publicar','professor','foreign-class',403);$run('secretaria/publicar','aluno','valid',403);
    $run('professor/publicar','responsavel','valid',403);
    foreach(['aluno','responsavel','secretaria','admin'] as $role)$run('portal/'.$role,$role,'get',200);
    $check(notificationApiSnapshot($pdo)===$before,'todas as rotas de escrita testadas reverteram dados e preservaram usuários');
    echo "$total verificações de API aprovadas.\n";exit;
}
final class NotificationApiSession implements SessionHandlerInterface {
    public function open(string $path,string $name):bool{return true;}public function close():bool{return true;}
    public function read(string $id):string|false{return '';}public function write(string $id,string $data):bool{return true;}
    public function destroy(string $id):bool{return true;}public function gc(int $max_lifetime):int|false{return 0;}
}
[$script,$route,$role,$mode]=$argv;$pdo=primewayPdo();session_set_save_handler(new NotificationApiSession(),true);primewayIniciarSessao();
if($role!=='anonimo'){$stmt=$pdo->prepare('SELECT id FROM usuarios WHERE perfil=? AND ativo=1 ORDER BY id LIMIT 1');$stmt->execute([$role]);$id=(int)$stmt->fetchColumn();if(!$id)throw new RuntimeException('Usuário existente necessário: '.$role);$_SESSION=['usuario_id'=>$id,'usuario_email'=>'teste@local.invalid','usuario_perfil'=>$role];}
$pdo->beginTransaction();$admin=(int)$pdo->query("SELECT id FROM usuarios WHERE perfil='admin' AND ativo=1 ORDER BY id LIMIT 1")->fetchColumn();
$notification=primewayNotificationCreate($pdo,['id'=>$admin,'perfil'=>'admin'],['title'=>'Teste API rollback','type'=>'Aviso','message'=>'Teste','audience'=>'Todos']);
$data=['notificationId'=>$notification,'read'=>true,'title'=>'Teste API rollback','type'=>'Aviso','message'=>'Teste','audience'=>'Todos'];
if(in_array($route,['professor/publicar','secretaria/publicar'],true)) {
    $year=(int)$pdo->query('SELECT id FROM anos_letivos WHERE ativo=1 ORDER BY id LIMIT 1')->fetchColumn();
    $teacher=(int)$pdo->query('SELECT p.id FROM professores p JOIN usuarios u ON u.pessoa_id=p.pessoa_id WHERE u.perfil=\'professor\' AND u.ativo=1 ORDER BY p.id LIMIT 1')->fetchColumn();
    $pdo->prepare("INSERT INTO turmas(ano_letivo_id,nome,serie,turno,status,professor_id) VALUES (?,'Teste API notificação','Teste','Integral','Ativa',?)")->execute([$year,$mode==='foreign-class'?null:$teacher]);$class=(int)$pdo->lastInsertId();
    $student=$pdo->query("SELECT a.id FROM alunos a JOIN usuarios u ON u.pessoa_id=a.pessoa_id WHERE u.perfil='aluno' AND u.ativo=1 ORDER BY a.id LIMIT 1")->fetchColumn();
    $pdo->prepare("INSERT INTO matriculas(aluno_id,turma_id,data_matricula,situacao) VALUES (?,?,CURRENT_DATE,'Ativa')")->execute([$student,$class]);
    $data['classId']=$class;$data['audience']=str_starts_with($route,'professor/')?'students':'all';
}
if($route==='estado')$data=['key'=>'primewayNotifications','value'=>[]];
if(str_starts_with($route,'central/'))$file='api/notificacoes/'.substr($route,8).'.php';
elseif(str_starts_with($route,'navigation/'))$file='api/'.substr($route,11).'/navegacao.php';
elseif(str_starts_with($route,'portal/'))$file='api/'.(substr($route,7)==='admin'?'dashboard':substr($route,7)).'/index.php';
elseif($route==='estado')$file='api/estado/index.php';else $file='api/'.str_replace('/','/notificacoes/',$route).'.php';
$_SERVER['REQUEST_METHOD']=$mode==='get'?'GET':'POST';if($mode!=='no-csrf')$_SERVER['HTTP_X_CSRF_TOKEN']=primewayTokenCsrf();
http_response_code(200);ob_start();
register_shutdown_function(static function()use($pdo):void{if($pdo->inTransaction())$pdo->rollBack();$data=json_decode(ob_get_clean(),true);echo json_encode(['status'=>http_response_code(),'data'=>$data],JSON_THROW_ON_ERROR);});
$path=dirname(__DIR__).'/'.$file;if(!is_file($path))throw new RuntimeException('Rota inválida.');
// Apenas corpo CLI e COMMIT são substituídos. Guards, CSRF, consultas e código da rota são reais.
$source=str_replace(['__DIR__','primewayLerJson()','$pdo->beginTransaction();','$pdo->commit();'],[var_export(dirname($path),true),var_export($data,true),'','$pdo->rollBack();'],file_get_contents($path));
eval('?>'.$source);
