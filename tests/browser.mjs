// Node 22+; Chrome instalado. Servidor isolado: nunca encaminha chamadas às APIs reais.
// Uso: node tests/browser.mjs [--visual] [--leaflet-real]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn, execFileSync} from 'node:child_process';
import {setTimeout as pause} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=fs.mkdtempSync(path.join(os.tmpdir(),'primeway-browser-'));
const server=http.createServer((req,res)=>{
    try {
        const url=new URL(req.url,'http://localhost');
        if(url.pathname==='/__test__/disciplinas') {
            res.setHeader('Content-Type','application/json');
            return res.end(execFileSync(process.env.PHP_BINARY || 'php',[path.join(root,'tests/integration/disciplinas_visual.php')],{windowsHide:true}));
        }
        const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
        if(!file.startsWith(root+path.sep)||!['.html','.js','.css','.png','.svg','.woff2'].includes(path.extname(file))) throw Error('Somente arquivos estáticos');
        res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream');
        res.end(fs.readFileSync(file));
    } catch { res.statusCode=404;res.end('Not found'); }
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const chrome=spawn(process.env.CHROME_BINARY || 'C:/Program Files/Google/Chrome/Application/chrome.exe',[
    '--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking',
    '--remote-debugging-port=0','--user-data-dir='+output,'--autoplay-policy=no-user-gesture-required',
    '--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'
],{windowsHide:true,stdio:'ignore'});
let ws,seq=0;const pending=new Map();
function send(method,params={}) { return new Promise((resolve,reject)=>{
    const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},15000);
    pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));
}); }
async function evaluate(expression) {
    const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;
}
async function until(expression) { for(let i=0;i<300;i++){if(await evaluate(expression))return;await pause(100);}throw Error('Timeout: '+expression); }
try {
    for(let i=0;!fs.existsSync(path.join(output,'DevToolsActivePort'));i++){if(i>100)throw Error('Chrome não iniciou');await pause(100);}
    const port=fs.readFileSync(path.join(output,'DevToolsActivePort'),'utf8').split('\n')[0];
    const target=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
    ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>ws.addEventListener('open',resolve));
    ws.addEventListener('message',event=>{const m=JSON.parse(event.data),p=pending.get(m.id);if(!p)return;clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);});
    await send('Runtime.enable');await send('Page.enable');
    const pages=['fechamento.html','estado_legado.html','notificacoes.html','calendario.html','disciplinas.html','chat_composer.html','chat_messages.html','chat_visibility.html','saida_segura_mapa.html'];
    if(process.argv.includes('--leaflet-real'))pages.push('saida_segura_mapa.html?real=1');
    for(const file of pages) {
        await send('Page.navigate',{url:origin+'/tests/'+file});
        await until("document.querySelector('#result')?.dataset.status");
        const result=await evaluate("({status:document.querySelector('#result').dataset.status,text:document.querySelector('#result').textContent})");
        console.log(JSON.stringify({file,...result}));
        if(result.status!=='passed') {
            if(['notificacoes.html','estado_legado.html'].includes(file)) console.log(await evaluate("({probe:window.previewFrame?.contentWindow?.probe,body:window.previewFrame?.contentDocument?.body?.innerText})"));
            throw Error('Falha em '+file);
        }
    }
    if(process.argv.includes('--calendar-visual')) {
        await send('Page.navigate',{url:origin+'/tests/calendario.html?preview=1'});
        await until("document.querySelector('#result')?.dataset.status");
        for(const width of [1440,390]) {
            await send('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:false});await pause(300);
            const layout=await evaluate("(()=>{const d=previewFrame.contentDocument,q=s=>d.querySelector(s);return {overflow:d.documentElement.scrollWidth>d.documentElement.clientWidth,toolbar:q('.calendar-toolbar').getBoundingClientRect().width,panel:q('.calendar-panel').clientWidth,days:d.querySelectorAll('.calendar-day').length};})()");
            if(layout.overflow||layout.toolbar>layout.panel||layout.days!==42)throw Error('Layout Calendário: '+JSON.stringify(layout));
            console.log(JSON.stringify({calendarWidth:width,...layout}));
            const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(output,`calendario-${width}.png`),Buffer.from(shot.data,'base64'));
            await evaluate("previewFrame.contentDocument.querySelector('[data-event-id=\"2\"]').click()");await pause(100);
            const modal=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(output,`calendario-modal-${width}.png`),Buffer.from(modal.data,'base64'));
            await evaluate("previewFrame.contentDocument.querySelector('#eventViewClose').click()");
        }
        console.log('Imagens: '+output);
    }
    if(process.argv.includes('--visual')) {
        await send('Page.navigate',{url:origin+'/tests/disciplinas.html?preview=1&database=1'});
        await until("document.querySelector('#result')?.dataset.status");
        await evaluate('previewFrame.contentDocument.fonts.ready.then(()=>true)');
        for(const width of [1440,390]) {
            await send('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:false});await pause(300);
            console.log(await evaluate(`(()=>{const d=previewFrame.contentDocument;return {width:${width},rows:d.querySelectorAll('#subjectsTableBody tr').length,table:d.querySelector('#subjectsTableBody').innerText,overflow:d.documentElement.scrollWidth>d.documentElement.clientWidth};})()`));
            const shot=await send('Page.captureScreenshot',{format:'png'});
            fs.writeFileSync(path.join(output,`disciplinas-${width}.png`),Buffer.from(shot.data,'base64'));
            await evaluate("previewFrame.contentDocument.querySelector('.subjects-panel-header').scrollIntoView()");
            await pause(100);
            const tableShot=await send('Page.captureScreenshot',{format:'png'});
            fs.writeFileSync(path.join(output,`disciplinas-tabela-${width}.png`),Buffer.from(tableShot.data,'base64'));
            const layout=await evaluate("(()=>{const d=previewFrame.contentDocument;return {overflow:d.documentElement.scrollWidth>d.documentElement.clientWidth,filters:d.querySelector('.subjects-actions').getBoundingClientRect().height};})()");
            if(layout.overflow || layout.filters>160)throw Error('Filtros excedem espaço esperado: '+JSON.stringify(layout));
            await evaluate(`previewFrame.contentDocument.querySelector('[data-action="link"][data-subject-id="1"]').click()`);
            await until("previewFrame.contentDocument.querySelector('#subjectModal').classList.contains('active')");
            const modalShot=await send('Page.captureScreenshot',{format:'png'});
            fs.writeFileSync(path.join(output,`disciplinas-vinculo-${width}.png`),Buffer.from(modalShot.data,'base64'));
            await evaluate("previewFrame.contentDocument.querySelector('#subjectCancelButton').click();previewFrame.contentWindow.scrollTo(0,0)");
        }
        console.log('Imagens: '+output);
    }
} finally {
    try{if(ws?.readyState===1)await send('Browser.close');}catch{}
    ws?.close();chrome.kill();server.close();
}
