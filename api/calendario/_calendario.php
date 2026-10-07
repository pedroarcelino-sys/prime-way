<?php
declare(strict_types=1);

// Reutiliza datas, horários e contrato de evento sem alterar as rotas da Secretaria.
require_once __DIR__ . '/../secretaria/calendario/_helpers.php';

final class PrimewayCalendarError extends RuntimeException {}
const PRIMEWAY_CALENDAR_TYPES = ['Prova','Atividade','Reunião','Evento','Feriado','Aviso'];
const PRIMEWAY_CALENDAR_STATUS = ['Agendado','Concluído','Cancelado'];
function primewayCalendarFail(string $message, int $status = 422): never {
    throw new PrimewayCalendarError($message, $status);
}
function primewayCalendarId(mixed $value): int {
    if ((!is_int($value) && !is_string($value)) || !preg_match('/^[1-9][0-9]*$/D',(string)$value)
        || filter_var($value,FILTER_VALIDATE_INT) === false) primewayCalendarFail('Identificador inválido.');
    return (int)$value;
}
function primewayCalendarText(mixed $value, int $max, string $label, bool $required = false): string {
    if (!is_string($value)) primewayCalendarFail("$label inválido.");
    $value=trim($value);
    if (mb_strlen($value)>$max || ($required && $value==='')) primewayCalendarFail("Informe $label válido (até $max caracteres).");
    return $value;
}
function primewayCalendarAdmin(array $user): void {
    if (($user['perfil']??'')!=='admin') primewayCalendarFail('Somente Admin pode alterar eventos.',403);
}
function primewayCalendarScope(PDO $pdo, array $user): ?int {
    if (($user['perfil']??'')==='admin') return null;
    if (($user['perfil']??'')!=='professor') primewayCalendarFail('Acesso não autorizado.',403);
    $stmt=$pdo->prepare("SELECT p.id FROM professores p
        JOIN pessoas pe ON pe.id=p.pessoa_id JOIN usuarios u ON u.pessoa_id=p.pessoa_id
        WHERE u.id=:user AND u.perfil='professor' AND u.ativo=1 AND pe.ativo=1 AND p.status='ativo' LIMIT 1");
    $stmt->execute(['user'=>$user['id']]);
    $id=$stmt->fetchColumn();
    if (!$id) primewayCalendarFail('Professor indisponível ou sem cadastro vinculado.',403);
    return (int)$id;
}
function primewayCalendarClassScope(?int $teacher, array &$params): string {
    if ($teacher===null) return '1=1';
    $params['regente']=$teacher; $params['docente']=$teacher;
    // Não apagar da consulta os vínculos históricos apenas por inativação.
    return '(t.professor_id=:regente OR EXISTS (SELECT 1 FROM turma_disciplinas td
        WHERE td.turma_id=t.id AND td.professor_id=:docente))';
}
function primewayCalendarList(PDO $pdo, array $user, array $query): array {
    $teacher=primewayCalendarScope($pdo,$user);
    $today=new DateTimeImmutable('today');
    $start=primewayCalendarText($query['inicio']??$today->modify('first day of this month')->format('Y-m-d'),10,'data inicial',true);
    $end=primewayCalendarText($query['fim']??$today->modify('last day of this month')->format('Y-m-d'),10,'data final',true);
    if (!primewayCalendarioDataValida($start)||!primewayCalendarioDataValida($end)||$end<$start
        || (new DateTimeImmutable($start))->diff(new DateTimeImmutable($end))->days>370) primewayCalendarFail('Período inválido; consulte até 370 dias.',400);
    $params=[]; $scope=primewayCalendarClassScope($teacher,$params);
    $where=['(ec.turma_id IS NULL OR '.$scope.')'];
    foreach (['type'=>['ec.tipo',PRIMEWAY_CALENDAR_TYPES],'status'=>['ec.status',PRIMEWAY_CALENDAR_STATUS]] as $key=>[$column,$allowed]) {
        if (($query[$key]??'')==='') continue;
        if (!in_array($query[$key],$allowed,true)) primewayCalendarFail('Filtro inválido: '.$key,400);
        $where[]="$column=:$key"; $params[$key]=$query[$key];
    }
    if (($query['classId']??'')==='global') $where[]='ec.turma_id IS NULL';
    elseif (($query['classId']??'')!=='') { $where[]='ec.turma_id=:class';$params['class']=primewayCalendarId($query['classId']); }
    $sql="SELECT ec.*, t.nome AS turma_nome, t.status AS turma_status,
        COALESCE(pe.nome,u.nome,'') AS criador_nome FROM eventos_calendario ec
        LEFT JOIN turmas t ON t.id=ec.turma_id
        LEFT JOIN usuarios u ON u.id=ec.criado_por_usuario_id LEFT JOIN pessoas pe ON pe.id=u.pessoa_id
        WHERE ".implode(' AND ',$where);
    $map=static function(array $row):array {
        return [...primewayCalendarioMapearEvento($row),'classStatus'=>$row['turma_status']];
    };
    $stmt=$pdo->prepare($sql.' AND ec.data_evento BETWEEN :inicio AND :fim ORDER BY ec.data_evento,ec.horario_inicio,ec.id');
    $stmt->execute([...$params,'inicio'=>$start,'fim'=>$end]);$events=array_map($map,$stmt->fetchAll());
    $stmt=$pdo->prepare($sql." AND ec.status='Agendado' AND ec.data_evento>=CURRENT_DATE ORDER BY ec.data_evento,ec.horario_inicio,ec.id LIMIT 6");
    $stmt->execute($params);$upcoming=array_map($map,$stmt->fetchAll());
    $params=[];$scope=primewayCalendarClassScope($teacher,$params);
    $stmt=$pdo->prepare("SELECT t.id,t.nome,t.status,al.ano,(t.status='Ativa' AND al.ativo=1) AS disponivel
        FROM turmas t JOIN anos_letivos al ON al.id=t.ano_letivo_id WHERE $scope ORDER BY al.ano DESC,t.nome,t.id");
    $stmt->execute($params);
    $classes=array_map(static fn(array $r):array=>['id'=>(int)$r['id'],'name'=>$r['nome'],'status'=>$r['status'],
        'schoolYear'=>(int)$r['ano'],'available'=>(bool)$r['disponivel']],$stmt->fetchAll());
    return ['success'=>true,'events'=>$events,'upcoming'=>$upcoming,'classes'=>$classes,
        'period'=>['start'=>$start,'end'=>$end],'canManage'=>$teacher===null];
}
function primewayCalendarRow(PDO $pdo, int $id): array {
    $stmt=$pdo->prepare('SELECT * FROM eventos_calendario WHERE id=:id FOR UPDATE');$stmt->execute(['id'=>$id]);
    $row=$stmt->fetch();if(!$row)primewayCalendarFail('Evento não encontrado.',404);return $row;
}
function primewayCalendarPayload(PDO $pdo, array $data, ?array $old = null): array {
    $payload=['titulo'=>primewayCalendarText($data['title']??null,190,'título',true),
        'tipo'=>primewayCalendarText($data['type']??null,60,'tipo',true),
        'data_evento'=>primewayCalendarText($data['date']??null,10,'data',true),
        'local'=>primewayCalendarText($data['location']??'',190,'local'),
        'descricao'=>primewayCalendarText($data['description']??'',10000,'descrição')];
    if(!in_array($payload['tipo'],PRIMEWAY_CALENDAR_TYPES,true))primewayCalendarFail('Tipo de evento inválido.');
    if(!primewayCalendarioDataValida($payload['data_evento']))primewayCalendarFail('Data inválida.');
    foreach(['timeStart'=>'horario_inicio','timeEnd'=>'horario_fim'] as $key=>$column) {
        $value=$data[$key]??'';
        if($value===''){$payload[$column]=null;continue;}
        if(!is_string($value)||!primewayCalendarioHoraValida($value))primewayCalendarFail('Horário inválido.');
        $payload[$column]=$value;
    }
    if($payload['horario_fim']!==null && ($payload['horario_inicio']===null||$payload['horario_fim']<=$payload['horario_inicio']))
        primewayCalendarFail('O término deve ser posterior ao início, no mesmo dia.');
    // Em edição, omissão não pode desvincular silenciosamente a turma histórica.
    if(!array_key_exists('classId',$data))primewayCalendarFail('Informe a turma ou selecione Toda a escola.');
    $class=$data['classId'];$payload['turma_id']=($class===null||$class==='')?null:primewayCalendarId($class);
    if($payload['turma_id']!==null) {
        $stmt=$pdo->prepare('SELECT t.status,al.ativo FROM turmas t JOIN anos_letivos al ON al.id=t.ano_letivo_id WHERE t.id=:id FOR UPDATE');
        $stmt->execute(['id'=>$payload['turma_id']]);$row=$stmt->fetch();
        if(!$row)primewayCalendarFail('Turma não encontrada.',404);
        $retained=$old!==null && (int)$old['turma_id']===$payload['turma_id'];
        if(!$retained && ($row['status']!=='Ativa'||(int)$row['ativo']!==1))primewayCalendarFail('A turma deve estar ativa no ano letivo ativo.',409);
    }
    return $payload;
}
function primewayCalendarAudit(PDO $pdo,array $user,string $action,int $id,?array $before,array $after):void {
    $keys=array_flip(['id','turma_id','criado_por_usuario_id','titulo','tipo','data_evento','horario_inicio','horario_fim','local','descricao','status']);
    $stmt=$pdo->prepare("INSERT INTO auditoria (usuario_id,acao,entidade,registro_id,dados_anteriores,dados_novos)
        VALUES (:user,:action,'eventos_calendario',:id,:before,:after)");
    $stmt->execute(['user'=>$user['id'],'action'=>$action,'id'=>$id,
        'before'=>$before===null?null:json_encode(array_intersect_key($before,$keys),JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE),
        'after'=>json_encode(array_intersect_key($after,$keys),JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE)]);
}
// Chamadas em transação pela rota; testes utilizam a mesma implementação com rollback.
function primewayCalendarSave(PDO $pdo,array $user,array $data,bool $editing=false):array {
    primewayCalendarAdmin($user);
    $id=$editing?primewayCalendarId($data['id']??null):null;
    $old=$id===null?null:primewayCalendarRow($pdo,$id);
    if($old!==null && $old['status']!=='Agendado')primewayCalendarFail('Somente eventos agendados podem ser editados.',409);
    $payload=primewayCalendarPayload($pdo,$data,$old);
    if($id===null) {
        $stmt=$pdo->prepare("INSERT INTO eventos_calendario (turma_id,criado_por_usuario_id,titulo,tipo,data_evento,horario_inicio,horario_fim,local,descricao,status)
            VALUES (:turma_id,:user,:titulo,:tipo,:data_evento,:horario_inicio,:horario_fim,:local,:descricao,'Agendado')");
        $stmt->execute([...$payload,'user'=>$user['id']]);$id=(int)$pdo->lastInsertId();
    } else {
        $stmt=$pdo->prepare('UPDATE eventos_calendario SET turma_id=:turma_id,titulo=:titulo,tipo=:tipo,data_evento=:data_evento,
            horario_inicio=:horario_inicio,horario_fim=:horario_fim,local=:local,descricao=:descricao WHERE id=:id');
        $stmt->execute([...$payload,'id'=>$id]);
    }
    primewayCalendarAudit($pdo,$user,$editing?'ALTERAR_EVENTO':'CRIAR_EVENTO',$id,$old,primewayCalendarRow($pdo,$id));
    return primewayCalendarioBuscarEvento($pdo,$id);
}
function primewayCalendarStatus(PDO $pdo,array $user,array $data):array {
    primewayCalendarAdmin($user);$id=primewayCalendarId($data['id']??null);$status=$data['status']??null;
    if(!in_array($status,['Concluído','Cancelado'],true))primewayCalendarFail('Status inválido.');
    $old=primewayCalendarRow($pdo,$id);
    if($old['status']!=='Agendado')primewayCalendarFail('Este evento não está mais agendado.',409);
    $stmt=$pdo->prepare('UPDATE eventos_calendario SET status=:status WHERE id=:id');$stmt->execute(['status'=>$status,'id'=>$id]);
    primewayCalendarAudit($pdo,$user,'ALTERAR_STATUS_EVENTO',$id,$old,primewayCalendarRow($pdo,$id));
    return primewayCalendarioBuscarEvento($pdo,$id);
}
function primewayCalendarErrorResponse(Throwable $error,?PDO $pdo=null):never {
    if($pdo?->inTransaction())$pdo->rollBack();
    if($error instanceof PrimewayCalendarError)primewayResponderJson(['success'=>false,'message'=>$error->getMessage()],$error->getCode());
    error_log('PrimeWay calendário: '.$error->getMessage());
    primewayResponderJson(['success'=>false,'message'=>'Não foi possível processar o calendário.'],500);
}
