(function () {
    "use strict";

    const SESSION_URL = "../api/auth/session.php";
    const LOGOUT_URL = "../api/auth/logout.php";
    const NAVIGATION_URL = "../api/secretaria/navegacao.php";
    const LOGIN_PAGE = "login.html";

    const ROLE_PAGES = {
        admin: "dashboard.html",
        professor: "professor.html",
        aluno: "aluno_portal.html",
        responsavel: "responsavel.html"
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
        [
            "primewayLogado",
            "primewayUsuario",
            "primewayPerfil"
        ].forEach(
            key => sessionStorage.removeItem(key)
        );
    }

    async function getSession(force = false) {
        if (cachedSession && !force) {
            return cachedSession;
        }

        const response = await fetch(
            SESSION_URL,
            {
                credentials: "same-origin",
                cache: "no-store",
                headers: {
                    Accept: "application/json"
                }
            }
        );

        const data = await readJson(response);

        if (
            !response.ok
            ||
            !data?.authenticated
            ||
            !data?.usuario
        ) {
            cachedSession = null;
            return null;
        }

        cachedSession = data;
        return data;
    }

    async function ensureSecretary() {
        try {
            const session = await getSession(true);

            if (!session) {
                clearCompatibilitySession();
                location.replace(LOGIN_PAGE);
                return null;
            }

            const role =
                String(
                    session.usuario.perfil
                    || ""
                );

            if (role !== "secretaria") {
                location.replace(
                    ROLE_PAGES[role]
                    || LOGIN_PAGE
                );
                return null;
            }

            return session;

        } catch (error) {
            console.error(
                "Erro ao validar sessão da Secretaria:",
                error
            );

            clearCompatibilitySession();
            location.replace(LOGIN_PAGE);
            return null;
        }
    }

    async function request(
        url,
        options = {}
    ) {
        const config = {
            method:
                options.method
                || "GET",

            credentials:
                "same-origin",

            cache:
                options.cache
                || "no-store",

            headers: {
                Accept:
                    "application/json",

                ...(options.headers || {})
            }
        };

        if (options.body !== undefined) {
            config.body = options.body;
        }

        const method =
            String(
                config.method
            ).toUpperCase();

        if (
            ![
                "GET",
                "HEAD"
            ].includes(method)
        ) {
            const session =
                await getSession();

            config.headers[
                "X-CSRF-Token"
            ] =
                session?.csrfToken
                || "";
        }

        const response =
            await fetch(
                url,
                config
            );

        const data =
            await readJson(
                response
            );

        if (response.status === 401) {
            clearCompatibilitySession();
            cachedSession = null;
            location.replace(LOGIN_PAGE);
        }

        return {
            response,
            data
        };
    }

    async function requestJson(
        url,
        payload,
        method = "POST"
    ) {
        return request(
            url,
            {
                method,
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body:
                    JSON.stringify(
                        payload
                    )
            }
        );
    }

    async function logout() {
        const button =
            document.querySelector(
                "#logoutButton"
            );

        if (button) {
            button.disabled = true;
        }

        try {
            const session =
                await getSession(true);

            const response =
                await fetch(
                    LOGOUT_URL,
                    {
                        method:
                            "POST",

                        credentials:
                            "same-origin",

                        headers: {
                            Accept:
                                "application/json",

                            "X-CSRF-Token":
                                session?.csrfToken
                                || ""
                        }
                    }
                );

            const data =
                await readJson(
                    response
                );

            if (
                !response.ok
                ||
                !data?.success
            ) {
                throw new Error(
                    data?.message
                    ||
                    "Não foi possível encerrar a sessão."
                );
            }

            clearCompatibilitySession();
            cachedSession = null;
            location.replace(LOGIN_PAGE);

        } catch (error) {
            window.PrimeWayFeedback?.error(
                error?.message
                ||
                "Não foi possível encerrar a sessão."
            );

            if (button) {
                button.disabled = false;
            }
        }
    }

    function bindLogout() {
        const button =
            document.querySelector(
                "#logoutButton"
            );

        if (
            !button
            ||
            button.dataset.primewayBound
            === "1"
        ) {
            return;
        }

        button.dataset.primewayBound =
            "1";

        button.addEventListener(
            "click",
            logout
        );
    }

    function formatDate(
        value,
        withTime = false
    ) {
        if (!value) {
            return "—";
        }

        const normalized =
            String(value).includes("T")
                ? String(value)
                : String(value).replace(
                    " ",
                    "T"
                );

        const parsed =
            new Date(
                normalized.length === 10
                    ? `${normalized}T12:00:00`
                    : normalized
            );

        if (
            Number.isNaN(
                parsed.getTime()
            )
        ) {
            return String(value);
        }

        return new Intl.DateTimeFormat(
            "pt-BR",
            withTime
                ? {
                    dateStyle:
                        "short",
                    timeStyle:
                        "short"
                }
                : {
                    dateStyle:
                        "short"
                }
        ).format(parsed);
    }

    function setBadge(
        name,
        value
    ) {
        const element =
            document.querySelector(
                `[data-nav-badge="${name}"]`
            );

        if (!element) {
            return;
        }

        const number =
            Number(value || 0);

        if (
            !Number.isFinite(number)
            ||
            number <= 0
        ) {
            element.hidden = true;
            element.textContent = "0";
            return;
        }

        element.hidden = false;
        element.textContent =
            number > 99
                ? "99+"
                : String(number);
    }

    async function refreshNavigationBadges() {
        try {
            const response =
                await fetch(
                    NAVIGATION_URL,
                    {
                        credentials:
                            "same-origin",
                        cache:
                            "no-store",
                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );

            const data =
                await readJson(
                    response
                );

            if (
                !response.ok
                ||
                !data?.success
            ) {
                return;
            }

            setBadge(
                "pickup",
                data.activePickup
            );

            setBadge(
                "inside",
                data.insideRadius
            );

        } catch (error) {
            console.debug(
                "Indicadores da Secretaria indisponíveis:",
                error
            );
        }
    }

    window.PrimeWaySecretaria =
        Object.freeze({
            readJson,
            getSession,
            ensureSecretary,
            request,
            requestJson,
            logout,
            bindLogout,
            formatDate,
            refreshNavigationBadges
        });

    document.addEventListener(
        "DOMContentLoaded",
        () => {
            refreshNavigationBadges();
        }
    );
})();
