<?php
declare(strict_types=1);
if (PHP_SAPI!=='cli') {http_response_code(404);exit;}
require_once dirname(__DIR__).'/api/_bootstrap.php';
function closingSnapshot(PDO $pdo):string {
    $rows=[];foreach($pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $table)
        $rows[$table]=$pdo->query('SELECT * FROM `'.str_replace('`','``',$table).'` ORDER BY 1')->fetchAll();
    return hash('sha256',json_encode($rows,JSON_THROW_ON_ERROR));
}
if ($argc===1) {
    $pdo=primewayPdo();$before=closingSnapshot($pdo);$total=0;
    $check=static function(bool $ok,string $label)use(&$total):void{if(!$ok)throw new RuntimeException($label);echo "[OK] $label\n";$total++;};
    $run=static function(string $route,string $role,string $mode,int $status=200)use($check):array{
        $proc=proc_open([PHP_BINARY,__FILE__,$route,$role,$mode],[1=>['pipe','w'],2=>['pipe','w']],$pipes);
        $out=stream_get_contents($pipes[1]);$err=stream_get_contents($pipes[2]);fclose($pipes[1]);fclose($pipes[2]);$exit=proc_close($proc);
        if($exit!==0||$err!=='')throw new RuntimeException($err?:$out);
        $result=json_decode($out,true,512,JSON_THROW_ON_ERROR);$check($result['status']===$status,"$route/$role/$mode: HTTP $status (recebido {$result['status']})");return $result;
    };
    $groups=[
        'admin'=>['dashboard/index','professores/index','alunos/index','responsaveis/index','turmas/index','turmas/alunos','disciplinas/index','calendario/index','notificacoes/index','configuracoes/index','chat/central'],
        'professor'=>['professor/index','professor/navegacao','professor/dados/index','professor/turmas/index','professor/atividades/index','professor/notas/index','professor/frequencia/index','professor/notificacoes/index','professor/chat/index'],
        'secretaria'=>['secretaria/index','secretaria/navegacao','secretaria/alunos/index','secretaria/professores/index','secretaria/responsaveis/index','secretaria/turmas/index','secretaria/matriculas/index','secretaria/calendario/index','secretaria/notificacoes/index','secretaria/chat/index','secretaria/saida_segura/index'],
        'aluno'=>['aluno/index','aluno/navegacao','aluno/dados/index','aluno/atividades/index','aluno/notas/index','aluno/frequencia/index','aluno/notificacoes/index','aluno/chat/index','aluno/boletim/index'],
        'responsavel'=>['responsavel/index','responsavel/navegacao','responsavel/dados/index','responsavel/alunos/index','responsavel/atividades/index','responsavel/notas/index','responsavel/frequencia/index','responsavel/notificacoes/index','responsavel/chat/index','responsavel/saida_segura/index','responsavel/boletim/index']
    ];
    foreach($groups as $role=>$routes)foreach($routes as $route){$run($route,$role,'get');$run($route,'anonimo','get',401);}
    $run('dashboard/index','admin','forged-role',403);$run('dashboard/index','admin','missing-account',401);
    $session=$run('auth/session','admin','forged-role');$check($session['data']['usuario']['perfil']==='aluno','sessão publica perfil atual do banco');
    $session=$run('auth/session','admin','missing-account');$check(!$session['data']['authenticated'],'sessão inexistente é revogada');
    $session=$run('auth/session','anonimo','get');$check(!$session['data']['authenticated']&&preg_match('/^[a-f0-9]{64}$/',$session['data']['csrfToken'])===1,'sessão anônima fornece CSRF para autenticação');
    $run('auth/logout','admin','no-csrf',403);$run('auth/logout','admin','post');
    $run('aluno/boletim/index','aluno','foreign-student',403);$run('responsavel/boletim/index','responsavel','foreign-student',403);
    $run('responsavel/boletim/index','responsavel','invalid-student',422);
    foreach(['aluno','responsavel'] as $role){$r=$run($role.'/boletim/index',$role,'fixtures');$check(count($r['data']['reports'])===1&&count($r['data']['reports'][0]['grades'])===1,'boletim usa notas relacionais '.$role);$check($r['data']['reports'][0]['attendance'][0]['absent']==1,'boletim usa frequência '.$role);}
    $r=$run('dashboard/index','admin','fixtures');$check($r['data']['indicators']['studentsAttention']===1,'dashboard usa média configurada 9');$check($r['data']['indicators']['lowAttendance']===1,'dashboard usa frequência configurada');
    $r=$run('dashboard/index','admin','missing-grade');$check($r['data']['indicators']['pendingGrades']>=1,'dashboard inclui avaliação sem nota nas pendências');
    $r=$run('professor/atividades/corrigir','professor','post',200);$check($r['effects']['grade']==7.0&&$r['effects']['submission']==='Corrigida','correção e nota persistem atomicamente antes do rollback');
    $run('professor/atividades/corrigir','professor','invalid-number',400);$run('professor/atividades/corrigir','professor','invalid-feedback',422);
    $run('professor/atividades/corrigir','professor','lower-maximum',409);
    foreach(['professor/notas/salvar_notas','professor/frequencia/salvar_frequencia','professor/atividades/corrigir'] as $route){$run($route,'professor','no-csrf',403);$run($route,'aluno','post',403);}
    $r=$run('professor/notas/salvar_notas','professor','post');$check($r['effects']['grade']==7.0,'lançamento de nota persiste');
    $r=$run('professor/frequencia/salvar_frequencia','professor','post');$check($r['effects']['attendance']==='Presente','frequência persiste');
    $r=$run('aluno/atividades/salvar-rascunho','aluno','post');$check($r['effects']['content']==='Resposta relacional','rascunho do Aluno persiste');
    $r=$run('aluno/atividades/enviar','aluno','post');$check($r['effects']['submission']==='Entregue','envio de atividade persiste');
    foreach(['professor/atividades/salvar','professor/notas/salvar_avaliacao','professor/frequencia/salvar_aula'] as $route){$run($route,'professor','create',201);$run($route,'aluno','create',403);$run($route,'professor','no-csrf',403);}
    $check(closingSnapshot($pdo)===$before,'rollback preservou TODAS as tabelas, usuários, senhas e histórico');
    echo "$total verificações de fechamento aprovadas.\n";exit;
}
final class ClosingSession implements SessionHandlerInterface {
    public function open(string $path,string $name):bool{return true;}public function close():bool{return true;}
    public function read(string $id):string|false{return '';}public function write(string $id,string $data):bool{return true;}
    public function destroy(string $id):bool{return true;}public function gc(int $max_lifetime):int|false{return 0;}
}
[$script,$route,$role,$mode]=$argv;$pdo=primewayPdo();session_set_save_handler(new ClosingSession(),true);primewayIniciarSessao();
if($role!=='anonimo'){$stmt=$pdo->prepare('SELECT id FROM usuarios WHERE perfil=? AND ativo=1 ORDER BY id LIMIT 1');$stmt->execute([$mode==='forged-role'?'aluno':$role]);$id=(int)$stmt->fetchColumn();if(!$id)throw new RuntimeException('Perfil necessário: '.$role);if($mode==='missing-account')$id=1000000000;$_SESSION=['usuario_id'=>$id,'usuario_perfil'=>$role,'usuario_email'=>'teste@local.invalid'];}
$_GET=['format'=>'json'];if($mode==='foreign-student')$_GET['studentId']=1000000000;if($mode==='invalid-student')$_GET['studentId']='inválido';
$data=[];$effects=null;$pdo->beginTransaction();
$fixture=!in_array($mode,['get','forged-role','missing-account','foreign-student','invalid-student','no-csrf'],true)&&$route!=='auth/logout';
if($fixture){
    $year=(int)$pdo->query('SELECT id FROM anos_letivos WHERE ativo=1 ORDER BY ano DESC LIMIT 1')->fetchColumn();
    $period=(int)$pdo->query("SELECT id FROM periodos_letivos WHERE ano_letivo_id=$year ORDER BY ordem LIMIT 1")->fetchColumn();
    $teacher=(int)$pdo->query("SELECT pr.id FROM professores pr JOIN usuarios u ON u.pessoa_id=pr.pessoa_id WHERE u.perfil='professor' AND u.ativo=1 ORDER BY pr.id LIMIT 1")->fetchColumn();
    $student=(int)$pdo->query("SELECT a.id FROM alunos a JOIN usuarios u ON u.pessoa_id=a.pessoa_id WHERE u.perfil='aluno' AND u.ativo=1 ORDER BY a.id LIMIT 1")->fetchColumn();
    $subject=(int)$pdo->query("SELECT id FROM disciplinas WHERE status='Ativa' ORDER BY id LIMIT 1")->fetchColumn();
    $pdo->prepare("INSERT INTO turmas(ano_letivo_id,nome,serie,turno,status,professor_id) VALUES (?,'Fixture fechamento','Teste','Integral','Ativa',?)")->execute([$year,$teacher]);$class=(int)$pdo->lastInsertId();
    $pdo->prepare("INSERT INTO turma_disciplinas(turma_id,disciplina_id,professor_id,carga_horaria,status) VALUES (?,?,?,40,'Ativa')")->execute([$class,$subject,$teacher]);$link=(int)$pdo->lastInsertId();
    $pdo->prepare("INSERT INTO matriculas(aluno_id,turma_id,data_matricula,situacao) VALUES (?,?,CURRENT_DATE,'Ativa')")->execute([$student,$class]);$enrollment=(int)$pdo->lastInsertId();
    $pdo->prepare("INSERT INTO atividades(turma_disciplina_id,periodo_letivo_id,titulo,tipo_entrega,status,data_publicacao,data_entrega,permite_atraso,permite_reenvio) VALUES (?,?,'Fixture fechamento','Texto','Publicada',CURRENT_TIMESTAMP,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 1 DAY),1,1)")->execute([$link,$period]);$activity=(int)$pdo->lastInsertId();
    $pdo->prepare("INSERT INTO entregas_atividades(atividade_id,matricula_id,conteudo,status,entregue_em) VALUES (?,?,'Resposta relacional','Entregue',CURRENT_TIMESTAMP)")->execute([$activity,$enrollment]);$submission=(int)$pdo->lastInsertId();
    $pdo->prepare("INSERT INTO avaliacoes(turma_disciplina_id,periodo_letivo_id,atividade_id,titulo,tipo,valor_maximo,peso,data_avaliacao,status) VALUES (?,?,?,'Fixture fechamento','Atividade',10,1,CURRENT_DATE,'Finalizada')")->execute([$link,$period,$activity]);$evaluation=(int)$pdo->lastInsertId();
    $pdo->prepare('INSERT INTO notas(avaliacao_id,matricula_id,valor) VALUES (?,?,8)')->execute([$evaluation,$enrollment]);
    $pdo->prepare("INSERT INTO aulas(turma_disciplina_id,periodo_letivo_id,data_aula,conteudo,status) VALUES (?,?,CURRENT_DATE,'Fixture fechamento','Realizada')")->execute([$link,$period]);$lesson=(int)$pdo->lastInsertId();
    $pdo->prepare("INSERT INTO frequencias(aula_id,matricula_id,situacao) VALUES (?,?,'Falta')")->execute([$lesson,$enrollment]);
    $pdo->prepare("INSERT INTO configuracoes_sistema(grupo,chave,valor,tipo) VALUES ('academico','media_aprovacao','9','decimal'),('academico','frequencia_minima','90','decimal') ON DUPLICATE KEY UPDATE valor=VALUES(valor)")->execute();
    $data=['activityId'=>$activity,'submissionId'=>$submission,'grade'=>7,'maximum'=>10,'feedback'=>'Correção segura','evaluationId'=>$evaluation,'grades'=>[['enrollmentId'=>$enrollment,'value'=>7,'observation'=>'Teste']], 'lessonId'=>$lesson,'records'=>[['enrollmentId'=>$enrollment,'status'=>'Presente','observation'=>'Teste']],'content'=>'Resposta relacional','link'=>''];
    if($mode==='invalid-number')$data['grade']='não numérico';if($mode==='invalid-feedback')$data['feedback']=[];if($mode==='lower-maximum'){$data['grade']=5;$data['maximum']=6;}
    if($mode==='missing-grade')$pdo->prepare('DELETE FROM notas WHERE avaliacao_id=?')->execute([$evaluation]);
    if(str_starts_with($route,'aluno/atividades/'))$pdo->prepare("UPDATE entregas_atividades SET status='Rascunho' WHERE id=?")->execute([$submission]);
    if($mode==='create'){
        $testDate=(string)$pdo->query("SELECT data_inicio FROM periodos_letivos WHERE id=$period")->fetchColumn();
        $data=['classSubjectId'=>$link,'periodId'=>$period,'title'=>'Teste automatizado','description'=>'Registro temporário','date'=>$testDate,'content'=>'Conteúdo temporário'];
        if($route==='professor/atividades/salvar')$data+=['submissionType'=>'Texto','status'=>'Publicada','dueAt'=>date('Y-m-d H:i:s',time()+86400)];
        if($route==='professor/notas/salvar_avaliacao')$data+=['type'=>'Prova','status'=>'Planejada','maximumValue'=>10,'weight'=>1];
        if($route==='professor/frequencia/salvar_aula')$data+=['status'=>'Realizada','startTime'=>'14:00','endTime'=>'15:00'];
    }
}
$file=dirname(__DIR__).'/api/'.$route.'.php';
$get=in_array($mode,['get','fixtures','missing-grade','forged-role','missing-account','foreign-student','invalid-student'],true);
$_SERVER['REQUEST_METHOD']=$get?'GET':'POST';if($mode!=='no-csrf')$_SERVER['HTTP_X_CSRF_TOKEN']=primewayTokenCsrf();
http_response_code(200);ob_start();register_shutdown_function(static function()use($pdo,&$effects):void{if($pdo->inTransaction())$pdo->rollBack();$out=ob_get_clean();echo json_encode(['status'=>http_response_code(),'data'=>json_decode($out,true),'effects'=>$effects],JSON_THROW_ON_ERROR);});
$capture=$fixture?'$effects=["grade"=>(float)$pdo->query("SELECT valor FROM notas WHERE avaliacao_id='.$evaluation.' AND matricula_id='.$enrollment.'")->fetchColumn(),"submission"=>$pdo->query("SELECT status FROM entregas_atividades WHERE id='.$submission.'")->fetchColumn(),"content"=>$pdo->query("SELECT conteudo FROM entregas_atividades WHERE id='.$submission.'")->fetchColumn(),"attendance"=>$pdo->query("SELECT situacao FROM frequencias WHERE aula_id='.$lesson.' AND matricula_id='.$enrollment.'")->fetchColumn()];':'';
if(!$fixture)$capture='';
$source=str_replace(['__DIR__','primewayLerJson()','$pdo->beginTransaction();','$pdo->commit();'],[var_export(dirname($file),true),var_export($data,true),'',$capture.'$pdo->rollBack();'],file_get_contents($file));
eval('?>'.$source);
