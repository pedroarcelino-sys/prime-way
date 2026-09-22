document.addEventListener("DOMContentLoaded", async function () {
    await window.PrimeWayStorage?.ready;

    const API_URL =
        "../api/professor/turmas/index.php";

    let state = {
        classes: [],
        students: [],
        classSubjects: []
    };

    const classFilter =
        document.querySelector(
            "#studentClassFilter"
        );

    const search =
        document.querySelector(
            "#studentSearch"
        );

    const grid =
        document.querySelector(
            "#classesGrid"
        );

    const body =
        document.querySelector(
            "#studentsBody"
        );

    function normalize(value) {
        return String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function subjectsForClass(classId) {
        return state.classSubjects.filter(
            item =>
                Number(item.classId) ===
                Number(classId)
        );
    }

    function renderSummary() {
        document.querySelector(
            "#classesCount"
        ).textContent =
            String(state.classes.length);

        document.querySelector(
            "#studentsCount"
        ).textContent =
            String(state.students.length);

        document.querySelector(
            "#subjectsCount"
        ).textContent =
            String(
                new Set(
                    state.classSubjects.map(
                        item =>
                            item.subjectId
                    )
                ).size
            );

        document.querySelector(
            "#homeroomCount"
        ).textContent =
            String(
                state.classes.filter(
                    item =>
                        item.homeroomTeacher
                ).length
            );
    }

    function renderClasses() {
        grid.replaceChildren();

        if (!state.classes.length) {
            grid.innerHTML =
                '<div class="professor-empty"><i class="fa-solid fa-users-slash" aria-hidden="true"></i>Nenhuma turma vinculada.</div>';
            return;
        }

        for (const item of state.classes) {
            const card =
                document.createElement(
                    "article"
                );

            card.className =
                `teacher-class-card${String(item.id) === classFilter.value ? " active" : ""}`;

            card.tabIndex = 0;

            const top =
                document.createElement(
                    "div"
                );

            top.className =
                "teacher-class-card-top";

            const info =
                document.createElement(
                    "div"
                );

            const title =
                document.createElement(
                    "h3"
                );

            title.textContent =
                item.name;

            const meta =
                document.createElement(
                    "p"
                );

            meta.textContent =
                `${item.series} • ${item.shift}${item.room ? ` • Sala ${item.room}` : ""}`;

            info.append(
                title,
                meta
            );

            const badge =
                document.createElement(
                    "span"
                );

            badge.className =
                `professor-status ${item.homeroomTeacher ? "success" : "neutral"}`;

            badge.textContent =
                item.homeroomTeacher
                    ? "Regente"
                    : "Docente";

            top.append(
                info,
                badge
            );

            const subjects =
                document.createElement(
                    "div"
                );

            subjects.className =
                "teacher-class-card-subjects";

            const classSubjects =
                subjectsForClass(
                    item.id
                );

            if (!classSubjects.length) {
                const empty =
                    document.createElement(
                        "span"
                    );

                empty.className =
                    "professor-status neutral";

                empty.textContent =
                    "Sem disciplina própria";

                subjects.append(
                    empty
                );
            } else {
                for (const subject of classSubjects) {
                    const chip =
                        document.createElement(
                            "span"
                        );

                    chip.className =
                        "professor-status";

                    chip.textContent =
                        subject.name;

                    subjects.append(
                        chip
                    );
                }
            }

            const footer =
                document.createElement(
                    "div"
                );

            footer.className =
                "teacher-class-card-footer";

            footer.innerHTML = `
                <span>${item.students} alunos</span>
                <span>Capacidade: ${item.capacity}</span>
            `;

            card.append(
                top,
                subjects,
                footer
            );

            const select = () => {
                classFilter.value =
                    String(item.id);

                renderClasses();
                renderStudents();
            };

            card.addEventListener(
                "click",
                select
            );

            card.addEventListener(
                "keydown",
                event => {
                    if (
                        event.key ===
                            "Enter" ||
                        event.key ===
                            " "
                    ) {
                        event.preventDefault();
                        select();
                    }
                }
            );

            grid.append(card);
        }
    }

    function renderStudents() {
        const query =
            normalize(
                search.value
            );

        const selectedClass =
            classFilter.value;

        const classMap =
            new Map(
                state.classes.map(
                    item => [
                        Number(item.id),
                        item
                    ]
                )
            );

        const items =
            state.students.filter(
                item => {
                    if (
                        selectedClass &&
                        String(item.classId) !==
                            selectedClass
                    ) {
                        return false;
                    }

                    if (
                        query &&
                        !normalize(
                            `${item.name} ${item.registration}`
                        ).includes(
                            query
                        )
                    ) {
                        return false;
                    }

                    return true;
                }
            );

        body.replaceChildren();

        if (!items.length) {
            const row =
                document.createElement(
                    "tr"
                );

            const cell =
                document.createElement(
                    "td"
                );

            cell.colSpan = 5;
            cell.className =
                "professor-empty";
            cell.textContent =
                "Nenhum aluno encontrado.";

            row.append(cell);
            body.append(row);
            return;
        }

        for (const item of items) {
            const row =
                document.createElement(
                    "tr"
                );

            const call =
                document.createElement(
                    "td"
                );

            call.textContent =
                item.callNumber === null
                    ? "—"
                    : String(item.callNumber);

            const name =
                document.createElement(
                    "td"
                );

            name.className =
                "teacher-student-name";
            name.textContent =
                item.name;

            const registration =
                document.createElement(
                    "td"
                );

            registration.textContent =
                item.registration;

            const classCell =
                document.createElement(
                    "td"
                );

            classCell.textContent =
                classMap.get(
                    Number(item.classId)
                )?.name || "—";

            const contact =
                document.createElement(
                    "td"
                );

            contact.className =
                "teacher-contact";

            const email =
                document.createElement(
                    "span"
                );

            email.textContent =
                item.email ||
                "E-mail não informado";

            const phone =
                document.createElement(
                    "span"
                );

            phone.textContent =
                item.phone ||
                "Telefone não informado";

            contact.append(
                email,
                phone
            );

            row.append(
                call,
                name,
                registration,
                classCell,
                contact
            );

            body.append(row);
        }
    }

    function fillClassFilter() {
        for (const item of state.classes) {
            const option =
                document.createElement(
                    "option"
                );

            option.value =
                String(item.id);

            option.textContent =
                item.name;

            classFilter.append(option);
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
                    "Não foi possível carregar suas turmas."
                );
            }

            state = {
                classes:
                    Array.isArray(
                        data.classes
                    )
                        ? data.classes
                        : [],

                students:
                    Array.isArray(
                        data.students
                    )
                        ? data.students
                        : [],

                classSubjects:
                    Array.isArray(
                        data.classSubjects
                    )
                        ? data.classSubjects
                        : []
            };

            document.querySelector(
                "#schoolYearValue"
            ).textContent =
                data.schoolYear?.year
                    ? `Ano letivo ${data.schoolYear.year}`
                    : "Ano letivo —";

            fillClassFilter();
            renderSummary();
            renderClasses();
            renderStudents();

        } catch (error) {
            console.error(
                "Erro ao carregar turmas:",
                error
            );

            window.PrimeWayFeedback
                ?.error(
                    error?.message ||
                    "Não foi possível carregar suas turmas."
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

    search.addEventListener(
        "input",
        renderStudents
    );

    classFilter.addEventListener(
        "change",
        function () {
            renderClasses();
            renderStudents();
        }
    );

    await load();

    await window
        .PrimeWayProfessor
        .refreshNavigationBadges();
});
