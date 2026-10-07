// Auditoria estática de toda a superfície de páginas/scripts/endpoints.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..');
const files=dir=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(x=>x.isDirectory()?files(dir+'/'+x.name):[dir+'/'+x.name]);
const pages=files('pages').filter(x=>x.endsWith('.html')),scripts=files('js').filter(x=>x.endsWith('.js'));
const routes=files('api').filter(x=>x.endsWith('.php')&&!path.basename(x).startsWith('_'));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
let links=0,apiReferences=0;
for(const page of pages){
    const source=read(page),ids=[...source.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
    assert.equal(new Set(ids).size,ids.length,'IDs duplicados: '+page);
    for(const [,url] of source.matchAll(/\b(?:href|src)="([^"]+)"/g)){
        if(/^(?:https?:|data:|mailto:|tel:|#)/.test(url))continue;
        const file=path.resolve(root,path.dirname(page),url.split(/[?#]/)[0]);
        assert(fs.existsSync(file),'Link quebrado: '+page+' -> '+url);links++;
    }
}
for(const file of scripts){
    const source=read(file);
    assert(!source.includes('PrimeWayStorage'),'Dependência de compatibilidade: '+file);
    if(file!=='js/core.js')assert(!source.includes('localStorage'),'Fonte local de dados: '+file);
    for(const [,url] of source.matchAll(/\.\.\/api\/([a-zA-Z0-9_/-]+\.php)/g)){
        assert(fs.existsSync(path.join(root,'api',url)),'API inexistente: '+file+' -> '+url);apiReferences++;
    }
}
for(const file of routes){
    const source=read(file);
    // Wrappers delegam os guards ao endpoint incluído.
    const wrapper=/require(?:_once)?\s*(?:\(?\s*)?__DIR__\s*\.\s*['"]([^'"]+\.php)['"]/.exec(source);
    const inherited=wrapper&&fs.existsSync(path.resolve(root,path.dirname(file),'.'+wrapper[1]))
        ?fs.readFileSync(path.resolve(root,path.dirname(file),'.'+wrapper[1]),'utf8'):'';
    const combined=source+inherited;
    assert(/primewayExigir|REQUEST_METHOD/.test(combined),'Endpoint sem guard: '+file);
    if(/primewayExigirMetodo\(\s*['"]POST['"]/.test(source))
        assert(/primewayExigirCsrf/.test(source),'Escrita sem CSRF: '+file);
}
console.log(JSON.stringify({pages:pages.length,scripts:scripts.length,endpoints:routes.length,links,apiReferences,status:'passed'}));
