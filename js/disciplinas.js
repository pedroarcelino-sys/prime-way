document.addEventListener("DOMContentLoaded", async () => {
    "use strict";
    await window.PrimeWayStorage?.ready;
    const q = selector => document.querySelector(selector);
    const feedback = (kind, message) => window.PrimeWayFeedback?.[kind]?.(message);
    let csrf = "", subjects = [], classes = [], teachers = [], busy = false, generation = 0;
    let mode = "identity", previousFocus;
    const form = q("#subjectForm"), modal = q("#subjectModal"), view = q("#subjectViewModal");
    const escape = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
    const normalize = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    async function request(url, payload) {
        const response = await fetch(url, {
            method: payload === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store",
            headers: { Accept: "application/json", ...(payload === undefined ? {} : { "Content-Type": "application/json", "X-CSRF-Token": csrf }) },
            ...(payload === undefined ? {} : { body: JSON.stringify(payload) })
        });
        const data = await response.json().catch(() => null);
        if (response.status === 401) location.replace("login.html");
        if (!response.ok || !data?.success) throw new Error(data?.message || "Não foi possível carregar ou salvar os dados.");
        return data;
    }
    try {
        const response = await fetch("../api/auth/session.php", { credentials: "same-origin", cache: "no-store" });
        const session = await response.json();
        if (!response.ok || !session.authenticated || session.usuario?.perfil !== "admin") {
            location.replace(session.usuario?.perfil === "professor" ? "professor.html" : "login.html");
            return;
        }
        csrf = session.csrfToken || "";
    } catch { location.replace("login.html"); return; }

    function allRows() {
        return subjects.flatMap(subject => subject.links.length ? subject.links.map(link => ({ subject, link })) : [{ subject, link: null }]);
    }
    function effectiveStatus(subject, link) {
        return subject.status === "Ativa" && (!link || link.status === "Ativa") ? "Ativa" : "Inativa";
    }
    function button(action, title, icon, subject, link) {
        return `<button type="button" class="subject-action-button" data-action="${action}" data-subject-id="${subject.id}" data-link-id="${link?.id || ""}" title="${title}" aria-label="${title} — ${escape(subject.name)}"><i class="fa-solid ${icon}" aria-hidden="true"></i></button>`;
    }
    function render() {
        const search = normalize(q("#subjectSearch").value), area = q("#areaFilter").value, status = q("#statusFilter").value;
        const rows = allRows().filter(({ subject: s, link: l }) => (!area || s.area === area)
            && (!status || effectiveStatus(s,l) === status)
            && normalize([s.name,s.code,s.area,l?.teacher,l?.className,l?.hours].join(" ")).includes(search));
        q("#subjectsTableBody").innerHTML = rows.map(({ subject: s, link: l }) => `<tr>
            <td><div class="subject-cell"><div class="subject-avatar"><i class="fa-solid fa-book-open" aria-hidden="true"></i></div><strong>${escape(s.name)}</strong></div></td>
            <td>${escape(s.code)}</td><td>${escape(s.area)}</td>
            <td>${escape(l?.teacher || "—")}${l && !l.teacherAvailable ? '<small class="subject-link-status">Professor indisponível</small>' : ""}</td>
            <td>${l ? `${escape(l.className)} • ${l.schoolYear}${l.classStatus === 'Inativa' ? ' (turma inativa)' : ''}` : 'Disciplina sem turma'}</td>
            <td>${l ? `${l.hours}h` : '—'}</td>
            <td><span class="status-badge ${s.status === 'Ativa' ? 'active' : 'inactive'}">Disciplina ${escape(s.status.toLowerCase())}</span>${l ? `<span class="subject-link-status">Vínculo ${l.status === 'Ativa' ? 'ativo' : 'inativo'}</span>` : ''}</td>
            <td><div class="subject-actions-buttons">
            ${button('view','Visualizar','fa-eye',s,l)}${button('identity','Editar disciplina','fa-pen',s,l)}
            ${button('link',l ? 'Editar vínculo' : 'Vincular à turma','fa-link',s,l)}
            ${button('subject-status',s.status === 'Ativa' ? 'Inativar disciplina' : 'Reativar disciplina','fa-power-off',s,l)}
            ${l ? button('link-status',l.status === 'Ativa' ? 'Inativar vínculo' : 'Reativar vínculo','fa-toggle-on',s,l) : ''}
            </div></td></tr>`).join("");
        q("#subjectsEmpty").classList.toggle("active", rows.length === 0);
        q("#totalSubjects").textContent = subjects.length;
        q("#activeSubjects").textContent = subjects.filter(s => s.status === "Ativa").length;
        q("#totalHours").textContent = subjects.flatMap(s=>s.links).reduce((n,l)=>n+l.hours,0)+"h";
        q("#linkedClasses").textContent = new Set(subjects.flatMap(s=>s.links.map(l=>l.turmaId))).size;
    }
    async function load() {
        const current = ++generation;
        const [data, classData, teacherData] = await Promise.all([
            request("../api/disciplinas/index.php"), request("../api/turmas/index.php"), request("../api/professores/index.php")
        ]);
        if (current !== generation) return;
        subjects = data.subjects; classes = classData.classes; teachers = teacherData.professors;
        render();
    }
    function show(element) {
        previousFocus = document.activeElement;
        element.classList.add("active"); element.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        element.querySelector("input:not([type=hidden]):not(:disabled),select:not(:disabled),button")?.focus();
    }
    function close(element) {
        if (busy) return;
        element.classList.remove("active"); element.setAttribute("aria-hidden", "true");
        document.body.style.overflow = ""; previousFocus?.focus();
    }
    function options(selector, items, currentId, label, available) {
        const select = q(selector); select.replaceChildren(new Option("Selecione", ""));
        for (const item of items) {
            const current = item.id === currentId;
            if (!available(item) && !current) continue;
            const option = new Option(label(item) + (!available(item) ? " (indisponível)" : ""), String(item.id));
            select.append(option);
        }
        select.value = currentId ? String(currentId) : "";
    }
    function editIdentity(subject) {
        mode = "identity"; form.reset();
        q("#subjectModalTitle").textContent = subject ? "Editar disciplina" : "Nova disciplina";
        q("#subjectId").value = subject?.id || "";
        q("#subjectName").value = subject?.name || ""; q("#subjectCode").value = subject?.code || "";
        q("#subjectArea").value = subject?.area || ""; q("#subjectStatus").value = subject?.status || "Ativa";
        switchFields(); show(modal);
    }
    function switchFields() {
        form.querySelector('[type="submit"] span').textContent = mode === "link" ? "Salvar vínculo" : "Salvar disciplina";
        for (const [id, enabled] of [["#subjectIdentityFields",mode === "identity"],["#subjectLinkFields",mode === "link"]]) {
            q(id).hidden = !enabled;
            q(id).querySelectorAll("input,select").forEach(input => { input.disabled = !enabled; });
        }
    }
    async function editLink(subject, link) {
        // Atualiza opções antes de abrir; o PHP repete a validação na escrita.
        try { await load(); } catch(error) { feedback("error",error.message); return; }
        subject = subjects.find(s=>s.id === subject?.id) || null;
        link = subject?.links.find(l=>l.id === link?.id) || null;
        mode = "link"; form.reset(); switchFields();
        q("#subjectModalTitle").textContent = link ? "Editar vínculo acadêmico" : "Vincular disciplina à turma";
        q("#subjectLinkId").value = link?.id || "";
        options("#linkSubject",subjects,subject?.id,s=>`${s.code} • ${s.name}`,s=>s.status === "Ativa");
        options("#subjectTeacher",teachers,link?.professorId,t=>t.name,t=>t.available);
        options("#subjectClass",classes,link?.turmaId,c=>`${c.name} • ${c.schoolYear}`,c=>c.status === "Ativa");
        q("#subjectHours").value = link?.hours || ""; q("#linkStatus").value = link?.status || "Ativa";
        for (const id of ["#linkSubject","#subjectTeacher","#subjectClass"]) q(id).disabled = Boolean(link?.hasHistory);
        q("#subjectLinkNotice").textContent = link?.hasHistory
            ? "Este vínculo possui histórico. Turma, disciplina e professor estão protegidos; carga horária e status podem ser editados."
            : "Selecione os cadastros existentes. O vínculo é único por turma e disciplina.";
        show(modal);
    }
    function showView(subject, link) {
        for (const [id,value] of Object.entries({viewSubjectName:subject.name,viewSubjectCode:subject.code,viewSubjectArea:subject.area,
            viewSubjectTeacher:link?.teacher || "—",viewSubjectClass:link ? `${link.className} • ${link.schoolYear}` : "Disciplina sem turma",
            viewSubjectHours:link ? `${link.hours}h` : "—",viewSubjectStatus:`Disciplina ${subject.status.toLowerCase()}${link ? `; vínculo ${link.status === 'Ativa' ? 'ativo' : 'inativo'}` : ''}`})) q('#'+id).textContent=value;
        show(view);
    }
    async function changeStatus(subject, link, target) {
        if (busy) return;
        const item = target === "disciplina" ? subject : link;
        const status = item.status === "Ativa" ? "Inativa" : "Ativa";
        const confirmed = await window.PrimeWayConfirm?.warning?.(
            `${status === 'Inativa' ? 'Inativar' : 'Reativar'} ${target} de ${subject.name}? O histórico será preservado.`,
            { title:"Alterar status",confirmText:"Confirmar",cancelText:"Cancelar" });
        if (confirmed === false) return;
        busy = true;
        try {
            await request("../api/disciplinas/status.php",{target,id:item.id,status});
            await load(); feedback("success","Status atualizado. Histórico preservado.");
        } catch(error) { feedback("error",error.message); }
        finally { busy = false; }
    }
    form.addEventListener("submit",async event=>{
        event.preventDefault(); if (busy || !form.reportValidity()) return;
        const payload = mode === "identity"
            ? {id:q("#subjectId").value || null,name:q("#subjectName").value.trim(),code:q("#subjectCode").value.trim(),area:q("#subjectArea").value,status:q("#subjectStatus").value}
            : {id:q("#subjectLinkId").value || null,disciplinaId:q("#linkSubject").value,turmaId:q("#subjectClass").value,professorId:q("#subjectTeacher").value,hours:q("#subjectHours").value,status:q("#linkStatus").value};
        busy = true; const submit = form.querySelector('[type="submit"]'); submit.disabled = true;
        try {
            await request(`../api/disciplinas/${mode === 'identity' ? 'salvar' : 'salvar_vinculo'}.php`,payload);
            busy = false; close(modal); await load(); feedback("success", "Dados salvos no servidor.");
        } catch(error) { feedback("error",error.message); }
        finally { busy = false; submit.disabled = false; }
    });
    q("#subjectsTableBody").addEventListener("click",event=>{
        if (busy) return;
        const button = event.target.closest("[data-action]"); if (!button) return;
        const subject = subjects.find(s=>s.id === Number(button.dataset.subjectId)); if(!subject)return;
        const link = subject.links.find(l=>l.id === Number(button.dataset.linkId));
        switch(button.dataset.action){
            case 'view':showView(subject,link);break;
            case 'identity':editIdentity(subject);break;
            case 'link':editLink(subject,link);break;
            case 'subject-status':changeStatus(subject,link,'disciplina');break;
            case 'link-status':changeStatus(subject,link,'vinculo');break;
        }
    });
    q("#newSubjectButton").addEventListener("click",()=>{if(!busy)editIdentity(null);});
    q("#newLinkButton").addEventListener("click",()=>{if(!busy)editLink(null,null);});
    for(const id of ["#subjectSearch","#areaFilter","#statusFilter"])q(id).addEventListener(id === "#subjectSearch" ? "input" : "change",render);
    for(const id of ["#subjectModalClose","#subjectCancelButton",".subject-modal-overlay"])q(id).addEventListener("click",()=>close(modal));
    for(const id of ["#subjectViewClose",".subject-view-overlay"])q(id).addEventListener("click",()=>close(view));
    document.addEventListener("keydown",event=>{
        const active = view.classList.contains("active") ? view : modal.classList.contains("active") ? modal : null;
        if(!active || document.querySelector(".primeway-confirm.show"))return;
        if(event.key === "Escape")close(active);
        if(event.key === "Tab"){
            const focusable = [...active.querySelectorAll('button,input:not([type="hidden"]),select')].filter(el=>!el.disabled && el.getClientRects().length);
            const first=focusable[0],last=focusable.at(-1);
            if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}
            else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();}
        }
    });
    q("#logoutButton").addEventListener("click",async()=>{
        try {await request("../api/auth/logout.php",{});location.replace("login.html");}
        catch(error){feedback("error",error.message);}
    });
    try {await load();} catch(error){feedback("error",error.message);q("#subjectsEmpty strong").textContent="Não foi possível carregar as disciplinas.";q("#subjectsEmpty").classList.add("active");}
});
