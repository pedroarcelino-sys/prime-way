document.addEventListener(
    "DOMContentLoaded",
    async function () {

        const API =
            "../api/secretaria/turmas/index.php";

        const session =
            await window
                .PrimeWaySecretaria
                .ensureSecretary();

        if (!session) {
            return;
        }

        window
            .PrimeWaySecretaria
            .bindLogout();

        const searchInput =
            document.querySelector(
                "#classSearch"
            );

        const shiftFilter =
            document.querySelector(
                "#shiftFilter"
            );

        const statusFilter =
            document.querySelector(
                "#statusFilter"
            );

        const grid =
            document.querySelector(
                "#classesGrid"
            );

        const emptyState =
            document.querySelector(
                "#classesEmpty"
            );

        const modal =
            document.querySelector(
                "#classDetailsModal"
            );

        const modalContent =
            document.querySelector(
                "#classDetailsContent"
            );

        const modalClose =
            document.querySelector(
                "#classDetailsClose"
            );

        const modalOverlay =
            document.querySelector(
                "#classDetailsOverlay"
            );

        let classes =
            [];

        function escapeHtml(
            value
        ) {

            return String(
                value
                ?? ""
            )
                .replaceAll(
                    "&",
                    "&amp;"
                )
                .replaceAll(
                    "<",
                    "&lt;"
                )
                .replaceAll(
                    ">",
                    "&gt;"
                )
                .replaceAll(
                    '"',
                    "&quot;"
                )
                .replaceAll(
                    "'",
                    "&#039;"
                );
        }

        function normalize(
            value
        ) {

            return String(
                value
                || ""
            )
                .normalize(
                    "NFD"
                )
                .replace(
                    /[\u0300-\u036f]/g,
                    ""
                )
                .toLowerCase()
                .trim();
        }

        function statusClass(
            status
        ) {

            return status === "Ativa"
                ? "success"
                : "neutral";
        }

        function visibleClasses() {

            const term =
                normalize(
                    searchInput.value
                );

            const shift =
                shiftFilter.value;

            const status =
                statusFilter.value;

            return classes.filter(
                classItem => {

                    const text =
                        normalize(
                            [
                                classItem.name,
                                classItem.series,
                                classItem.shift,
                                classItem.room,
                                classItem
                                    .mainTeacher
                                    ?.name,
                                ...(
                                    classItem
                                        .subjects
                                    || []
                                ).flatMap(
                                    subject => [
                                        subject.name,
                                        subject.area,
                                        subject
                                            .teacher
                                            ?.name
                                    ]
                                )
                            ].join(
                                " "
                            )
                        );

                    return (
                        (
                            !term
                            ||
                            text.includes(
                                term
                            )
                        )
                        &&
                        (
                            !shift
                            ||
                            classItem.shift
                            === shift
                        )
                        &&
                        (
                            !status
                            ||
                            classItem.status
                            === status
                        )
                    );
                }
            );
        }

        function render() {

            const list =
                visibleClasses();

            grid.replaceChildren();

            emptyState.hidden =
                list.length > 0;

            if (!list.length) {
                return;
            }

            for (
                const classItem
                of list
            ) {

                const activeSubjects =
                    (
                        classItem.subjects
                        || []
                    ).filter(
                        subject =>
                            subject.status
                            === "Ativa"
                    );

                const card =
                    document.createElement(
                        "article"
                    );

                card.className =
                    "class-card";

                card.innerHTML = `
                    <div class="class-card-top">
                        <div>
                            <span class="class-card-label">
                                ${escapeHtml(classItem.series)}
                            </span>

                            <h2>
                                ${escapeHtml(classItem.name)}
                            </h2>

                            <p>
                                ${escapeHtml(classItem.shift)}
                                ${classItem.room ? ` • Sala ${escapeHtml(classItem.room)}` : ""}
                            </p>
                        </div>

                        <span class="secretary-status ${statusClass(classItem.status)}">
                            ${escapeHtml(classItem.status)}
                        </span>
                    </div>

                    <div class="class-card-stats">

                        <div>
                            <span>Alunos</span>
                            <strong>
                                ${classItem.studentCount}/${classItem.capacity}
                            </strong>
                        </div>

                        <div>
                            <span>Disciplinas</span>
                            <strong>
                                ${activeSubjects.length}
                            </strong>
                        </div>

                        <div>
                            <span>Regente</span>
                            <strong>
                                ${escapeHtml(
                                    classItem
                                        .mainTeacher
                                        ?.name
                                    || "Não definido"
                                )}
                            </strong>
                        </div>

                    </div>

                    <button
                        type="button"
                        class="class-details-button"
                        data-class-id="${classItem.id}"
                    >
                        <i class="fa-solid fa-eye"></i>
                        Ver detalhes
                    </button>
                `;

                grid.append(
                    card
                );
            }

            bindDetailButtons();
        }

        function studentsHtml(
            classItem
        ) {

            const students =
                classItem.students
                || [];

            if (!students.length) {
                return `
                    <div class="class-detail-empty">
                        Nenhum aluno com matrícula ativa nesta turma.
                    </div>
                `;
            }

            return students
                .map(
                    student => `
                        <div class="class-student-row">

                            <div class="class-student-number">
                                ${student.callNumber ?? "—"}
                            </div>

                            <div>
                                <strong>
                                    ${escapeHtml(student.name)}
                                </strong>

                                <span>
                                    ${escapeHtml(student.registration)}
                                </span>
                            </div>

                        </div>
                    `
                )
                .join("");
        }

        function subjectsHtml(
            classItem
        ) {

            const subjects =
                classItem.subjects
                || [];

            if (!subjects.length) {
                return `
                    <div class="class-detail-empty">
                        Nenhuma disciplina vinculada a esta turma.
                    </div>
                `;
            }

            return subjects
                .map(
                    subject => `
                        <article class="class-subject-card">

                            <div>
                                <strong>
                                    ${escapeHtml(subject.name)}
                                </strong>

                                <span>
                                    ${escapeHtml(subject.code)}
                                    •
                                    ${escapeHtml(subject.area)}
                                </span>
                            </div>

                            <div class="class-subject-meta">
                                <span>
                                    <i class="fa-solid fa-chalkboard-user"></i>
                                    ${escapeHtml(subject.teacher?.name || "Professor não definido")}
                                </span>

                                <span>
                                    <i class="fa-solid fa-clock"></i>
                                    ${subject.workload}h
                                </span>

                                <span class="secretary-status ${subject.status === "Ativa" ? "success" : "neutral"}">
                                    ${escapeHtml(subject.status)}
                                </span>
                            </div>

                        </article>
                    `
                )
                .join("");
        }

        function openDetails(
            classItem
        ) {

            const occupancy =
                classItem.capacity > 0
                    ? Math.round(
                        (
                            classItem.studentCount
                            /
                            classItem.capacity
                        )
                        *
                        100
                    )
                    : 0;

            modalContent.innerHTML = `
                <div class="class-detail-heading">

                    <div class="class-detail-icon">
                        <i class="fa-solid fa-users-rectangle"></i>
                    </div>

                    <div>
                        <span class="class-detail-label">
                            Turma
                        </span>

                        <h2>
                            ${escapeHtml(classItem.name)}
                        </h2>

                        <div class="class-detail-badges">
                            <span class="secretary-status ${statusClass(classItem.status)}">
                                ${escapeHtml(classItem.status)}
                            </span>

                            <span>
                                ${escapeHtml(classItem.shift)}
                            </span>

                            <span>
                                ${escapeHtml(classItem.series)}
                            </span>
                        </div>
                    </div>

                </div>

                <section class="class-detail-section">

                    <h3>Informações da turma</h3>

                    <div class="class-detail-grid">

                        <div>
                            <span>Sala</span>
                            <strong>
                                ${escapeHtml(classItem.room || "—")}
                            </strong>
                        </div>

                        <div>
                            <span>Capacidade</span>
                            <strong>
                                ${classItem.capacity}
                            </strong>
                        </div>

                        <div>
                            <span>Matriculados</span>
                            <strong>
                                ${classItem.studentCount}
                            </strong>
                        </div>

                        <div>
                            <span>Ocupação</span>
                            <strong>
                                ${occupancy}%
                            </strong>
                        </div>

                        <div class="class-detail-wide">
                            <span>Professor regente</span>
                            <strong>
                                ${escapeHtml(
                                    classItem
                                        .mainTeacher
                                        ?.name
                                    || "Não definido"
                                )}
                            </strong>
                        </div>

                    </div>

                </section>

                <section class="class-detail-section">

                    <h3>
                        Alunos matriculados
                    </h3>

                    <div class="class-student-list">
                        ${studentsHtml(classItem)}
                    </div>

                </section>

                <section class="class-detail-section">

                    <h3>
                        Disciplinas e professores
                    </h3>

                    <div class="class-subject-list">
                        ${subjectsHtml(classItem)}
                    </div>

                </section>
            `;

            modal.hidden =
                false;

            document.body.classList.add(
                "modal-open"
            );

            modalClose.focus();
        }

        function closeDetails() {

            modal.hidden =
                true;

            document.body.classList.remove(
                "modal-open"
            );
        }

        function bindDetailButtons() {

            document
                .querySelectorAll(
                    "[data-class-id]"
                )
                .forEach(
                    button => {

                        button.addEventListener(
                            "click",
                            () => {

                                const id =
                                    Number(
                                        button
                                            .dataset
                                            .classId
                                    );

                                const classItem =
                                    classes.find(
                                        item =>
                                            Number(
                                                item.id
                                            )
                                            === id
                                    );

                                if (classItem) {
                                    openDetails(
                                        classItem
                                    );
                                }
                            }
                        );
                    }
                );
        }

        async function load() {

            try {

                const {
                    response,
                    data
                } =
                    await window
                        .PrimeWaySecretaria
                        .request(
                            API
                        );

                if (
                    !response.ok
                    ||
                    !data?.success
                ) {
                    throw new Error(
                        data?.message
                        ||
                        "Não foi possível carregar as turmas."
                    );
                }

                classes =
                    data.classes
                    || [];

                document.querySelector(
                    "#summaryTotal"
                ).textContent =
                    data.summary.total;

                document.querySelector(
                    "#summaryActive"
                ).textContent =
                    data.summary.active;

                document.querySelector(
                    "#summaryStudents"
                ).textContent =
                    data.summary.students;

                document.querySelector(
                    "#summarySubjects"
                ).textContent =
                    data.summary.subjects;

                document.querySelector(
                    "#schoolYearLabel"
                ).textContent =
                    data.schoolYear
                        ?.year
                    ?? "—";

                render();

            } catch (error) {

                console.error(
                    error
                );

                window
                    .PrimeWayFeedback
                    ?.error(
                        error?.message
                        ||
                        "Não foi possível carregar as turmas da Secretaria."
                    );
            }
        }

        searchInput.addEventListener(
            "input",
            render
        );

        shiftFilter.addEventListener(
            "change",
            render
        );

        statusFilter.addEventListener(
            "change",
            render
        );

        modalClose.addEventListener(
            "click",
            closeDetails
        );

        modalOverlay.addEventListener(
            "click",
            closeDetails
        );

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key
                    === "Escape"
                    &&
                    !modal.hidden
                ) {
                    closeDetails();
                }
            }
        );

        await load();
    }
);
