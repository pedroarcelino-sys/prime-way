document.addEventListener("DOMContentLoaded", async () => {

    const SESSION_URL =
        "../api/auth/session.php";

    const LOGOUT_URL =
        "../api/auth/logout.php";

    const SUBMISSIONS_URL =
        "../api/professor/atividades/entregas.php";

    const FILE_URL =
        "../api/professor/atividades/arquivo.php";

    const CORRECT_URL =
        "../api/professor/atividades/corrigir.php";

    const LOGIN_PAGE =
        "login.html";


    let csrfToken =
        "";

    let activity =
        null;

    let submissions =
        [];

    let currentSubmission =
        null;

    let operationRunning =
        false;


    const activityContext =
        document.querySelector(
            "#activityContext"
        );

    const activitySubject =
        document.querySelector(
            "#activitySubject"
        );

    const activityTitle =
        document.querySelector(
            "#activityTitle"
        );

    const activityDescription =
        document.querySelector(
            "#activityDescription"
        );

    const activityClass =
        document.querySelector(
            "#activityClass"
        );

    const activityPeriod =
        document.querySelector(
            "#activityPeriod"
        );

    const activityDue =
        document.querySelector(
            "#activityDue"
        );


    const totalStudents =
        document.querySelector(
            "#totalStudents"
        );

    const totalSubmitted =
        document.querySelector(
            "#totalSubmitted"
        );

    const totalPending =
        document.querySelector(
            "#totalPending"
        );

    const totalCorrected =
        document.querySelector(
            "#totalCorrected"
        );


    const submissionSearch =
        document.querySelector(
            "#submissionSearch"
        );

    const submissionStatusFilter =
        document.querySelector(
            "#submissionStatusFilter"
        );

    const submissionsCounter =
        document.querySelector(
            "#submissionsCounter"
        );

    const submissionsList =
        document.querySelector(
            "#submissionsList"
        );


    const correctionModal =
        document.querySelector(
            "#correctionModal"
        );

    const closeCorrectionModalButton =
        document.querySelector(
            "#closeCorrectionModal"
        );

    const cancelCorrectionButton =
        document.querySelector(
            "#cancelCorrectionButton"
        );

    const correctionStudentName =
        document.querySelector(
            "#correctionStudentName"
        );

    const correctionSubmissionInfo =
        document.querySelector(
            "#correctionSubmissionInfo"
        );

    const studentAnswer =
        document.querySelector(
            "#studentAnswer"
        );

    const studentLinkSection =
        document.querySelector(
            "#studentLinkSection"
        );

    const studentLink =
        document.querySelector(
            "#studentLink"
        );

    const studentFiles =
        document.querySelector(
            "#studentFiles"
        );

    const gradeValue =
        document.querySelector(
            "#gradeValue"
        );

    const gradeMaximum =
        document.querySelector(
            "#gradeMaximum"
        );

    const correctionFeedback =
        document.querySelector(
            "#correctionFeedback"
        );

    const publishCorrectionButton =
        document.querySelector(
            "#publishCorrectionButton"
        );

    const logoutButton =
        document.querySelector(
            "#logoutButton"
        );


    const params =
        new URLSearchParams(
            window.location.search
        );

    const activityId =
        Number(
            params.get(
                "atividadeId"
            )
        );


    /*====================================================
                    JSON SEGURO
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


    /*====================================================
                        SESSÃO
    ====================================================*/

    async function validateSession() {

        try {

            const response =
                await fetch(
                    SESSION_URL,
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
                !response.ok ||
                !data?.authenticated ||
                data?.usuario?.perfil !==
                    "professor"
            ) {

                window.location.replace(
                    LOGIN_PAGE
                );

                return false;
            }


            csrfToken =
                data.csrfToken ||
                "";


            return true;

        } catch (
            error
        ) {

            console.error(
                "Erro de sessão:",
                error
            );


            window.location.replace(
                LOGIN_PAGE
            );


            return false;
        }
    }


    /*====================================================
                FORMATAÇÃO DE DATA
    ====================================================*/

    function formatDate(
        value,
        withTime = true
    ) {

        if (!value) {

            return "—";
        }


        const normalized =
            String(value).includes(
                "T"
            )
                ? String(value)
                : String(value)
                    .replace(
                        " ",
                        "T"
                    );


        const date =
            new Date(
                normalized
            );


        if (
            Number.isNaN(
                date.getTime()
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
        ).format(
            date
        );
    }


    /*====================================================
                FORMATAR TAMANHO
    ====================================================*/

    function formatSize(
        bytes
    ) {

        const value =
            Number(
                bytes || 0
            );


        if (
            value < 1024
        ) {

            return `${value} B`;
        }


        if (
            value <
            1024 * 1024
        ) {

            return `${(
                value /
                1024
            ).toFixed(1)} KB`;
        }


        return `${(
            value /
            1024 /
            1024
        ).toFixed(1)} MB`;
    }


    /*====================================================
                        STATUS
    ====================================================*/

    function statusClass(
        status
    ) {

        switch (
            status
        ) {

            case "Rascunho":
                return "draft";


            case "Entregue":
            case "Reenviada":
                return "submitted";


            case "Atrasada":
                return "late";


            case "Corrigida":
                return "corrected";


            default:
                return "pending";
        }
    }


    function statusText(
        status
    ) {

        if (
            status ===
            "Atrasada"
        ) {

            return "Entregue com atraso";
        }


        return status ||
            "Pendente";
    }


    /*====================================================
                    CARREGANDO
    ====================================================*/

    function renderLoading() {

        submissionsList.innerHTML = `
            <div class="loading-state">

                <i
                    class="fa-solid fa-spinner fa-spin"
                ></i>

                <span>
                    Carregando entregas...
                </span>

            </div>
        `;
    }


    /*====================================================
                CARREGAR ENTREGAS
    ====================================================*/

    async function loadSubmissions() {

        renderLoading();


        try {

            const response =
                await fetch(
                    `${SUBMISSIONS_URL}?atividadeId=${encodeURIComponent(activityId)}`,
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
                !response.ok ||
                !data?.success
            ) {

                throw new Error(
                    data?.message ||
                    "Não foi possível carregar as entregas."
                );
            }


            csrfToken =
                data.csrfToken ||
                csrfToken;


            activity =
                data.activity ||
                null;


            submissions =
                Array.isArray(
                    data.submissions
                )
                    ? data.submissions
                    : [];


            renderActivity(
                activity
            );


            renderSummary(
                data.summary ||
                {}
            );


            renderSubmissions();


        } catch (
            error
        ) {

            console.error(
                "Erro ao carregar entregas:",
                error
            );


            submissionsList.innerHTML = `
                <div class="loading-state">

                    <i
                        class="fa-solid fa-triangle-exclamation"
                    ></i>

                    <span>
                        ${
                            error.message ||
                            "Não foi possível carregar as entregas."
                        }
                    </span>

                </div>
            `;


            PrimeWayFeedback.error(
                error.message ||
                "Não foi possível carregar as entregas."
            );
        }
    }


    /*====================================================
                        ATIVIDADE
    ====================================================*/

    function renderActivity(
        item
    ) {

        if (!item) {

            return;
        }


        activityContext.textContent =
            `${item.class?.name || "Turma"} • ${item.subject?.name || "Disciplina"}`;


        activitySubject.textContent =
            item.subject?.name ||
            "Disciplina";


        activityTitle.textContent =
            item.title ||
            "Atividade";


        activityDescription.textContent =
            item.description ||
            "Sem descrição.";


        activityClass.textContent =
            item.class?.name ||
            "—";


        activityPeriod.textContent =
            item.period?.name ||
            "—";


        activityDue.textContent =
            formatDate(
                item.dueAt
            );
    }


    /*====================================================
                        RESUMO
    ====================================================*/

    function renderSummary(
        summary
    ) {

        totalStudents.textContent =
            String(
                summary.students ??
                0
            );


        totalSubmitted.textContent =
            String(
                summary.submitted ??
                0
            );


        totalPending.textContent =
            String(
                summary.pending ??
                0
            );


        totalCorrected.textContent =
            String(
                summary.corrected ??
                0
            );
    }


    /*====================================================
                        FILTROS
    ====================================================*/

    function getFilteredSubmissions() {

        const search =
            submissionSearch.value
                .trim()
                .toLowerCase();


        const status =
            submissionStatusFilter.value;


        return submissions.filter(
            item => {

                const name =
                    String(
                        item.student?.name ||
                        ""
                    )
                        .toLowerCase();


                const registration =
                    String(
                        item.student
                            ?.registration ||
                        ""
                    )
                        .toLowerCase();


                const currentStatus =
                    item.submission
                        ?.status ||
                    "Pendente";


                if (
                    status &&
                    currentStatus !==
                        status
                ) {

                    return false;
                }


                if (
                    search &&
                    !name.includes(
                        search
                    ) &&
                    !registration.includes(
                        search
                    )
                ) {

                    return false;
                }


                return true;
            }
        );
    }


    /*====================================================
                    LISTAR ENTREGAS
    ====================================================*/

    function renderSubmissions() {

        const filtered =
            getFilteredSubmissions();


        submissionsCounter.textContent =
            `${filtered.length} ${
                filtered.length === 1
                    ? "aluno"
                    : "alunos"
            }`;


        submissionsList.replaceChildren();


        if (
            filtered.length ===
            0
        ) {

            submissionsList.innerHTML = `
                <div class="loading-state">

                    <i
                        class="fa-regular fa-folder-open"
                    ></i>

                    <span>
                        Nenhum aluno encontrado.
                    </span>

                </div>
            `;


            return;
        }


        for (
            const item
            of filtered
        ) {

            const student =
                item.student ||
                {};


            const submission =
                item.submission ||
                {};


            const status =
                submission.status ||
                "Pendente";


            const row =
                document.createElement(
                    "article"
                );


            row.className =
                "submission-item";


            /* ALUNO */

            const studentBox =
                document.createElement(
                    "div"
                );


            studentBox.className =
                "submission-student";


            const studentName =
                document.createElement(
                    "strong"
                );


            studentName.textContent =
                student.name ||
                "Aluno";


            const registration =
                document.createElement(
                    "span"
                );


            registration.textContent =
                student.registration
                    ? `Matrícula: ${student.registration}`
                    : "Matrícula não informada";


            studentBox.append(
                studentName,
                registration
            );


            /* STATUS */

            const statusBox =
                document.createElement(
                    "div"
                );


            statusBox.className =
                "submission-info";


            const statusLabel =
                document.createElement(
                    "span"
                );


            statusLabel.textContent =
                "Status";


            const statusBadge =
                document.createElement(
                    "div"
                );


            statusBadge.className =
                `submission-status ${statusClass(status)}`;


            statusBadge.textContent =
                statusText(
                    status
                );


            statusBox.append(
                statusLabel,
                statusBadge
            );


            /* ENVIO */

            const dateBox =
                document.createElement(
                    "div"
                );


            dateBox.className =
                "submission-info";


            const dateLabel =
                document.createElement(
                    "span"
                );


            dateLabel.textContent =
                "Envio";


            const dateValue =
                document.createElement(
                    "strong"
                );


            dateValue.textContent =
                submission.submittedAt
                    ? formatDate(
                        submission.submittedAt
                    )
                    : "Não enviado";


            dateBox.append(
                dateLabel,
                dateValue
            );


            /* BOTÃO */

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "open-submission-button";


            const canOpen =
                submission.id !==
                    null &&
                submission.id !==
                    undefined &&
                [
                    "Entregue",
                    "Atrasada",
                    "Reenviada",
                    "Corrigida"
                ].includes(
                    status
                );


            if (
                canOpen
            ) {

                button.innerHTML = `
                    <i
                        class="fa-regular fa-eye"
                    ></i>

                    ${
                        status ===
                        "Corrigida"
                            ? "Ver correção"
                            : "Corrigir"
                    }
                `;


                button.addEventListener(
                    "click",
                    () => {

                        openCorrection(
                            item
                        );
                    }
                );


            } else {

                button.disabled =
                    true;


                button.innerHTML = `
                    <i
                        class="fa-solid fa-clock"
                    ></i>

                    Aguardando
                `;
            }


            row.append(
                studentBox,
                statusBox,
                dateBox,
                button
            );


            submissionsList.append(
                row
            );
        }
    }


    /*====================================================
                    ABRIR CORREÇÃO
    ====================================================*/

    function openCorrection(
        item
    ) {

        currentSubmission =
            item;


        const student =
            item.student ||
            {};


        const submission =
            item.submission ||
            {};


        const grade =
            item.grade ||
            {};


        correctionStudentName.textContent =
            student.name ||
            "Aluno";


        correctionSubmissionInfo.textContent =
            `${statusText(submission.status)} • ${
                submission.submittedAt
                    ? `Enviada em ${formatDate(submission.submittedAt)}`
                    : "Sem data de envio"
            }`;


        studentAnswer.textContent =
            submission.content
                ?.trim()
                ? submission.content
                : "Nenhuma resposta escrita foi enviada.";


        /* LINK */

        if (
            submission.link &&
            submission.link.trim()
        ) {

            studentLinkSection.classList.remove(
                "hidden"
            );


            studentLink.href =
                submission.link;


            studentLink.textContent =
                submission.link;


        } else {

            studentLinkSection.classList.add(
                "hidden"
            );


            studentLink.removeAttribute(
                "href"
            );
        }


        /* ARQUIVOS */

        renderFiles(
            submission.files ||
            []
        );


        /* NOTA */

        gradeValue.value =
            grade.value !==
                null &&
            grade.value !==
                undefined
                ? String(
                    grade.value
                )
                : "";


        gradeMaximum.value =
            grade.maximum !==
                null &&
            grade.maximum !==
                undefined
                ? String(
                    grade.maximum
                )
                : "10";


        correctionFeedback.value =
            submission.feedback ||
            grade.observation ||
            "";


        correctionModal.classList.remove(
            "hidden"
        );


        correctionModal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.classList.add(
            "modal-open"
        );
    }


    /*====================================================
                ARQUIVOS DO ALUNO
    ====================================================*/

    function renderFiles(
        files
    ) {

        studentFiles.replaceChildren();


        if (
            files.length ===
            0
        ) {

            const empty =
                document.createElement(
                    "div"
                );


            empty.className =
                "empty-state-small";


            empty.textContent =
                "Nenhum arquivo enviado.";


            studentFiles.append(
                empty
            );


            return;
        }


        for (
            const file
            of files
        ) {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "student-file-item";


            const icon =
                document.createElement(
                    "i"
                );


            icon.className =
                file.mimeType ===
                    "application/pdf"
                    ? "fa-regular fa-file-pdf"
                    : file.mimeType
                        ?.startsWith(
                            "image/"
                        )
                        ? "fa-regular fa-file-image"
                        : "fa-regular fa-file";


            const info =
                document.createElement(
                    "div"
                );


            info.className =
                "student-file-info";


            const name =
                document.createElement(
                    "strong"
                );


            name.textContent =
                file.name;


            const size =
                document.createElement(
                    "span"
                );


            size.textContent =
                formatSize(
                    file.sizeBytes
                );


            info.append(
                name,
                size
            );


            const open =
                document.createElement(
                    "a"
                );


            open.className =
                "student-file-open";


            open.target =
                "_blank";


            open.rel =
                "noopener noreferrer";


            open.href =
                `${FILE_URL}?id=${encodeURIComponent(file.id)}`;


            open.innerHTML = `
                <i
                    class="fa-regular fa-eye"
                ></i>

                Visualizar
            `;


            item.append(
                icon,
                info,
                open
            );


            studentFiles.append(
                item
            );
        }
    }


    /*====================================================
                    FECHAR CORREÇÃO
    ====================================================*/

    function closeCorrection() {

        if (
            operationRunning
        ) {

            return;
        }


        correctionModal.classList.add(
            "hidden"
        );


        correctionModal.setAttribute(
            "aria-hidden",
            "true"
        );


        document.body.classList.remove(
            "modal-open"
        );


        currentSubmission =
            null;
    }


    /*====================================================
                PUBLICAR CORREÇÃO
    ====================================================*/

    async function publishCorrection() {

        if (
            !currentSubmission ||
            operationRunning
        ) {

            return;
        }


        const submission =
            currentSubmission.submission;


        const value =
            Number(
                gradeValue.value
            );


        const maximum =
            Number(
                gradeMaximum.value
            );


        if (
            gradeValue.value.trim() ===
                "" ||
            !Number.isFinite(
                value
            )
        ) {

            PrimeWayFeedback.warning(
                "Informe a nota do aluno."
            );


            gradeValue.focus();


            return;
        }


        if (
            !Number.isFinite(
                maximum
            ) ||
            maximum <= 0
        ) {

            PrimeWayFeedback.warning(
                "Informe um valor máximo válido."
            );


            gradeMaximum.focus();


            return;
        }


        if (
            value < 0 ||
            value > maximum
        ) {

            PrimeWayFeedback.warning(
                `A nota deve estar entre 0 e ${maximum}.`
            );


            gradeValue.focus();


            return;
        }


        const confirmed =
            await PrimeWayConfirm.info(
                `Publicar a correção de ${
                    currentSubmission
                        .student
                        ?.name ||
                    "este aluno"
                } com a nota ${value} de ${maximum}?`,
                {
                    title:
                        "Publicar correção?",

                    confirmText:
                        "Publicar correção",

                    cancelText:
                        "Cancelar"
                }
            );


        if (!confirmed) {

            return;
        }


        operationRunning =
            true;


        publishCorrectionButton.disabled =
            true;


        const originalButton =
            publishCorrectionButton.innerHTML;


        publishCorrectionButton.innerHTML = `
            <i
                class="fa-solid fa-spinner fa-spin"
            ></i>

            Publicando...
        `;


        try {

            const response =
                await fetch(
                    CORRECT_URL,
                    {
                        method:
                            "POST",

                        credentials:
                            "same-origin",

                        cache:
                            "no-store",

                        headers: {
                            Accept:
                                "application/json",

                            "Content-Type":
                                "application/json",

                            "X-CSRF-Token":
                                csrfToken
                        },

                        body:
                            JSON.stringify(
                                {
                                    activityId:
                                        activity.id,

                                    submissionId:
                                        submission.id,

                                    grade:
                                        value,

                                    maximum:
                                        maximum,

                                    feedback:
                                        correctionFeedback
                                            .value
                                            .trim()
                                }
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
                    "Não foi possível publicar a correção."
                );
            }


            PrimeWayFeedback.success(
                data.message ||
                "Correção publicada com sucesso."
            );


            operationRunning =
                false;


            closeCorrection();


            await loadSubmissions();


        } catch (
            error
        ) {

            console.error(
                "Erro ao corrigir atividade:",
                error
            );


            PrimeWayFeedback.error(
                error.message ||
                "Não foi possível publicar a correção."
            );


        } finally {

            operationRunning =
                false;


            publishCorrectionButton.disabled =
                false;


            publishCorrectionButton.innerHTML =
                originalButton;
        }
    }


    /*====================================================
                        LOGOUT
    ====================================================*/

    async function logout() {

        logoutButton.disabled =
            true;


        try {

            const response =
                await fetch(
                    LOGOUT_URL,
                    {
                        method:
                            "POST",

                        credentials:
                            "same-origin",

                        cache:
                            "no-store",

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
                    "Não foi possível sair."
                );
            }


            sessionStorage.clear();


            window.location.replace(
                LOGIN_PAGE
            );


        } catch (
            error
        ) {

            console.error(
                "Erro ao sair:",
                error
            );


            PrimeWayFeedback.error(
                error.message ||
                "Não foi possível sair."
            );


            logoutButton.disabled =
                false;
        }
    }


    /*====================================================
                        EVENTOS
    ====================================================*/

    submissionSearch.addEventListener(
        "input",
        renderSubmissions
    );


    submissionStatusFilter.addEventListener(
        "change",
        renderSubmissions
    );


    closeCorrectionModalButton.addEventListener(
        "click",
        closeCorrection
    );


    cancelCorrectionButton.addEventListener(
        "click",
        closeCorrection
    );


    correctionModal.addEventListener(
        "click",
        event => {

            if (
                event.target.matches(
                    "[data-close-correction]"
                )
            ) {

                closeCorrection();
            }
        }
    );


    publishCorrectionButton.addEventListener(
        "click",
        publishCorrection
    );


    logoutButton.addEventListener(
        "click",
        logout
    );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                    "Escape" &&
                !document.querySelector(
                    ".primeway-confirm.show"
                ) &&
                !correctionModal
                    .classList
                    .contains(
                        "hidden"
                    )
            ) {

                closeCorrection();
            }
        }
    );


    /*====================================================
                    INICIALIZAÇÃO
    ====================================================*/

    if (
        !Number.isInteger(
            activityId
        ) ||
        activityId <= 0
    ) {

        submissionsList.innerHTML = `
            <div class="loading-state">

                <i
                    class="fa-solid fa-triangle-exclamation"
                ></i>

                <span>
                    Atividade inválida.
                </span>

            </div>
        `;


        PrimeWayFeedback.error(
            "Atividade inválida."
        );


        return;
    }


    const validSession =
        await validateSession();


    if (!validSession) {

        return;
    }


    await loadSubmissions();
});