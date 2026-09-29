document.addEventListener(
"DOMContentLoaded",
async function(){

const API="../api/secretaria/responsaveis/index.php";

const session=await window.PrimeWaySecretaria.ensureSecretary();
if(!session)return;

window.PrimeWaySecretaria.bindLogout();

const body=document.querySelector("#guardiansTableBody");
const search=document.querySelector("#guardianSearch");
const statusFilter=document.querySelector("#statusFilter");
const modal=document.querySelector("#guardianDetailsModal");
const modalBody=document.querySelector("#guardianDetailsContent");
const modalClose=document.querySelector("#guardianDetailsClose");
const modalOverlay=document.querySelector("#guardianDetailsOverlay");

let guardians=[];

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

function statusLabel(status){
    if(status==="ativo")return"Ativo";
    if(status==="pendente")return"Pendente";
    return"Inativo";
}

function statusClass(status){
    if(status==="ativo")return"success";
    if(status==="pendente")return"warning";
    return"neutral";
}

function setCount(selector,value){
    const el=document.querySelector(selector);
    if(el)el.textContent=Number(value||0);
}

function visible(){
    const term=normalize(search.value);
    const status=statusFilter.value;

    return guardians.filter(guardian=>{
        const text=normalize([
            guardian.name,
            guardian.email,
            guardian.phone,
            guardian.document,
            ...(guardian.links||[]).map(link=>link.studentName)
        ].join(" "));

        return(!term||text.includes(term))
            &&(!status||guardian.status===status);
    });
}

function render(){
    const list=visible();
    body.replaceChildren();

    if(!list.length){
        const row=document.createElement("tr");
        row.innerHTML=`
            <td colspan="6" class="guardian-empty-cell">
                Nenhum responsável encontrado.
            </td>
        `;
        body.append(row);
        return;
    }

    for(const guardian of list){
        const activeLinks=(guardian.links||[])
            .filter(link=>link.active);

        const linked=activeLinks.length
            ?activeLinks.map(link=>`
                <div class="guardian-student-link">
                    <strong>${escapeHtml(link.studentName)}</strong>
                    <span>
                        ${escapeHtml(link.relationship||"Responsável")}
                        ${link.className?` • ${escapeHtml(link.className)}`:""}
                    </span>
                </div>
            `).join("")
            :'<span class="guardian-muted">Sem vínculo ativo</span>';

        const row=document.createElement("tr");

        row.innerHTML=`
            <td>
                <div class="guardian-identity">
                    <div class="guardian-avatar">
                        ${escapeHtml(
                            guardian.name?.charAt(0)?.toUpperCase()||"R"
                        )}
                    </div>

                    <div>
                        <strong>${escapeHtml(guardian.name)}</strong>
                        <span>${escapeHtml(guardian.document||"Sem documento")}</span>
                    </div>
                </div>
            </td>

            <td>
                <div class="guardian-links-cell">
                    ${linked}
                </div>
            </td>

            <td>
                <strong>${escapeHtml(guardian.phone||"—")}</strong>
                <span class="guardian-subline">
                    ${escapeHtml(guardian.email||"Sem e-mail")}
                </span>
            </td>

            <td>
                <span class="secretary-status ${statusClass(guardian.status)}">
                    ${statusLabel(guardian.status)}
                </span>
            </td>

            <td>
                <span class="guardian-access ${guardian.accountActive?"active":"inactive"}">
                    ${guardian.accountActive?"Liberado":"Bloqueado"}
                </span>
            </td>

            <td>
                <button
                    type="button"
                    class="guardian-details-button"
                    data-guardian-id="${guardian.id}"
                >
                    <i class="fa-solid fa-eye"></i>
                    Ver detalhes
                </button>
            </td>
        `;

        body.append(row);
    }

    bindDetails();
}

function openDetails(guardian){
    const links=(guardian.links||[]);

    const linksHtml=links.length
        ?links.map(link=>`
            <article class="guardian-link-card">
                <div>
                    <strong>${escapeHtml(link.studentName)}</strong>
                    <span>
                        ${escapeHtml(link.relationship||"Responsável")}
                        ${link.className?` • ${escapeHtml(link.className)}`:""}
                    </span>
                </div>

                <div class="guardian-badges">
                    ${link.primaryContact?'<span>Contato principal</span>':""}
                    ${link.authorizedPickup?'<span class="success">Retirada autorizada</span>':""}
                    ${link.financial?'<span class="financial">Financeiro</span>':""}
                    ${!link.active?'<span class="muted">Vínculo inativo</span>':""}
                </div>
            </article>
        `).join("")
        :'<div class="guardian-detail-empty">Nenhum aluno vinculado.</div>';

    modalBody.innerHTML=`
        <div class="guardian-detail-heading">
            <div class="guardian-detail-avatar">
                ${escapeHtml(
                    guardian.name?.charAt(0)?.toUpperCase()||"R"
                )}
            </div>

            <div>
                <span class="guardian-detail-label">Responsável</span>
                <h2>${escapeHtml(guardian.name)}</h2>

                <div class="guardian-badges">
                    <span class="${statusClass(guardian.status)}">
                        ${statusLabel(guardian.status)}
                    </span>
                    <span class="${guardian.accountActive?"success":"muted"}">
                        ${guardian.accountActive?"Acesso ativo":"Acesso bloqueado"}
                    </span>
                </div>
            </div>
        </div>

        <section class="guardian-detail-section">
            <h3>Dados cadastrais</h3>

            <div class="guardian-detail-grid">
                <div>
                    <span>E-mail</span>
                    <strong>${escapeHtml(guardian.email||"—")}</strong>
                </div>
                <div>
                    <span>Telefone</span>
                    <strong>${escapeHtml(guardian.phone||"—")}</strong>
                </div>
                <div>
                    <span>Documento</span>
                    <strong>${escapeHtml(guardian.document||"—")}</strong>
                </div>
                <div>
                    <span>Nascimento</span>
                    <strong>${window.PrimeWaySecretaria.formatDate(guardian.birthDate)}</strong>
                </div>
            </div>
        </section>

        <section class="guardian-detail-section">
            <h3>Alunos vinculados</h3>
            <div class="guardian-link-list">${linksHtml}</div>
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
    document.querySelectorAll("[data-guardian-id]")
        .forEach(button=>{
            button.addEventListener("click",()=>{
                const id=Number(button.dataset.guardianId);
                const guardian=guardians.find(
                    item=>Number(item.id)===id
                );

                if(guardian)openDetails(guardian);
            });
        });
}

async function load(){
    try{
        const{response,data}=
            await window.PrimeWaySecretaria.request(API);

        if(!response.ok||!data?.success){
            throw new Error(
                data?.message||
                "Não foi possível carregar os responsáveis."
            );
        }

        guardians=data.guardians||[];

        setCount("#summaryTotal",data.summary.total);
        setCount("#summaryActive",data.summary.active);
        setCount("#summaryLinks",data.summary.activeLinks);
        setCount("#summaryPickup",data.summary.authorizedPickup);

        document.querySelector("#schoolYearLabel").textContent=
            data.schoolYear?.year??"—";

        render();
    }catch(error){
        console.error(error);
        window.PrimeWayFeedback?.error(
            error?.message||
            "Não foi possível carregar os responsáveis."
        );
    }
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

await load();

});
