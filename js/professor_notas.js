document.addEventListener("DOMContentLoaded", async function () {
    await window.PrimeWayStorage?.ready;

    const INDEX_URL =
        "../api/professor/notas/index.php";

    const SAVE_EVALUATION_URL =
        "../api/professor/notas/salvar_avaliacao.php";

    const SAVE_GRADES_URL =
        "../api/professor/notas/salvar_notas.php";

    const SESSION_URL =
        "../api/auth/session.php";

    const LOGOUT_URL =
        "../api/auth/logout.php";

    const LOGIN_PAGE =
        "login.html";


    let state = {
        professor: null,
        schoolYear: null,
        classSubjects: [],
        periods: [],
        evaluations: [],
        studentsByClassSubject: {},
        gradesByEvaluation: {},
        csrfToken: ""
    };


    let activeEvaluationId =
        null;


    /*====================================================
                    ELEMENTOS
    ====================================================*/

    const schoolYearValue =
        document.querySelector(
            "#schoolYearValue"
        );

    const newEvaluationButton =
        document.querySelector(
            "#newEvaluationButton"
        );

    const totalEvaluations =
        document.querySelector(
            "#totalEvaluations"
        );

    const finalizedEvaluations =
        document.querySelector(
            "#finalizedEvaluations"
        );

    const launchedGrades =
        document.querySelector(
            "#launchedGrades"
        );

    const pendingGrades =
        document.querySelector(
            "#pendingGrades"
        );

    const evaluationSearch =
        document.querySelector(
            "#evaluationSearch"
        );

    const classSubjectFilter =
        document.querySelector(
            "#classSubjectFilter"
        );

    const periodFilter =
        document.querySelector(
            "#periodFilter"
        );

    const evaluationsTableBody =
        document.querySelector(
            "#evaluationsTableBody"
        );


    /* AVALIAÇÃO */

    const evaluationDialog =
        document.querySelector(
            "#evaluationDialog"
        );

    const evaluationForm =
        document.querySelector(
            "#evaluationForm"
        );

    const evaluationDialogTitle =
        document.querySelector(
            "#evaluationDialogTitle"
        );

    const evaluationId =
        document.querySelector(
            "#evaluationId"
        );

    const evaluationClassSubject =
        document.querySelector(
            "#evaluationClassSubject"
        );

    const evaluationPeriod =
        document.querySelector(
            "#evaluationPeriod"
        );

    const evaluationType =
        document.querySelector(
            "#evaluationType"
        );

    const evaluationTitle =
        document.querySelector(
            "#evaluationTitle"
        );

    const evaluationMaximumValue =
        document.querySelector(
            "#evaluationMaximumValue"
        );

    const evaluationWeight =
        document.querySelector(
            "#evaluationWeight"
        );

    const evaluationDate =
        document.querySelector(
            "#evaluationDate"
        );

    const evaluationStatus =
        document.querySelector(
            "#evaluationStatus"
        );

    const evaluationDescription =
        document.querySelector(
            "#evaluationDescription"
        );

    const closeEvaluationDialog =
        document.querySelector(
            "#closeEvaluationDialog"
        );

    const cancelEvaluationButton =
        document.querySelector(
            "#cancelEvaluationButton"
        );

    const saveEvaluationButton =
        document.querySelector(
            "#saveEvaluationButton"
        );


    /* NOTAS */

    const gradesDialog =
        document.querySelector(
            "#gradesDialog"
        );

    const gradesForm =
        document.querySelector(
            "#gradesForm"
        );

    const gradesDialogTitle =
        document.querySelector(
            "#gradesDialogTitle"
        );

    const gradesDialogContext =
        document.querySelector(
            "#gradesDialogContext"
        );

    const gradesMaximumValue =
        document.querySelector(
            "#gradesMaximumValue"
        );

    const gradesStudentsCount =
        document.querySelector(
            "#gradesStudentsCount"
        );

    const gradesFilledCount =
        document.querySelector(
            "#gradesFilledCount"
        );

    const gradesStudentsBody =
        document.querySelector(
            "#gradesStudentsBody"
        );

    const closeGradesDialog =
        document.querySelector(
            "#closeGradesDialog"
        );

    const cancelGradesButton =
        document.querySelector(
            "#cancelGradesButton"
        );

    const saveGradesButton =
        document.querySelector(
            "#saveGradesButton"
        );

    const logoutButton =
        document.querySelector(
            "#logoutButton"
        );


    /*====================================================
                    UTILITÁRIOS
    ====================================================*/

    async function readJson(
        response
    ) {

        try {
            return await response.json();
        } catch {
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
            sessionStorage.removeItem(
                key
            );
        }
    }


    function normalizeText(
        value
    ) {

        return String(
            value ?? ""
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


    function formatNumber(
        value,
        digits = 2
    ) {

        const number =
            Number(
                value
            );


        if (
            !Number.isFinite(
                number
            )
        ) {
            return "—";
        }


        return number.toLocaleString(
            "pt-BR",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits:
                    digits
            }
        );
    }


    function formatDate(
        value
    ) {

        if (!value) {
            return "Sem data";
        }


        const date =
            new Date(
                `${value}T12:00:00`
            );


        return Number.isNaN(
            date.getTime()
        )
            ? String(value)
            : new Intl.DateTimeFormat(
                "pt-BR"
            ).format(
                date
            );
    }


    function createCell(
        text
    ) {

        const cell =
            document.createElement(
                "td"
            );

        cell.textContent =
            text;

        return cell;
    }


    function findEvaluation(
        id
    ) {

        return state.evaluations.find(
            item =>
                Number(item.id) ===
                Number(id)
        ) || null;
    }


    function getStudentsForEvaluation(
        evaluation
    ) {

        if (!evaluation) {
            return [];
        }


        return state
            .studentsByClassSubject[
                String(
                    evaluation.classSubjectId
                )
            ] ||
            [];
    }


    function getGradesForEvaluation(
        evaluationId
    ) {

        return state
            .gradesByEvaluation[
                String(
                    evaluationId
                )
            ] ||
            {};
    }


    function statusClass(
        status
    ) {

        switch (
            status
        ) {
            case "Finalizada":
                return "success";

            case "Aplicada":
                return "info";

            case "Cancelada":
                return "danger";

            default:
                return "warning";
        }
    }


    /*====================================================
                    SELECTS
    ====================================================*/

    function fillSelects() {

        classSubjectFilter
            ?.querySelectorAll(
                "option:not(:first-child)"
            )
            .forEach(
                option =>
                    option.remove()
            );


        evaluationClassSubject
            ?.querySelectorAll(
                "option:not(:first-child)"
            )
            .forEach(
                option =>
                    option.remove()
            );


        for (
            const item of
            state.classSubjects
        ) {

            const label =
                `${item.className} • ${item.subjectName}`;


            const filterOption =
                document.createElement(
                    "option"
                );

            filterOption.value =
                String(
                    item.id
                );

            filterOption.textContent =
                label;

            classSubjectFilter
                ?.append(
                    filterOption
                );


            const formOption =
                filterOption.cloneNode(
                    true
                );

            evaluationClassSubject
                ?.append(
                    formOption
                );
        }


        periodFilter
            ?.querySelectorAll(
                "option:not(:first-child)"
            )
            .forEach(
                option =>
                    option.remove()
            );


        evaluationPeriod
            ?.querySelectorAll(
                "option:not(:first-child)"
            )
            .forEach(
                option =>
                    option.remove()
            );


        for (
            const period of
            state.periods
        ) {

            const filterOption =
                document.createElement(
                    "option"
                );

            filterOption.value =
                String(
                    period.id
                );

            filterOption.textContent =
                period.name;

            periodFilter
                ?.append(
                    filterOption
                );


            const formOption =
                filterOption.cloneNode(
                    true
                );

            evaluationPeriod
                ?.append(
                    formOption
                );
        }
    }


    /*====================================================
                    RESUMO
    ====================================================*/

    function renderSummary() {

        const total =
            state.evaluations.length;


        const finalized =
            state.evaluations.filter(
                item =>
                    item.status ===
                    "Finalizada"
            ).length;


        const launched =
            state.evaluations.reduce(
                (
                    sum,
                    item
                ) =>
                    sum +
                    Number(
                        item.summary
                            ?.graded ||
                        0
                    ),
                0
            );


        const pending =
            state.evaluations.reduce(
                (
                    sum,
                    item
                ) =>
                    sum +
                    Number(
                        item.summary
                            ?.pending ||
                        0
                    ),
                0
            );


        totalEvaluations.textContent =
            String(total);

        finalizedEvaluations.textContent =
            String(finalized);

        launchedGrades.textContent =
            String(launched);

        pendingGrades.textContent =
            String(pending);
    }


    /*====================================================
                LISTAR AVALIAÇÕES
    ====================================================*/

    function renderEvaluations() {

        const search =
            normalizeText(
                evaluationSearch
                    ?.value
            );


        const classSubjectId =
            classSubjectFilter
                ?.value ||
            "";


        const periodId =
            periodFilter
                ?.value ||
            "";


        const filtered =
            state.evaluations.filter(
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
                        String(
                            item.periodId
                        ) !==
                            periodId
                    ) {
                        return false;
                    }


                    if (
                        search
                    ) {

                        const text =
                            normalizeText(
                                [
                                    item.title,
                                    item.type,
                                    item.class
                                        ?.name,
                                    item.subject
                                        ?.name,
                                    item.period
                                        ?.name,
                                    item.status
                                ].join(
                                    " "
                                )
                            );


                        if (
                            !text.includes(
                                search
                            )
                        ) {
                            return false;
                        }
                    }


                    return true;
                }
            );


        evaluationsTableBody
            .replaceChildren();


        if (
            filtered.length ===
            0
        ) {

            const row =
                document.createElement(
                    "tr"
                );

            const cell =
                document.createElement(
                    "td"
                );

            cell.colSpan =
                7;

            cell.className =
                "grades-empty-cell";

            cell.textContent =
                state.evaluations.length
                    ? "Nenhuma avaliação corresponde aos filtros."
                    : "Nenhuma avaliação cadastrada.";

            row.append(
                cell
            );

            evaluationsTableBody
                .append(
                    row
                );

            return;
        }


        for (
            const item of
            filtered
        ) {

            const row =
                document.createElement(
                    "tr"
                );


            const titleCell =
                document.createElement(
                    "td"
                );


            const titleWrap =
                document.createElement(
                    "div"
                );

            titleWrap.className =
                "evaluation-title";


            const strong =
                document.createElement(
                    "strong"
                );

            strong.textContent =
                item.title;


            const small =
                document.createElement(
                    "span"
                );

            small.textContent =
                `${item.type} • ${formatDate(item.date)}`;


            titleWrap.append(
                strong,
                small
            );

            titleCell.append(
                titleWrap
            );


            const classCell =
                createCell(
                    `${item.class?.name || "—"} / ${item.subject?.name || "—"}`
                );


            const periodCell =
                createCell(
                    item.period
                        ?.name ||
                    "—"
                );


            const valueCell =
                createCell(
                    `${formatNumber(item.maximumValue)} pts • peso ${formatNumber(item.weight)}`
                );


            const statusCell =
                document.createElement(
                    "td"
                );


            const statusBadge =
                document.createElement(
                    "span"
                );

            statusBadge.className =
                `status-badge ${statusClass(item.status)}`;

            statusBadge.textContent =
                item.status;

            statusCell.append(
                statusBadge
            );


            const launchCell =
                document.createElement(
                    "td"
                );

            launchCell.textContent =
                `${item.summary?.graded || 0}/${item.summary?.students || 0}`;


            const actionsCell =
                document.createElement(
                    "td"
                );


            const actions =
                document.createElement(
                    "div"
                );

            actions.className =
                "table-actions";


            const gradeButton =
                document.createElement(
                    "button"
                );

            gradeButton.type =
                "button";

            gradeButton.className =
                "table-action-button";

            gradeButton.innerHTML =
                '<i class="fa-solid fa-pen" aria-hidden="true"></i><span>Notas</span>';

            gradeButton.addEventListener(
                "click",
                () =>
                    openGradesDialog(
                        item.id
                    )
            );


            const editButton =
                document.createElement(
                    "button"
                );

            editButton.type =
                "button";

            editButton.className =
                "table-action-button";

            editButton.innerHTML =
                '<i class="fa-solid fa-gear" aria-hidden="true"></i><span>Editar</span>';

            editButton.addEventListener(
                "click",
                () =>
                    openEvaluationDialog(
                        item
                    )
            );


            actions.append(
                gradeButton,
                editButton
            );

            actionsCell.append(
                actions
            );


            row.append(
                titleCell,
                classCell,
                periodCell,
                valueCell,
                statusCell,
                launchCell,
                actionsCell
            );


            evaluationsTableBody
                .append(
                    row
                );
        }
    }


    /*====================================================
                MODAL DE AVALIAÇÃO
    ====================================================*/

    function resetEvaluationForm() {

        evaluationForm.reset();

        evaluationId.value =
            "";

        evaluationMaximumValue.value =
            "10";

        evaluationWeight.value =
            "1";

        evaluationStatus.value =
            "Planejada";

        evaluationType.value =
            "Prova";
    }


    function openEvaluationDialog(
        item = null
    ) {

        resetEvaluationForm();


        if (
            item
        ) {

            evaluationDialogTitle.textContent =
                "Editar avaliação";

            evaluationId.value =
                String(
                    item.id
                );

            evaluationClassSubject.value =
                String(
                    item.classSubjectId
                );

            evaluationPeriod.value =
                String(
                    item.periodId
                );

            evaluationType.value =
                item.type;

            evaluationTitle.value =
                item.title;

            evaluationMaximumValue.value =
                String(
                    item.maximumValue
                );

            evaluationWeight.value =
                String(
                    item.weight
                );

            evaluationDate.value =
                item.date ||
                "";

            evaluationStatus.value =
                item.status;

            evaluationDescription.value =
                item.description ||
                "";

        } else {

            evaluationDialogTitle.textContent =
                "Nova avaliação";


            if (
                classSubjectFilter.value
            ) {
                evaluationClassSubject.value =
                    classSubjectFilter.value;
            }


            if (
                periodFilter.value
            ) {
                evaluationPeriod.value =
                    periodFilter.value;
            }
        }


        evaluationDialog
            .showModal();


        requestAnimationFrame(
            () =>
                evaluationTitle.focus()
        );
    }


    function closeEvaluation() {

        if (
            evaluationDialog.open
        ) {
            evaluationDialog.close();
        }
    }


    /*====================================================
                    SALVAR AVALIAÇÃO
    ====================================================*/

    evaluationForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            if (
                !evaluationForm.checkValidity()
            ) {

                evaluationForm.reportValidity();
                return;
            }


            saveEvaluationButton.disabled =
                true;


            try {

                const payload = {
                    id:
                        evaluationId.value ||
                        null,

                    classSubjectId:
                        evaluationClassSubject.value,

                    periodId:
                        evaluationPeriod.value,

                    title:
                        evaluationTitle.value.trim(),

                    description:
                        evaluationDescription.value.trim(),

                    type:
                        evaluationType.value,

                    maximumValue:
                        evaluationMaximumValue.value,

                    weight:
                        evaluationWeight.value,

                    date:
                        evaluationDate.value ||
                        null,

                    status:
                        evaluationStatus.value
                };


                const response =
                    await fetch(
                        SAVE_EVALUATION_URL,
                        {
                            method:
                                "POST",

                            credentials:
                                "same-origin",

                            headers: {
                                Accept:
                                    "application/json",

                                "Content-Type":
                                    "application/json",

                                "X-CSRF-Token":
                                    state.csrfToken
                            },

                            body:
                                JSON.stringify(
                                    payload
                                )
                        }
                    );


                const data =
                    await readJson(
                        response
                    );


                if (
                    !response.ok ||
                    !data?.success
                ) {

                    throw new Error(
                        data?.message ||
                        "Não foi possível salvar a avaliação."
                    );
                }


                PrimeWayFeedback.success(
                    data.message ||
                    "Avaliação salva com sucesso."
                );


                closeEvaluation();


                await loadData();

            } catch (error) {

                console.error(
                    "Erro ao salvar avaliação:",
                    error
                );


                PrimeWayFeedback.error(
                    error?.message ||
                    "Não foi possível salvar a avaliação."
                );

            } finally {

                saveEvaluationButton.disabled =
                    false;
            }
        }
    );


    /*====================================================
                    MODAL DE NOTAS
    ====================================================*/

    function updateFilledCount() {

        const inputs =
            gradesStudentsBody
                .querySelectorAll(
                    ".grade-input"
                );


        const filled =
            Array
                .from(
                    inputs
                )
                .filter(
                    input =>
                        input.value !==
                        ""
                )
                .length;


        gradesFilledCount.textContent =
            String(
                filled
            );
    }


    function openGradesDialog(
        evaluationIdValue
    ) {

        const evaluation =
            findEvaluation(
                evaluationIdValue
            );


        if (
            !evaluation
        ) {
            return;
        }


        activeEvaluationId =
            Number(
                evaluation.id
            );


        const students =
            getStudentsForEvaluation(
                evaluation
            );


        const grades =
            getGradesForEvaluation(
                evaluation.id
            );


        gradesDialogTitle.textContent =
            evaluation.title;


        gradesDialogContext.textContent =
            `${evaluation.class?.name || "—"} • ${evaluation.subject?.name || "—"} • ${evaluation.period?.name || "—"}`;


        gradesMaximumValue.textContent =
            formatNumber(
                evaluation.maximumValue
            );


        gradesStudentsCount.textContent =
            String(
                students.length
            );


        gradesStudentsBody
            .replaceChildren();


        if (
            students.length ===
            0
        ) {

            const row =
                document.createElement(
                    "tr"
                );

            const cell =
                document.createElement(
                    "td"
                );

            cell.colSpan =
                5;

            cell.className =
                "grades-empty-cell";

            cell.textContent =
                "Nenhum aluno com matrícula ativa nesta turma.";

            row.append(
                cell
            );

            gradesStudentsBody
                .append(
                    row
                );

        } else {

            for (
                const student of
                students
            ) {

                const row =
                    document.createElement(
                        "tr"
                    );


                row.dataset.enrollmentId =
                    String(
                        student.enrollmentId
                    );


                const existing =
                    grades[
                        String(
                            student.enrollmentId
                        )
                    ] ||
                    null;


                const callCell =
                    createCell(
                        student.callNumber ===
                        null
                            ? "—"
                            : String(
                                student.callNumber
                            )
                    );


                const nameCell =
                    createCell(
                        student.name
                    );


                const registrationCell =
                    createCell(
                        student.registration
                    );


                const gradeCell =
                    document.createElement(
                        "td"
                    );


                const gradeInput =
                    document.createElement(
                        "input"
                    );

                gradeInput.type =
                    "number";

                gradeInput.className =
                    "grade-input";

                gradeInput.min =
                    "0";

                gradeInput.max =
                    String(
                        evaluation.maximumValue
                    );

                gradeInput.step =
                    "0.01";

                gradeInput.inputMode =
                    "decimal";

                gradeInput.value =
                    existing
                        ? String(
                            existing.value
                        )
                        : "";

                gradeInput.setAttribute(
                    "aria-label",
                    `Nota de ${student.name}`
                );

                gradeInput.addEventListener(
                    "input",
                    updateFilledCount
                );

                gradeCell.append(
                    gradeInput
                );


                const observationCell =
                    document.createElement(
                        "td"
                    );


                const observationInput =
                    document.createElement(
                        "input"
                    );

                observationInput.type =
                    "text";

                observationInput.className =
                    "grade-observation";

                observationInput.maxLength =
                    2000;

                observationInput.placeholder =
                    "Opcional";

                observationInput.value =
                    existing
                        ?.observation ||
                    "";

                observationInput.setAttribute(
                    "aria-label",
                    `Observação da nota de ${student.name}`
                );

                observationCell.append(
                    observationInput
                );


                row.append(
                    callCell,
                    nameCell,
                    registrationCell,
                    gradeCell,
                    observationCell
                );


                gradesStudentsBody
                    .append(
                        row
                    );
            }
        }


        updateFilledCount();


        gradesDialog
            .showModal();
    }


    function closeGrades() {

        activeEvaluationId =
            null;


        if (
            gradesDialog.open
        ) {
            gradesDialog.close();
        }
    }


    /*====================================================
                    SALVAR NOTAS
    ====================================================*/

    gradesForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const evaluation =
                findEvaluation(
                    activeEvaluationId
                );


            if (
                !evaluation
            ) {

                PrimeWayFeedback.error(
                    "Avaliação não encontrada."
                );

                return;
            }


            const rows =
                Array.from(
                    gradesStudentsBody
                        .querySelectorAll(
                            "tr[data-enrollment-id]"
                        )
                );


            const grades =
                [];


            for (
                const row of
                rows
            ) {

                const enrollmentId =
                    Number(
                        row.dataset
                            .enrollmentId
                    );


                const gradeInput =
                    row.querySelector(
                        ".grade-input"
                    );


                const observationInput =
                    row.querySelector(
                        ".grade-observation"
                    );


                if (
                    gradeInput.value !==
                    ""
                ) {

                    const value =
                        Number(
                            gradeInput.value
                        );


                    if (
                        !Number.isFinite(
                            value
                        ) ||
                        value < 0 ||
                        value >
                            Number(
                                evaluation.maximumValue
                            )
                    ) {

                        PrimeWayFeedback.error(
                            `As notas devem ficar entre 0 e ${formatNumber(evaluation.maximumValue)}.`
                        );

                        gradeInput.focus();

                        return;
                    }
                }


                grades.push({
                    enrollmentId,
                    value:
                        gradeInput.value ===
                        ""
                            ? null
                            : gradeInput.value,

                    observation:
                        observationInput
                            .value
                            .trim()
                });
            }


            saveGradesButton.disabled =
                true;


            try {

                const response =
                    await fetch(
                        SAVE_GRADES_URL,
                        {
                            method:
                                "POST",

                            credentials:
                                "same-origin",

                            headers: {
                                Accept:
                                    "application/json",

                                "Content-Type":
                                    "application/json",

                                "X-CSRF-Token":
                                    state.csrfToken
                            },

                            body:
                                JSON.stringify({
                                    evaluationId:
                                        evaluation.id,

                                    grades
                                })
                        }
                    );


                const data =
                    await readJson(
                        response
                    );


                if (
                    !response.ok ||
                    !data?.success
                ) {

                    throw new Error(
                        data?.message ||
                        "Não foi possível salvar as notas."
                    );
                }


                PrimeWayFeedback.success(
                    data.message ||
                    "Notas salvas com sucesso."
                );


                closeGrades();


                await loadData();

            } catch (error) {

                console.error(
                    "Erro ao salvar notas:",
                    error
                );


                PrimeWayFeedback.error(
                    error?.message ||
                    "Não foi possível salvar as notas."
                );

            } finally {

                saveGradesButton.disabled =
                    false;
            }
        }
    );


    /*====================================================
                    CARREGAR DADOS
    ====================================================*/

    async function loadData() {

        const response =
            await fetch(
                INDEX_URL,
                {
                    method:
                        "GET",

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
            response.status ===
            401 ||
            response.status ===
            403
        ) {

            clearSession();

            location.replace(
                LOGIN_PAGE
            );

            return false;
        }


        if (
            !response.ok ||
            !data?.success
        ) {

            throw new Error(
                data?.message ||
                "Não foi possível carregar as notas."
            );
        }


        state = {
            professor:
                data.professor ||
                null,

            schoolYear:
                data.schoolYear ||
                null,

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

            evaluations:
                Array.isArray(
                    data.evaluations
                )
                    ? data.evaluations
                    : [],

            studentsByClassSubject:
                data.studentsByClassSubject &&
                typeof data.studentsByClassSubject ===
                    "object"
                    ? data.studentsByClassSubject
                    : {},

            gradesByEvaluation:
                data.gradesByEvaluation &&
                typeof data.gradesByEvaluation ===
                    "object"
                    ? data.gradesByEvaluation
                    : {},

            csrfToken:
                String(
                    data.csrfToken ||
                    ""
                )
        };


        schoolYearValue.textContent =
            state.schoolYear
                ?.year
                ? String(
                    state.schoolYear.year
                )
                : "—";


        newEvaluationButton.disabled =
            state.classSubjects.length ===
                0 ||
            state.periods.length ===
                0;


        fillSelects();
        renderSummary();
        renderEvaluations();


        return true;
    }


    async function initialLoad() {

        try {

            await loadData();

        } catch (error) {

            console.error(
                "Erro ao carregar módulo de notas:",
                error
            );


            evaluationsTableBody.innerHTML =
                '<tr><td colspan="7" class="grades-empty-cell">Não foi possível carregar as avaliações.</td></tr>';


            PrimeWayFeedback.error(
                error?.message ||
                "Não foi possível carregar o módulo de notas."
            );
        }
    }


    /*====================================================
                    LOGOUT
    ====================================================*/

    async function logout() {

        logoutButton.disabled =
            true;


        try {

            let csrfToken =
                state.csrfToken;


            if (
                !csrfToken
            ) {

                const sessionResponse =
                    await fetch(
                        SESSION_URL,
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


                const sessionData =
                    await readJson(
                        sessionResponse
                    );


                csrfToken =
                    String(
                        sessionData
                            ?.csrfToken ||
                        ""
                    );
            }


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
                                csrfToken
                        }
                    }
                );


            const data =
                await readJson(
                    response
                );


            if (
                !response.ok ||
                !data?.success
            ) {

                throw new Error(
                    data?.message ||
                    "Não foi possível encerrar a sessão."
                );
            }


            clearSession();

            location.replace(
                LOGIN_PAGE
            );

        } catch (error) {

            console.error(
                "Erro ao encerrar sessão:",
                error
            );


            PrimeWayFeedback.error(
                error?.message ||
                "Não foi possível encerrar a sessão."
            );


            logoutButton.disabled =
                false;
        }
    }


    /*====================================================
                    EVENTOS
    ====================================================*/

    newEvaluationButton
        ?.addEventListener(
            "click",
            () =>
                openEvaluationDialog()
        );


    closeEvaluationDialog
        ?.addEventListener(
            "click",
            closeEvaluation
        );


    cancelEvaluationButton
        ?.addEventListener(
            "click",
            closeEvaluation
        );


    closeGradesDialog
        ?.addEventListener(
            "click",
            closeGrades
        );


    cancelGradesButton
        ?.addEventListener(
            "click",
            closeGrades
        );


    evaluationSearch
        ?.addEventListener(
            "input",
            renderEvaluations
        );


    classSubjectFilter
        ?.addEventListener(
            "change",
            renderEvaluations
        );


    periodFilter
        ?.addEventListener(
            "change",
            renderEvaluations
        );


    logoutButton
        ?.addEventListener(
            "click",
            logout
        );


    evaluationDialog
        ?.addEventListener(
            "cancel",
            function (event) {

                event.preventDefault();
                closeEvaluation();
            }
        );


    gradesDialog
        ?.addEventListener(
            "cancel",
            function (event) {

                event.preventDefault();
                closeGrades();
            }
        );


    await initialLoad();
});
