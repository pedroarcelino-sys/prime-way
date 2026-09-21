document.addEventListener("DOMContentLoaded", async function () {
    await window.PrimeWayStorage?.ready;

    const SESSION_URL = "../api/auth/session.php";
    const LOGOUT_URL = "../api/auth/logout.php";
    const PORTAL_URL = "../api/professor/index.php";
    const LOGIN_PAGE = "login.html";
    const ADMIN_PAGE = "dashboard.html";
    const logoutButton = document.querySelector("#logoutButton");

    async function readJson(response) {
        try {
            return await response.json();
        } catch (error) {
            return null;
        }
    }

    function clearCompatibilitySession() {
        sessionStorage.removeItem("primewayLogado");
        sessionStorage.removeItem("primewayUsuario");
        sessionStorage.removeItem("primewayPerfil");
    }

    function syncCompatibilitySession(user) {
        sessionStorage.setItem("primewayLogado", "true");
        sessionStorage.setItem("primewayUsuario", String(user.email || ""));
        sessionStorage.setItem("primewayPerfil", String(user.perfil || ""));
    }

    async function validateSession() {
        try {
            const response = await fetch(SESSION_URL, {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store",
                headers: { "Accept": "application/json" }
            });
            const data = await readJson(response);

            if (!response.ok || !data?.authenticated || !data?.usuario) {
                clearCompatibilitySession();
                window.location.replace(LOGIN_PAGE);
                return false;
            }

            const user = data.usuario;
            syncCompatibilitySession(user);

            if (user.perfil === "admin") {
                window.location.replace(ADMIN_PAGE);
                return false;
            }

            if (user.perfil !== "professor") {
                clearCompatibilitySession();
                window.location.replace(LOGIN_PAGE);
                return false;
            }

            return true;
        } catch (error) {
            console.error("Erro ao validar a sessão do professor:", error);
            clearCompatibilitySession();
            window.location.replace(LOGIN_PAGE);
            return false;
        }
    }

    function setText(selector, value) {
        const element = document.querySelector(selector);
        if (element) {
            element.textContent = value === null || value === undefined || value === ""
                ? "—"
                : String(value);
        }
    }

    function formatDate(value) {
        if (!value) {
            return "—";
        }
        const date = new Date(`${value}T12:00:00`);
        return Number.isNaN(date.getTime())
            ? String(value)
            : new Intl.DateTimeFormat("pt-BR").format(date);
    }

    function createCell(text) {
        const cell = document.createElement("td");
        cell.textContent = text || "—";
        return cell;
    }

    function renderEmpty(body, columns, message) {
        body.replaceChildren();
        const row = document.createElement("tr");
        const cell = createCell(message);
        cell.colSpan = columns;
        cell.className = "professor-empty";
        row.append(cell);
        body.append(row);
    }

    function renderClasses(classes) {
        const body = document.querySelector("#professorClassesBody");
        if (!body) {
            return;
        }
        if (!Array.isArray(classes) || classes.length === 0) {
            renderEmpty(body, 6, "Você ainda não possui turmas vinculadas.");
            return;
        }

        body.replaceChildren();
        for (const item of classes) {
            const row = document.createElement("tr");
            row.append(
                createCell(item.name),
                createCell(item.grade),
                createCell(item.shift),
                createCell(item.room),
                createCell(item.subjects),
                createCell(String(item.students ?? 0))
            );
            body.append(row);
        }
    }

    function renderStudents(students) {
        const body = document.querySelector("#professorStudentsBody");
        if (!body) {
            return;
        }
        if (!Array.isArray(students) || students.length === 0) {
            renderEmpty(body, 3, "Nenhum aluno está vinculado às suas turmas.");
            return;
        }

        body.replaceChildren();
        for (const item of students) {
            const row = document.createElement("tr");
            row.append(
                createCell(item.name),
                createCell(item.registration),
                createCell(item.className)
            );
            body.append(row);
        }
    }

    function renderPortal(data) {
        const profile = data.profile || {};
        const summary = data.summary || {};
        const firstName = String(profile.name || "Professor").trim().split(/\s+/)[0];

        setText("#professorGreeting", `Olá, ${firstName}!`);
        setText("#professorClassesCount", summary.classes ?? 0);
        setText("#professorStudentsCount", summary.students ?? 0);
        setText("#professorSubjectsCount", summary.subjects ?? 0);
        setText("#professorActivitiesCount", summary.upcomingActivities ?? 0);
        setText("#profileName", profile.name);
        setText("#profileEmail", profile.email);
        setText("#profilePhone", profile.phone);
        setText("#profileDocument", profile.document);
        setText("#profileBirthDate", formatDate(profile.birthDate));
        setText("#profileRegistration", profile.registration);
        setText("#profileStatus", profile.status === "ativo" ? "Ativo" : "Inativo");
        setText("#profileAdmissionDate", formatDate(profile.admissionDate));
        setText("#profileContract", profile.contract || "Não informado no sistema");
        renderClasses(data.classes);
        renderStudents(data.students);
    }

    async function loadPortal() {
        try {
            const response = await fetch(PORTAL_URL, {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store",
                headers: { "Accept": "application/json" }
            });
            const data = await readJson(response);

            if (!response.ok || !data?.success) {
                throw new Error(data?.message || "Falha ao carregar a área do professor.");
            }

            renderPortal(data);
        } catch (error) {
            console.error("Erro ao carregar a área do professor:", error);

            renderClasses([]);
            renderStudents([]);

            PrimeWayFeedback.error(
                error?.message ||
                "Não foi possível carregar a área do professor."
            );
        }
    }

    async function logout() {
        if (logoutButton) {
            logoutButton.disabled = true;
        }
        try {
            const response = await fetch(LOGOUT_URL, {
                method: "POST",
                credentials: "same-origin",
                cache: "no-store",
                headers: { "Accept": "application/json" }
            });
            const data = await readJson(response);
            if (!response.ok || !data?.success) {
                throw new Error(data?.message || "Falha ao sair.");
            }
            clearCompatibilitySession();
            window.location.replace(LOGIN_PAGE);
        } catch (error) {
            console.error("Erro ao encerrar a sessão:", error);
            PrimeWayFeedback.error(
                "Não foi possível encerrar a sessão. Tente novamente."
            );
            if (logoutButton) {
                logoutButton.disabled = false;
            }
        }
    }

    if (!await validateSession()) {
        return;
    }

    setText(
        "#currentDate",
        new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date())
    );
    logoutButton?.addEventListener("click", logout);
    await loadPortal();
});
