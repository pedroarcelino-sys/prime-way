<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require_once dirname(__DIR__).'/config/database.php';
require_once dirname(__DIR__).'/config/session.php';
require_once dirname(__DIR__).'/config/storage.php';
require_once dirname(__DIR__).'/api/chat/_attachments.php';
require_once dirname(__DIR__).'/database/export_schema.php';
$total=0;
function productionCheck(bool $ok,string $label):void{global $total;if(!$ok)throw new RuntimeException($label);$total++;echo "[OK] $label\n";}
function productionReject(callable $action,string $label):void{try{$action();}catch(RuntimeException $error){productionCheck(true,$label);return;}throw new RuntimeException('Aceitou: '.$label);}
final class ProductionTlsStatement extends PDOStatement {
    public function __construct(private string $cipher){}
    public function fetch(int $mode=PDO::FETCH_DEFAULT,int $cursorOrientation=PDO::FETCH_ORI_NEXT,int $cursorOffset=0):mixed{return ['Ssl_cipher',$this->cipher];}
}
final class ProductionTlsPdo extends PDO {
    public function __construct(private string $cipher){}
    public function query(string $query,?int $fetchMode=null,mixed ...$fetchModeArgs):PDOStatement|false{return new ProductionTlsStatement($this->cipher);}
}
$original=[];foreach(['PRIMEWAY_APP_ENV','PRIMEWAY_SESSION_SECURE','PRIMEWAY_STORAGE_DIR'] as $key)$original[$key]=getenv($key);
$base=sys_get_temp_dir().DIRECTORY_SEPARATOR.'primeway-security-'.bin2hex(random_bytes(8));mkdir($base,0700);
try {
    putenv('PRIMEWAY_APP_ENV=production');putenv('PRIMEWAY_SESSION_SECURE=0');unset($_SERVER['HTTPS']);
    productionCheck(primewayCookieSecure(),'produção força cookie Secure');
    putenv('PRIMEWAY_APP_ENV=development');$_SERVER['HTTP_X_FORWARDED_PROTO']='https';
    productionCheck(!primewayCookieSecure(),'header forwarded isolado não promove confiança TLS');
    $_SERVER['HTTPS']='on';productionCheck(primewayCookieSecure(),'HTTPS direto habilita Secure');unset($_SERVER['HTTPS']);
    putenv('PRIMEWAY_SESSION_SECURE=1');productionCheck(primewayCookieSecure(),'proxy pode usar configuração explícita');
    putenv('PRIMEWAY_APP_ENV=production');$_SERVER['HTTPS']='on';$headers=primewaySecurityHeaders();
    productionCheck(isset($headers['Strict-Transport-Security']),'HSTS com produção/HTTPS');
    productionCheck($headers['X-Content-Type-Options']==='nosniff'&&$headers['X-Frame-Options']==='SAMEORIGIN','headers contra sniffing e enquadramento');
    productionCheck(str_contains($headers['Permissions-Policy'],'geolocation=(self)')&&str_contains($headers['Permissions-Policy'],'microphone=(self)'),'GPS e microfone preservados');
    productionCheck(str_contains($headers['Content-Security-Policy'],"form-action 'self'")&&str_contains($headers['Content-Security-Policy'],'https://unpkg.com'),'CSP compatível com formulários e Leaflet');
    putenv('PRIMEWAY_STORAGE_DIR');productionReject(fn()=>primewayChatStorageRoot(),'produção não usa storage temporário');
    putenv('PRIMEWAY_STORAGE_DIR=relative');productionReject(fn()=>primewayStorageBase(),'storage relativo bloqueado');
    putenv('PRIMEWAY_STORAGE_DIR='.dirname(__DIR__));productionReject(fn()=>primewayStorageBase(),'storage público bloqueado');
    putenv('PRIMEWAY_STORAGE_DIR='.$base);productionCheck(primewayStorageBase()===realpath($base),'storage privado persistente aceito');
    productionCheck(primewayChatStorageRoot()===$base.DIRECTORY_SEPARATOR.'chat','Chat preserva caminho relativo');
    productionCheck(primewayActivitiesStorageRoot()===$base.DIRECTORY_SEPARATOR.'atividades','atividades usam o mesmo storage privado');
    productionReject(fn()=>primewayValidateDatabaseCredentials(['user'=>'root','password'=>'fixture']),'root recusado em produção');
    $ca=$base.DIRECTORY_SEPARATOR.'test-ca.txt';file_put_contents($ca,'Somente fixture, não certificado real');
    $options=primewayDatabaseOptions(['ssl_ca'=>$ca]);$verifyOption=defined('Pdo\\Mysql::ATTR_SSL_VERIFY_SERVER_CERT')?constant('Pdo\\Mysql::ATTR_SSL_VERIFY_SERVER_CERT'):PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT;productionCheck($options[$verifyOption]===true,'certificado MySQL verificado');
    productionCheck($options[PDO::ATTR_EMULATE_PREPARES]===false,'prepared statements nativos preservados');
    productionReject(fn()=>primewayDatabaseOptions(['ssl_ca'=>$base.'/ausente']),'CA ausente bloqueada');
    productionReject(fn()=>primewayDatabaseRequireTls(new ProductionTlsPdo(''),['ssl_ca'=>$ca]),'downgrade para MySQL sem TLS bloqueado');
    primewayDatabaseRequireTls(new ProductionTlsPdo('TLS_AES_256_GCM_SHA384'),['ssl_ca'=>$ca]);productionCheck(true,'conexão MySQL com cipher TLS aceita');
    $text=$base.'/text.txt';file_put_contents($text,'Texto simples');primewayChatValidateContent($text,'txt','text/plain');productionCheck(true,'texto legítimo aceito');
    productionReject(fn()=>primewayChatValidateContent($text,'png','text/plain'),'extensão imagem não aceita conteúdo textual');
    productionReject(fn()=>primewayChatValidateContent($text,'php','text/plain'),'PHP não permitido');
    productionReject(fn()=>primewayChatValidateContent($text,'docx','application/zip'),'ZIP falso não é Office');
    $zipPath=$base.'/document.zip';$zip=new PharData($zipPath);$zip->addFromString('[Content_Types].xml','<Types/>');$zip->addFromString('word/document.xml','<document/>');unset($zip);
    primewayChatValidateContent($zipPath,'docx','application/zip');productionCheck(true,'documento Office estruturalmente válido aceito');
    $zip=new PharData($zipPath);$zip->addFromString('word/vbaProject.bin','macro');unset($zip);
    productionReject(fn()=>primewayChatValidateContent($zipPath,'docx','application/zip'),'macro disfarçada em DOCX bloqueada');
    $schema=primewayProductionSchema();productionCheck(!str_contains($schema,'CREATE DATABASE')&&!preg_match('/^USE /m',$schema),'exportação respeita banco escolhido pelo provedor');
    productionCheck(!str_contains($schema,'admin@primeway.com')&&!str_contains($schema,'$2y$')&&!str_contains($schema,'INSERT INTO usuarios'),'exportação não inclui contas ou senhas');
    productionCheck(substr_count($schema,".sql','")===9,'baseline cobre somente 002–010 já presentes');
    productionCheck(substr_count($schema,'INSERT INTO ')===1,'sem dados mockados ou seeds de instalação');
    $migration=file_get_contents(dirname(__DIR__).'/database/migrate.php');
    productionCheck(str_contains($migration,'isset($aplicadas[$versao])')&&str_contains($migration,'hash_equals('),'migrations já aplicadas são preservadas e checksums conferidos');
    $apache=file_get_contents(dirname(__DIR__).'/.htaccess');$nginx=file_get_contents(dirname(__DIR__).'/deploy/nginx.conf.example');
    foreach(['config','database','tests','docs','deploy','storage'] as $folder)productionCheck(str_contains($apache,$folder)&&str_contains($nginx,$folder),'servidores bloqueiam '.$folder);
    productionCheck(str_contains($apache,'Options -Indexes')&&str_contains($nginx,'autoindex off'),'listagem de diretórios desabilitada');
    foreach(['api/chat/upload.php','api/secretaria/chat/upload.php'] as $route)productionCheck(str_contains(file_get_contents(dirname(__DIR__).'/'.$route),'catch (PrimewayChatUploadValidationError'),'upload distingue validação e falha interna '.$route);
    echo "$total verificações de produção aprovadas.\n";
} finally {
    foreach($original as $key=>$value)putenv($value===false?$key:$key.'='.$value);
    foreach(glob($base.'/*') as $file)if(is_file($file))unlink($file);rmdir($base);
}
