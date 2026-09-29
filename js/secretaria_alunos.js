document.addEventListener(
    "DOMContentLoaded",
    async function () {

        const API =
            "../api/secretaria/alunos/index.php";

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
                "#studentSearch"
            );

        const classFilter =
            document.querySelector(
                "#classFilter"
            );

        const statusFilter =
            document.querySelector(
                "#statusFilter"
            );

        const tableBody =
            document.querySelector(
                "#studentsTableBody"
            );

        const emptyState =
            document.querySelector(
                "#studentsEmpty"
            );

        const modal =
            document.querySelector(
                "#studentDetailsModal"
            );

        const modalContent =
            document.querySelector(
                "#studentDetailsContent"
            );

        const modalClose =
            document.querySelector(
                "#studentDetailsClose"
            );

        const modalOverlay =
            document.querySelector(
                "#studentDetailsOverlay"
            );

        let state = {
            students: []
        };

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

        function statusClass(
            status
        ) {
            if (
                status ===
                "Ativo"
            ) {
                return "success";
            }

            if (
                status ===
                "Pendente"
            ) {
                return "warning";
            }

            return "neutral";
        }

        function fillClassFilter() {

            const current =
                classFilter.value;

            const classes =
                [
                    ...new Map(
                        state
                            .students
                            .filter(
                                student =>
                                    student.class
                            )
                            .map(
                                student => [
                                    String(
                                        student.class.id
                                    ),
                                    student.class.name
                                ]
                            )
                    )
                ];

            classFilter.innerHTML =
                '<option value="">Todas as turmas</option>';

            for (
                const [
                    id,
                    name
                ]
                of classes
            ) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    id;

                option.textContent =
                    name;

                classFilter.append(
                    option
                );
            }

            if (
                [
                    ...classFilter.options
                ].some(
                    option =>
                        option.value
                        === current
                )
            ) {
                classFilter.value =
                    current;
            }
        }

        function visibleStudents() {

            const term =
                searchInput
                    .value
                    .trim()
                    .toLowerCase();

            const classId =
                classFilter.value;

            const status =
                statusFilter.value;

            return state.students.filter(
                student => {

                    const mainGuardian =
                        student.guardians
                            ?.find(
                                guardian =>
                                    guardian.primaryContact
                            )
                        ||
                        student.guardians?.[0]
                        ||
                        null;

                    const haystack = [
                        student.name,
                        student.registration,
                        student.email,
                        student.phone,
                        student.document,
                        student.class?.name,
                        student.class?.series,
                        mainGuardian?.name
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();

                    const matchesSearch =
                        !term
                        ||
                        haystack.includes(
                            term
                        );

                    const matchesClass =
                        !classId
                        ||
                        String(
                            student
                                .class
                                ?.id
                            ?? ""
                        )
                        === classId;

                    const matchesStatus =
                        !status
                        ||
                        student.status
                        === status;

                    return (
                        matchesSearch
                        &&
                        matchesClass
                        &&
                        matchesStatus
                    );
                }
            );
        }

        function renderStudents() {

            const students =
                visibleStudents();

            tableBody.replaceChildren();

            emptyState.hidden =
                students.length > 0;

            if (!students.length) {
                return;
            }

            for (
                const student
                of students
            ) {

                const mainGuardian =
                    student.guardians
                        ?.find(
                            guardian =>
                                guardian.primaryContact
                        )
                    ||
                    student.guardians?.[0]
                    ||
                    null;

                const tr =
                    document.createElement(
                        "tr"
                    );

                tr.innerHTML = `
                    <td>
                        <div class="student-main-cell">
                            <div class="student-avatar">
                                ${escapeHtml(
                                    student.name
                                        ?.charAt(0)
                                        ?.toUpperCase()
                                    || "A"
                                )}
                            </div>

                            <div>
                                <strong>
                                    ${escapeHtml(student.name)}
                                </strong>

                                <span>
                                    ${escapeHtml(student.email || "Sem e-mail de acesso")}
                                </span>
                            </div>
                        </div>
                    </td>

                    <td>
                        <strong>
                            ${escapeHtml(student.registration)}
                        </strong>
                    </td>

                    <td>
                        <strong>
                            ${escapeHtml(student.class?.name || "Sem turma")}
                        </strong>

                        <span class="student-subline">
                            ${escapeHtml(
                                [
                                    student.class?.series,
                                    student.class?.shift
                                ]
                                    .filter(Boolean)
                                    .join(" • ")
                                || "—"
                            )}
                        </span>
                    </td>

                    <td>
                        <strong>
                            ${escapeHtml(mainGuardian?.name || "Não vinculado")}
                        </strong>

                        <span class="student-subline">
                            ${escapeHtml(mainGuardian?.relationship || "—")}
                        </span>
                    </td>

                    <td>
                        <span class="secretary-status ${statusClass(student.status)}">
                            ${escapeHtml(student.status)}
                        </span>
                    </td>

                    <td class="student-actions-cell">
                        <button
                            type="button"
                            class="student-details-button"
                            data-student-id="${student.id}"
                        >
                            <i class="fa-solid fa-eye"></i>
                            Ver detalhes
                        </button>
                    </td>
                `;

                tableBody.append(
                    tr
                );
            }

            bindDetailButtons();
        }

        function guardianBadges(
            guardian
        ) {

            const badges = [];

            if (
                guardian
                    .primaryContact
            ) {
                badges.push(
                    '<span class="detail-badge">Contato principal</span>'
                );
            }

            if (
                guardian
                    .authorizedPickup
            ) {
                badges.push(
                    '<span class="detail-badge success">Retirada autorizada</span>'
                );
            }

            if (
                guardian
                    .financial
            ) {
                badges.push(
                    '<span class="detail-badge financial">Financeiro</span>'
                );
            }

            if (
                !guardian.active
            ) {
                badges.push(
                    '<span class="detail-badge muted">Vínculo inativo</span>'
                );
            }

            return badges.join(
                ""
            );
        }

        function openDetails(
            student
        ) {

            const guardians =
                student.guardians
                || [];

            const guardiansHtml =
                guardians.length
                    ? guardians
                        .map(
                            guardian => `
                                <article class="guardian-detail-card">
                                    <div>
                                        <strong>
                                            ${escapeHtml(guardian.name)}
                                        </strong>

                                        <span>
                                            ${escapeHtml(guardian.relationship || "Responsável")}
                                        </span>
                                    </div>

                                    <div class="guardian-contact">
                                        <span>
                                            <i class="fa-solid fa-phone"></i>
                                            ${escapeHtml(guardian.phone || "—")}
                                        </span>

                                        <span>
                                            <i class="fa-solid fa-envelope"></i>
                                            ${escapeHtml(guardian.email || "—")}
                                        </span>
                                    </div>

                                    <div class="detail-badges">
                                        ${guardianBadges(guardian)}
                                    </div>
                                </article>
                            `
                        )
                        .join("")
                    : `
                        <div class="student-detail-empty">
                            Nenhum responsável vinculado.
                        </div>
                    `;

            modalContent.innerHTML = `
                <div class="student-details-heading">
                    <div class="student-detail-avatar">
                        ${escapeHtml(
                            student.name
                                ?.charAt(0)
                                ?.toUpperCase()
                            || "A"
                        )}
                    </div>

                    <div>
                        <span class="student-detail-label">
                            Aluno
                        </span>

                        <h2>
                            ${escapeHtml(student.name)}
                        </h2>

                        <div class="detail-badges">
                            <span class="secretary-status ${statusClass(student.status)}">
                                ${escapeHtml(student.status)}
                            </span>

                            ${
                                student.hasAccess
                                    ? '<span class="detail-badge success">Acesso ativo</span>'
                                    : '<span class="detail-badge muted">Sem acesso ativo</span>'
                            }

                            ${
                                student.newStudent
                                    ? '<span class="detail-badge">Novo aluno</span>'
                                    : ''
                            }
                        </div>
                    </div>
                </div>

                <section class="student-detail-section">
                    <h3>Dados cadastrais</h3>

                    <div class="student-detail-grid">
                        <div>
                            <span>Matrícula</span>
                            <strong>${escapeHtml(student.registration || "—")}</strong>
                        </div>

                        <div>
                            <span>E-mail</span>
                            <strong>${escapeHtml(student.email || "—")}</strong>
                        </div>

                        <div>
                            <span>Telefone</span>
                            <strong>${escapeHtml(student.phone || "—")}</strong>
                        </div>

                        <div>
                            <span>Documento</span>
                            <strong>${escapeHtml(student.document || "—")}</strong>
                        </div>

                        <div>
                            <span>Nascimento</span>
                            <strong>${window.PrimeWaySecretaria.formatDate(student.birthDate)}</strong>
                        </div>

                        <div>
                            <span>Ingresso</span>
                            <strong>${window.PrimeWaySecretaria.formatDate(student.entryDate)}</strong>
                        </div>
                    </div>
                </section>

                <section class="student-detail-section">
                    <h3>Matrícula atual</h3>

                    ${
                        student.enrollment
                            ? `
                                <div class="student-detail-grid">
                                    <div>
                                        <span>Turma</span>
                                        <strong>${escapeHtml(student.class?.name || "—")}</strong>
                                    </div>

                                    <div>
                                        <span>Série</span>
                                        <strong>${escapeHtml(student.class?.series || "—")}</strong>
                                    </div>

                                    <div>
                                        <span>Turno</span>
                                        <strong>${escapeHtml(student.class?.shift || "—")}</strong>
                                    </div>

                                    <div>
                                        <span>Sala</span>
                                        <strong>${escapeHtml(student.class?.room || "—")}</strong>
                                    </div>

                                    <div>
                                        <span>Nº da chamada</span>
                                        <strong>${escapeHtml(student.enrollment.callNumber ?? "—")}</strong>
                                    </div>

                                    <div>
                                        <span>Data da matrícula</span>
                                        <strong>${window.PrimeWaySecretaria.formatDate(student.enrollment.date)}</strong>
                                    </div>
                                </div>
                            `
                            : `
                                <div class="student-detail-empty">
                                    O aluno não possui matrícula ativa no ano letivo atual.
                                </div>
                            `
                    }
                </section>

                <section class="student-detail-section">
                    <h3>Responsáveis</h3>

                    <div class="guardian-detail-list">
                        ${guardiansHtml}
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
                    "[data-student-id]"
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
                                            .studentId
                                    );

                                const student =
                                    state.students.find(
                                        item =>
                                            Number(
                                                item.id
                                            )
                                            === id
                                    );

                                if (student) {
                                    openDetails(
                                        student
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
                        "Não foi possível carregar os alunos."
                    );
                }

                state.students =
                    data.students
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
                    "#summaryPending"
                ).textContent =
                    data.summary.pending;

                document.querySelector(
                    "#summaryWithoutClass"
                ).textContent =
                    data.summary.withoutClass;

                document.querySelector(
                    "#schoolYearLabel"
                ).textContent =
                    data.schoolYear
                        ?.year
                    ?? "—";

                fillClassFilter();
                renderStudents();

            } catch (error) {

                console.error(
                    error
                );

                window
                    .PrimeWayFeedback
                    ?.error(
                        error?.message
                        ||
                        "Não foi possível carregar os alunos da Secretaria."
                    );
            }
        }

        searchInput.addEventListener(
            "input",
            renderStudents
        );

        classFilter.addEventListener(
            "change",
            renderStudents
        );

        statusFilter.addEventListener(
            "change",
            renderStudents
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
                    event.key === "Escape"
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
