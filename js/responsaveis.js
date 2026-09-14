document.addEventListener("DOMContentLoaded", async function () {
    await window.PrimeWayStorage?.ready;

    const SESSION_URL = "../api/auth/session.php";
    const LOGOUT_URL = "../api/auth/logout.php";
    const GUARDIANS_URL = "../api/responsaveis/index.php";
    const SAVE_URL = "../api/responsaveis/salvar.php";
    const DELETE_URL = "../api/responsaveis/excluir.php";
    const STUDENTS_URL = "../api/alunos/index.php";
    const LOGIN_PAGE = "login.html";
    const ROUTES = { professor: "professor.html", responsavel: "responsavel.html" };

    const body = document.querySelector("#guardiansTableBody");
    const search = document.querySelector("#guardianSearch");
    const statusFilter = document.querySelector("#statusFilter");
    const dialog = document.querySelector("#guardianDialog");
    const form = document.querySelector("#guardianForm");
    const feedback = document.querySelector("#guardianFeedback");
    const saveButton = document.querySelector("#saveGuardianButton");
    const studentsSelect = document.querySelector("#guardianStudents");
    const password = document.querySelector("#guardianPassword");
    let guardians = [];
    let students = [];

    async function readJson(response) {
        try { return await response.json(); } catch (error) { return null; }
    }

    function clearSession() {
        for (const key of ["primewayLogado", "primewayUsuario", "primewayPerfil"]) sessionStorage.removeItem(key);
    }

    async function validateSession() {
        try {
            const response = await fetch(SESSION_URL, { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } });
            const data = await readJson(response);
            if (!response.ok || !data?.authenticated || !data?.usuario) throw new Error("Sessão ausente.");
            const user = data.usuario;
            sessionStorage.setItem("primewayLogado", "true");
            sessionStorage.setItem("primewayUsuario", String(user.email || ""));
            sessionStorage.setItem("primewayPerfil", String(user.perfil || ""));
            if (user.perfil !== "admin") {
                window.location.replace(ROUTES[user.perfil] || LOGIN_PAGE);
                return false;
            }
            return true;
        } catch (error) {
            clearSession();
            window.location.replace(LOGIN_PAGE);
            return false;
        }
    }

    async function freshToken() {
        const response = await fetch(SESSION_URL, { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } });
        const data = await readJson(response);
        if (!response.ok || !data?.authenticated || typeof data.csrfToken !== "string") {
            throw new Error("Sua sessão expirou. Entre novamente.");
        }
        return data.csrfToken;
    }

    function normalize(value) {
        return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    }

    function setCount(selector, value) {
        const element = document.querySelector(selector);
        if (element) element.textContent = new Intl.NumberFormat("pt-BR").format(value || 0);
    }

    function renderSummary() {
        setCount("#totalGuardians", guardians.length);
        setCount("#activeLinks", guardians.reduce((total, item) => total + item.links.filter((link) => link.active).length, 0));
        setCount("#activeAccounts", guardians.filter((item) => item.accountActive).length);
        setCount("#pendingGuardians", guardians.filter((item) => item.status === "pendente").length);
    }

    function td(text, className = "") {
        const cell = document.createElement("td");
        cell.textContent = text || "—";
        if (className) cell.className = className;
        return cell;
    }

    function statusLabel(status) {
        return status === "ativo" ? "Ativo" : status === "pendente" ? "Pendente" : "Inativo";
    }

    function renderTable() {
        if (!body) return;
        const term = normalize(search?.value);
        const status = statusFilter?.value || "";
        const filtered = guardians.filter((guardian) => {
            const text = normalize([guardian.name, guardian.email, guardian.phone, guardian.document, ...guardian.links.map((link) => link.studentName)].join(" "));
            return (!term || text.includes(term)) && (!status || guardian.status === status);
        });
        body.replaceChildren();
        if (filtered.length === 0) {
            const row = document.createElement("tr");
            const cell = td(guardians.length ? "Nenhum responsável encontrado." : "Nenhum responsável cadastrado.", "empty-cell");
            cell.colSpan = 6; row.append(cell); body.append(row); return;
        }

        for (const guardian of filtered) {
            const row = document.createElement("tr");
            const identity = document.createElement("td");
            const name = document.createElement("span"); name.className = "guardian-name"; name.textContent = guardian.name;
            const documentText = document.createElement("span"); documentText.className = "subtext"; documentText.textContent = guardian.document || "Sem documento";
            identity.append(name, documentText);

            const linked = document.createElement("td"); linked.className = "link-list";
            const activeLinks = guardian.links.filter((link) => link.active);
            if (activeLinks.length === 0) linked.textContent = "Sem vínculo ativo";
            for (const link of activeLinks) {
                const line = document.createElement("span");
                line.textContent = `${link.studentName} (${link.relationship})`;
                linked.append(line);
            }

            const contact = document.createElement("td"); contact.textContent = guardian.phone || "—";
            const email = document.createElement("span"); email.className = "subtext"; email.textContent = guardian.email || "Sem e-mail"; contact.append(email);
            const statusCell = document.createElement("td");
            const pill = document.createElement("span"); pill.className = `status-pill ${guardian.status === "pendente" ? "pending" : guardian.status === "inativo" ? "inactive" : ""}`; pill.textContent = statusLabel(guardian.status); statusCell.append(pill);
            const access = td(guardian.accountActive ? "Liberado" : "Bloqueado");
            const actions = document.createElement("td"); actions.className = "action-buttons";
            const edit = document.createElement("button"); edit.type = "button"; edit.title = "Editar responsável"; edit.innerHTML = '<i class="fa-solid fa-pen"></i>'; edit.addEventListener("click", () => openDialog(guardian));
            const remove = document.createElement("button"); remove.type = "button"; remove.title = "Inativar responsável"; remove.className = "danger"; remove.innerHTML = '<i class="fa-solid fa-user-slash"></i>'; remove.addEventListener("click", () => deactivateGuardian(guardian));
            actions.append(edit, remove);
            row.append(identity, linked, contact, statusCell, access, actions); body.append(row);
        }
    }

    function populateStudents(selectedIds = []) {
        if (!studentsSelect) return;
        const selected = new Set(selectedIds.map(Number));
        studentsSelect.replaceChildren();
        if (students.length === 0) {
            const option = document.createElement("option"); option.disabled = true; option.textContent = "Nenhum aluno cadastrado"; studentsSelect.append(option); return;
        }
        for (const student of students) {
            const option = document.createElement("option"); option.value = String(student.id); option.textContent = `${student.name}${student.className ? ` — ${student.className}` : " — Sem turma"}`; option.selected = selected.has(Number(student.id)); studentsSelect.append(option);
        }
    }

    function resetFeedback() { if (feedback) { feedback.textContent = ""; feedback.classList.remove("success"); } }

    function openDialog(guardian = null) {
        if (!dialog || !form) return;
        form.reset(); resetFeedback();
        document.querySelector("#guardianDialogTitle").textContent = guardian ? "Editar responsável" : "Novo responsável";
        document.querySelector("#guardianId").value = guardian?.id || "";
        document.querySelector("#guardianName").value = guardian?.name || "";
        document.querySelector("#guardianEmail").value = guardian?.email || "";
        document.querySelector("#guardianPhone").value = guardian?.phone || "";
        document.querySelector("#guardianDocument").value = guardian?.document || "";
        document.querySelector("#guardianBirthDate").value = guardian?.birthDate || "";
        document.querySelector("#guardianStatus").value = guardian?.status || "ativo";
        const links = guardian?.links.filter((link) => link.active) || [];
        populateStudents(links.map((link) => link.studentId));
        document.querySelector("#guardianRelationship").value = links[0]?.relationship || "";
        document.querySelector("#authorizedPickup").checked = Boolean(links[0]?.authorizedPickup);
        document.querySelector("#primaryContact").checked = Boolean(links[0]?.primaryContact);
        document.querySelector("#financialGuardian").checked = Boolean(links[0]?.financial);
        password.required = !guardian;
        password.value = "";
        document.querySelector("#passwordHint").textContent = guardian ? "Deixe vazio para manter a senha atual." : "Mínimo de 8 caracteres.";
        dialog.showModal(); document.querySelector("#guardianName")?.focus();
    }

    function closeDialog() { dialog?.close(); form?.reset(); resetFeedback(); }

    async function loadData() {
        const [guardiansResponse, studentsResponse] = await Promise.all([
            fetch(GUARDIANS_URL, { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } }),
            fetch(STUDENTS_URL, { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } })
        ]);
        const [guardiansData, studentsData] = await Promise.all([readJson(guardiansResponse), readJson(studentsResponse)]);
        if (!guardiansResponse.ok || !guardiansData?.success) throw new Error(guardiansData?.message || "Falha ao carregar responsáveis.");
        if (!studentsResponse.ok || !studentsData?.success) throw new Error(studentsData?.message || "Falha ao carregar alunos.");
        guardians = guardiansData.guardians || []; students = studentsData.students || [];
        renderSummary(); renderTable();
    }

    async function submitGuardian(event) {
        event.preventDefault(); if (!form?.reportValidity()) return;
        const studentIds = Array.from(studentsSelect.selectedOptions).map((option) => Number(option.value)).filter((id) => id > 0);
        if (studentIds.length === 0) { feedback.textContent = "Selecione ao menos um aluno."; return; }
        const payload = {
            id: document.querySelector("#guardianId").value || null,
            name: document.querySelector("#guardianName").value,
            email: document.querySelector("#guardianEmail").value,
            password: password.value,
            phone: document.querySelector("#guardianPhone").value,
            document: document.querySelector("#guardianDocument").value,
            birthDate: document.querySelector("#guardianBirthDate").value,
            status: document.querySelector("#guardianStatus").value,
            studentIds,
            relationship: document.querySelector("#guardianRelationship").value,
            authorizedPickup: document.querySelector("#authorizedPickup").checked,
            primaryContact: document.querySelector("#primaryContact").checked,
            financial: document.querySelector("#financialGuardian").checked
        };
        saveButton.disabled = true; saveButton.textContent = "Salvando…"; resetFeedback();
        try {
            const token = await freshToken();
            const response = await fetch(SAVE_URL, { method: "POST", credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json", "Content-Type": "application/json", "X-CSRF-Token": token }, body: JSON.stringify(payload) });
            const data = await readJson(response);
            if (!response.ok || !data?.success) throw new Error(data?.message || "Falha ao salvar responsável.");
            feedback.textContent = data.message; feedback.classList.add("success"); await loadData(); window.setTimeout(closeDialog, 650);
        } catch (error) { feedback.textContent = error.message || "Não foi possível salvar o responsável."; }
        finally { saveButton.disabled = false; saveButton.textContent = "Salvar responsável"; }
    }

    async function deactivateGuardian(guardian) {
        if (!window.confirm(`Inativar o acesso de ${guardian.name}?`)) return;
        try {
            const token = await freshToken();
            const response = await fetch(DELETE_URL, { method: "POST", credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json", "Content-Type": "application/json", "X-CSRF-Token": token }, body: JSON.stringify({ id: guardian.id }) });
            const data = await readJson(response); if (!response.ok || !data?.success) throw new Error(data?.message || "Falha ao inativar."); await loadData();
        } catch (error) { alert(error.message || "Não foi possível inativar o responsável."); }
    }

    async function logout() {
        try {
            const token = await freshToken();
            const response = await fetch(LOGOUT_URL, { method: "POST", credentials: "same-origin", headers: { Accept: "application/json", "X-CSRF-Token": token } });
            const data = await readJson(response); if (!response.ok || !data?.success) throw new Error(); clearSession(); window.location.replace(LOGIN_PAGE);
        } catch (error) { alert("Não foi possível encerrar a sessão."); }
    }

    if (!await validateSession()) return;
    try { await loadData(); } catch (error) { console.error(error); guardians = []; students = []; renderSummary(); renderTable(); }
    search?.addEventListener("input", renderTable); statusFilter?.addEventListener("change", renderTable);
    document.querySelector("#newGuardianButton")?.addEventListener("click", () => openDialog());
    document.querySelector("#closeGuardianDialog")?.addEventListener("click", closeDialog);
    document.querySelector("#cancelGuardianButton")?.addEventListener("click", closeDialog);
    document.querySelector("#logoutButton")?.addEventListener("click", logout);
    form?.addEventListener("submit", submitGuardian);
    dialog?.addEventListener("click", (event) => { if (event.target === dialog) closeDialog(); });
});
