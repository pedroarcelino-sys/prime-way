document.addEventListener("DOMContentLoaded", async function () {
    await window.PrimeWayStorage?.ready;

    const INDEX_URL =
        "../api/professor/frequencia/index.php";

    const SAVE_LESSON_URL =
        "../api/professor/frequencia/salvar_aula.php";

    const SAVE_ATTENDANCE_URL =
        "../api/professor/frequencia/salvar_frequencia.php";

    let state = {
        classSubjects: [],
        periods: [],
        lessons: [],
        studentsByClassSubject: {},
        attendanceByLesson: {}
    };

    let activeLessonId =
        null;

    const schoolYearValue =
        document.querySelector(
            "#schoolYearValue"
        );

    const lessonCount =
        document.querySelector(
            "#lessonCount"
        );

    const realizedCount =
        document.querySelector(
            "#realizedCount"
        );

    const plannedCount =
        document.querySelector(
            "#plannedCount"
        );

    const completedAttendanceCount =
        document.querySelector(
            "#completedAttendanceCount"
        );

    const search =
        document.querySelector(
            "#lessonSearch"
        );

    const classSubjectFilter =
        document.querySelector(
            "#classSubjectFilter"
        );

    const periodFilter =
        document.querySelector(
            "#periodFilter"
        );

    const statusFilter =
        document.querySelector(
            "#statusFilter"
        );

    const lessonsBody =
        document.querySelector(
            "#lessonsBody"
        );

    const newLessonButton =
        document.querySelector(
            "#newLessonButton"
        );

    const lessonDialog =
        document.querySelector(
            "#lessonDialog"
        );

    const lessonForm =
        document.querySelector(
            "#lessonForm"
        );

    const lessonDialogTitle =
        document.querySelector(
            "#lessonDialogTitle"
        );

    const lessonId =
        document.querySelector(
            "#lessonId"
        );

    const lessonClassSubject =
        document.querySelector(
            "#lessonClassSubject"
        );

    const lessonPeriod =
        document.querySelector(
            "#lessonPeriod"
        );

    const lessonDate =
        document.querySelector(
            "#lessonDate"
        );

    const lessonStartTime =
        document.querySelector(
            "#lessonStartTime"
        );

    const lessonEndTime =
        document.querySelector(
            "#lessonEndTime"
        );

    const lessonContent =
        document.querySelector(
            "#lessonContent"
        );

    const lessonNotes =
        document.querySelector(
            "#lessonNotes"
        );

    const lessonStatus =
        document.querySelector(
            "#lessonStatus"
        );

    const closeLessonDialog =
        document.querySelector(
            "#closeLessonDialog"
        );

    const cancelLessonButton =
        document.querySelector(
            "#cancelLessonButton"
        );

    const saveLessonButton =
        document.querySelector(
            "#saveLessonButton"
        );

    const attendanceDialog =
        document.querySelector(
            "#attendanceDialog"
        );

    const attendanceForm =
        document.querySelector(
            "#attendanceForm"
        );

    const attendanceDialogTitle =
        document.querySelector(
            "#attendanceDialogTitle"
        );

    const attendanceDialogContext =
        document.querySelector(
            "#attendanceDialogContext"
        );

    const attendanceStudentsCount =
        document.querySelector(
            "#attendanceStudentsCount"
        );

    const attendanceBody =
        document.querySelector(
            "#attendanceBody"
        );

    const markAllPresentButton =
        document.querySelector(
            "#markAllPresentButton"
        );

    const closeAttendanceDialog =
        document.querySelector(
            "#closeAttendanceDialog"
        );

    const cancelAttendanceButton =
        document.querySelector(
            "#cancelAttendanceButton"
        );

    const saveAttendanceButton =
        document.querySelector(
            "#saveAttendanceButton"
        );

    function normalize(value) {
        return String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function timeValue(value) {
        return value
            ? String(value).slice(0, 5)
            : "";
    }

    function statusClass(status) {
        switch (status) {
            case "Realizada":
                return "success";
            case "Cancelada":
                return "danger";
            default:
                return "warning";
        }
    }

    function findLesson(id) {
        return state.lessons.find(
            item =>
                Number(item.id) ===
                Number(id)
        ) || null;
    }

    function studentsForLesson(lesson) {
        if (!lesson) {
            return [];
        }

        return state.studentsByClassSubject[
            String(lesson.classSubjectId)
        ] || [];
    }

    function attendanceForLesson(id) {
        return state.attendanceByLesson[
            String(id)
        ] || {};
    }

    function fillSelects() {
        const targets = [
            classSubjectFilter,
            lessonClassSubject
        ];

        for (const target of targets) {
            target
                .querySelectorAll(
                    "option:not(:first-child)"
                )
                .forEach(
                    option =>
                        option.remove()
                );
        }

        for (const item of state.classSubjects) {
            const label =
                `${item.className} • ${item.subjectName}`;

            for (const target of targets) {
                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    String(item.id);

                option.textContent =
                    label;

                target.append(option);
            }
        }

        const periodTargets = [
            periodFilter,
            lessonPeriod
        ];

        for (const target of periodTargets) {
            target
                .querySelectorAll(
                    "option:not(:first-child)"
                )
                .forEach(
                    option =>
                        option.remove()
                );
        }

        for (const item of state.periods) {
            for (const target of periodTargets) {
                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    String(item.id);

                option.textContent =
                    item.name;

                target.append(option);
            }
        }
    }

    function renderSummary() {
        lessonCount.textContent =
            String(
                state.lessons.length
            );

        realizedCount.textContent =
            String(
                state.lessons.filter(
                    item =>
                        item.status ===
                        "Realizada"
                ).length
            );

        plannedCount.textContent =
            String(
                state.lessons.filter(
                    item =>
                        item.status ===
                        "Planejada"
                ).length
            );

        completedAttendanceCount.textContent =
            String(
                state.lessons.filter(
                    item =>
                        Number(
                            item.summary?.students ||
                            0
                        ) > 0 &&
                        Number(
                            item.summary?.registered ||
                            0
                        ) >=
                        Number(
                            item.summary?.students ||
                            0
                        )
                ).length
            );
    }

    function renderLessons() {
        const query =
            normalize(
                search.value
            );

        const classSubjectId =
            classSubjectFilter.value;

        const periodId =
            periodFilter.value;

        const status =
            statusFilter.value;

        const items =
            state.lessons.filter(
                item => {
                    if (
                        classSubjectId &&
                        String(
                            item.classSubjectId
                        ) !==
                            classSubjectId
                    ) {
                        return false;
                    }

                    if (
                        periodId &&
                        String(item.periodId) !==
                            periodId
                    ) {
                        return false;
                    }

                    if (
                        status &&
                        item.status !==
                            status
                    ) {
                        return false;
                    }

                    if (
                        query &&
                        !normalize(
                            `${item.content} ${item.class?.name} ${item.subject?.name} ${item.period?.name}`
                        ).includes(
                            query
                        )
                    ) {
                        return false;
                    }

                    return true;
                }
            );

        lessonsBody.replaceChildren();

        if (!items.length) {
            const row =
                document.createElement(
                    "tr"
                );

            const cell =
                document.createElement(
                    "td"
                );

            cell.colSpan = 7;
            cell.className =
                "professor-empty";

            cell.textContent =
                state.lessons.length
                    ? "Nenhuma aula corresponde aos filtros."
                    : "Nenhuma aula cadastrada.";

            row.append(cell);
            lessonsBody.append(row);
            return;
        }

        for (const item of items) {
            const row =
                document.createElement(
                    "tr"
                );

            const date =
                document.createElement(
                    "td"
                );

            date.textContent =
                window.PrimeWayProfessor
                    .formatDate(
                        item.date
                    );

            const classCell =
                document.createElement(
                    "td"
                );

            classCell.innerHTML =
                `<div class="lesson-title"><strong></strong><span></span></div>`;

            classCell.querySelector(
                "strong"
            ).textContent =
                item.class?.name ||
                "—";

            classCell.querySelector(
                "span"
            ).textContent =
                item.subject?.name ||
                "—";

            const period =
                document.createElement(
                    "td"
                );

            period.textContent =
                item.period?.name ||
                "—";

            const content =
                document.createElement(
                    "td"
                );

            content.textContent =
                item.content ||
                "Conteúdo não informado";

            const statusCell =
                document.createElement(
                    "td"
                );

            const badge =
                document.createElement(
                    "span"
                );

            badge.className =
                `professor-status ${statusClass(item.status)}`;

            badge.textContent =
                item.status;

            statusCell.append(badge);

            const attendance =
                document.createElement(
                    "td"
                );

            attendance.textContent =
                `${item.summary?.registered || 0}/${item.summary?.students || 0}`;

            const actionsCell =
                document.createElement(
                    "td"
                );

            const actions =
                document.createElement(
                    "div"
                );

            actions.className =
                "lesson-actions";

            const attendanceButton =
                document.createElement(
                    "button"
                );

            attendanceButton.type =
                "button";

            attendanceButton.className =
                "lesson-action-button";

            attendanceButton.innerHTML =
                '<i class="fa-solid fa-user-check" aria-hidden="true"></i><span>Chamada</span>';

            attendanceButton.disabled =
                item.status ===
                "Cancelada";

            attendanceButton.addEventListener(
                "click",
                () =>
                    openAttendance(
                        item
                    )
            );

            const editButton =
                document.createElement(
                    "button"
                );

            editButton.type =
                "button";

            editButton.className =
                "lesson-action-button";

            editButton.innerHTML =
                '<i class="fa-solid fa-gear" aria-hidden="true"></i><span>Editar</span>';

            editButton.addEventListener(
                "click",
                () =>
                    openLesson(
                        item
                    )
            );

            actions.append(
                attendanceButton,
                editButton
            );

            actionsCell.append(
                actions
            );

            row.append(
                date,
                classCell,
                period,
                content,
                statusCell,
                attendance,
                actionsCell
            );

            lessonsBody.append(row);
        }
    }

    function resetLessonForm() {
        lessonForm.reset();
        lessonId.value = "";
        lessonStatus.value =
            "Planejada";

        if (
            classSubjectFilter.value
        ) {
            lessonClassSubject.value =
                classSubjectFilter.value;
        }

        if (
            periodFilter.value
        ) {
            lessonPeriod.value =
                periodFilter.value;
        }
    }

    function openLesson(item = null) {
        resetLessonForm();

        if (item) {
            lessonDialogTitle.textContent =
                "Editar aula";

            lessonId.value =
                String(item.id);

            lessonClassSubject.value =
                String(
                    item.classSubjectId
                );

            lessonPeriod.value =
                String(
                    item.periodId
                );

            lessonDate.value =
                item.date ||
                "";

            lessonStartTime.value =
                timeValue(
                    item.startTime
                );

            lessonEndTime.value =
                timeValue(
                    item.endTime
                );

            lessonContent.value =
                item.content ||
                "";

            lessonNotes.value =
                item.notes ||
                "";

            lessonStatus.value =
                item.status;

        } else {
            lessonDialogTitle.textContent =
                "Nova aula";
        }

        lessonDialog.showModal();
    }

    function closeLesson() {
        if (lessonDialog.open) {
            lessonDialog.close();
        }
    }

    async function saveLesson(event) {
        event.preventDefault();

        if (!lessonForm.checkValidity()) {
            lessonForm.reportValidity();
            return;
        }

        saveLessonButton.disabled =
            true;

        try {
            const payload = {
                id:
                    lessonId.value ||
                    null,

                classSubjectId:
                    lessonClassSubject.value,

                periodId:
                    lessonPeriod.value,

                date:
                    lessonDate.value,

                startTime:
                    lessonStartTime.value ||
                    null,

                endTime:
                    lessonEndTime.value ||
                    null,

                content:
                    lessonContent.value.trim(),

                notes:
                    lessonNotes.value.trim(),

                status:
                    lessonStatus.value
            };

            const {
                response,
                data
            } =
                await window
                    .PrimeWayProfessor
                    .requestJson(
                        SAVE_LESSON_URL,
                        payload
                    );

            if (
                !response.ok ||
                !data?.success
            ) {
                throw new Error(
                    data?.message ||
                    "Não foi possível salvar a aula."
                );
            }

            window.PrimeWayFeedback
                ?.success(
                    data.message ||
                    "Aula salva com sucesso."
                );

            closeLesson();
            await load();

        } catch (error) {
            window.PrimeWayFeedback
                ?.error(
                    error?.message ||
                    "Não foi possível salvar a aula."
                );

        } finally {
            saveLessonButton.disabled =
                false;
        }
    }

    function openAttendance(lesson) {
        activeLessonId =
            Number(lesson.id);

        const students =
            studentsForLesson(
                lesson
            );

        const records =
            attendanceForLesson(
                lesson.id
            );

        attendanceDialogTitle.textContent =
            "Registrar frequência";

        attendanceDialogContext.textContent =
            `${lesson.class?.name || "—"} • ${lesson.subject?.name || "—"} • ${window.PrimeWayProfessor.formatDate(lesson.date)}`;

        attendanceStudentsCount.textContent =
            `${students.length} ${students.length === 1 ? "aluno" : "alunos"}`;

        attendanceBody.replaceChildren();

        if (!students.length) {
            attendanceBody.innerHTML =
                '<tr><td colspan="4" class="professor-empty">Nenhum aluno com matrícula ativa nesta turma.</td></tr>';
        } else {
            for (const student of students) {
                const row =
                    document.createElement(
                        "tr"
                    );

                row.dataset.enrollmentId =
                    String(
                        student.enrollmentId
                    );

                const existing =
                    records[
                        String(
                            student.enrollmentId
                        )
                    ] ||
                    null;

                const call =
                    document.createElement(
                        "td"
                    );

                call.textContent =
                    student.callNumber ===
                        null
                        ? "—"
                        : String(
                            student.callNumber
                        );

                const name =
                    document.createElement(
                        "td"
                    );

                name.className =
                    "attendance-student-name";

                name.textContent =
                    student.name;

                const statusCell =
                    document.createElement(
                        "td"
                    );

                const select =
                    document.createElement(
                        "select"
                    );

                select.className =
                    "attendance-status-select";

                for (
                    const value of [
                        "Presente",
                        "Falta",
                        "Justificada",
                        "Atraso"
                    ]
                ) {
                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        value;

                    option.textContent =
                        value;

                    select.append(
                        option
                    );
                }

                select.value =
                    existing?.status ||
                    "Presente";

                statusCell.append(
                    select
                );

                const observationCell =
                    document.createElement(
                        "td"
                    );

                const observation =
                    document.createElement(
                        "input"
                    );

                observation.type =
                    "text";

                observation.className =
                    "attendance-observation";

                observation.maxLength =
                    500;

                observation.placeholder =
                    "Opcional";

                observation.value =
                    existing?.observation ||
                    "";

                observationCell.append(
                    observation
                );

                row.append(
                    call,
                    name,
                    statusCell,
                    observationCell
                );

                attendanceBody.append(
                    row
                );
            }
        }

        attendanceDialog.showModal();
    }

    function closeAttendance() {
        activeLessonId =
            null;

        if (attendanceDialog.open) {
            attendanceDialog.close();
        }
    }

    function markAllPresent() {
        attendanceBody
            .querySelectorAll(
                ".attendance-status-select"
            )
            .forEach(
                select => {
                    select.value =
                        "Presente";
                }
            );
    }

    async function saveAttendance(event) {
        event.preventDefault();

        const lesson =
            findLesson(
                activeLessonId
            );

        if (!lesson) {
            window.PrimeWayFeedback
                ?.error(
                    "Aula não encontrada."
                );
            return;
        }

        const rows =
            Array.from(
                attendanceBody.querySelectorAll(
                    "tr[data-enrollment-id]"
                )
            );

        const records =
            rows.map(
                row => ({
                    enrollmentId:
                        Number(
                            row.dataset
                                .enrollmentId
                        ),

                    status:
                        row.querySelector(
                            ".attendance-status-select"
                        ).value,

                    observation:
                        row.querySelector(
                            ".attendance-observation"
                        ).value.trim()
                })
            );

        saveAttendanceButton.disabled =
            true;

        try {
            const {
                response,
                data
            } =
                await window
                    .PrimeWayProfessor
                    .requestJson(
                        SAVE_ATTENDANCE_URL,
                        {
                            lessonId:
                                lesson.id,
                            records
                        }
                    );

            if (
                !response.ok ||
                !data?.success
            ) {
                throw new Error(
                    data?.message ||
                    "Não foi possível salvar a frequência."
                );
            }

            window.PrimeWayFeedback
                ?.success(
                    data.message ||
                    "Frequência salva com sucesso."
                );

            closeAttendance();
            await load();

        } catch (error) {
            window.PrimeWayFeedback
                ?.error(
                    error?.message ||
                    "Não foi possível salvar a frequência."
                );

        } finally {
            saveAttendanceButton.disabled =
                false;
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
                        INDEX_URL
                    );

            if (
                !response.ok ||
                !data?.success
            ) {
                throw new Error(
                    data?.message ||
                    "Não foi possível carregar a frequência."
                );
            }

            state = {
                classSubjects:
                    Array.isArray(
                        data.classSubjects
                    )
                        ? data.classSubjects
                        : [],

                periods:
                    Array.isArray(
                        data.periods
                    )
                        ? data.periods
                        : [],

                lessons:
                    Array.isArray(
                        data.lessons
                    )
                        ? data.lessons
                        : [],

                studentsByClassSubject:
                    data.studentsByClassSubject &&
                    typeof data.studentsByClassSubject ===
                        "object"
                        ? data.studentsByClassSubject
                        : {},

                attendanceByLesson:
                    data.attendanceByLesson &&
                    typeof data.attendanceByLesson ===
                        "object"
                        ? data.attendanceByLesson
                        : {}
            };

            schoolYearValue.textContent =
                data.schoolYear?.year
                    ? `Ano letivo ${data.schoolYear.year}`
                    : "Ano letivo —";

            newLessonButton.disabled =
                state.classSubjects.length ===
                    0 ||
                state.periods.length ===
                    0;

            fillSelects();
            renderSummary();
            renderLessons();

        } catch (error) {
            console.error(
                "Erro ao carregar frequência:",
                error
            );

            window.PrimeWayFeedback
                ?.error(
                    error?.message ||
                    "Não foi possível carregar a frequência."
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

    newLessonButton.addEventListener(
        "click",
        () =>
            openLesson()
    );

    closeLessonDialog.addEventListener(
        "click",
        closeLesson
    );

    cancelLessonButton.addEventListener(
        "click",
        closeLesson
    );

    closeAttendanceDialog.addEventListener(
        "click",
        closeAttendance
    );

    cancelAttendanceButton.addEventListener(
        "click",
        closeAttendance
    );

    markAllPresentButton.addEventListener(
        "click",
        markAllPresent
    );

    lessonForm.addEventListener(
        "submit",
        saveLesson
    );

    attendanceForm.addEventListener(
        "submit",
        saveAttendance
    );

    search.addEventListener(
        "input",
        renderLessons
    );

    classSubjectFilter.addEventListener(
        "change",
        renderLessons
    );

    periodFilter.addEventListener(
        "change",
        renderLessons
    );

    statusFilter.addEventListener(
        "change",
        renderLessons
    );

    await load();

    await window
        .PrimeWayProfessor
        .refreshNavigationBadges();
});
