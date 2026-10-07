<?php
declare(strict_types=1);
// Exclusivamente router do servidor de teste local; nunca usar em produção.
if(PHP_SAPI!=='cli-server'){http_response_code(404);exit;}
require_once dirname(__DIR__).'/config/runtime.php';
$route=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
if(preg_match('~^/(?:config|database|tests|docs|deploy|storage|vendor|node_modules)(?:/|$)|/\.(?!well-known)|^/api/(?:.*/)?_[^/]*\.php$~i',$route)){http_response_code(404);exit;}
if($route==='/__fault'){throw new PDOException('SQLSTATE[99999] secret /internal/server/path');}
if($route==='/__warning'){trigger_error('private /internal/server/path',E_USER_WARNING);header('Content-Type: application/json');echo '{"success":true}';exit;}
if($route==='/__upload'){
    require_once dirname(__DIR__).'/api/chat/_attachments.php';
    header('Content-Type: application/json');
    try{$result=primewayChatValidateUpload($_FILES['file']??[]);unset($result['temporaryPath']);echo json_encode($result,JSON_THROW_ON_ERROR);}
    catch(PrimewayChatUploadValidationError $error){http_response_code(422);echo json_encode(['message'=>$error->getMessage()]);}
    exit;
}
// O servidor embutido descarta headers do router ao servir arquivos estáticos;
// simular aqui os headers que Apache/Nginx aplicarão também a HTML/assets.
if(!str_ends_with($route,'.php')){
    $file=realpath(dirname(__DIR__).($route==='/'?'/index.html':$route));
    if($file && str_starts_with($file,dirname(__DIR__).DIRECTORY_SEPARATOR) && is_file($file)
        && in_array(pathinfo($file,PATHINFO_EXTENSION),['html','js','css','png','svg'],true)){
        $mime=['html'=>'text/html; charset=utf-8','js'=>'text/javascript','css'=>'text/css','png'=>'image/png','svg'=>'image/svg+xml'];
        header('Content-Type: '.$mime[pathinfo($file,PATHINFO_EXTENSION)]);readfile($file);exit;
    }
    http_response_code(404);exit;
}
return false;
