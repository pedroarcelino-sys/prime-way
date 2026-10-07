<?php
declare(strict_types=1);

// Rotas e guards reais, sessão somente em memória. Nenhuma escrita autorizada é enviada.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
if ($argc === 1 || ($argv[1] ?? '') === '--local-data') {
    $total=0;
    $check=static function (bool $ok,string $label) use (&$total): void {
        if (!$ok) throw new RuntimeException($label);
        echo "[OK] $label\n"; $total++;
    };
    foreach (['index','salvar','salvar_vinculo','status','estado'] as $route) {
        foreach (['anonimo','aluno','professor','responsavel','secretaria','admin'] as $role) {
            if ($route==='estado' && $role!=='admin') continue;
            $process=proc_open([PHP_BINARY,__FILE__,$route,$role],[1=>['pipe','w'],2=>['pipe','w']],$pipes);
            $out=stream_get_contents($pipes[1]); $err=stream_get_contents($pipes[2]);
            fclose($pipes[1]);fclose($pipes[2]);$exit=proc_close($process);
            if($exit!==0 || $err!=='')throw new RuntimeException($err ?: $out);
            $result=json_decode($out,true,512,JSON_THROW_ON_ERROR);
            $expected=$route==='estado'?422:($role==='anonimo'?401:($role==='admin'&&$route==='index'?200:403));
            $check($result['status']===$expected,"$route / $role retorna HTTP $expected");
            if($role==='admin' && $route==='index') {
                $subjects=$result['data']['subjects'];
                if (($argv[1] ?? '') === '--local-data') {
                    require_once dirname(__DIR__).'/config/database.php';
                    $pdo=primewayPdo();
                    $ids=array_map('intval',$pdo->query('SELECT id FROM disciplinas ORDER BY id')->fetchAll(PDO::FETCH_COLUMN));
                    $received=array_column($subjects,'id');sort($received);
                    $check($received===$ids,'GET real preserva todas as identidades deste banco');
                    $links=[];foreach($subjects as $subject)foreach($subject['links'] as $link)$links[]=$link['id'];sort($links);
                    $expectedLinks=array_map('intval',$pdo->query('SELECT id FROM turma_disciplinas ORDER BY id')->fetchAll(PDO::FETCH_COLUMN));
                    $check($links===$expectedLinks,'GET real preserva os vínculos deste banco');
                } else {
                    $check(count($subjects)===5,'GET real retorna cinco disciplinas');
                    $check(count(array_filter($subjects,fn($s)=>$s['links']===[]))===4,'GET real preserva quatro sem vínculo');
                    $check(count(array_filter($subjects,fn($s)=>count($s['links'])===1))===1,'GET real identifica vínculo');
                }
            }
            if($role==='admin' && !in_array($route,['index','estado'],true)) {
                $check(str_contains($result['data']['message'],'Token'),'escrita sem CSRF bloqueada pelo guard real');
            }
        }
    }
    echo "$total verificações de API aprovadas.\n";exit;
}
final class DisciplinasTestSession implements SessionHandlerInterface {
    public function open(string $path,string $name):bool{return true;}
    public function close():bool{return true;}
    public function read(string $id):string|false{return '';}
    public function write(string $id,string $data):bool{return true;}
    public function destroy(string $id):bool{return true;}
    public function gc(int $max_lifetime):int|false{return 0;}
}
$route=$argv[1];$role=$argv[2];
if(!in_array($route,['index','salvar','salvar_vinculo','status','estado'],true))exit(2);
require_once dirname(__DIR__).'/api/_bootstrap.php';
session_set_save_handler(new DisciplinasTestSession(),true);
primewayIniciarSessao();
if($role!=='anonimo')$_SESSION=['usuario_id'=>1,'usuario_email'=>'isolado@local.invalid','usuario_perfil'=>$role];
$_SERVER['REQUEST_METHOD']=$route==='index'?'GET':'POST';
if($route==='estado')$_SERVER['HTTP_X_CSRF_TOKEN']=primewayTokenCsrf();
http_response_code(200);
ob_start();
register_shutdown_function(static function():void {
    $data=json_decode(ob_get_clean(),true);
    echo json_encode(['status'=>http_response_code(),'data'=>$data],JSON_THROW_ON_ERROR);
});
if($route==='estado') {
    // PHP CLI não fornece php://input: injeta somente o corpo, mantendo autorização e CSRF reais.
    $file=dirname(__DIR__).'/api/estado/index.php';
    $source=str_replace(['__DIR__','primewayLerJson()'],[var_export(dirname($file),true),"['key'=>'primewaySubjects','value'=>[]]"],file_get_contents($file));
    eval('?>'.$source);
} else {
    require dirname(__DIR__).'/api/disciplinas/'.$route.'.php';
}
