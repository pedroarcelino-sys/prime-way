document.addEventListener("DOMContentLoaded", async function () {
    await window.PrimeWayStorage?.ready;

    const SESSION_URL = "../api/auth/session.php";
    const LOGOUT_URL = "../api/auth/logout.php";
    const PORTAL_URL = "../api/responsavel/index.php";

    const LOGIN_PAGE = "login.html";
    const ADMIN_PAGE = "dashboard.html";
    const PROFESSOR_PAGE = "professor.html";

    async function json(response) {
        try {
            return await response.json();
        } catch (error) {
            return null;
        }
    }

    function clearSession() {
        for (
            const key of [
                "primewayLogado",
                "primewayUsuario",
                "primewayPerfil"
            ]
        ) {
            sessionStorage.removeItem(key);
        }
    }

    async function session() {
        try {
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

            const data = await json(response);

            if (
                !response.ok ||
                !data?.authenticated ||
                !data.usuario
            ) {
                throw new Error();
            }

            const user = data.usuario;

            if (user.perfil === "admin") {
                location.replace(ADMIN_PAGE);
                return false;
            }

            if (user.perfil === "professor") {
                location.replace(PROFESSOR_PAGE);
                return false;
            }

            if (user.perfil !== "responsavel") {
                clearSession();
                location.replace(LOGIN_PAGE);
                return false;
            }

            return true;
        } catch (error) {
            clearSession();
            location.replace(LOGIN_PAGE);
            return false;
        }
    }

    function set(selector, value) {
        const element =
            document.querySelector(selector);

        if (element) {
            element.textContent =
                value === null ||
                value === undefined ||
                value === ""
                    ? "—"
                    : String(value);
        }
    }

    function date(value) {
        if (!value) {
            return "—";
        }

        const parsed =
            new Date(
                String(value).includes("T")
                    ? value
                    : `${value}T12:00:00`
            );

        return Number.isNaN(parsed.getTime())
            ? String(value)
            : new Intl.DateTimeFormat(
                "pt-BR"
            ).format(parsed);
    }

    function empty(message) {
        const p =
            document.createElement("p");

        p.className =
            "empty-state";

        p.textContent =
            message;

        return p;
    }

    function renderStudents(items) {
        const container =
            document.querySelector(
                "#guardianStudents"
            );

        container.replaceChildren();

        if (!items.length) {
            container.append(
                empty(
                    "Nenhum aluno está vinculado à sua conta."
                )
            );

            return;
        }

        for (const item of items) {
            const card =
                document.createElement(
                    "article"
                );

            card.className =
                "student-card";

            const header =
                document.createElement(
                    "div"
                );

            header.className =
                "student-card-header";

            const identity =
                document.createElement(
                    "div"
                );

            const title =
                document.createElement(
                    "h3"
                );

            const subtitle =
                document.createElement(
                    "p"
                );

            const relation =
                document.createElement(
                    "span"
                );

            title.textContent =
                item.name;

            subtitle.textContent =
                `${item.className || "Sem turma"} • Matrícula ${item.registration}`;

            relation.className =
                "relationship";

            relation.textContent =
                item.relationship;

            identity.append(
                title,
                subtitle
            );

            header.append(
                identity,
                relation
            );

            const stats =
                document.createElement(
                    "div"
                );

            stats.className =
                "student-stats";

            for (
                const [label, value] of [
                    [
                        "Média",
                        item.average === null
                            ? "—"
                            : Number(
                                item.average
                            ).toLocaleString(
                                "pt-BR",
                                {
                                    minimumFractionDigits: 1
                                }
                            )
                    ],
                    [
                        "Frequência",
                        item.attendance === null
                            ? "—"
                            : `${item.attendance}%`
                    ],
                    [
                        "Atividades",
                        item.upcomingActivities
                    ]
                ]
            ) {
                const box =
                    document.createElement(
                        "div"
                    );

                const span =
                    document.createElement(
                        "span"
                    );

                const strong =
                    document.createElement(
                        "strong"
                    );

                span.textContent =
                    label;

                strong.textContent =
                    value;

                box.append(
                    span,
                    strong
                );

                stats.append(
                    box
                );
            }

            const flags =
                document.createElement(
                    "div"
                );

            flags.className =
                "student-flags";

            if (item.primaryContact) {
                const flag =
                    document.createElement(
                        "span"
                    );

                flag.textContent =
                    "Contato principal";

                flags.append(flag);
            }

            if (item.financial) {
                const flag =
                    document.createElement(
                        "span"
                    );

                flag.textContent =
                    "Responsável financeiro";

                flags.append(flag);
            }

            if (item.authorizedPickup) {
                const flag =
                    document.createElement(
                        "span"
                    );

                flag.textContent =
                    "Retirada autorizada";

                flags.append(flag);
            }

            card.append(
                header,
                stats,
                flags
            );

            container.append(
                card
            );
        }
    }

    function renderEvents(items) {
        const container =
            document.querySelector(
                "#guardianEvents"
            );

        container.replaceChildren();

        if (!items.length) {
            container.append(
                empty(
                    "Nenhum evento futuro."
                )
            );

            return;
        }

        for (const item of items) {
            const element =
                document.createElement(
                    "article"
                );

            element.className =
                "list-item";

            const h =
                document.createElement(
                    "h3"
                );

            const p =
                document.createElement(
                    "p"
                );

            const span =
                document.createElement(
                    "span"
                );

            h.textContent =
                item.title;

            p.textContent =
                `${date(item.date)}${
                    item.time
                        ? ` às ${String(item.time).slice(0, 5)}`
                        : ""
                }`;

            span.textContent =
                item.className ||
                item.location ||
                item.type;

            element.append(
                h,
                p,
                span
            );

            container.append(
                element
            );
        }
    }

    function renderNotices(items) {
        const container =
            document.querySelector(
                "#guardianNotices"
            );

        container.replaceChildren();

        if (!items.length) {
            container.append(
                empty(
                    "Nenhum comunicado publicado."
                )
            );

            return;
        }

        for (const item of items) {
            const element =
                document.createElement(
                    "article"
                );

            element.className =
                "list-item";

            const h =
                document.createElement(
                    "h3"
                );

            const p =
                document.createElement(
                    "p"
                );

            const span =
                document.createElement(
                    "span"
                );

            h.textContent =
                item.title;

            p.textContent =
                item.message;

            span.textContent =
                date(
                    String(item.date).split(" ")[0]
                );

            element.append(
                h,
                p,
                span
            );

            container.append(
                element
            );
        }
    }

    function render(data) {
        const profile =
            data.profile || {};

        const students =
            data.students || [];

        const events =
            data.events || [];

        const notices =
            data.notices || [];

        set(
            "#guardianGreeting",
            `Olá, ${
                String(
                    profile.name ||
                    "Responsável"
                ).split(/\s+/)[0]
            }!`
        );

        set(
            "#linkedStudentsCount",
            students.length
        );

        set(
            "#activitiesCount",
            students.reduce(
                (sum, item) =>
                    sum +
                    Number(
                        item.upcomingActivities ||
                        0
                    ),
                0
            )
        );

        set(
            "#eventsCount",
            events.length
        );

        set(
            "#noticesCount",
            notices.length
        );

        set(
            "#guardianName",
            profile.name
        );

        set(
            "#guardianEmail",
            profile.email
        );

        set(
            "#guardianPhone",
            profile.phone
        );

        set(
            "#guardianDocument",
            profile.document
        );

        set(
            "#guardianBirthDate",
            date(
                profile.birthDate
            )
        );

        set(
            "#guardianStatus",
            profile.status === "ativo"
                ? "Ativo"
                : profile.status === "pendente"
                    ? "Pendente"
                    : "Inativo"
        );

        renderStudents(
            students
        );

        renderEvents(
            events
        );

        renderNotices(
            notices
        );
    }

    async function load() {
        try {
            const response =
                await fetch(
                    PORTAL_URL,
                    {
                        credentials: "same-origin",
                        cache: "no-store",
                        headers: {
                            Accept: "application/json"
                        }
                    }
                );

            const data =
                await json(
                    response
                );

            if (
                !response.ok ||
                !data?.success
            ) {
                throw new Error(
                    data?.message ||
                    "Falha ao carregar."
                );
            }

            render(data);
        } catch (error) {
            console.error(
                "Erro ao carregar a área do responsável:",
                error
            );

            render({
                students: [],
                events: [],
                notices: []
            });

            PrimeWayFeedback.error(
                error?.message ||
                "Não foi possível carregar sua área."
            );
        }
    }

    async function logout() {
        try {
            const sessionResponse =
                await fetch(
                    SESSION_URL,
                    {
                        credentials: "same-origin",
                        cache: "no-store",
                        headers: {
                            Accept: "application/json"
                        }
                    }
                );

            const sessionData =
                await json(
                    sessionResponse
                );

            const response =
                await fetch(
                    LOGOUT_URL,
                    {
                        method: "POST",
                        credentials: "same-origin",
                        headers: {
                            Accept: "application/json",
                            "X-CSRF-Token":
                                sessionData?.csrfToken ||
                                ""
                        }
                    }
                );

            const data =
                await json(
                    response
                );

            if (
                !response.ok ||
                !data?.success
            ) {
                throw new Error();
            }

            clearSession();
            location.replace(
                LOGIN_PAGE
            );
        } catch (error) {
            console.error(
                "Erro ao encerrar a sessão:",
                error
            );

            PrimeWayFeedback.error(
                "Não foi possível encerrar a sessão."
            );
        }
    }

    if (
        !await session()
    ) {
        return;
    }

    set(
        "#currentDate",
        new Intl.DateTimeFormat(
            "pt-BR",
            {
                dateStyle: "long"
            }
        ).format(
            new Date()
        )
    );

    document
        .querySelector(
            "#logoutButton"
        )
        ?.addEventListener(
            "click",
            logout
        );

    await load();
});
