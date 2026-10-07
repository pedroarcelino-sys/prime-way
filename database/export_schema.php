<?php
declare(strict_types=1);
// Exportação somente CLI: não conecta ao banco, não cria usuários nem arquivos.
if (PHP_SAPI !== 'cli') {http_response_code(404);exit;}

function primewayProductionSchema(): string
{
    $source=file_get_contents(__DIR__.'/primeway.sql');
    $end=is_string($source)?strpos($source,'INSERT INTO schema_migrations'):false;
    if ($end===false) throw new RuntimeException('Schema de referência inválido.');
    // A referência cobre 002–010; dados iniciais e Admin de desenvolvimento
    // ficam depois deste marcador e nunca entram no artefato de produção.
    $schema=substr($source,0,$end);
    $schema=preg_replace('/^--.*$/m','',$schema);
    $schema=preg_replace('/CREATE DATABASE IF NOT EXISTS.*?;/s','',$schema);
    $schema=preg_replace('/^USE\s+[^;]+;/m','',$schema);
    $rows=[];
    foreach (glob(__DIR__.'/migrations/*.sql') as $file) {
        $version=basename($file);
        if (preg_match('/^(\d+)_/', $version,$match) && (int)$match[1]<=10) {
            $rows[]="('".$version."','".hash_file('sha256',$file)."')";
        }
    }
    if (count($rows)!==9) throw new RuntimeException('Baseline de referência inválida.');
    return "-- PrimeWay: schema sem dados/credenciais, SOMENTE banco vazio.\n"
        .trim($schema)."\nINSERT INTO schema_migrations (versao,checksum) VALUES\n"
        .implode(",\n",$rows).";\n";
}

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    try {echo primewayProductionSchema();}
    catch(Throwable $error){fwrite(STDERR,$error->getMessage().PHP_EOL);exit(1);}
}
