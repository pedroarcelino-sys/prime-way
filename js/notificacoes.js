document.addEventListener("DOMContentLoaded", async () => {
    "use strict";
    const q=s=>document.querySelector(s), feedback=(kind,message)=>window.PrimeWayFeedback?.[kind]?.(message);
    const normalize=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
    const form=q("#notificationForm"),modal=q("#notificationModal"),view=q("#notificationViewModal");
    let items=[],selected=null,admin=false,csrf="",busy=false,serial=0,previousFocus;
    async function request(route,payload) {
        const response=await fetch(`../api/${route}`,{method:payload===undefined?"GET":"POST",credentials:"same-origin",cache:"no-store",
            headers:{Accept:"application/json",...(payload===undefined?{}:{"Content-Type":"application/json","X-CSRF-Token":csrf})},
            ...(payload===undefined?{}:{body:JSON.stringify(payload)})});
        const data=await response.json().catch(()=>null);
        if(response.status===401)location.replace("login.html");
        if(!response.ok||data?.success===false||!data)throw Error(data?.message||"Não foi possível processar as notificações.");
        return data;
    }
    try {
        const session=await request("auth/session.php");
        if(!session.authenticated||!["admin","professor"].includes(session.usuario?.perfil)){location.replace("login.html");return;}
        admin=session.usuario.perfil==="admin";csrf=session.csrfToken||"";
    }catch{location.replace("login.html");return;}
    for(const id of ["newNotificationButton","markAllReadButton","toggleReadButton","deleteNotificationButton"])q("#"+id).hidden=!admin;
    q("#notificationHistoryLabel").hidden=!admin;
    if(!admin) {modal.remove();q(".notifications-header .section-label").textContent="Professor • somente leitura";}
    const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
    const formatDate=s=>{const date=new Date(String(s).replace(" ","T"));return Number.isNaN(date.getTime())?s:date.toLocaleString("pt-BR");};
    function filtered() {
        const search=normalize(q("#notificationSearch").value),type=q("#notificationTypeFilter").value,read=q("#notificationStatusFilter").value;
        return items.filter(x=>(!type||x.type===type)&&(!read||(read==="read"?x.read:!x.read))&&(!search||normalize(`${x.title} ${x.message} ${x.audience}`).includes(search)));
    }
    function render() {
        const list=q("#notificationsList");list.replaceChildren();const visible=filtered();q("#notificationsEmpty").classList.toggle("active",!visible.length);
        q("#totalNotifications").textContent=items.length;q("#unreadNotifications").textContent=items.filter(x=>!x.read&&x.status==="Publicada").length;
        q("#eventNotifications").textContent=items.filter(x=>x.eventId!==null||x.origin==="Calendario").length;
        q("#noticeNotifications").textContent=items.filter(x=>x.type==="Aviso").length;
        q("#markAllReadButton").disabled=busy||!items.some(x=>!x.read&&x.status==="Publicada");
        for(const x of visible) {
            const card=make("article",`notification-card${x.read?"":" unread"}`);card.tabIndex=0;card.setAttribute("role","button");card.dataset.notificationId=x.id;
            const icon=make("div","notification-icon");icon.append(make("i","fa-solid fa-bell"));
            const content=make("div","notification-content"),meta=make("div","notification-meta");
            meta.append(make("span","notification-type",x.type),make("span","notification-audience",x.audience));
            if(x.status!=="Publicada")meta.append(make("span","notification-audience",x.status));
            content.append(meta,make("h3","",x.title),make("p","",x.message));
            const side=make("div","notification-side");side.append(make("span","notification-date",formatDate(x.date)));
            if(!x.read)side.append(make("span","unread-dot"));card.append(icon,content,side);
            const open=()=>showNotification(x);card.onclick=open;card.onkeydown=e=>{if(["Enter"," "].includes(e.key)){e.preventDefault();open();}};list.append(card);
        }
    }
    async function load() {
        const current=++serial; q("#notificationsList").setAttribute("aria-busy","true");
        try {
            const data=await request(`notificacoes/index.php?history=${q("#notificationHistory").checked?1:0}`);if(current!==serial)return;
            items=data.notifications;admin=admin&&data.canManage;render();
            const type=q("#notificationTypeFilter"),value=type.value;type.replaceChildren(new Option("Todos os tipos",""));
            for(const name of [...new Set(items.map(x=>x.type))].sort())type.append(new Option(name,name));type.value=value;
            render();
        }catch(e){if(current!==serial)return;items=[];render();feedback("error",e.message);}
        finally{if(current===serial)q("#notificationsList").setAttribute("aria-busy","false");}
    }
    function show(el){previousFocus=document.activeElement;el.classList.add("active");el.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";el.querySelector("button,input")?.focus();}
    function close(el){if(busy)return;el.classList.remove("active");el.setAttribute("aria-hidden","true");document.body.style.overflow="";if(previousFocus?.isConnected)previousFocus.focus();else q("#notificationSearch").focus();}
    function fill(x) {
        selected=x;
        for(const [id,value] of Object.entries({viewNotificationTitle:x.title,viewNotificationType:`${x.type} • ${x.status}`,viewNotificationAudience:x.audience,
            viewNotificationDate:formatDate(x.date),viewNotificationMessage:x.message}))q("#"+id).textContent=value;
        q("#toggleReadButton").hidden=!admin||x.status!=="Publicada";q("#deleteNotificationButton").hidden=!admin||x.status!=="Publicada";
        q("#toggleReadButton span").textContent=x.read?"Marcar como não lida":"Marcar como lida";
    }
    async function mutation(route,payload) {
        if(busy)return false;busy=true;
        for(const button of [q("#markAllReadButton"),q("#toggleReadButton"),q("#deleteNotificationButton"),form.querySelector('[type="submit"]')])button.disabled=true;
        try{await request(route,payload);return true;}
        catch(e){feedback("error",e.message);return false;}
        finally{busy=false;for(const button of [q("#toggleReadButton"),q("#deleteNotificationButton"),form.querySelector('[type="submit"]')])button.disabled=false;render();}
    }
    async function showNotification(x) {
        if(busy)return;
        if(admin&&!x.read&&x.status==="Publicada") {
            if(await mutation("notificacoes/leitura.php",{notificationId:x.id,read:true})){await load();x=items.find(item=>item.id===x.id)||x;}
        }
        fill(x);show(view);
    }
    for(const selector of ["#notificationViewClose",".notification-view-overlay"])q(selector).onclick=()=>close(view);
    for(const selector of ["#notificationSearch","#notificationTypeFilter","#notificationStatusFilter"])q(selector).addEventListener(selector.endsWith("Search")?"input":"change",render);
    if(admin) {
        q("#notificationHistory").onchange=load;
        q("#newNotificationButton").onclick=()=>{if(!busy){form.reset();show(modal);}};
        for(const selector of ["#notificationModalClose","#notificationCancelButton",".notification-modal-overlay"])q(selector).onclick=()=>close(modal);
        form.onsubmit=async e=>{
            e.preventDefault();if(busy||!form.reportValidity())return;
            if(await mutation("notificacoes/publicar.php",{title:q("#notificationTitle").value.trim(),type:q("#notificationType").value,
                audience:q("#notificationAudience").value,message:q("#notificationMessage").value.trim()})){close(modal);await load();feedback("success","Notificação publicada.");}
        };
        q("#toggleReadButton").onclick=async()=>{if(selected&&await mutation("notificacoes/leitura.php",{notificationId:selected.id,read:!selected.read})){await load();const x=items.find(x=>x.id===selected.id);if(x)fill(x);}};
        q("#markAllReadButton").onclick=async()=>{if(await mutation("notificacoes/marcar_todas_lidas.php",{})){await load();if(selected){const x=items.find(x=>x.id===selected.id);if(x)fill(x);}feedback("success","Notificações marcadas como lidas para sua conta.");}};
        q("#deleteNotificationButton").onclick=async()=>{
            if(busy||!selected)return;const x=selected;
            const yes=await window.PrimeWayConfirm.danger(`Cancelar “${x.title}”? O histórico e os destinatários serão mantidos.`,{title:"Cancelar notificação",confirmText:"Cancelar notificação"});
            if(yes&&await mutation("notificacoes/cancelar.php",{notificationId:x.id})){close(view);await load();feedback("success","Notificação cancelada; histórico preservado.");}
        };
    }
    document.addEventListener("keydown",e=>{
        if(q(".primeway-confirm"))return;const active=modal.classList.contains("active")?modal:view.classList.contains("active")?view:null;if(!active)return;
        if(e.key==="Escape")close(active);
        if(e.key==="Tab"){
            const controls=[...active.querySelectorAll('button,input,select,textarea')].filter(x=>!x.disabled&&x.getClientRects().length),first=controls[0],last=controls.at(-1);
            if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
        }
    });
    q("#logoutButton").onclick=async()=>{try{await request("auth/logout.php",{});location.replace("login.html");}catch(e){feedback("error",e.message);}};
    await load();
});
