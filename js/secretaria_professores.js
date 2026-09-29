document.addEventListener(
"DOMContentLoaded",
async function(){

const API="../api/secretaria/professores/index.php";

const session=await window.PrimeWaySecretaria.ensureSecretary();
if(!session)return;

window.PrimeWaySecretaria.bindLogout();

const search=document.querySelector("#teacherSearch");
const statusFilter=document.querySelector("#statusFilter");
const tbody=document.querySelector("#teachersTableBody");

const modal=document.querySelector("#teacherDetailsModal");
const modalContent=document.querySelector("#teacherDetailsContent");
const modalClose=document.querySelector("#teacherDetailsClose");
const modalOverlay=document.querySelector("#teacherDetailsOverlay");

let teachers=[];

function escapeHtml(value){
    return String(value??"")
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;")
        .replaceAll("'","&#039;");
}

function normalize(value){
    return String(value||"")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g,"")
        .toLowerCase()
        .trim();
}

function isActive(teacher){
    return teacher.status==="ativo"&&teacher.personActive;
}

function visibleTeachers(){
    const term=normalize(search.value);
    const status=statusFilter.value;

    return teachers.filter(teacher=>{
        const academicText=[
            ...(teacher.mainClasses||[]).map(item=>item.name),
            ...(teacher.assignments||[]).flatMap(item=>[
                item.class?.name,
                item.subject?.name,
                item.subject?.area
            ])
        ];

        const haystack=normalize([
            teacher.name,
            teacher.registration,
            teacher.email,
            teacher.phone,
            ...academicText
        ].join(" "));

        if(term&&!haystack.includes(term)){
            return false;
        }

        if(status==="active"&&!isActive(teacher)){
            return false;
        }

        if(status==="inactive"&&isActive(teacher)){
            return false;
        }

        if(status==="linked"){
            const linked=
                (teacher.mainClasses||[]).length>0
                ||
                (teacher.assignments||[]).length>0;

            if(!linked)return false;
        }

        return true;
    });
}

function academicClassesCount(teacher){
    const ids=new Set();

    for(const item of teacher.mainClasses||[]){
        ids.add(Number(item.id));
    }

    for(const item of teacher.assignments||[]){
        ids.add(Number(item.class?.id));
    }

    ids.delete(0);
    ids.delete(NaN);

    return ids.size;
}

function activeSubjectsCount(teacher){
    return(teacher.assignments||[]).filter(
        item=>item.status==="Ativa"
    ).length;
}

function render(){
    const list=visibleTeachers();
    tbody.replaceChildren();

    if(!list.length){
        const row=document.createElement("tr");

        row.innerHTML=`
            <td colspan="7" class="teacher-empty-cell">
                Nenhum professor encontrado.
            </td>
        `;

        tbody.append(row);
        return;
    }

    for(const teacher of list){
        const row=document.createElement("tr");

        row.innerHTML=`
            <td>
                <div class="teacher-identity">
                    <div class="teacher-avatar">
                        ${escapeHtml(
                            teacher.name?.charAt(0)?.toUpperCase()||"P"
                        )}
                    </div>

                    <div>
                        <strong>${escapeHtml(teacher.name)}</strong>
                        <span>${escapeHtml(teacher.registration||"Sem registro funcional")}</span>
                    </div>
                </div>
            </td>

            <td>
                <strong>${escapeHtml(teacher.email||"—")}</strong>
                <span class="teacher-subline">
                    ${escapeHtml(teacher.phone||"Sem telefone")}
                </span>
            </td>

            <td>
                ${academicClassesCount(teacher)}
            </td>

            <td>
                ${activeSubjectsCount(teacher)}
            </td>

            <td>
                <span class="secretary-status ${isActive(teacher)?"success":"neutral"}">
                    ${isActive(teacher)?"Ativo":"Inativo"}
                </span>
            </td>

            <td>
                <span class="teacher-access ${teacher.accountActive?"active":"inactive"}">
                    ${teacher.accountActive?"Liberado":"Bloqueado"}
                </span>
            </td>

            <td>
                <button
                    type="button"
                    class="teacher-details-button"
                    data-teacher-id="${teacher.id}"
                >
                    <i class="fa-solid fa-eye"></i>
                    Ver detalhes
                </button>
            </td>
        `;

        tbody.append(row);
    }

    bindDetails();
}

function classesHtml(teacher){
    const main=teacher.mainClasses||[];

    if(!main.length){
        return`
            <div class="teacher-detail-empty">
                Nenhuma turma como professor regente.
            </div>
        `;
    }

    return main.map(item=>`
        <article class="teacher-link-card">
            <div>
                <strong>${escapeHtml(item.name)}</strong>
                <span>
                    ${escapeHtml(item.series)} • ${escapeHtml(item.shift)}
                    ${item.room?` • Sala ${escapeHtml(item.room)}`:""}
                </span>
            </div>

            <span class="secretary-status ${item.status==="Ativa"?"success":"neutral"}">
                ${escapeHtml(item.status)}
            </span>
        </article>
    `).join("");
}

function assignmentsHtml(teacher){
    const items=teacher.assignments||[];

    if(!items.length){
        return`
            <div class="teacher-detail-empty">
                Nenhuma disciplina vinculada no ano letivo atual.
            </div>
        `;
    }

    return items.map(item=>`
        <article class="teacher-assignment-card">
            <div>
                <strong>${escapeHtml(item.subject?.name||"Disciplina")}</strong>
                <span>
                    ${escapeHtml(item.subject?.code||"")}
                    ${item.subject?.area?` • ${escapeHtml(item.subject.area)}`:""}
                </span>
            </div>

            <div class="teacher-assignment-meta">
                <span>
                    <i class="fa-solid fa-users-rectangle"></i>
                    ${escapeHtml(item.class?.name||"Turma")}
                </span>

                <span>
                    <i class="fa-solid fa-clock"></i>
                    ${Number(item.workload||0)}h
                </span>

                <span class="secretary-status ${item.status==="Ativa"?"success":"neutral"}">
                    ${escapeHtml(item.status)}
                </span>
            </div>
        </article>
    `).join("");
}

function openDetails(teacher){
    modalContent.innerHTML=`
        <div class="teacher-detail-heading">
            <div class="teacher-detail-avatar">
                ${escapeHtml(
                    teacher.name?.charAt(0)?.toUpperCase()||"P"
                )}
            </div>

            <div>
                <span class="teacher-detail-label">Professor</span>

                <h2>${escapeHtml(teacher.name)}</h2>

                <div class="teacher-detail-badges">
                    <span class="${isActive(teacher)?"success":"muted"}">
                        ${isActive(teacher)?"Ativo":"Inativo"}
                    </span>

                    <span class="${teacher.accountActive?"success":"muted"}">
                        ${teacher.accountActive?"Acesso ativo":"Acesso bloqueado"}
                    </span>

                    ${
                        teacher.registration
                        ?`<span>${escapeHtml(teacher.registration)}</span>`
                        :""
                    }
                </div>
            </div>
        </div>

        <section class="teacher-detail-section">
            <h3>Dados cadastrais</h3>

            <div class="teacher-detail-grid">
                <div>
                    <span>E-mail</span>
                    <strong>${escapeHtml(teacher.email||"—")}</strong>
                </div>

                <div>
                    <span>Telefone</span>
                    <strong>${escapeHtml(teacher.phone||"—")}</strong>
                </div>

                <div>
                    <span>Documento</span>
                    <strong>${escapeHtml(teacher.document||"—")}</strong>
                </div>

                <div>
                    <span>Nascimento</span>
                    <strong>${window.PrimeWaySecretaria.formatDate(teacher.birthDate)}</strong>
                </div>

                <div>
                    <span>Admissão</span>
                    <strong>${window.PrimeWaySecretaria.formatDate(teacher.admissionDate)}</strong>
                </div>

                <div>
                    <span>Último login</span>
                    <strong>${window.PrimeWaySecretaria.formatDate(teacher.lastLogin,true)}</strong>
                </div>
            </div>
        </section>

        <section class="teacher-detail-section">
            <h3>Professor regente</h3>
            <div class="teacher-link-list">
                ${classesHtml(teacher)}
            </div>
        </section>

        <section class="teacher-detail-section">
            <h3>Disciplinas e turmas</h3>
            <div class="teacher-assignment-list">
                ${assignmentsHtml(teacher)}
            </div>
        </section>
    `;

    modal.hidden=false;
    document.body.classList.add("modal-open");
    modalClose.focus();
}

function closeDetails(){
    modal.hidden=true;
    document.body.classList.remove("modal-open");
}

function bindDetails(){
    document.querySelectorAll("[data-teacher-id]")
        .forEach(button=>{
            button.addEventListener("click",()=>{
                const id=Number(button.dataset.teacherId);

                const teacher=teachers.find(
                    item=>Number(item.id)===id
                );

                if(teacher){
                    openDetails(teacher);
                }
            });
        });
}

async function load(){
    const{response,data}=
        await window.PrimeWaySecretaria.request(API);

    if(!response.ok||!data?.success){
        throw new Error(
            data?.message||
            "Não foi possível carregar os professores."
        );
    }

    teachers=Array.isArray(data.teachers)
        ?data.teachers
        :[];

    document.querySelector("#summaryTotal").textContent=
        String(data.summary?.total??0);

    document.querySelector("#summaryActive").textContent=
        String(data.summary?.active??0);

    document.querySelector("#summaryAccounts").textContent=
        String(data.summary?.activeAccounts??0);

    document.querySelector("#summaryLinked").textContent=
        String(data.summary?.withAssignments??0);

    document.querySelector("#schoolYearLabel").textContent=
        String(data.schoolYear?.year??"—");

    render();
}

search.addEventListener("input",render);
statusFilter.addEventListener("change",render);

modalClose.addEventListener("click",closeDetails);
modalOverlay.addEventListener("click",closeDetails);

document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&!modal.hidden){
        closeDetails();
    }
});

try{
    await load();
}catch(error){
    console.error(error);

    window.PrimeWayFeedback?.error(
        error?.message||
        "Não foi possível carregar os professores."
    );
}

});
