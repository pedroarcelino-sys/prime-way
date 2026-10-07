import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const tracked=execFileSync('git',['ls-files'],{cwd:root,windowsHide:true}).toString().trim().split(/\r?\n/);
let total=0;const check=(ok,label)=>{assert(ok,label);total++;};
check(!tracked.some(x=>/\.local\.php$|^\.env$|\.(?:log|bak|dump|pem|key|p12|pfx|sql\.gz)$/.test(x)),'nenhum segredo/config local/backup versionado');
check(!tracked.some(x=>x.startsWith('storage/')&&!x.endsWith('.htaccess')),'nenhum anexo persistente versionado');
const ignored=['config/database.local.php','config/database.migration.local.php','config/saida_segura.local.php','.env.production','backup.sql','backup.sql.gz','server.key','storage/chat/test.pdf'];
for(const file of ignored){
    const value=execFileSync('git',['check-ignore',file],{cwd:root,windowsHide:true}).toString().trim();check(value===file,'ignore '+file);
}
for(const file of fs.readdirSync(path.join(root,'js')).filter(x=>x.endsWith('.js'))){
    const source=fs.readFileSync(path.join(root,'js',file),'utf8');
    check(!/https?:\/\/(?:localhost|127\.0\.0\.1)|[A-Z]:\\/i.test(source),'URLs portáveis '+file);
}
for(const dir of ['pages'])for(const file of fs.readdirSync(path.join(root,dir))){
    const source=fs.readFileSync(path.join(root,dir,file),'utf8');
    check(!/https?:\/\/(?:localhost|127\.0\.0\.1)|[A-Z]:\\/i.test(source),'URLs portáveis '+file);
}
for(const file of ['config/database.local.example.php','config/database.migration.local.example.php']){
    const source=fs.readFileSync(path.join(root,file),'utf8');check(!/'password'\s*=>\s*'[^']+'/.test(source),'modelo sem senha '+file);
}
const map=fs.readFileSync(path.join(root,'js/saida_segura_mapa.js'),'utf8');
check(map.includes('https://tile.openstreetmap.org/')&&map.includes('OpenStreetMap')&&!/api[_-]?key\s*[:=]/i.test(map),'mapa HTTPS com atribuição, sem chave local');
console.log(`${total} verificações de auditoria de produção aprovadas.`);
