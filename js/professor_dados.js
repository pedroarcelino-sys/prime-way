document.addEventListener("DOMContentLoaded", async function () {
    await window.PrimeWayStorage?.ready;

    const API_URL =
        "../api/professor/dados/index.php";

    function set(selector, value) {
        const element =
            document.querySelector(selector);

        if (!element) {
            return;
        }

        element.textContent =
            value === null ||
            value === undefined ||
            value === ""
                ? "—"
                : String(value);
    }

    function renderAssignments(items) {
        const grid =
            document.querySelector(
                "#assignmentsGrid"
            );

        grid.replaceChildren();

        if (!items.length) {
            grid.innerHTML =
                '<div class="professor-empty"><i class="fa-solid fa-book-open" aria-hidden="true"></i>Nenhum vínculo acadêmico ativo.</div>';
            return;
        }

        for (const item of items) {
            const card =
                document.createElement(
                    "article"
                );

            card.className =
                "teacher-assignment-card";

            const code =
                document.createElement(
                    "span"
                );

            code.className =
                "code";

            code.textContent =
                item.subjectCode;

            const title =
                document.createElement(
                    "h3"
                );

            title.textContent =
                item.subjectName;

            const classInfo =
                document.createElement(
                    "p"
                );

            classInfo.textContent =
                `${item.className} • ${item.series} • ${item.shift}`;

            const workload =
                document.createElement(
                    "p"
                );

            workload.textContent =
                `${item.workload}h • ${item.area}`;

            card.append(
                code,
                title,
                classInfo,
                workload
            );

            grid.append(card);
        }
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
                        API_URL
                    );

            if (
                !response.ok ||
                !data?.success
            ) {
                throw new Error(
                    data?.message ||
                    "Não foi possível carregar seus dados."
                );
            }

            const profile =
                data.profile || {};

            set(
                "#teacherName",
                profile.name
            );

            set(
                "#teacherEmail",
                profile.email
            );

            set(
                "#teacherPhone",
                profile.phone
            );

            set(
                "#teacherDocument",
                profile.document
            );

            set(
                "#teacherBirthDate",
                window.PrimeWayProfessor
                    .formatDate(
                        profile.birthDate
                    )
            );

            set(
                "#teacherRegistration",
                profile.registration
            );

            set(
                "#teacherStatus",
                profile.status ===
                    "ativo"
                    ? "Ativo"
                    : "Inativo"
            );

            set(
                "#teacherAdmissionDate",
                window.PrimeWayProfessor
                    .formatDate(
                        profile.admissionDate
                    )
            );

            set(
                "#teacherSchoolYear",
                data.schoolYear?.year ||
                "—"
            );

            renderAssignments(
                Array.isArray(
                    data.assignments
                )
                    ? data.assignments
                    : []
            );

        } catch (error) {
            console.error(
                "Erro ao carregar dados do professor:",
                error
            );

            window.PrimeWayFeedback
                ?.error(
                    error?.message ||
                    "Não foi possível carregar seus dados."
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

    await load();

    await window
        .PrimeWayProfessor
        .refreshNavigationBadges();
});
