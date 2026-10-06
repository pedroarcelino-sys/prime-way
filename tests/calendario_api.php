<?php
declare(strict_types=1);

// Rotas e guards reais, sessão somente em memória. Nenhuma escrita autorizada é enviada.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
if ($argc === 1) {
    $total=0;
    $check=static function (bool $ok,string $label) use (&$total): void {
        if (!$ok) throw new RuntimeException($label);
        echo "[OK] $label\n"; $total++;
    };
    foreach (['index','criar','atualizar','status','estado'] as $route) {
        foreach (['anonimo','aluno','professor','responsavel','secretaria','admin'] as $role) {
            if ($route==='estado' && $role!=='admin') continue;
            $process=proc_open([PHP_BINARY,__FILE__,$route,$role],[1=>['pipe','w'],2=>['pipe','w']],$pipes);
            $out=stream_get_contents($pipes[1]); $err=stream_get_contents($pipes[2]);
            fclose($pipes[1]);fclose($pipes[2]);$exit=proc_close($process);
            if($exit!==0 || $err!=='')throw new RuntimeException($err ?: $out);
            $result=json_decode($out,true,512,JSON_THROW_ON_ERROR);
            $expected=$route==='estado'?422:($role==='anonimo'?401:(in_array($role,['admin','professor'],true)&&$route==='index'?200:403));
            $check($result['status']===$expected,"$route / $role retorna HTTP $expected");
            if($role==='admin' && $route==='index') {
                $check(count($result['data']['events'])===3,'GET real retorna três eventos');
                $check($result['data']['canManage']===true,'Admin gerencia');
            }
            if($role==='professor' && $route==='index') $check($result['data']['canManage']===false,'Professor recebe somente leitura');
            if($role==='admin' && !in_array($route,['index','estado'],true)) {
                $check(str_contains($result['data']['message'],'Token'),'escrita sem CSRF bloqueada pelo guard real');
            }
        }
    }
    echo "$total verificações de API aprovadas.\n";exit;
}
final class CalendarTestSession implements SessionHandlerInterface {
    public function open(string $path,string $name):bool{return true;}
    public function close():bool{return true;}
    public function read(string $id):string|false{return '';}
    public function write(string $id,string $data):bool{return true;}
    public function destroy(string $id):bool{return true;}
    public function gc(int $max_lifetime):int|false{return 0;}
}
$route=$argv[1];$role=$argv[2];
if(!in_array($route,['index','criar','atualizar','status','estado'],true))exit(2);
require_once dirname(__DIR__).'/api/_bootstrap.php';
session_set_save_handler(new CalendarTestSession(),true);
primewayIniciarSessao();
if($role!=='anonimo') {
    $stmt=primewayPdo()->prepare('SELECT id FROM usuarios WHERE perfil=? AND ativo=1 ORDER BY id LIMIT 1');$stmt->execute([$role]);
    $_SESSION=['usuario_id'=>(int)$stmt->fetchColumn(),'usuario_email'=>'isolado@local.invalid','usuario_perfil'=>$role];
}
$_GET=['inicio'=>'2026-01-01','fim'=>'2026-12-31'];
$_SERVER['REQUEST_METHOD']=$route==='index'?'GET':'POST';
if($route==='estado'||$role==='professor')$_SERVER['HTTP_X_CSRF_TOKEN']=primewayTokenCsrf();
http_response_code(200);
ob_start();
register_shutdown_function(static function():void {
    $data=json_decode(ob_get_clean(),true);
    echo json_encode(['status'=>http_response_code(),'data'=>$data],JSON_THROW_ON_ERROR);
});
if($route==='estado') {
    // PHP CLI não fornece php://input: injeta somente o corpo, mantendo autorização e CSRF reais.
    $file=dirname(__DIR__).'/api/estado/index.php';
    $source=str_replace(['__DIR__','primewayLerJson()'],[var_export(dirname($file),true),"['key'=>'primewayCalendarEvents','value'=>[]]"],file_get_contents($file));
    eval('?>'.$source);
} else {
    require dirname(__DIR__).'/api/calendario/'.$route.'.php';
}
