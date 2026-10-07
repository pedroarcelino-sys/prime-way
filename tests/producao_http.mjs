// HTTP real em servidor PHP local isolado. Não envia escrita ao MySQL.
import assert from 'node:assert/strict';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {setTimeout as pause} from 'node:timers/promises';
const root=path.resolve(import.meta.dirname,'..');
const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
const php=spawn(process.env.PHP_BINARY||'php',['-d','upload_max_filesize=20M','-d','post_max_size=22M','-S',`127.0.0.1:${port}`,'-t',root,path.join(root,'tests/producao_router.php')],{windowsHide:true,env:{...process.env,PRIMEWAY_APP_ENV:'production'},stdio:'ignore'});
const origin=`http://127.0.0.1:${port}`;let total=0;
function check(ok,label){assert(ok,label);total++;}
async function get(route){return fetch(origin+route,{headers:{Host:'escola.example.test'},redirect:'manual'});}
try{
    let ready=false;for(let i=0;i<100;i++){try{await get('/');ready=true;break;}catch{await pause(100);}}assert(ready,'PHP não iniciou');
    const session=await get('/api/auth/session.php');const data=await session.json(),cookie=session.headers.get('set-cookie');
    check(!data.authenticated&&/^[a-f0-9]{64}$/.test(data.csrfToken),'CSRF de login anônimo');
    for(const part of ['secure','httponly','samesite=lax'])check(cookie?.toLowerCase().includes(part),'cookie '+part);
    check(session.headers.get('x-content-type-options')==='nosniff','nosniff em API');
    check(session.headers.get('content-security-policy')?.includes("frame-ancestors 'self'"),'CSP em API');
    const landing=await get('/');check((await landing.text()).includes('url=escola.html'),'página inicial relativa ao domínio');
    const school=await get('/escola.html');check((await school.text()).includes('pages/login.html'),'link público de login relativo');
    const login=await get('/pages/login.html');check(login.status===200,'login sob Host do domínio');
    check(login.headers.get('permissions-policy')?.includes('microphone=(self)'),'microfone e GPS compatíveis');
    for(const route of ['/config/database.local.php','/.env','/.git/HEAD','/database/primeway.sql','/tests/producao.php','/storage/test.php','/api/chat/_attachments.php'])check((await get(route)).status===404,'nega caminho privado '+route);
    const error=await get('/__fault'),text=await error.text();check(error.status===500,'erro inesperado retorna 500');
    check(!/SQLSTATE|secret|internal|Stack trace/i.test(text)&&JSON.parse(text).success===false,'erro não revela informação interna');
    const warning=await get('/__warning');check((await warning.text())==='{"success":true}','warning não contamina JSON');
    async function upload(name,content,type='text/plain'){
        const form=new FormData();form.append('file',new Blob([content],{type}),name);
        const response=await fetch(origin+'/__upload',{method:'POST',body:form});return {status:response.status,data:await response.json()};
    }
    const valid=await upload('texto.txt','Texto simples');check(valid.status===200&&valid.data.extension==='txt','multipart real válido');
    check(!('temporaryPath' in valid.data),'resposta não inclui caminho temporário');
    check((await upload('imagem.png','Texto simples','image/png')).status===422,'MIME do cliente não substitui conteúdo');
    check((await upload('arquivo.php','<?php echo 1;')).status===422,'extensão executável bloqueada');
    check((await upload('documento.docx','Texto simples','application/zip')).status===422,'documento Office falso bloqueado');
    check((await upload('grande.txt',Buffer.alloc(10*1024*1024+1,65))).status===422,'limite de 10 MB confirmado');
    console.log(`${total} verificações HTTP de produção aprovadas.`);
}finally{php.kill();}
