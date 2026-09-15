document.addEventListener(
    "DOMContentLoaded",
    async function () {

        /*====================================================
                            APIs
        ====================================================*/

        const SESSION_URL =
            "../api/auth/session.php";

        const LOGOUT_URL =
            "../api/auth/logout.php";

        const ACTIVITIES_URL =
            "../api/aluno/atividades/index.php";

        const VIEW_ACTIVITY_URL =
            "../api/aluno/atividades/visualizar.php";

        const SAVE_DRAFT_URL =
            "../api/aluno/atividades/salvar-rascunho.php";

        const SUBMIT_URL =
            "../api/aluno/atividades/enviar.php";

        const WITHDRAW_URL =
            "../api/aluno/atividades/retirar.php";

        const COMMENT_URL =
            "../api/aluno/atividades/comentar.php";

        const UPLOAD_URL =
            "../api/aluno/atividades/upload.php";

        const REMOVE_FILE_URL =
            "../api/aluno/atividades/remover-arquivo.php";

        const FILE_URL =
            "../api/aluno/atividades/arquivo.php";


        const LOGIN_PAGE =
            "login.html";


        /*====================================================
                            ESTADO
        ====================================================*/

        let csrfToken =
            "";

        let activities =
            [];

        let currentActivity =
            null;

        let currentFilter =
            "all";

        let searchTerm =
            "";

        let operationRunning =
            false;


        /*====================================================
                            ELEMENTOS
        ====================================================*/

        const activitiesList =
            document.querySelector(
                "#activitiesList"
            );

        const activitySearch =
            document.querySelector(
                "#activitySearch"
            );

        const filters =
            document.querySelector(
                "#activityFilters"
            );

        const resultsCount =
            document.querySelector(
                "#resultsCount"
            );


        const modal =
            document.querySelector(
                "#activityModal"
            );

        const closeModalButton =
            document.querySelector(
                "#closeActivityModal"
            );


        const answerInput =
            document.querySelector(
                "#activityAnswer"
            );

        const linkInput =
            document.querySelector(
                "#activityLink"
            );

        const fileInput =
            document.querySelector(
                "#activityFileInput"
            );

        const uploadLabel =
            document.querySelector(
                "#uploadLabel"
            );


        const saveDraftButton =
            document.querySelector(
                "#saveDraftButton"
            );

        const submitButton =
            document.querySelector(
                "#submitActivityButton"
            );

        const withdrawButton =
            document.querySelector(
                "#withdrawButton"
            );


        const commentInput =
            document.querySelector(
                "#commentInput"
            );

        const commentButton =
            document.querySelector(
                "#sendCommentButton"
            );


        const logoutButton =
            document.querySelector(
                "#logoutButton"
            );

/*====================================================
                FEEDBACK / CONFIRMAÇÃO
====================================================*/

const activityFeedback =
    document.querySelector(
        "#activityFeedback"
    );


const confirmationModal =
    document.querySelector(
        "#confirmationModal"
    );


const confirmationOverlay =
    document.querySelector(
        "#confirmationOverlay"
    );


const confirmationTitle =
    document.querySelector(
        "#confirmationTitle"
    );


const confirmationMessage =
    document.querySelector(
        "#confirmationMessage"
    );


const confirmationConfirm =
    document.querySelector(
        "#confirmationConfirm"
    );


const confirmationCancel =
    document.querySelector(
        "#confirmationCancel"
    );


let feedbackTimer =
    null;


let confirmationResolver =
    null;
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
                FEEDBACK PRIMEWAY
====================================================*/

function showFeedback(
    message,
    type = "success"
) {

    if (!activityFeedback) {

        return;
    }


    if (feedbackTimer) {

        clearTimeout(
            feedbackTimer
        );
    }


    activityFeedback.replaceChildren();


    const icon =
        document.createElement(
            "i"
        );


    icon.className =
        type === "success"
            ? "fa-solid fa-circle-check"
            : type === "error"
                ? "fa-solid fa-circle-exclamation"
                : "fa-solid fa-circle-info";


    const text =
        document.createElement(
            "span"
        );


    text.textContent =
        String(message);


    activityFeedback.append(
        icon,
        text
    );


    activityFeedback.className =
        `activity-feedback show ${type}`;


    feedbackTimer =
        setTimeout(
            function () {

                activityFeedback.className =
                    "activity-feedback";

                activityFeedback.replaceChildren();

            },
            4000
        );
}


/*====================================================
                CONFIRMAÇÃO PRIMEWAY
====================================================*/

function askConfirmation(
    message,
    options = {}
) {

    if (
        confirmationResolver
    ) {

        confirmationResolver(
            false
        );
    }


    confirmationTitle.textContent =
        options.title ||
        "Confirmar ação";


    confirmationMessage.textContent =
        message;


    confirmationConfirm.replaceChildren();


    const icon =
        document.createElement(
            "i"
        );


    icon.className =
        `fa-solid ${
            options.icon ||
            "fa-check"
        }`;


    confirmationConfirm.append(
        icon,
        document.createTextNode(
            options.confirmText ||
            "Confirmar"
        )
    );


    confirmationModal.classList.remove(
        "hidden"
    );


    confirmationModal.setAttribute(
        "aria-hidden",
        "false"
    );


    return new Promise(
        function (resolve) {

            confirmationResolver =
                resolve;
        }
    );
}


function closeConfirmation(
    result
) {

    confirmationModal.classList.add(
        "hidden"
    );


    confirmationModal.setAttribute(
        "aria-hidden",
        "true"
    );


    if (
        confirmationResolver
    ) {

        const resolver =
            confirmationResolver;


        confirmationResolver =
            null;


        resolver(
            result
        );
    }
}


confirmationConfirm.addEventListener(
    "click",
    function () {

        closeConfirmation(
            true
        );
    }
);


confirmationCancel.addEventListener(
    "click",
    function () {

        closeConfirmation(
            false
        );
    }
);


confirmationOverlay.addEventListener(
    "click",
    function () {

        closeConfirmation(
            false
        );
    }
);

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
                        "aluno"
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

            } catch {

                window.location.replace(
                    LOGIN_PAGE
                );

                return false;
            }

        }


        /*====================================================
                        FORMATAÇÕES
        ====================================================*/

        function formatDate(
            value,
            withTime = false
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
                    normalized.length ===
                    10
                        ? `${normalized}T12:00:00`
                        : normalized
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


        function escapeLower(
            value
        ) {

            return String(
                value || ""
            )
                .normalize(
                    "NFD"
                )
                .replace(
                    /[\u0300-\u036f]/g,
                    ""
                )
                .toLowerCase();
        }


        /*====================================================
                    STATUS / CATEGORIA
        ====================================================*/

        function statusCategory(
            status
        ) {

            switch (status) {

                case "Corrigida":
                    return "corrected";


                case "Entregue com atraso":
                    return "late";


                case "Entregue":
                case "Reenviada":
                    return "submitted";


                case "Rascunho":
                    return "draft";


                default:
                    return "pending";
            }

        }


        /*====================================================
                            SET TEXTO
        ====================================================*/

        function setText(
            selector,
            value
        ) {

            const element =
                document.querySelector(
                    selector
                );


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


        /*====================================================
                    ELEMENTO TEXTO
        ====================================================*/

        function textElement(
            tag,
            className,
            text
        ) {

            const element =
                document.createElement(
                    tag
                );


            if (className) {

                element.className =
                    className;
            }


            element.textContent =
                text;


            return element;
        }


        /*====================================================
                        LISTAR ATIVIDADES
        ====================================================*/

        async function loadActivities() {

            activitiesList.innerHTML =
                `
                    <div class="loading-state">
                        <i class="fa-solid fa-spinner fa-spin"></i>
                        <span>Carregando atividades...</span>
                    </div>
                `;


            try {

                const response =
                    await fetch(
                        ACTIVITIES_URL,
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
                    401
                ) {

                    window.location.replace(
                        LOGIN_PAGE
                    );

                    return;
                }


                if (
                    !response.ok ||
                    !data?.success
                ) {

                    throw new Error(
                        data?.message ||
                        "Erro ao carregar atividades."
                    );
                }


                csrfToken =
                    data.csrfToken ||
                    csrfToken;


                activities =
                    Array.isArray(
                        data.activities
                    )
                        ? data.activities
                        : [];


                const summary =
                    data.summary ||
                    {};


                setText(
                    "#totalActivities",
                    summary.total ?? 0
                );


                setText(
                    "#pendingActivities",
                    summary.pending ?? 0
                );


                setText(
                    "#submittedActivities",
                    summary.submitted ?? 0
                );


                setText(
                    "#correctedActivities",
                    summary.corrected ?? 0
                );


                if (
                    data.enrollment
                ) {

                    setText(
                        "#studentContext",
                        `${data.enrollment.className} • ${data.enrollment.series} • ${data.enrollment.shift}`
                    );
                }


                renderActivities();


            } catch (error) {

                console.error(
                    error
                );


                activitiesList.innerHTML =
                    `
                        <div class="empty-state">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                            <strong>Não foi possível carregar as atividades.</strong>
                            <span>Tente atualizar a página.</span>
                        </div>
                    `;
            }

        }


        /*====================================================
                        FILTRO
        ====================================================*/

        function activityMatchesFilter(
            activity
        ) {

            const status =
                activity
                    ?.submission
                    ?.status ||
                "Não iniciada";


            const category =
                statusCategory(
                    status
                );


            if (
                currentFilter !==
                "all" &&
                category !==
                currentFilter
            ) {

                return false;
            }


            if (
                searchTerm ===
                ""
            ) {

                return true;
            }


            const searchable =
                escapeLower(
                    [
                        activity.title,
                        activity.subject?.name,
                        activity.teacher?.name,
                        activity.period?.name
                    ].join(
                        " "
                    )
                );


            return searchable.includes(
                searchTerm
            );
        }


        /*====================================================
                        RENDER LISTA
        ====================================================*/

        function renderActivities() {

            const filtered =
                activities.filter(
                    activityMatchesFilter
                );


            activitiesList.replaceChildren();


            resultsCount.textContent =
                `${filtered.length} ${
                    filtered.length === 1
                        ? "atividade"
                        : "atividades"
                }`;


            if (
                filtered.length ===
                0
            ) {

                const empty =
                    document.createElement(
                        "div"
                    );


                empty.className =
                    "empty-state";


                empty.innerHTML =
                    `
                        <i class="fa-regular fa-folder-open"></i>
                        <strong>Nenhuma atividade encontrada.</strong>
                        <span>Altere os filtros ou aguarde novas publicações.</span>
                    `;


                activitiesList.append(
                    empty
                );


                return;
            }


            for (
                const activity
                of filtered
            ) {

                const row =
                    document.createElement(
                        "article"
                    );


                row.className =
                    "activity-row";


                /* PRINCIPAL */

                const primary =
                    document.createElement(
                        "div"
                    );


                primary.className =
                    "activity-primary";


                primary.append(
                    textElement(
                        "span",
                        "activity-subject-name",
                        activity.subject?.name ||
                        "Disciplina"
                    ),

                    textElement(
                        "h3",
                        "",
                        activity.title
                    ),

                    textElement(
                        "p",
                        "",
                        activity.description ||
                        "Sem descrição."
                    )
                );


                /* PROFESSOR */

                const teacher =
                    document.createElement(
                        "div"
                    );


                teacher.className =
                    "activity-column teacher-column";


                teacher.append(
                    textElement(
                        "span",
                        "",
                        "Professor"
                    ),

                    textElement(
                        "strong",
                        "",
                        activity.teacher?.name ||
                        "—"
                    )
                );


                /* PERÍODO */

                const period =
                    document.createElement(
                        "div"
                    );


                period.className =
                    "activity-column period-column";


                period.append(
                    textElement(
                        "span",
                        "",
                        "Período"
                    ),

                    textElement(
                        "strong",
                        "",
                        activity.period?.name ||
                        "—"
                    )
                );


                /* PRAZO */

                const due =
                    document.createElement(
                        "div"
                    );


                due.className =
                    "activity-column";


                due.append(
                    textElement(
                        "span",
                        "",
                        "Prazo"
                    ),

                    textElement(
                        "strong",
                        "",
                        formatDate(
                            activity.dueAt,
                            true
                        )
                    )
                );


                /* STATUS */

                const status =
                    activity.submission?.status ||
                    "Não iniciada";


                const statusElement =
                    textElement(
                        "span",
                        `activity-status-pill ${statusCategory(status)}`,
                        status
                    );


                /* BOTÃO */

                const button =
                    document.createElement(
                        "button"
                    );


                button.type =
                    "button";


                button.className =
                    "activity-open-button";


                button.innerHTML =
                    `
                        <i class="fa-regular fa-eye"></i>
                        Abrir
                    `;


                button.addEventListener(
                    "click",
                    function () {

                        openActivity(
                            activity.id
                        );
                    }
                );


                row.append(
                    primary,
                    teacher,
                    period,
                    due,
                    statusElement,
                    button
                );


                activitiesList.append(
                    row
                );
            }

        }


        /*====================================================
                    ABRIR ATIVIDADE
        ====================================================*/

        async function openActivity(
            activityId
        ) {

            if (
                operationRunning
            ) {

                return;
            }


            operationRunning =
                true;


            try {

                const response =
                    await fetch(
                        `${VIEW_ACTIVITY_URL}?id=${encodeURIComponent(activityId)}`,
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

                    showFeedback(
                        data?.message ||
                        "Não foi possível abrir a atividade.",
                        "error"
                    );

                    return;
                }


                csrfToken =
                    data.csrfToken ||
                    csrfToken;


                currentActivity =
                    data;


                renderModal(
                    data
                );


                modal.classList.remove(
                    "hidden"
                );


                document.body.classList.add(
                    "modal-open"
                );


            } finally {

                operationRunning =
                    false;
            }

        }


        /*====================================================
                    RENDER MODAL
        ====================================================*/

        function renderModal(
            data
        ) {

            const activity =
                data.activity;


            const submission =
                data.submission ||
                {};


            const permissions =
                data.permissions ||
                {};


            const grade =
                data.grade ||
                {};


            setText(
                "#modalActivityStatus",
                submission.status ||
                "Não iniciada"
            );


            setText(
                "#modalActivitySubject",
                activity.subject?.name
            );


            setText(
                "#modalActivityTitle",
                activity.title
            );


            setText(
                "#modalActivityTeacher",
                `Professor(a): ${
                    activity.teacher?.name ||
                    "—"
                }`
            );


            setText(
                "#modalPeriod",
                activity.period?.name
            );


            setText(
                "#modalPublishedAt",
                formatDate(
                    activity.publishedAt,
                    true
                )
            );


            setText(
                "#modalDueAt",
                formatDate(
                    activity.dueAt,
                    true
                )
            );


            setText(
                "#modalSubmissionType",
                activity.submissionType
            );


            setText(
                "#modalDescription",
                activity.description ||
                "Nenhuma descrição informada."
            );


            const instructionsBox =
                document.querySelector(
                    "#instructionsBox"
                );


            if (
                activity.instructions
            ) {

                instructionsBox.classList.remove(
                    "hidden"
                );


                setText(
                    "#modalInstructions",
                    activity.instructions
                );

            } else {

                instructionsBox.classList.add(
                    "hidden"
                );
            }


            setText(
                "#submissionStatus",
                submission.status ||
                "Não iniciada"
            );


            answerInput.value =
                submission.content ||
                "";


            linkInput.value =
                submission.link ||
                "";


            configureSubmissionType(
                activity.submissionType
            );


            renderTeacherFiles(
                activity.attachments ||
                []
            );


            renderSubmissionFiles(
                submission.files ||
                []
            );


            renderComments(
                data.comments ||
                []
            );


            renderHistory(
                submission.versionHistory ||
                []
            );


            renderCorrection(
                data
            );


            configurePermissions(
                permissions,
                activity,
                submission
            );


            setText(
                "#fileLimitText",
                `Máximo de ${activity.maxFiles} arquivo(s) • ${activity.maxFileSizeMb} MB cada`
            );


            const message =
                document.querySelector(
                    "#submissionMessage"
                );


            if (
                activity.deadlinePassed
            ) {

                message.classList.remove(
                    "hidden"
                );


                message.textContent =
                    activity.allowsLateSubmission
                        ? "O prazo terminou, mas o professor permite entregas atrasadas."
                        : "O prazo desta atividade foi encerrado.";

            } else {

                message.classList.add(
                    "hidden"
                );
            }

        }


        /*====================================================
                    TIPO DE ENTREGA
        ====================================================*/

        function configureSubmissionType(
            type
        ) {

            const textGroup =
                document.querySelector(
                    "#textAnswerGroup"
                );


            const linkGroup =
                document.querySelector(
                    "#linkAnswerGroup"
                );


            textGroup.classList.remove(
                "hidden"
            );


            linkGroup.classList.add(
                "hidden"
            );


            switch (
                type
            ) {

                case "Arquivo":

                    textGroup.classList.add(
                        "hidden"
                    );

                    break;


                case "Link":

                    textGroup.classList.add(
                        "hidden"
                    );

                    linkGroup.classList.remove(
                        "hidden"
                    );

                    break;


                case "Livre":

                    linkGroup.classList.remove(
                        "hidden"
                    );

                    break;
            }

        }


        /*====================================================
                        ARQUIVOS
        ====================================================*/

        function createFileItem(
            file,
            type,
            removable = false
        ) {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "file-item";


            const icon =
                document.createElement(
                    "i"
                );


            icon.className =
                "fa-regular fa-file";


            const info =
                document.createElement(
                    "div"
                );


            info.className =
                "file-info";


            info.append(
                textElement(
                    "strong",
                    "",
                    file.name
                ),

                textElement(
                    "span",
                    "",
                    formatSize(
                        file.sizeBytes
                    )
                )
            );


            const open =
                document.createElement(
                    "a"
                );


            open.className =
                "file-action";


            open.target =
                "_blank";


            open.rel =
                "noopener noreferrer";


            open.href =
                `${FILE_URL}?type=${encodeURIComponent(type)}&id=${encodeURIComponent(file.id)}`;


            open.innerHTML = `
                <i class="fa-regular fa-eye"></i>
                Visualizar
            `;


            item.append(
                icon,
                info,
                open
            );


            if (
                removable
            ) {

                const remove =
                    document.createElement(
                        "button"
                    );


                remove.type =
                    "button";


                remove.className =
                    "file-action file-remove";


                remove.textContent =
                    "Remover";


                remove.addEventListener(
                    "click",
                    function () {

                        removeFile(
                            file.id
                        );
                    }
                );


                item.append(
                    remove
                );
            }


            return item;
        }


        function renderTeacherFiles(
            files
        ) {

            const container =
                document.querySelector(
                    "#teacherFiles"
                );


            container.replaceChildren();


            if (
                files.length ===
                0
            ) {

                container.append(
                    textElement(
                        "div",
                        "small-empty",
                        "Nenhum material anexado."
                    )
                );

                return;
            }


            for (
                const file
                of files
            ) {

                container.append(
                    createFileItem(
                        file,
                        "activity",
                        false
                    )
                );
            }

        }


        function renderSubmissionFiles(
            files
        ) {

            const container =
                document.querySelector(
                    "#submissionFiles"
                );


            container.replaceChildren();


            if (
                files.length ===
                0
            ) {

                container.append(
                    textElement(
                        "div",
                        "small-empty",
                        "Nenhum arquivo adicionado."
                    )
                );

                return;
            }


            const canRemove =
                Boolean(
                    currentActivity
                        ?.permissions
                        ?.canSaveDraft
                );


            for (
                const file
                of files
            ) {

                container.append(
                    createFileItem(
                        file,
                        "submission",
                        canRemove
                    )
                );
            }

        }


        /*====================================================
                        COMENTÁRIOS
        ====================================================*/

        function renderComments(
            comments
        ) {

            const container =
                document.querySelector(
                    "#activityComments"
                );


            container.replaceChildren();


            if (
                comments.length ===
                0
            ) {

                container.append(
                    textElement(
                        "div",
                        "small-empty",
                        "Nenhum comentário nesta atividade."
                    )
                );

                return;
            }


            for (
                const comment
                of comments
            ) {

                const item =
                    document.createElement(
                        "article"
                    );


                item.className =
                    `comment-item ${
                        comment.author?.role ===
                        "professor"
                            ? "teacher"
                            : ""
                    }`;


                const avatar =
                    textElement(
                        "div",
                        "comment-avatar",
                        String(
                            comment.author?.name ||
                            "?"
                        )
                            .trim()
                            .slice(
                                0,
                                1
                            )
                            .toUpperCase()
                    );


                const content =
                    document.createElement(
                        "div"
                    );


                content.className =
                    "comment-content";


                const meta =
                    document.createElement(
                        "div"
                    );


                meta.className =
                    "comment-meta";


                meta.append(
                    textElement(
                        "strong",
                        "",
                        comment.author?.name ||
                        "Usuário"
                    ),

                    textElement(
                        "span",
                        "",
                        formatDate(
                            comment.createdAt,
                            true
                        )
                    )
                );


                content.append(
                    meta,

                    textElement(
                        "p",
                        "",
                        comment.text
                    )
                );


                item.append(
                    avatar,
                    content
                );


                container.append(
                    item
                );
            }

        }


        /*====================================================
                        HISTÓRICO
        ====================================================*/

        function renderHistory(
            versions
        ) {

            const container =
                document.querySelector(
                    "#versionHistory"
                );


            container.replaceChildren();


            if (
                versions.length ===
                0
            ) {

                container.append(
                    textElement(
                        "div",
                        "small-empty",
                        "Nenhum envio realizado."
                    )
                );

                return;
            }


            for (
                const version
                of versions
            ) {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "version-item";


                item.append(
                    textElement(
                        "strong",
                        "",
                        `Versão ${version.number} • ${version.status}`
                    ),

                    textElement(
                        "span",
                        "",
                        version.submittedAt
                            ? `Enviada em ${formatDate(version.submittedAt, true)}`
                            : `Salva em ${formatDate(version.savedAt, true)}`
                    )
                );


                container.append(
                    item
                );
            }

        }


        /*====================================================
                        CORREÇÃO / NOTA
        ====================================================*/

        function renderCorrection(
            data
        ) {

            const grade =
                data.grade ||
                {};


            const correction =
                data.correction ||
                {};


            const card =
                document.querySelector(
                    "#correctionCard"
                );


            if (
                grade.published &&
                grade.value !== null
            ) {

                const value =
                    Number(
                        grade.value
                    );


                const maximum =
                    Number(
                        grade.maximum
                    );


                setText(
                    "#activityGrade",
                    `${value.toLocaleString("pt-BR")} / ${maximum.toLocaleString("pt-BR")}`
                );


                setText(
                    "#activityGradeInfo",
                    grade.normalized !== null
                        ? `Nota equivalente: ${Number(grade.normalized).toLocaleString("pt-BR")} / 10`
                        : "Correção publicada"
                );

            } else {

                setText(
                    "#activityGrade",
                    "—"
                );


                setText(
                    "#activityGradeInfo",
                    "Aguardando correção"
                );
            }


            if (
                correction.published
            ) {

                card.classList.remove(
                    "hidden"
                );


                setText(
                    "#correctionFeedback",
                    correction.feedback ||
                    "Sem observações do professor."
                );


                const files =
                    document.querySelector(
                        "#correctionFiles"
                    );


                files.replaceChildren();


                if (
                    !correction.files?.length
                ) {

                    files.append(
                        textElement(
                            "div",
                            "small-empty",
                            "Nenhum arquivo de correção."
                        )
                    );

                } else {

                    for (
                        const file
                        of correction.files
                    ) {

                        files.append(
                            createFileItem(
                                file,
                                "correction",
                                false
                            )
                        );
                    }
                }

            } else {

                card.classList.add(
                    "hidden"
                );
            }

        }


        /*====================================================
                        PERMISSÕES
        ====================================================*/

        function configurePermissions(
            permissions,
            activity,
            submission
        ) {

            answerInput.disabled =
                !permissions.canSaveDraft;


            linkInput.disabled =
                !permissions.canSaveDraft;


            saveDraftButton.classList.toggle(
                "hidden",
                !permissions.canSaveDraft
            );


            submitButton.classList.toggle(
                "hidden",
                !permissions.canSubmit
            );


            withdrawButton.classList.toggle(
                "hidden",
                !permissions.canWithdraw
            );


            uploadLabel.classList.toggle(
                "disabled",
                !permissions.canSaveDraft
            );


            commentInput.disabled =
                !permissions.canComment;


            commentButton.disabled =
                !permissions.canComment;


            document
                .querySelector(
                    "#commentForm"
                )
                .classList.toggle(
                    "hidden",
                    !permissions.canComment
                );


            if (
                activity.deadlinePassed &&
                !activity.allowsLateSubmission
            ) {

                answerInput.disabled =
                    true;

                linkInput.disabled =
                    true;
            }

        }


        /*====================================================
                        POST JSON
        ====================================================*/

        async function postJson(
            url,
            payload
        ) {

            const response =
                await fetch(
                    url,
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
                                payload
                            )
                    }
                );


            const data =
                await readJson(
                    response
                );


            return {
                response,
                data
            };
        }


        /*====================================================
                    SALVAR RASCUNHO
        ====================================================*/

        async function saveDraft() {

            if (
                !currentActivity ||
                operationRunning
            ) {

                return;
            }


            operationRunning =
                true;


            try {

                const {
                    response,
                    data
                } =
                    await postJson(
                        SAVE_DRAFT_URL,
                        {
                            activityId:
                                currentActivity
                                    .activity
                                    .id,

                            content:
                                answerInput.value,

                            link:
                                linkInput.value
                        }
                    );


                if (
                    !response.ok ||
                    !data?.success
                ) {

                    showFeedback(
                        data?.message ||
                        "Não foi possível salvar o rascunho.",
                        "error"
                    );

                    return;
                }


                showFeedback(
                    "Rascunho salvo com sucesso.",
                    "success"
                );


                await refreshCurrentActivity();


            } finally {

                operationRunning =
                    false;
            }

        }


        /*====================================================
                        ENVIAR
        ====================================================*/

        async function submitActivity() {

            if (
                !currentActivity ||
                operationRunning
            ) {

                return;
            }


     const confirmed =
    await askConfirmation(
        "Ao enviar, o professor poderá visualizar sua resposta e os arquivos anexados.",
        {
            title:
                "Enviar atividade?",

            confirmText:
                "Enviar atividade",

            icon:
                "fa-paper-plane"
        }
    );


if (!confirmed) {

    return;
}


            operationRunning =
                true;


            try {

                const {
                    response,
                    data
                } =
                    await postJson(
                        SUBMIT_URL,
                        {
                            activityId:
                                currentActivity
                                    .activity
                                    .id,

                            content:
                                answerInput.value,

                            link:
                                linkInput.value
                        }
                    );


                if (
                    !response.ok ||
                    !data?.success
                ) {

                   showFeedback(
    data?.message ||
    "Não foi possível enviar a atividade.",
    "error"
);

                    return;
                }

showFeedback(
    data.message ||
    "Atividade enviada com sucesso.",
    "success"
);


                await loadActivities();

                await refreshCurrentActivity();


            } finally {

                operationRunning =
                    false;
            }

        }


        /*====================================================
                        RETIRAR
        ====================================================*/

        async function withdrawActivity() {

            if (
                !currentActivity ||
                operationRunning
            ) {

                return;
            }


            const confirmed =
                await askConfirmation(
                    "Você precisará enviar a atividade novamente para que ela seja considerada entregue.",
                    {
                        title:
                            "Retirar entrega?",

                        confirmText:
                            "Retirar entrega",

                        icon:
                            "fa-rotate-left"
                    }
                );


            if (!confirmed) {

                return;
            }


            operationRunning =
                true;


            try {

                const {
                    response,
                    data
                } =
                    await postJson(
                        WITHDRAW_URL,
                        {
                            activityId:
                                currentActivity
                                    .activity
                                    .id
                        }
                    );


                if (
                    !response.ok ||
                    !data?.success
                ) {

                    showFeedback(
                        data?.message ||
                        "Não foi possível retirar a entrega.",
                        "error"
                    );

                    return;
                }


                showFeedback(
                    data.message ||
                    "Entrega retirada com sucesso.",
                    "success"
                );


                await loadActivities();

                await refreshCurrentActivity();


            } finally {

                operationRunning =
                    false;
            }

        }


        /*====================================================
                        COMENTAR
        ====================================================*/

        async function sendComment() {

            if (
                !currentActivity ||
                operationRunning
            ) {

                return;
            }


            const comment =
                commentInput.value.trim();


            if (!comment) {

                return;
            }


            operationRunning =
                true;


            try {

                const {
                    response,
                    data
                } =
                    await postJson(
                        COMMENT_URL,
                        {
                            activityId:
                                currentActivity
                                    .activity
                                    .id,

                            comment
                        }
                    );


                if (
                    !response.ok ||
                    !data?.success
                ) {

                    showFeedback(
                        data?.message ||
                        "Não foi possível enviar o comentário.",
                        "error"
                    );

                    return;
                }


                commentInput.value =
                    "";


                showFeedback(
                    "Comentário enviado com sucesso.",
                    "success"
                );


                await refreshCurrentActivity();


            } finally {

                operationRunning =
                    false;
            }

        }



        /*====================================================
                ENVIAR UM ARQUIVO
====================================================*/

