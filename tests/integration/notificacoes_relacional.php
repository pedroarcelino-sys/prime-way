<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'||!in_array('--rollback',$argv,true))exit("Uso: php tests/integration/notificacoes_relacional.php --rollback\n");
require_once dirname(__DIR__,2).'/api/notificacoes/_notificacoes.php';
$pdo=primewayPdo();$total=0;
function notificationCheck(bool $ok,string $label): void {global $total;if(!$ok)throw new RuntimeException($label);$total++;echo "[OK] $label\n";}
function notificationReject(callable $fn,int $status,string $label): void {try{$fn();}catch(PrimewayNotificationError $e){notificationCheck($e->getCode()===$status,$label);return;}throw new RuntimeException('Aceitou: '.$label);}
function notificationSnapshot(PDO $pdo): string {
    $rows=[];foreach(['notificacoes','notificacao_destinatarios','eventos_calendario','estado_aplicacao','auditoria','usuarios'] as $table)$rows[$table]=$pdo->query("SELECT * FROM $table ORDER BY id")->fetchAll();
    return hash('sha256',json_encode($rows,JSON_THROW_ON_ERROR));
}
$users=[];foreach(['admin','secretaria','professor','aluno','responsavel'] as $role){$s=$pdo->prepare('SELECT id FROM usuarios WHERE perfil=? AND ativo=1 ORDER BY id LIMIT 1');$s->execute([$role]);$id=$s->fetchColumn();if(!$id)throw new RuntimeException('Usuário existente necessário: '.$role);$users[$role]=['id'=>(int)$id,'perfil'=>$role];}
$before=notificationSnapshot($pdo);$pdo->beginTransaction();
try {
    $admin=$users['admin'];$payload=['title'=>'Teste rollback','type'=>'Aviso','message'=>'Sem inferir público pelo texto','audience'=>'Todos'];
    $id=primewayNotificationCreate($pdo,$admin,$payload);
    foreach($users as $role=>$user) {
        $rows=primewayNotificationList($pdo,$user,['id'=>$id]);notificationCheck(count($rows)===1&&!$rows[0]['read'],"$role recebe a publicação e leitura inicial individual");
        $count=primewayNotificationUnread($pdo,$user);primewayNotificationRead($pdo,$user,$id);
        notificationCheck(primewayNotificationList($pdo,$user,['id'=>$id])[0]['read'],"$role marca como lida");
        notificationCheck(primewayNotificationUnread($pdo,$user)===$count-1,"$role contador de não lidas atualizado");
        primewayNotificationRead($pdo,$user,$id);
        if($role!=='admin') {
            notificationReject(fn()=>primewayNotificationCreate($pdo,$user,$payload),403,"$role não usa publicação da central Admin");
            notificationReject(fn()=>primewayNotificationCancel($pdo,$user,$id),403,"$role não cancela globalmente");
            notificationReject(fn()=>primewayNotificationRead($pdo,$user,$id,false),403,"$role não ganha ação não lida ausente no portal");
        }
    }
    primewayNotificationRead($pdo,$admin,$id,false);
    notificationCheck(!primewayNotificationList($pdo,$admin,['id'=>$id])[0]['read']&&primewayNotificationList($pdo,$users['aluno'],['id'=>$id])[0]['read'],'não leitura do Admin não altera leitura do Aluno');
    $s=$pdo->prepare('SELECT COUNT(*) FROM notificacao_destinatarios WHERE notificacao_id=?');$s->execute([$id]);$count=(int)$s->fetchColumn();
    primewayNotificationDeliver($pdo,$id,[$users['aluno']['id'],$users['aluno']['id']]);$s->execute([$id]);notificationCheck((int)$s->fetchColumn()===$count,'entrega repetida não duplica destinatários nem leitura');
    // Público amplo não substitui destinatário explícito de outro usuário.
    $pdo->prepare("INSERT INTO notificacoes(titulo,tipo,publico,mensagem,status,publicada_em) VALUES ('Somente aluno','Aviso','Todos','Professores, responsáveis e secretaria no texto','Publicada',CURRENT_TIMESTAMP)")->execute();$private=(int)$pdo->lastInsertId();
    primewayNotificationDeliver($pdo,$private,[$users['aluno']['id']]);
    foreach(['professor','responsavel','secretaria'] as $role) {
        notificationCheck(primewayNotificationList($pdo,$users[$role],['id'=>$private])===[],"$role não recebe notificação de outro usuário nem pelo título/texto/público amplo");
        notificationReject(fn()=>primewayNotificationRead($pdo,$users[$role],$private),404,"$role não marca notificação alheia");
    }
    notificationCheck(count(primewayNotificationList($pdo,$admin,['id'=>$private]))===1,'Admin mantém a gestão de todos os avisos');
    $pdo->prepare("UPDATE notificacao_destinatarios SET excluida_em=CURRENT_TIMESTAMP WHERE notificacao_id=? AND usuario_id=?")->execute([$private,$users['aluno']['id']]);
    notificationCheck(primewayNotificationList($pdo,$users['aluno'],['id'=>$private])===[],'exclusão individual histórica não reaparece');
    notificationReject(fn()=>primewayNotificationRead($pdo,$users['aluno'],$private),404,'leitura não ressuscita exclusão individual');
    $pdo->prepare("INSERT INTO notificacoes(titulo,tipo,publico,mensagem,status,publicada_em) VALUES ('Histórico sem destinatários','Sistema','Todos','Antigo','Publicada','2020-01-01')")->execute();$legacy=(int)$pdo->lastInsertId();
    foreach($users as $role=>$user)notificationCheck(count(primewayNotificationList($pdo,$user,['id'=>$legacy]))===1,"$role consulta aviso antigo sem destinatários");
    primewayNotificationRead($pdo,$users['aluno'],$legacy);
    notificationCheck(!primewayNotificationList($pdo,$users['professor'],['id'=>$legacy])[0]['read'],'materialização de aviso antigo mantém outros usuários não lidos');
    $s->execute([$legacy]);notificationCheck((int)$s->fetchColumn()===count($pdo->query('SELECT id FROM usuarios WHERE ativo=1')->fetchAll()),'aviso antigo entrega destinatários uma vez pelo público estruturado');
    $pdo->prepare("INSERT INTO eventos_calendario(titulo,tipo,data_evento,status) VALUES ('Evento preservado','Evento','2020-01-01','Cancelado')")->execute();$event=(int)$pdo->lastInsertId();
    $linked=primewayNotificationCreate($pdo,$admin,[...$payload,'eventId'=>$event,'title'=>'Evento fora da consulta']);
    notificationCheck(primewayNotificationList($pdo,$users['responsavel'],['id'=>$linked])[0]['eventId']===$event,'vínculo opcional com evento antigo/cancelado preservado');
    primewayNotificationList($pdo,$users['responsavel'],['search'=>'Nada encontrado']);
    notificationCheck(count(primewayNotificationList($pdo,$users['responsavel'],['id'=>$linked]))===1,'ausência em consulta não exclui aviso relacionado');
    notificationCheck(primewayNotificationList($pdo,$admin,['id'=>$id])[0]['eventId']===null,'evento é opcional');
    notificationReject(fn()=>primewayNotificationCreate($pdo,$admin,[...$payload,'eventId'=>2147483647]),404,'evento inexistente rejeitado');
    foreach([['title'=>''],['message'=>str_repeat('x',501)],['type'=>'Prova'],['audience'=>'Personalizado'],['eventId'=>true]] as $bad)notificationReject(fn()=>primewayNotificationCreate($pdo,$admin,[...$payload,...$bad]),422,'validação: '.array_key_first($bad));
    notificationCheck(count(primewayNotificationList($pdo,$admin,['id'=>$legacy,'type'=>'Sistema','search'=>'Histórico','read'=>'unread']))===1,'filtros tipo, busca e não lida');
    notificationCheck(primewayNotificationList($pdo,$admin,['id'=>$legacy,'read'=>'read'])===[],'filtro lidas é individual');
    notificationReject(fn()=>primewayNotificationList($pdo,$admin,['read'=>'invalid']),422,'filtro inválido rejeitado');
    $linkedBefore=$pdo->query("SELECT * FROM notificacao_destinatarios WHERE notificacao_id=$linked ORDER BY id")->fetchAll();
    primewayNotificationCancel($pdo,$admin,$linked);
    notificationCheck(primewayNotificationList($pdo,$users['responsavel'],['id'=>$linked])===[],'cancelamento retira entrega ativa');
    $history=primewayNotificationList($pdo,$admin,['id'=>$linked,'history'=>'1']);notificationCheck(count($history)===1&&$history[0]['eventId']===$event&&$history[0]['status']==='Cancelada','histórico cancelado consultável sem apagar vínculo');
    notificationCheck($linkedBefore===$pdo->query("SELECT * FROM notificacao_destinatarios WHERE notificacao_id=$linked ORDER BY id")->fetchAll(),'cancelamento preserva destinatários e leituras');
    notificationCheck(primewayNotificationList($pdo,$users['responsavel'],['id'=>$linked,'history'=>'1'])===[],'parâmetro history não amplia autorização');
    primewayNotificationReadAll($pdo,$users['professor']);notificationCheck(primewayNotificationUnread($pdo,$users['professor'])===0,'marcar todas atua na caixa do próprio Professor');
    notificationCheck(!primewayNotificationList($pdo,$admin,['id'=>$id])[0]['read'],'marcar todas do Professor não altera Admin');
    $s=$pdo->prepare("SELECT COUNT(*) FROM auditoria WHERE entidade='notificacoes' AND registro_id=? AND acao='PUBLICAR_NOTIFICACAO_ADMIN'");$s->execute([$id]);notificationCheck((int)$s->fetchColumn()===1,'publicação auditada');
    $s->execute([$linked]);notificationCheck((int)$s->fetchColumn()===1,'publicação relacionada auditada');
}finally{$pdo->rollBack();}
notificationCheck(notificationSnapshot($pdo)===$before,'rollback preserva notificações, destinatários, eventos, estado, auditoria e usuários');
echo "$total verificações aprovadas.\n";
