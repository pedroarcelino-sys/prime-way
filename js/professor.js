document.addEventListener("DOMContentLoaded", async function () {
    await window.PrimeWayStorage?.ready;

    const PORTAL_URL =
        "../api/professor/index.php";

    function setText(selector, value) {
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

    function renderClasses(classes) {
        const container =
            document.querySelector(
                "#professorClassesPreview"
            );

        container.replaceChildren();

        if (!Array.isArray(classes) || classes.length === 0) {
            const empty =
                document.createElement("p");

            empty.className =
                "professor-empty";

            empty.textContent =
                "Você ainda não possui turmas vinculadas.";

            container.append(empty);
            return;
        }

        for (const item of classes.slice(0, 5)) {
            const article =
                document.createElement("article");

            article.className =
                "professor-class-preview";

            const title =
                document.createElement("strong");

            title.textContent =
                item.name;

            const count =
                document.createElement("span");

            count.textContent =
                `${item.students ?? 0} alunos`;

            const meta =
                document.createElement("p");

            meta.textContent =
                `${item.grade} • ${item.shift}${item.room ? ` • Sala ${item.room}` : ""}${item.subjects ? ` • ${item.subjects}` : ""}`;

            article.append(
                title,
                count,
                meta
            );

            container.append(article);
        }
    }

    function render(data) {
        const profile =
            data.profile || {};

        const summary =
            data.summary || {};

        const firstName =
            String(
                profile.name ||
                "Professor"
            )
                .trim()
                .split(/\s+/)[0];

        setText(
            "#professorGreeting",
            `Olá, ${firstName}!`
        );

        setText(
            "#professorClassesCount",
            summary.classes ?? 0
        );

        setText(
            "#professorStudentsCount",
            summary.students ?? 0
        );

        setText(
            "#professorSubjectsCount",
            summary.subjects ?? 0
        );

        setText(
            "#professorActivitiesCount",
            summary.upcomingActivities ?? 0
        );

        renderClasses(
            data.classes || []
        );
    }

    async function load() {
        try {
            const {
                response,
                data
            } =
                await window
                    .PrimeWayProfessor
                    .request(
                        PORTAL_URL
                    );

            if (
                !response.ok ||
                !data?.success
            ) {
                throw new Error(
                    data?.message ||
                    "Não foi possível carregar o painel."
                );
            }

            render(data);

        } catch (error) {
            console.error(
                "Erro ao carregar área do professor:",
                error
            );

            window.PrimeWayFeedback
                ?.error(
                    error?.message ||
                    "Não foi possível carregar sua área."
                );
        }
    }

    const session =
        await window
            .PrimeWayProfessor
            .ensureProfessor();

    if (!session) {
        return;
    }

    window.PrimeWayProfessor
        .bindLogout();

    setText(
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

    await load();

    await window
        .PrimeWayProfessor
        .refreshNavigationBadges();
});