async function uploadSingleFile(
    file
) {

    const formData =
        new FormData();


    formData.append(
        "activityId",
        currentActivity
            .activity
            .id
    );


    formData.append(
        "file",
        file
    );


    const response =
        await fetch(
            UPLOAD_URL,
            {
                method: "POST",

                credentials: "same-origin",

                cache: "no-store",

                headers: {
                    Accept: "application/json",

                    "X-CSRF-Token":
                        csrfToken
                },

                body:
                    formData
            }
        );


    const data =
        await readJson(
            response
        );


    return {
        response,
        data
    };
}


/*====================================================
            ENVIAR ARQUIVOS SELECIONADOS
====================================================*/

async function uploadFiles(
    selectedFiles
) {

    if (
        !currentActivity ||
        operationRunning
    ) {

        return;
    }


    const files =
        Array.from(
            selectedFiles || []
        );


    if (
        files.length === 0
    ) {

        return;
    }


    const existingFiles =
        currentActivity
            ?.submission
            ?.files
            ?.length || 0;


    const maximumFiles =
        Number(
            currentActivity
                ?.activity
                ?.maxFiles || 1
        );


    /* LIMITE DE QUANTIDADE */

    if (
        existingFiles +
        files.length >
        maximumFiles
    ) {

        showFeedback(
            `Esta atividade permite no máximo ${maximumFiles} arquivo(s).`,
            "error"
        );


        fileInput.value =
            "";


        return;
    }


    /* LIMITE DE TAMANHO */

    const maximumMb =
        Number(
            currentActivity
                ?.activity
                ?.maxFileSizeMb || 20
        );


    const maximumBytes =
        maximumMb *
        1024 *
        1024;


    for (
        const file
        of files
    ) {

        if (
            file.size >
            maximumBytes
        ) {

            showFeedback(
                `${file.name} ultrapassa o limite de ${maximumMb} MB.`,
                "error"
            );


            fileInput.value =
                "";


            return;
        }
    }


    operationRunning =
        true;


    const originalLabel =
        uploadLabel.innerHTML;


    uploadLabel.classList.add(
        "disabled"
    );


    uploadLabel.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Enviando...
    `;


    let uploaded =
        0;


    let uploadFailed =
        false;


    try {

        for (
            const file
            of files
        ) {

            const {
                response,
                data
            } =
                await uploadSingleFile(
                    file
                );


            if (
                !response.ok ||
                !data?.success
            ) {

                uploadFailed =
                    true;


                showFeedback(
                    data?.message ||
                    `Não foi possível enviar ${file.name}.`,
                    "error"
                );


                break;
            }


            uploaded++;
        }


        await refreshCurrentActivity();


        if (
            uploaded > 0 &&
            !uploadFailed
        ) {

            showFeedback(
                uploaded === 1
                    ? "Arquivo adicionado com sucesso."
                    : `${uploaded} arquivos adicionados com sucesso.`,
                "success"
            );
        }


    } catch (
        error
    ) {

        console.error(
            "Erro ao enviar arquivo:",
            error
        );


        showFeedback(
            "Não foi possível enviar o arquivo.",
            "error"
        );


    } finally {

        operationRunning =
            false;


        fileInput.value =
            "";


        uploadLabel.innerHTML =
            originalLabel;


        if (
            currentActivity
                ?.permissions
                ?.canSaveDraft
        ) {

            uploadLabel.classList.remove(
                "disabled"
            );
        }
    }
}

        /*====================================================
                    REMOVER ARQUIVO
        ====================================================*/

        async function removeFile(
            fileId
        ) {

            if (
                operationRunning
            ) {

                return;
            }


            const confirmed =
                await askConfirmation(
                    "O arquivo será removido desta entrega.",
                    {
                        title:
                            "Remover arquivo?",

                        confirmText:
                            "Remover",

                        icon:
                            "fa-trash"
                    }
                );


            if (!confirmed) {

                return;
            }


            operationRunning =
                true;


            try {

                const {
                    response,
                    data
                } =
                    await postJson(
                        REMOVE_FILE_URL,
                        {
                            fileId
                        }
                    );


                if (
                    !response.ok ||
                    !data?.success
                ) {

                    showFeedback(
                        data?.message ||
                        "Não foi possível remover o arquivo.",
                        "error"
                    );

                    return;
                }


                showFeedback(
                    data.message ||
                    "Arquivo removido com sucesso.",
                    "success"
                );


                await refreshCurrentActivity();


            } finally {

                operationRunning =
                    false;
            }

        }


        /*====================================================
                    ATUALIZAR MODAL
        ====================================================*/

        async function refreshCurrentActivity() {

            if (
                !currentActivity
            ) {

                return;
            }


            const id =
                currentActivity
                    .activity
                    .id;


            const response =
                await fetch(
                    `${VIEW_ACTIVITY_URL}?id=${encodeURIComponent(id)}`,
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
                response.ok &&
                data?.success
            ) {

                currentActivity =
                    data;


                csrfToken =
                    data.csrfToken ||
                    csrfToken;


                renderModal(
                    data
                );
            }

        }


        /*====================================================
                        FECHAR MODAL
        ====================================================*/

        function closeModal() {

            modal.classList.add(
                "hidden"
            );


            document.body.classList.remove(
                "modal-open"
            );


            currentActivity =
                null;
        }


        /*====================================================
                        EVENTOS
        ====================================================*/

        activitySearch.addEventListener(
            "input",
            function () {

                searchTerm =
                    escapeLower(
                        activitySearch.value.trim()
                    );


                renderActivities();
            }
        );


        filters.addEventListener(
            "click",
            function (
                event
            ) {

                const button =
                    event.target.closest(
                        "[data-filter]"
                    );


                if (!button) {

                    return;
                }


                currentFilter =
                    button.dataset.filter;


                filters
                    .querySelectorAll(
                        "[data-filter]"
                    )
                    .forEach(
                        item =>
                            item.classList.toggle(
                                "active",
                                item ===
                                button
                            )
                    );


                renderActivities();
            }
        );


        closeModalButton.addEventListener(
            "click",
            closeModal
        );


        modal.addEventListener(
            "click",
            function (
                event
            ) {

                if (
                    event.target.matches(
                        "[data-close-modal]"
                    )
                ) {

                    closeModal();
                }
            }
        );


        document.addEventListener(
            "keydown",
            function (
                event
            ) {

                if (
                    event.key ===
                    "Escape" &&
                    !modal.classList.contains(
                        "hidden"
                    )
                ) {

                    closeModal();
                }
            }
        );


        saveDraftButton.addEventListener(
            "click",
            saveDraft
        );


        submitButton.addEventListener(
            "click",
            submitActivity
        );


        withdrawButton.addEventListener(
            "click",
            withdrawActivity
        );


        commentButton.addEventListener(
            "click",
            sendComment
        );


        fileInput.addEventListener(
            "change",
            function () {

                if (
                    fileInput.files &&
                    fileInput.files.length > 0
                ) {

                    uploadFiles(
                        fileInput.files
                    );
                }
            }
        );


        logoutButton?.addEventListener(
            "click",
            async function () {

                try {

                    await fetch(
                        LOGOUT_URL,
                        {
                            method:
                                "POST",

                            credentials:
                                "same-origin",

                            headers: {
                                "X-CSRF-Token":
                                    csrfToken
                            }
                        }
                    );

                } finally {

                    sessionStorage.clear();

                    window.location.replace(
                        LOGIN_PAGE
                    );
                }
            }
        );


        /*====================================================
                        INICIALIZAÇÃO
        ====================================================*/

        const validSession =
            await validateSession();


        if (!validSession) {

            return;
        }


        await loadActivities();


        /*
            Permite abrir diretamente:
            aluno_atividades.html?id=10
        */
        const params =
            new URLSearchParams(
                window.location.search
            );


        const activityFromUrl =
            Number(
                params.get(
                    "id"
                )
            );


        if (
            Number.isInteger(
                activityFromUrl
            ) &&
            activityFromUrl >
            0
        ) {

            openActivity(
                activityFromUrl
            );
        }

    }
);