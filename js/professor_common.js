(function () {
    "use strict";

    const SESSION_URL = "../api/auth/session.php";
    const LOGOUT_URL = "../api/auth/logout.php";
    const NAVIGATION_URL = "../api/professor/navegacao.php";
    const LOGIN_PAGE = "login.html";

    const ROLE_PAGES = {
        admin: "dashboard.html",
        aluno: "aluno_portal.html",
        responsavel: "responsavel.html",
        secretaria: "dashboard.html"
    };

    let cachedSession = null;

    async function readJson(response) {
        try {
            return await response.json();
        } catch {
            return null;
        }
    }

    function clearCompatibilitySession() {
        ["primewayLogado", "primewayUsuario", "primewayPerfil"]
            .forEach(key => sessionStorage.removeItem(key));
    }

    async function getSession(force = false) {
        if (cachedSession && !force) {
            return cachedSession;
        }

        const response = await fetch(SESSION_URL, {
            credentials: "same-origin",
            cache: "no-store",
            headers: { Accept: "application/json" }
        });

        const data = await readJson(response);

        if (!response.ok || !data?.authenticated || !data?.usuario) {
            cachedSession = null;
            return null;
        }

        cachedSession = data;
        return data;
    }

    async function ensureProfessor() {
        try {
            const session = await getSession(true);

            if (!session) {
                clearCompatibilitySession();
                location.replace(LOGIN_PAGE);
                return null;
            }

            const role = String(session.usuario.perfil || "");

            if (role !== "professor") {
                location.replace(ROLE_PAGES[role] || LOGIN_PAGE);
                return null;
            }

            return session;
        } catch (error) {
            console.error("Erro ao validar sessão do professor:", error);
            clearCompatibilitySession();
            location.replace(LOGIN_PAGE);
            return null;
        }
    }

    async function request(url, options = {}) {
        const config = {
            method: options.method || "GET",
            credentials: "same-origin",
            cache: options.cache || "no-store",
            headers: {
                Accept: "application/json",
                ...(options.headers || {})
            }
        };

        if (options.body !== undefined) {
            config.body = options.body;
        }

        const method = String(config.method).toUpperCase();

        if (!["GET", "HEAD"].includes(method)) {
            const session = await getSession();
            config.headers["X-CSRF-Token"] = session?.csrfToken || "";
        }

        const response = await fetch(url, config);
        const data = await readJson(response);

        if (response.status === 401) {
            clearCompatibilitySession();
            cachedSession = null;
            location.replace(LOGIN_PAGE);
        }

        return { response, data };
    }

    async function requestJson(url, payload, method = "POST") {
        return request(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    }

    async function logout() {
        const button = document.querySelector("#logoutButton");

        if (button) {
            button.disabled = true;
        }

        try {
            const session = await getSession(true);

            const response = await fetch(LOGOUT_URL, {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    Accept: "application/json",
                    "X-CSRF-Token": session?.csrfToken || ""
                }
            });

            const data = await readJson(response);

            if (!response.ok || !data?.success) {
                throw new Error(
                    data?.message ||
                    "Não foi possível encerrar a sessão."
                );
            }

            clearCompatibilitySession();
            cachedSession = null;
            location.replace(LOGIN_PAGE);

        } catch (error) {
            console.error("Erro ao encerrar sessão:", error);

            window.PrimeWayFeedback?.error(
                error?.message ||
                "Não foi possível encerrar a sessão."
            );

            if (button) {
                button.disabled = false;
            }
        }
    }

    function bindLogout() {
        const button = document.querySelector("#logoutButton");

        if (!button || button.dataset.primewayBound === "1") {
            return;
        }

        button.dataset.primewayBound = "1";
        button.addEventListener("click", logout);
    }

    function formatDate(value, withTime = false) {
        if (!value) {
            return "—";
        }

        const normalized = String(value).includes("T")
            ? String(value)
            : String(value).replace(" ", "T");

        const parsed = new Date(
            normalized.length === 10
                ? `${normalized}T12:00:00`
                : normalized
        );

        if (Number.isNaN(parsed.getTime())) {
            return String(value);
        }

        return new Intl.DateTimeFormat(
            "pt-BR",
            withTime
                ? { dateStyle: "short", timeStyle: "short" }
                : { dateStyle: "short" }
        ).format(parsed);
    }

    function activeKey() {
        const file = location.pathname.split("/").pop() || "";

        const map = {
            "professor.html": "portal",
            "professor_turmas.html": "turmas",
            "professor_atividades.html": "atividades",
            "professor_notas.html": "notas",
            "professor_frequencia.html": "frequencia",
            "professor_notificacoes.html": "notificacoes",
            "professor_chat.html": "chat",
            "professor_dados.html": "dados"
        };

        return map[file] || "";
    }

    function injectSidebar() {
        const sidebar = document.querySelector(
            "aside.sidebar.professor-sidebar, aside.sidebar"
        );

        if (!sidebar) {
            return;
        }

        const active = activeKey();

        const items = [
            ["portal", "professor.html", "fa-house", "Meu painel", ""],
            ["turmas", "professor_turmas.html", "fa-users", "Minhas turmas", ""],
            ["atividades", "professor_atividades.html", "fa-list-check", "Atividades", ""],
            ["notas", "professor_notas.html", "fa-clipboard-check", "Notas", ""],
            ["frequencia", "professor_frequencia.html", "fa-user-check", "Frequência", ""],
            ["calendario", "calendario.html", "fa-calendar-days", "Calendário", ""],
            ["notificacoes", "professor_notificacoes.html", "fa-bell", "Notificações", "notifications"],
            ["chat", "professor_chat.html", "fa-comments", "Chat", "chat"],
            ["dados", "professor_dados.html", "fa-address-card", "Meus dados", ""]
        ];

        const nav = items.map(([key, href, icon, label, badge]) => {
            const activeAttr = key === active
                ? ' class="active" aria-current="page"'
                : "";

            const badgeHtml = badge
                ? `<span class="nav-badge" data-nav-badge="${badge}" hidden>0</span>`
                : "";

            return `
                <a href="${href}"${activeAttr}>
                    <i class="fa-solid ${icon}" aria-hidden="true"></i>
                    <span>${label}</span>${badgeHtml}
                </a>
            `;
        }).join("");

        sidebar.innerHTML = `
            <div class="sidebar-logo">
                <img src="../img/logo.png" alt="PrimeWay School">
            </div>

            <nav class="sidebar-menu" aria-label="Navegação do professor">
                ${nav}
            </nav>

            <div class="sidebar-bottom">
                <button type="button" id="logoutButton">
                    <i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
                    <span>Sair</span>
                </button>
            </div>
        `;
    }

    function setBadge(name, value) {
        const element = document.querySelector(
            `[data-nav-badge="${name}"]`
        );

        if (!element) {
            return;
        }

        const number = Number(value || 0);

        if (!Number.isFinite(number) || number <= 0) {
            element.hidden = true;
            element.textContent = "0";
            return;
        }

        element.hidden = false;
        element.textContent = number > 99 ? "99+" : String(number);
    }

    async function refreshNavigationBadges() {
        try {
            const response = await fetch(NAVIGATION_URL, {
                credentials: "same-origin",
                cache: "no-store",
                headers: { Accept: "application/json" }
            });

            const data = await readJson(response);

            if (!response.ok || !data?.success) {
                return;
            }

            setBadge("notifications", data.unreadNotifications);
            setBadge("chat", data.unreadMessages);

        } catch (error) {
            console.debug(
                "Não foi possível atualizar contadores do professor:",
                error
            );
        }
    }

    injectSidebar();

    window.PrimeWayProfessor = Object.freeze({
        readJson,
        getSession,
        ensureProfessor,
        request,
        requestJson,
        logout,
        bindLogout,
        formatDate,
        injectSidebar,
        refreshNavigationBadges
    });

    document.addEventListener("DOMContentLoaded", function () {
        injectSidebar();
        refreshNavigationBadges();
    });
})();
