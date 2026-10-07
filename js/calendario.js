document.addEventListener("DOMContentLoaded", async () => {
    "use strict";
    await window.PrimeWayStorage?.ready;
    const q = s => document.querySelector(s);
    const key = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const date = s => new Date(`${s}T12:00:00`);
    const br = s => date(s).toLocaleDateString("pt-BR");
    const typeClass = {Prova:"type-prova",Atividade:"type-atividade",Reunião:"type-reuniao",Evento:"type-evento",Feriado:"type-feriado",Aviso:"type-aviso"};
    const msg = (kind,text) => window.PrimeWayFeedback?.[kind]?.(text);
    const form = q("#eventForm"), modal = q("#eventModal"), view = q("#eventViewModal");
    let month = new Date(new Date().getFullYear(),new Date().getMonth(),1);
    let events = [], upcoming = [], classes = [], selected = null, admin = false, csrf = "", busy = false, serial = 0, focus;
    const make = (tag, cls, text) => { const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el; };
    async function request(url,payload) {
        const response=await fetch(url,{method:payload===undefined?"GET":"POST",credentials:"same-origin",cache:"no-store",
            headers:{Accept:"application/json",...(payload===undefined?{}:{"Content-Type":"application/json","X-CSRF-Token":csrf})},
            ...(payload===undefined?{}:{body:JSON.stringify(payload)})});
        const data=await response.json().catch(()=>null);
        if(response.status===401)location.replace("login.html");
        if(!response.ok || !data?.success)throw Error(data?.message || "Não foi possível carregar ou salvar o calendário.");
        return data;
    }
    try {
        const r=await fetch("../api/auth/session.php",{credentials:"same-origin",cache:"no-store"}),s=await r.json();
        if(!r.ok||!s.authenticated||!["admin","professor"].includes(s.usuario?.perfil)){location.replace("login.html");return;}
        admin=s.usuario.perfil==="admin";csrf=s.csrfToken||"";
    } catch {location.replace("login.html");return;}
    q(".calendar-page-header .section-label").textContent=admin?"Administração":"Professor • somente leitura";
    q("#newEventButton").hidden=!admin;
    if(!admin){q(".event-view-actions").remove();modal.remove();}
    function range() {
        const start=new Date(month.getFullYear(),month.getMonth(),1-month.getDay()),end=new Date(start);end.setDate(start.getDate()+41);
        return {start:key(start),end:key(end)};
    }
    function render() {
        q("#calendarMonth").textContent=month.toLocaleDateString("pt-BR",{month:"long"});q("#calendarYear").textContent=month.getFullYear();
        const grid=q("#calendarGrid");grid.replaceChildren();const start=date(range().start),today=key(new Date());
        for(let i=0;i<42;i++) {
            const d=new Date(start);d.setDate(start.getDate()+i);const k=key(d),day=make("div","calendar-day");day.dataset.date=k;
            day.classList.toggle("other-month",d.getMonth()!==month.getMonth());day.classList.toggle("today",k===today);
            const list=make("div","day-events");
            for(const e of events.filter(e=>e.date===k)) {
                const b=make("button",`calendar-event ${typeClass[e.type]||"event"}${e.status==="Cancelado"?" canceled":""}`,`${e.timeStart?e.timeStart+" ":""}${e.title}`);
                b.type="button";b.dataset.eventId=e.id;b.title=`${e.title} • ${e.status}`;b.setAttribute("aria-label",b.title);b.onclick=()=>showEvent(e);list.append(b);
            }
            day.append(make("div","day-number",d.getDate()),list);
            if(admin)day.ondblclick=e=>{if(!busy&&!e.target.closest("[data-event-id]"))edit(null,k);};grid.append(day);
        }
        const visible=events.filter(e=>e.date.slice(0,7)===key(month).slice(0,7));
        q("#monthEventsCount").textContent=visible.length;q("#examEventsCount").textContent=visible.filter(e=>e.type==="Prova").length;
        q("#meetingEventsCount").textContent=visible.filter(e=>e.type==="Reunião").length;q("#upcomingEventsCount").textContent=upcoming.length;
        const list=q("#upcomingEventsList");list.replaceChildren();q("#upcomingEventsEmpty").classList.toggle("active",!upcoming.length);
        for(const e of upcoming) {
            const card=make("article","upcoming-card");card.tabIndex=0;card.setAttribute("role","button");card.dataset.eventId=e.id;
            const top=make("div","upcoming-card-top");top.append(make("span","upcoming-type",e.type),make("span","upcoming-date",br(e.date)));
            card.append(top,make("strong","",e.title),make("p","",`${e.className||"Toda a escola"} • ${time(e)}`));
            card.onclick=()=>showEvent(e);card.onkeydown=ev=>{if(["Enter"," "].includes(ev.key)){ev.preventDefault();showEvent(e);}};list.append(card);
        }
    }
    async function load() {
        const current=++serial,r=range(),params=new URLSearchParams({inicio:r.start,fim:r.end,type:q("#eventTypeFilter").value,
            classId:q("#eventClassFilter").value,status:q("#eventStatusFilter").value});
        q("#calendarGrid").setAttribute("aria-busy","true");
        try {
            const data=await request(`../api/calendario/index.php?${params}`);if(current!==serial)return;
            events=data.events;upcoming=data.upcoming;classes=data.classes;
            const filter=q("#eventClassFilter"),value=filter.value;filter.replaceChildren(new Option("Todas as turmas",""),new Option("Toda a escola","global"));
            for(const c of classes)filter.append(new Option(`${c.name} • ${c.schoolYear}${c.available?"":" (inativa/ano encerrado)"}`,c.id));
            filter.value=value;render();
        } catch(error) {if(current!==serial)return;events=[];upcoming=[];render();msg("error",error.message);}
        finally {if(current===serial)q("#calendarGrid").setAttribute("aria-busy","false");}
    }
    function show(el) {focus=document.activeElement;el.classList.add("active");el.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";el.querySelector("button,input:not([type=hidden])")?.focus();}
    function close(el) {if(busy)return;el.classList.remove("active");el.setAttribute("aria-hidden","true");document.body.style.overflow="";focus?.focus();}
    function time(e) {return e.timeStart?`${e.timeStart}${e.timeEnd?" – "+e.timeEnd:""}`:"Sem horário definido";}
    function showEvent(e) {
        if(busy)return;selected=e;
        for(const [id,value] of Object.entries({viewEventTitle:e.title,viewEventType:e.type,viewEventDate:br(e.date),viewEventTime:time(e),
            viewEventClass:`${e.className||"Toda a escola"}${e.classStatus==="Inativa"?" (turma inativa)":""}`,viewEventLocation:e.location||"Não informado",
            viewEventDescription:e.description||"Sem descrição",viewEventStatus:e.status,viewEventCreator:e.creatorName||"Não informado"}))q("#"+id).textContent=value;
        if(admin)q(".event-view-actions").hidden=e.status!=="Agendado";
        show(view);
    }
    function classNotice() {q("#eventAudienceNotice").textContent=q("#eventClass").value
        ? "Evento desta turma. Quando agendado, poderá aparecer aos alunos e responsáveis vinculados."
        : "Toda a escola: quando Agendado, este evento poderá aparecer nos portais de Aluno e Responsável. O título não restringe o público.";}
    function edit(e=null,day=key(new Date())) {
        if(!admin||busy||e&&e.status!=="Agendado")return;
        if(view.classList.contains("active"))close(view);form.reset();q("#eventModalTitle").textContent=e?"Editar evento":"Novo evento";
        q("#eventId").value=e?.id||"";q("#eventTitle").value=e?.title||"";q("#eventType").value=e?.type||"";q("#eventDate").value=e?.date||day;
        q("#eventTime").value=e?.timeStart||"";q("#eventTimeEnd").value=e?.timeEnd||"";q("#eventLocation").value=e?.location||"";q("#eventDescription").value=e?.description||"";
        const select=q("#eventClass");select.replaceChildren(new Option("Toda a escola",""));
        for(const c of classes)if(c.available||c.id===e?.classId)select.append(new Option(`${c.name} • ${c.schoolYear}${c.available?"":" (indisponível; vínculo preservado)"}`,c.id));
        if(e?.classId && ![...select.options].some(o=>o.value===String(e.classId)))select.append(new Option(`${e.className} (vínculo preservado)`,e.classId));
        select.value=e?.classId?String(e.classId):"";classNotice();show(modal);
    }
    if(admin) {
        q("#newEventButton").onclick=()=>edit();q("#editEventButton").onclick=()=>edit(selected);q("#eventClass").onchange=classNotice;
        for(const s of ["#eventModalClose","#eventCancelButton",".event-modal-overlay"])q(s).onclick=()=>close(modal);
        form.onsubmit=async event=>{
            event.preventDefault();if(busy||!form.reportValidity())return;
            const id=q("#eventId").value,payload={id:id?Number(id):undefined,title:q("#eventTitle").value.trim(),type:q("#eventType").value,
                date:q("#eventDate").value,timeStart:q("#eventTime").value,timeEnd:q("#eventTimeEnd").value,
                classId:q("#eventClass").value?Number(q("#eventClass").value):null,location:q("#eventLocation").value.trim(),description:q("#eventDescription").value.trim()};
            busy=true;form.querySelector('[type="submit"]').disabled=true;
            try {const data=await request(`../api/calendario/${id?"atualizar":"criar"}.php`,payload);busy=false;close(modal);
                month=new Date(date(data.event.date).getFullYear(),date(data.event.date).getMonth(),1);await load();msg("success","Evento salvo no calendário.");}
            catch(error){msg("error",error.message);}
            finally{busy=false;form.querySelector('[type="submit"]').disabled=false;}
        };
        for(const [selector,status] of [["#completeEventButton","Concluído"],["#cancelEventButton","Cancelado"]])q(selector).onclick=async()=>{
            if(busy||selected?.status!=="Agendado")return;const event=selected;
            const ok=await window.PrimeWayConfirm.warning(`Marcar “${event.title}” como ${status.toLowerCase()}? O histórico será mantido.`,{title:"Alterar evento",confirmText:"Confirmar"});
            if(!ok||busy)return;busy=true;
            try{const data=await request("../api/calendario/status.php",{id:event.id,status});busy=false;close(view);await load();showEvent(data.event);msg("success","Status atualizado.");}
            catch(error){msg("error",error.message);}finally{busy=false;}
        };
    }
    for(const s of ["#eventViewClose",".event-view-overlay"])q(s).onclick=()=>close(view);
    for(const s of ["#eventTypeFilter","#eventClassFilter","#eventStatusFilter"])q(s).onchange=load;
    q("#previousMonthButton").onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1);load();};
    q("#nextMonthButton").onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1);load();};
    q("#todayButton").onclick=()=>{month=new Date(new Date().getFullYear(),new Date().getMonth(),1);load();};
    document.addEventListener("keydown",event=>{
        if(document.querySelector(".primeway-confirm"))return;
        const active=modal.classList.contains("active")?modal:view.classList.contains("active")?view:null;if(!active)return;
        if(event.key==="Escape")close(active);
        if(event.key==="Tab"){
            const items=[...active.querySelectorAll('button,input:not([type="hidden"]),select,textarea')].filter(e=>!e.disabled&&e.getClientRects().length);
            const first=items[0],last=items.at(-1);
            if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
            else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
        }
    });
    q("#logoutButton").onclick=async()=>{try{await request("../api/auth/logout.php",{});location.replace("login.html");}catch(e){msg("error",e.message);}};
    await load();
});
