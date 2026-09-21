document.addEventListener("DOMContentLoaded", async function () {
    await window.PrimeWayStorage?.ready;

    const SESSION_URL = "../api/auth/session.php";
    const LOGOUT_URL = "../api/auth/logout.php";
    const PORTAL_URL = "../api/aluno/index.php";
    const LOGIN_PAGE = "login.html";
    const ROLE_PAGES = {
        admin: "dashboard.html",
        professor: "professor.html",
        responsavel: "responsavel.html"
    };

    async function readJson(response) {
        try { return await response.json(); } catch { return null; }
    }

    function clearSession() {
        for (const key of ["primewayLogado", "primewayUsuario", "primewayPerfil"]) {
            sessionStorage.removeItem(key);
        }
    }

    async function validateSession() {
        try {
            const response = await fetch(SESSION_URL, {
                credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" }
            });
            const data = await readJson(response);
            if (!response.ok || !data?.authenticated || !data.usuario) throw new Error();
            const role = data.usuario.perfil;
            if (ROLE_PAGES[role]) { location.replace(ROLE_PAGES[role]); return false; }
            if (role !== "aluno") throw new Error();
            return true;
        } catch {
            clearSession();
            location.replace(LOGIN_PAGE);
            return false;
        }
    }

    function set(selector, value) {
        const element = document.querySelector(selector);
        if (element) element.textContent = value === null || value === undefined || value === "" ? "—" : String(value);
    }

    function formatDate(value, withTime = false) {
        if (!value) return "—";
        const normalized = String(value).includes("T") ? value : String(value).replace(" ", "T");
        const parsed = new Date(normalized.length === 10 ? `${normalized}T12:00:00` : normalized);
        if (Number.isNaN(parsed.getTime())) return String(value);
        return new Intl.DateTimeFormat("pt-BR", withTime
            ? { dateStyle: "short", timeStyle: "short" }
            : { dateStyle: "short" }).format(parsed);
    }

    function empty(message) {
        const element = document.createElement("p");
        element.className = "empty-state";
        element.textContent = message;
        return element;
    }

    function textElement(tag, className, value) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        element.textContent = value;
        return element;
    }

    function renderSubjects(items) {
        const container = document.querySelector("#studentSubjects");
        container.replaceChildren();
        if (!items.length) { container.append(empty("Nenhuma disciplina vinculada à turma.")); return; }
        for (const item of items) {
            const card = document.createElement("article");
            card.className = "subject-card";
            card.append(
                textElement("span", "code", item.code),
                textElement("h3", "", item.name),
                textElement("p", "", `Professor(a): ${item.teacher}`),
                textElement("span", "", `${item.workload} horas • ${item.area}`)
            );
            container.append(card);
        }
    }

   function renderActivities(items) {

    const container =
        document.querySelector(
            "#studentActivities"
        );

    container.replaceChildren();


    if (!items.length) {

        container.append(
            empty(
                "Nenhuma atividade foi publicada."
            )
        );

        return;
    }


    for (const item of items) {

        const row =
            document.createElement(
                "article"
            );

        row.className =
            "list-item";


        /* TÍTULO */

        const title =
            textElement(
                "h3",
                "",
                item.title
            );


        /* DISCIPLINA */

        const badge =
            textElement(
                "span",
                "badge",
                item.subject
            );


        /* DESCRIÇÃO */

        const description =
            textElement(
                "p",
                "",
                item.description ||
                "Sem descrição."
            );


        /* DATA / PERÍODO */

        const meta =
            textElement(
                "span",
                "meta",
                `Entrega: ${
                    formatDate(
                        item.dueAt,
                        Boolean(
                            item.dueAt
                        )
                    )
                } • ${
                    item.period
                }`
            );


        /*============================================
                    BOTÃO ABRIR
        ============================================*/

        const button =
            document.createElement(
                "a"
            );


        button.href =
            `aluno_atividades.html?id=${encodeURIComponent(
                item.id
            )}`;


        button.className =
            "activity-access-button";


        button.innerHTML = `
            <i class="fa-regular fa-eye"></i>
            Abrir atividade
        `;


        /* ADICIONAR NA TELA */

        row.append(
            title,
            badge,
            description,
            meta,
            button
        );


        container.append(
            row
        );
    }
}
    function renderGrades(items) {
        const container = document.querySelector("#studentGrades");
        container.replaceChildren();
        if (!items.length) { container.append(empty("Nenhuma avaliação cadastrada.")); return; }
        for (const item of items) {
            const row = document.createElement("article");
            row.className = "list-item";
            const value = item.value === null ? "Aguardando" : `${Number(item.value).toLocaleString("pt-BR")}/${Number(item.maximum).toLocaleString("pt-BR")}`;
            row.append(
                textElement("h3", "", item.title),
                textElement("span", "value", value),
                textElement("span", "meta", `${item.subject} • ${item.period} • ${formatDate(item.date)}`)
            );
            container.append(row);
        }
    }

    function renderAttendance(items) {
        const container = document.querySelector("#studentAttendance");
        container.replaceChildren();
        if (!items.length) { container.append(empty("Nenhuma frequência registrada.")); return; }
        for (const item of items) {
            const row = document.createElement("article");
            row.className = "list-item";
            const percentage = item.percentage === null ? "—" : `${item.percentage}%`;
            const progress = document.createElement("div");
            progress.className = "progress";
            const bar = document.createElement("span");
            bar.style.width = `${item.percentage ?? 0}%`;
            progress.append(bar);
            row.append(
                textElement("h3", "", item.subject),
                textElement("span", "value", percentage),
                textElement("span", "meta", `${item.presences} presenças • ${item.absences} faltas • ${item.justified} justificadas`),
                progress
            );
            container.append(row);
        }
    }

    function renderEvents(items) {
        const container = document.querySelector("#studentEvents");
        container.replaceChildren();
        if (!items.length) { container.append(empty("Nenhum evento futuro.")); return; }
        for (const item of items) {
            const row = document.createElement("article");
            row.className = "list-item";
            const time = item.startTime ? ` às ${String(item.startTime).slice(0, 5)}` : "";
            row.append(
                textElement("h3", "", item.title),
                textElement("span", "badge", item.type),
                textElement("p", "", `${formatDate(item.date)}${time}${item.location ? ` • ${item.location}` : ""}`)
            );
            container.append(row);
        }
    }

    function renderNotices(items) {
        const container = document.querySelector("#studentNotices");
        container.replaceChildren();
        if (!items.length) { container.append(empty("Nenhum comunicado publicado.")); return; }
        for (const item of items) {
            const row = document.createElement("article");
            row.className = "list-item";
            row.append(
                textElement("h3", "", item.title),
                textElement("span", "badge", item.type),
                textElement("p", "", item.message),
                textElement("span", "meta", formatDate(item.date, true))
            );
            container.append(row);
        }
    }

    function render(data) {
        const profile = data.profile || {};
        const enrollment = data.enrollment;
        const summary = data.summary || {};
        const firstName = String(profile.name || "Aluno").trim().split(/\s+/)[0];
        set("#studentGreeting", `Olá, ${firstName}!`);
        set("#studentContext", enrollment
            ? `${enrollment.className} • ${enrollment.series} • ${enrollment.shift} • Ano letivo ${data.schoolYear}`
            : "Você ainda não possui uma turma ativa. A administração poderá vinculá-la depois.");
        set("#averageValue", summary.average === null ? "—" : Number(summary.average).toLocaleString("pt-BR", { minimumFractionDigits: 1 }));
        set("#attendanceValue", summary.attendance === null ? "—" : `${summary.attendance}%`);
        set("#subjectsCount", summary.subjects ?? 0);
        set("#activitiesCount", summary.upcomingActivities ?? 0);
        set("#studentName", profile.name);
        set("#studentEmail", profile.email);
        set("#studentRegistration", profile.registration);
        set("#studentClass", enrollment?.className || "Sem turma");
        set("#studentPhone", profile.phone);
        set("#studentDocument", profile.document);
        set("#studentBirthDate", formatDate(profile.birthDate));
        set("#studentEntryDate", formatDate(profile.entryDate));
        set("#studentStatus", profile.status === "ativo" ? "Ativo" : profile.status === "pendente" ? "Pendente" : "Inativo");
        renderSubjects(data.subjects || []);
        renderActivities(data.activities || []);
        renderGrades(data.grades || []);
        renderAttendance(data.attendance || []);
        renderEvents(data.events || []);
        renderNotices(data.notices || []);
    }

    async function loadPortal() {
        try {
            const response = await fetch(PORTAL_URL, {
                credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" }
            });
            const data = await readJson(response);
            if (!response.ok || !data?.success) throw new Error(data?.message || "Falha ao carregar.");
            render(data);
        } catch (error) {
            console.error("Erro ao carregar a área do aluno:", error);

            PrimeWayFeedback.error(
                error?.message ||
                "Não foi possível carregar sua área."
            );
        }
    }

    async function logout() {
        try {
            const sessionResponse = await fetch(SESSION_URL, {
                credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" }
            });
            const sessionData = await readJson(sessionResponse);
            const response = await fetch(LOGOUT_URL, {
                method: "POST", credentials: "same-origin",
                headers: { Accept: "application/json", "X-CSRF-Token": sessionData?.csrfToken || "" }
            });
            const data = await readJson(response);
            if (!response.ok || !data?.success) throw new Error();
            clearSession();
            location.replace(LOGIN_PAGE);
        } catch (error) {
            console.error("Erro ao encerrar a sessão:", error);
            PrimeWayFeedback.error("Não foi possível encerrar a sessão.");
        }
    }

    if (!await validateSession()) return;
    set("#currentDate", new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date()));
    document.querySelector("#logoutButton")?.addEventListener("click", logout);
    await loadPortal();
});
