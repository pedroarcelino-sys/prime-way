(function(){
"use strict";

const API="../api/secretaria/calendario";
const URLS={list:`${API}/index.php`,create:`${API}/criar.php`,update:`${API}/atualizar.php`,status:`${API}/status.php`};
const MONTHS=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const ICONS={Prova:"fa-file-pen",Atividade:"fa-list-check",Reunião:"fa-people-group",Evento:"fa-star",Feriado:"fa-umbrella-beach",Aviso:"fa-bullhorn"};
const S={month:new Date(new Date().getFullYear(),new Date().getMonth(),1),events:[],upcoming:[],classes:[],selected:null,loading:false};
const E={};
const $=id=>document.getElementById(id);

function msg(kind,text){
  const f=window.PrimeWayFeedback;
  if(f&&typeof f[kind]==="function")f[kind](text); else (kind==="error"?console.error:console.log)(text);
}
function key(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function parse(v){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v||""));if(!m)return null;const d=new Date(+m[1],+m[2]-1,+m[3]);return d.getFullYear()==+m[1]&&d.getMonth()==+m[2]-1&&d.getDate()==+m[3]?d:null;}
function br(v){const d=parse(v);return d?new Intl.DateTimeFormat("pt-BR").format(d):"—";}
function time(e){return e.timeStart?(e.timeEnd?`${e.timeStart} - ${e.timeEnd}`:e.timeStart):"Sem horário definido";}
function gridRange(){const y=S.month.getFullYear(),m=S.month.getMonth(),f=new Date(y,m,1),start=new Date(y,m,1-f.getDay()),end=new Date(start);end.setDate(start.getDate()+41);return{start,end};}
function find(id){id=Number(id);return [...S.events,...S.upcoming].find(e=>Number(e.id)===id)||null;}
function statusClass(s){return s==="Agendado"?"warning":s==="Concluído"?"success":s==="Cancelado"?"danger":"neutral";}
function filtered(){const t=E.eventTypeFilter.value,s=E.eventStatusFilter.value,c=E.eventClassFilter.value;return S.events.filter(e=>(!t||e.type===t)&&(!s||e.status===s)&&(!c||String(e.classId||"")===c));}
function loading(v){S.loading=!!v;E.calendarLoading.hidden=!S.loading;[E.previousMonthButton,E.nextMonthButton,E.todayButton,E.newEventButton].forEach(b=>b&&(b.disabled=S.loading));}

function classOptions(){
  const fv=E.eventClassFilter.value,ev=E.eventClass.value;
  E.eventClassFilter.innerHTML='<option value="">Todas as turmas</option>';
  E.eventClass.innerHTML='<option value="">Toda a escola</option>';
  S.classes.forEach(c=>{
    const a=document.createElement("option");a.value=String(c.id);a.textContent=c.name;E.eventClassFilter.append(a);
    const b=a.cloneNode(true);E.eventClass.append(b);
  });
  if([...E.eventClassFilter.options].some(o=>o.value===fv))E.eventClassFilter.value=fv;
  if([...E.eventClass.options].some(o=>o.value===ev))E.eventClass.value=ev;
}
function summary(){
  const y=S.month.getFullYear(),m=S.month.getMonth(),list=S.events.filter(e=>{const d=parse(e.date);return d&&d.getFullYear()===y&&d.getMonth()===m;});
  E.summaryMonth.textContent=list.length;E.summaryScheduled.textContent=list.filter(e=>e.status==="Agendado").length;E.summaryCompleted.textContent=list.filter(e=>e.status==="Concluído").length;E.summaryCanceled.textContent=list.filter(e=>e.status==="Cancelado").length;
}
function chip(e){
  const b=document.createElement("button");b.type="button";b.className=`calendar-event-chip type-${e.type} status-${e.status}`;b.title=`${e.title} — ${e.status}`;b.textContent=`${e.timeStart?e.timeStart+" ":""}${e.title}`;b.onclick=x=>{x.stopPropagation();view(e.id);};return b;
}
function renderCalendar(){
  const y=S.month.getFullYear(),m=S.month.getMonth(),{start}=gridRange(),today=key(new Date()),events=filtered();
  E.calendarYear.textContent=y;E.calendarMonthTitle.textContent=MONTHS[m];E.calendarGrid.replaceChildren();
  for(let i=0;i<42;i++){
    const d=new Date(start);d.setDate(start.getDate()+i);const k=key(d),cell=document.createElement("div");cell.className="calendar-day";if(d.getMonth()!==m)cell.classList.add("other-month");if(k===today)cell.classList.add("today");
    const n=document.createElement("div");n.className="calendar-day-number";n.textContent=d.getDate();const list=document.createElement("div");list.className="calendar-day-events";
    const day=events.filter(e=>e.date===k).sort((a,b)=>(a.timeStart||"").localeCompare(b.timeStart||"")||Number(a.id)-Number(b.id));day.slice(0,3).forEach(e=>list.append(chip(e)));
    if(day.length>3){const more=document.createElement("span");more.className="calendar-more-events";more.textContent=`+${day.length-3} evento(s)`;list.append(more);}
    cell.append(n,list);cell.ondblclick=()=>create(k);E.calendarGrid.append(cell);
  }
  summary();
}
function renderUpcoming(){
  E.upcomingList.replaceChildren();E.upcomingEmpty.hidden=S.upcoming.length>0;
  S.upcoming.forEach(e=>{const b=document.createElement("button");b.type="button";b.className="upcoming-card";b.innerHTML=`<div class="upcoming-card-top"><span class="upcoming-type"></span><span class="upcoming-date"></span></div><strong></strong><p></p>`;b.querySelector(".upcoming-type").textContent=e.type;b.querySelector(".upcoming-date").textContent=br(e.date);b.querySelector("strong").textContent=e.title;b.querySelector("p").textContent=`${e.className||"Toda a escola"} • ${time(e)}`;b.onclick=()=>view(e.id);E.upcomingList.append(b);});
}
async function load(){
  if(S.loading)return;loading(true);
  try{const r=gridRange(),q=new URLSearchParams({inicio:key(r.start),fim:key(r.end)}),{response,data}=await window.PrimeWaySecretaria.request(`${URLS.list}?${q}`);if(!response.ok||!data?.success)throw new Error(data?.message||"Não foi possível carregar o calendário.");S.events=Array.isArray(data.events)?data.events:[];S.upcoming=Array.isArray(data.upcoming)?data.upcoming:[];S.classes=Array.isArray(data.classes)?data.classes:[];classOptions();renderCalendar();renderUpcoming();}
  catch(err){S.events=[];S.upcoming=[];renderCalendar();renderUpcoming();msg("error",err?.message||"Não foi possível carregar o calendário.");}
  finally{loading(false);}
}

function show(m){m.hidden=false;document.body.classList.add("calendar-modal-open");}
function hide(m){m.hidden=true;if(E.eventFormModal.hidden&&E.eventViewModal.hidden)document.body.classList.remove("calendar-modal-open");}
function reset(){E.eventForm.reset();E.eventId.value="";E.eventFormModalTitle.textContent="Novo evento";E.eventSubmitButton.innerHTML='<i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Salvar evento';}
function create(date=""){reset();classOptions();E.eventDate.value=date||key(new Date());show(E.eventFormModal);setTimeout(()=>E.eventTitle.focus(),0);}
function edit(e){if(!e||e.status!=="Agendado")return;reset();classOptions();E.eventId.value=e.id;E.eventTitle.value=e.title||"";E.eventType.value=e.type||"";E.eventClass.value=e.classId?String(e.classId):"";E.eventDate.value=e.date||"";E.eventTimeStart.value=e.timeStart||"";E.eventTimeEnd.value=e.timeEnd||"";E.eventLocation.value=e.location||"";E.eventDescription.value=e.description||"";E.eventFormModalTitle.textContent="Editar evento";E.eventSubmitButton.innerHTML='<i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Salvar alterações';hide(E.eventViewModal);show(E.eventFormModal);}
function view(id){
  const e=find(id);if(!e)return;S.selected=Number(e.id);E.viewEventIcon.innerHTML=`<i class="fa-solid ${ICONS[e.type]||"fa-calendar-day"}" aria-hidden="true"></i>`;E.viewEventType.textContent=e.type||"Evento";E.viewEventTitle.textContent=e.title||"Evento";E.viewEventStatus.textContent=e.status||"—";E.viewEventStatus.className=`secretary-status ${statusClass(e.status)}`;E.viewEventDate.textContent=br(e.date);E.viewEventTime.textContent=time(e);E.viewEventClass.textContent=e.className||"Toda a escola";E.viewEventLocation.textContent=e.location||"Não informado";E.viewEventDescription.textContent=e.description||"Sem descrição.";E.viewEventCreator.textContent=e.creatorName||"Usuário da Secretaria";E.eventViewActions.hidden=e.status!=="Agendado";show(E.eventViewModal);
}
function payload(){return{id:E.eventId.value?Number(E.eventId.value):undefined,title:E.eventTitle.value.trim(),type:E.eventType.value,classId:E.eventClass.value?Number(E.eventClass.value):null,date:E.eventDate.value,timeStart:E.eventTimeStart.value||null,timeEnd:E.eventTimeEnd.value||null,location:E.eventLocation.value.trim(),description:E.eventDescription.value.trim()};}
async function save(ev){
  ev.preventDefault();const p=payload();if(p.timeEnd&&!p.timeStart)return msg("error","Informe o horário de início antes do término.");if(p.timeStart&&p.timeEnd&&p.timeEnd<=p.timeStart)return msg("error","O horário de término deve ser posterior ao início.");E.eventSubmitButton.disabled=true;
  try{const {response,data}=await window.PrimeWaySecretaria.requestJson(p.id?URLS.update:URLS.create,p);if(!response.ok||!data?.success)throw new Error(data?.message||"Não foi possível salvar o evento.");hide(E.eventFormModal);msg("success",data.message||"Evento salvo com sucesso.");await load();if(data.event?.id)view(data.event.id);}
  catch(err){msg("error",err?.message||"Não foi possível salvar o evento.");}finally{E.eventSubmitButton.disabled=false;}
}
async function setStatus(status){
  const e=find(S.selected);if(!e||e.status!=="Agendado")return;const ok=confirm(status==="Concluído"?`Marcar “${e.title}” como concluído?`:`Cancelar “${e.title}”? O evento será mantido no histórico.`);if(!ok)return;
  try{const {response,data}=await window.PrimeWaySecretaria.requestJson(URLS.status,{id:e.id,status});if(!response.ok||!data?.success)throw new Error(data?.message||"Não foi possível alterar o status.");hide(E.eventViewModal);msg("success",data.message||"Status atualizado.");await load();if(data.event?.id)view(data.event.id);}
  catch(err){msg("error",err?.message||"Não foi possível alterar o status.");}
}

function bind(){
  E.newEventButton.onclick=()=>create();E.previousMonthButton.onclick=async()=>{S.month=new Date(S.month.getFullYear(),S.month.getMonth()-1,1);await load();};E.nextMonthButton.onclick=async()=>{S.month=new Date(S.month.getFullYear(),S.month.getMonth()+1,1);await load();};E.todayButton.onclick=async()=>{const d=new Date();S.month=new Date(d.getFullYear(),d.getMonth(),1);await load();};[E.eventTypeFilter,E.eventStatusFilter,E.eventClassFilter].forEach(x=>x.onchange=renderCalendar);E.eventForm.onsubmit=save;E.eventFormClose.onclick=E.eventFormCancel.onclick=()=>hide(E.eventFormModal);document.querySelector("[data-close-form-modal]").onclick=()=>hide(E.eventFormModal);E.eventViewClose.onclick=()=>hide(E.eventViewModal);document.querySelector("[data-close-view-modal]").onclick=()=>hide(E.eventViewModal);E.editEventButton.onclick=()=>edit(find(S.selected));E.completeEventButton.onclick=()=>setStatus("Concluído");E.cancelEventButton.onclick=()=>setStatus("Cancelado");document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(!E.eventFormModal.hidden)hide(E.eventFormModal);else if(!E.eventViewModal.hidden)hide(E.eventViewModal);}});
}
function collect(){
  ["newEventButton","previousMonthButton","nextMonthButton","todayButton","calendarYear","calendarMonthTitle","calendarGrid","calendarLoading","eventTypeFilter","eventStatusFilter","eventClassFilter","summaryMonth","summaryScheduled","summaryCompleted","summaryCanceled","upcomingList","upcomingEmpty","eventFormModal","eventFormModalTitle","eventFormClose","eventFormCancel","eventForm","eventId","eventTitle","eventType","eventClass","eventDate","eventTimeStart","eventTimeEnd","eventLocation","eventDescription","eventSubmitButton","eventViewModal","eventViewClose","viewEventIcon","viewEventType","viewEventStatus","viewEventTitle","viewEventDate","viewEventTime","viewEventClass","viewEventLocation","viewEventDescription","viewEventCreator","eventViewActions","editEventButton","completeEventButton","cancelEventButton"].forEach(id=>E[id]=$(id));return Object.values(E).every(Boolean);
}
async function init(){if(!window.PrimeWaySecretaria)return;const session=await window.PrimeWaySecretaria.ensureSecretary();if(!session||!collect())return;window.PrimeWaySecretaria.bindLogout();bind();await load();}
document.addEventListener("DOMContentLoaded",init);
})();
