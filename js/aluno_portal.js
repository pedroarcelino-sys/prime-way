document.addEventListener("DOMContentLoaded", async function () {
    await window.PrimeWayStorage?.ready;
    const PORTAL_URL="../api/aluno/index.php";

    function set(selector,value){const e=document.querySelector(selector);if(e)e.textContent=value===null||value===undefined||value===""?"—":String(value)}
    function empty(message){const e=document.createElement("p");e.className="empty-state";e.textContent=message;return e}
    function textElement(tag,className,value){const e=document.createElement(tag);if(className)e.className=className;e.textContent=value;return e}
    const formatDate=(value,withTime=false)=>window.PrimeWayAluno.formatDate(value,withTime);

    function renderSubjects(items){
        const c=document.querySelector("#studentSubjects");c.replaceChildren();
        if(!items.length){c.append(empty("Nenhuma disciplina vinculada à sua turma."));return}
        for(const item of items.slice(0,6)){
            const card=document.createElement("article");card.className="subject-card";
            card.append(textElement("span","code",item.code),textElement("h3","",item.name),textElement("p","",`Professor(a): ${item.teacher}`),textElement("span","",`${item.workload} horas • ${item.area}`));
            c.append(card)
        }
    }

    function renderActivities(items){
        const c=document.querySelector("#studentActivities");c.replaceChildren();
        if(!items.length){c.append(empty("Nenhuma atividade publicada."));return}
        for(const item of items.slice(0,3)){
            const row=document.createElement("article");row.className="list-item";
            row.append(textElement("h3","",item.title),textElement("span","badge",item.subject),textElement("p","",item.description||"Sem descrição."),textElement("span","meta",`Entrega: ${formatDate(item.dueAt,Boolean(item.dueAt))} • ${item.period}`));
            const link=document.createElement("a");link.href=`aluno_atividades.html?id=${encodeURIComponent(item.id)}`;link.className="activity-access-button";link.innerHTML='<i class="fa-regular fa-eye" aria-hidden="true"></i> Abrir atividade';
            row.append(link);c.append(row)
        }
    }

    function renderGrades(items){
        const c=document.querySelector("#studentGrades");c.replaceChildren();
        if(!items.length){c.append(empty("Nenhuma avaliação cadastrada."));return}
        for(const item of items.slice(0,3)){
            const row=document.createElement("article");row.className="list-item";
            const value=item.value===null?"Aguardando":`${Number(item.value).toLocaleString("pt-BR")}/${Number(item.maximum).toLocaleString("pt-BR")}`;
            row.append(textElement("h3","",item.title),textElement("span","value",value),textElement("span","meta",`${item.subject} • ${item.period} • ${formatDate(item.date)}`));c.append(row)
        }
    }

    function renderEvents(items){
        const c=document.querySelector("#studentEvents");c.replaceChildren();
        if(!items.length){c.append(empty("Nenhum evento futuro."));return}
        for(const item of items.slice(0,3)){
            const row=document.createElement("article");row.className="list-item";const time=item.startTime?` às ${String(item.startTime).slice(0,5)}`:"";
            row.append(textElement("h3","",item.title),textElement("span","badge",item.type),textElement("p","",`${formatDate(item.date)}${time}${item.location?` • ${item.location}`:""}`));c.append(row)
        }
    }

    function renderNotices(items){
        const c=document.querySelector("#studentNotices");c.replaceChildren();
        if(!items.length){c.append(empty("Nenhuma notificação publicada."));return}
        for(const item of items.slice(0,3)){
            const row=document.createElement("article");row.className="list-item";
            row.append(textElement("h3","",item.title),textElement("span","badge",item.type),textElement("p","",item.message),textElement("span","meta",formatDate(item.date,true)));c.append(row)
        }
    }

    function render(data){
        const profile=data.profile||{},enrollment=data.enrollment,summary=data.summary||{},firstName=String(profile.name||"Aluno").trim().split(/\s+/)[0];
        set("#studentGreeting",`Olá, ${firstName}!`);
        set("#studentContext",enrollment?`${enrollment.className} • ${enrollment.series} • ${enrollment.shift} • Ano letivo ${data.schoolYear}`:"Você ainda não possui uma turma ativa.");
        set("#averageValue",summary.average===null?"—":Number(summary.average).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1}));
        set("#attendanceValue",summary.attendance===null?"—":`${summary.attendance}%`);
        set("#subjectsCount",summary.subjects??0);set("#activitiesCount",summary.upcomingActivities??0);
        renderSubjects(data.subjects||[]);renderActivities(data.activities||[]);renderGrades(data.grades||[]);renderEvents(data.events||[]);renderNotices(data.notices||[])
    }

    async function loadPortal(){
        try{
            const {response,data}=await window.PrimeWayAluno.request(PORTAL_URL);
            if(!response.ok||!data?.success)throw new Error(data?.message||"Não foi possível carregar o painel.");
            render(data)
        }catch(error){console.error("Erro ao carregar área do aluno:",error);window.PrimeWayFeedback?.error(error?.message||"Não foi possível carregar sua área.")}
    }

    const session=await window.PrimeWayAluno.ensureStudent();if(!session)return;
    window.PrimeWayAluno.bindLogout();
    set("#currentDate",new Intl.DateTimeFormat("pt-BR",{dateStyle:"long"}).format(new Date()));
    await loadPortal();await window.PrimeWayAluno.refreshNavigationBadges();
});