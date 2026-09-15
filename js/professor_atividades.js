document.addEventListener("DOMContentLoaded", async () => {

    const SESSION_URL = "../api/auth/session.php";
    const LOGOUT_URL = "../api/auth/logout.php";
    const ACTIVITIES_URL = "../api/professor/atividades/index.php";
    const SAVE_ACTIVITY_URL = "../api/professor/atividades/salvar.php";
    const VIEW_ACTIVITY_URL = "../api/professor/atividades/visualizar.php";

    const LOGIN_PAGE = "login.html";
    const SUBMISSIONS_PAGE = "professor_entregas.html";

    let csrfToken = "";
    let activities = [];
    let classSubjects = [];
    let periods = [];
    let operationRunning = false;

    const activitiesList =
        document.querySelector("#activitiesList");

    const activitiesCounter =
        document.querySelector("#activitiesCounter");

    const totalActivities =
        document.querySelector("#totalActivities");

    const publishedActivities =
        document.querySelector("#publishedActivities");

    const scheduledActivities =
        document.querySelector("#scheduledActivities");

    const draftActivities =
        document.querySelector("#draftActivities");

    const activitySearch =
        document.querySelector("#activitySearch");

    const statusFilter =
        document.querySelector("#statusFilter");

    const newActivityButton =
        document.querySelector("#newActivityButton");

    const modal =
        document.querySelector("#activityModal");

    const modalOverlay =
        document.querySelector("#activityModalOverlay");

    const modalClose =
        document.querySelector("#activityModalClose");

    const cancelActivityButton =
        document.querySelector("#cancelActivityButton");

    const activityModalTitle =
        document.querySelector("#activityModalTitle");

    const activityForm =
        document.querySelector("#activityForm");

    const activityId =
        document.querySelector("#activityId");

    const classSubject =
        document.querySelector("#classSubject");

    const activityPeriod =
        document.querySelector("#activityPeriod");

    const activityTitle =
        document.querySelector("#activityTitle");

    const activityDescription =
        document.querySelector("#activityDescription");

    const activityInstructions =
        document.querySelector("#activityInstructions");

    const submissionType =
        document.querySelector("#submissionType");

    const activityStatus =
        document.querySelector("#activityStatus");

    const publishAt =
        document.querySelector("#publishAt");

    const dueAt =
        document.querySelector("#dueAt");

    const maxFiles =
        document.querySelector("#maxFiles");

    const maxFileSize =
        document.querySelector("#maxFileSize");

    const allowsLateSubmission =
        document.querySelector("#allowsLateSubmission");

    const allowsResubmission =
        document.querySelector("#allowsResubmission");

    const allowsComments =
        document.querySelector("#allowsComments");

    const saveActivityButton =
        document.querySelector("#saveActivityButton");

    const logoutButton =
        document.querySelector("#logoutButton");


    /*====================================================
                        JSON
    ====================================================*/

    async function readJson(response) {

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
                        method: "GET",
                        credentials: "same-origin",
                        cache: "no-store",
                        headers: {
                            Accept: "application/json"
                        }
                    }
                );

            const data =
                await readJson(response);

            if (
                !response.ok ||
                !data?.authenticated ||
                data?.usuario?.perfil !== "professor"
            ) {

                window.location.replace(
                    LOGIN_PAGE
                );

                return false;
            }

            csrfToken =
                data.csrfToken || "";

            return true;

        } catch (error) {

            console.error(
                "Erro ao validar sessão:",
                error
            );

            window.location.replace(
                LOGIN_PAGE
            );

            return false;
        }
    }


    /*====================================================
                    ESCAPAR HTML
    ====================================================*/

    function escapeHtml(value) {

        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }


    /*====================================================
                    FORMATAR DATA
    ====================================================*/

    function formatDateTime(value) {

        if (!value) {
            return "Sem prazo";
        }

        const date =
            new Date(
                String(value)
                    .replace(" ", "T")
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
            {
                dateStyle: "short",
                timeStyle: "short"
            }
        ).format(date);
    }


    function toDateTimeLocal(value) {

        if (!value) {
            return "";
        }

        return String(value)
            .replace(" ", "T")
            .slice(0, 16);
    }


    /*====================================================
                    STATUS CSS
    ====================================================*/

    function getStatusClass(status) {

        switch (status) {

            case "Publicada":
                return "published";

            case "Agendada":
                return "scheduled";

            case "Rascunho":
                return "draft";

            case "Encerrada":
                return "closed";

            case "Cancelada":
                return "cancelled";

            default:
                return "closed";
        }
    }


    /*====================================================
                    RESUMO
    ====================================================*/

    function renderSummary() {

        totalActivities.textContent =
            String(
                activities.length
            );

        publishedActivities.textContent =
            String(
                activities.filter(
                    item =>
                        item.status ===
                        "Publicada"
                ).length
            );

        scheduledActivities.textContent =
            String(
                activities.filter(
                    item =>
                        item.status ===
                        "Agendada"
                ).length
            );

        draftActivities.textContent =
            String(
                activities.filter(
                    item =>
                        item.status ===
                        "Rascunho"
                ).length
            );
    }


    /*====================================================
                        FILTROS
    ====================================================*/

    function getFilteredActivities() {

        const search =
            activitySearch.value
                .trim()
                .toLowerCase();

        const status =
            statusFilter.value;

        return activities.filter(
            activity => {

                if (
                    status &&
                    activity.status !== status
                ) {

                    return false;
                }

                if (!search) {

                    return true;
                }

                const text = [
                    activity.title,
                    activity.description,
                    activity.classSubject?.className,
                    activity.classSubject?.subjectName,
                    activity.period?.name
                ]
                    .join(" ")
                    .toLowerCase();

                return text.includes(search);
            }
        );
    }


    /*====================================================
                    ESTADO VAZIO
    ====================================================*/

    function renderEmpty(message) {

        activitiesList.innerHTML = `
            <div class="empty-state">

                <i
                    class="fa-regular fa-folder-open"
                    aria-hidden="true"
                ></i>

                <strong>
                    ${escapeHtml(
                        message ||
                        "Nenhuma atividade encontrada."
                    )}
                </strong>

                <span>
                    Utilize o botão Nova atividade para começar.
                </span>

            </div>
        `;
    }


    /*====================================================
                RENDERIZAR ATIVIDADES
    ====================================================*/

    function renderActivities() {

        const filtered =
            getFilteredActivities();

        activitiesCounter.textContent =
            `${filtered.length} ${
                filtered.length === 1
                    ? "atividade"
                    : "atividades"
            }`;

        if (
            filtered.length === 0
        ) {

            renderEmpty();

            return;
        }

        activitiesList.innerHTML =
            filtered.map(
                activity => {

                    const submitted =
                        Number(
                            activity.submissions
                                ?.submitted ?? 0
                        );

                    const corrected =
                        Number(
                            activity.submissions
                                ?.corrected ?? 0
                        );

                    return `
                        <article
                            class="activity-item"
                            data-activity-id="${activity.id}"
                        >

                            <div class="activity-item-icon">

                                <i
                                    class="fa-solid fa-file-lines"
                                    aria-hidden="true"
                                ></i>

                            </div>


                            <div class="activity-item-info">

                                <h3>
                                    ${escapeHtml(
                                        activity.title
                                    )}
                                </h3>

                                <p>
                                    ${escapeHtml(
                                        activity.classSubject
                                            ?.className ??
                                        "Turma"
                                    )}

                                    ·

                                    ${escapeHtml(
                                        activity.classSubject
                                            ?.subjectName ??
                                        "Disciplina"
                                    )}
                                </p>

                            </div>


                            <div class="activity-item-meta">

                                <span>

                                    <i
                                        class="fa-regular fa-calendar"
                                    ></i>

                                    ${escapeHtml(
                                        formatDateTime(
                                            activity.dueAt
                                        )
                                    )}

                                </span>

                                <span>

                                    <i
                                        class="fa-solid fa-layer-group"
                                    ></i>

                                    ${escapeHtml(
                                        activity.period
                                            ?.name ??
                                        "—"
                                    )}

                                </span>

                            </div>


                            <div class="activity-submission-info">

                                <strong>
                                    ${submitted} entregas
                                </strong>

                                <span>
                                    ${corrected} corrigidas
                                </span>

                                <span
                                    class="activity-status ${getStatusClass(
                                        activity.status
                                    )}"
                                >
                                    ${escapeHtml(
                                        activity.status
                                    )}
                                </span>

                            </div>


                            <div class="activity-actions">

                                <button
                                    type="button"
                                    class="activity-action-button view-submissions-button"
                                    data-id="${activity.id}"
                                    title="Ver entregas"
                                    aria-label="Ver entregas da atividade"
                                >

                                    <i
                                        class="fa-solid fa-inbox"
                                        aria-hidden="true"
                                    ></i>

                                </button>

                                <button
                                    type="button"
                                    class="activity-action-button edit-activity-button"
                                    data-id="${activity.id}"
                                    title="Editar atividade"
                                    aria-label="Editar atividade"
                                >

                                    <i
                                        class="fa-solid fa-pen"
                                        aria-hidden="true"
                                    ></i>

                                </button>

                            </div>

                        </article>
                    `;
                }
            ).join("");
    }


    /*====================================================
                TURMAS E DISCIPLINAS
    ====================================================*/

    function populateClassSubjects() {

        classSubject.innerHTML = `
            <option value="">
                Selecione
            </option>
        `;

        classSubjects.forEach(
            item => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    String(item.id);

                option.textContent =
                    `${item.className} — ${item.subjectName}`;

                classSubject.appendChild(
                    option
                );
            }
        );
    }


    /*====================================================
                    PERÍODOS
    ====================================================*/

    function populatePeriods() {

        activityPeriod.innerHTML = `
            <option value="">
                Selecione
            </option>
        `;

        periods.forEach(
            item => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    String(item.id);

                option.textContent =
                    item.name;

                activityPeriod.appendChild(
                    option
                );
            }
        );
    }


    /*====================================================
                    CARREGANDO
    ====================================================*/

    function renderLoading() {

        activitiesList.innerHTML = `
            <div class="activities-loading">

                <i
                    class="fa-solid fa-spinner fa-spin"
                ></i>

                <span>
                    Carregando atividades...
                </span>

            </div>
        `;
    }


    /*====================================================
                    CARREGAR API
    ====================================================*/

    async function loadActivities() {

        renderLoading();

        try {

            const response =
                await fetch(
                    ACTIVITIES_URL,
                    {
                        method: "GET",
                        credentials: "same-origin",
                        cache: "no-store",
                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );

            const data =
                await readJson(response);

            if (
                !response.ok ||
                !data?.success
            ) {

                throw new Error(
                    data?.message ||
                    "Não foi possível carregar as atividades."
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

            classSubjects =
                Array.isArray(
                    data.classSubjects
                )
                    ? data.classSubjects
                    : [];

            periods =
                Array.isArray(
                    data.periods
                )
                    ? data.periods
                    : [];

            populateClassSubjects();

            populatePeriods();

            renderSummary();

            renderActivities();

        } catch (error) {

            console.error(
                "Erro ao carregar atividades:",
                error
            );

            renderEmpty(
                error.message
            );

            PrimeWayFeedback.error(
                error.message ||
                "Não foi possível carregar as atividades."
            );
        }
    }


    /*====================================================
                RESETAR FORMULÁRIO
    ====================================================*/

    function resetForm() {

        activityForm.reset();

        activityId.value = "";

        submissionType.value =
            "Livre";

        activityStatus.value =
            "Rascunho";

        maxFiles.value =
            "5";

        maxFileSize.value =
            "20";

        allowsLateSubmission.checked =
            false;

        allowsResubmission.checked =
            true;

        allowsComments.checked =
            true;

        updatePublishField();
    }


    /*====================================================
                    MODAL
    ====================================================*/

    function openModal() {

        modal.classList.add(
            "active"
        );

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );

        setTimeout(
            () =>
                activityTitle.focus(),
            50
        );
    }


    function closeModal(force = false) {

        if (
            operationRunning &&
            !force
        ) {

            return;
        }

        modal.classList.remove(
            "active"
        );

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "modal-open"
        );
    }


    /*====================================================
                    NOVA ATIVIDADE
    ====================================================*/

    function newActivity() {

        resetForm();

        activityModalTitle.textContent =
            "Nova atividade";

        openModal();
    }


    /*====================================================
                CAMPO DE PUBLICAÇÃO
    ====================================================*/

    function updatePublishField() {

        publishAt.required =
            activityStatus.value ===
            "Agendada";
    }


    /*====================================================
                VER ENTREGAS
    ====================================================*/

    function openSubmissions(id) {

        const numericId =
            Number(id);

        if (
            !Number.isInteger(numericId) ||
            numericId <= 0
        ) {

            PrimeWayFeedback.error(
                "Atividade inválida."
            );

            return;
        }

        window.location.href =
            `${SUBMISSIONS_PAGE}?atividadeId=${encodeURIComponent(numericId)}`;
    }


    /*====================================================
                    EDITAR
    ====================================================*/

    async function editActivity(id) {

        const numericId =
            Number(id);

        if (
            !Number.isInteger(numericId) ||
            numericId <= 0
        ) {

            PrimeWayFeedback.error(
                "Atividade inválida."
            );

            return;
        }

        try {

            const response =
                await fetch(
                    `${VIEW_ACTIVITY_URL}?id=${numericId}`,
                    {
                        method: "GET",
                        credentials: "same-origin",
                        cache: "no-store",
                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );

            const data =
                await readJson(response);

            if (
                !response.ok ||
                !data?.success ||
                !data?.activity
            ) {

                throw new Error(
                    data?.message ||
                    "Não foi possível abrir a atividade."
                );
            }

            csrfToken =
                data.csrfToken ||
                csrfToken;

            const activity =
                data.activity;

            resetForm();

            activityId.value =
                String(activity.id);

            classSubject.value =
                String(
                    activity.classSubject
                        ?.id ?? ""
                );

            activityPeriod.value =
                String(
                    activity.period
                        ?.id ?? ""
                );

            activityTitle.value =
                activity.title || "";

            activityDescription.value =
                activity.description || "";

            activityInstructions.value =
                activity.instructions || "";

            submissionType.value =
                activity.submissionType ||
                "Livre";

            activityStatus.value =
                activity.status ||
                "Rascunho";

            publishAt.value =
                toDateTimeLocal(
                    activity.publishAt ??
                    activity.publishedAt
                );

            dueAt.value =
                toDateTimeLocal(
                    activity.dueAt
                );

            maxFiles.value =
                String(
                    activity.maxFiles ?? 5
                );

            maxFileSize.value =
                String(
                    activity.maxFileSizeMb ??
                    20
                );

            allowsLateSubmission.checked =
                Boolean(
                    activity.allowsLateSubmission
                );

            allowsResubmission.checked =
                Boolean(
                    activity.allowsResubmission
                );

            allowsComments.checked =
                Boolean(
                    activity.allowsComments
                );

            activityModalTitle.textContent =
                "Editar atividade";

            updatePublishField();

            openModal();

        } catch (error) {

            console.error(
                "Erro ao abrir atividade:",
                error
            );

            PrimeWayFeedback.error(
                error.message ||
                "Não foi possível abrir a atividade."
            );
        }
    }


    /*====================================================
                DADOS DO FORMULÁRIO
    ====================================================*/

    function getPayload() {

        const id =
            Number(
                activityId.value || 0
            );

        return {

            id:
                id > 0
                    ? id
                    : null,

            classSubjectId:
                Number(
                    classSubject.value
                ),

            periodId:
                Number(
                    activityPeriod.value
                ),

            title:
                activityTitle.value
                    .trim(),

            description:
                activityDescription.value
                    .trim(),

            instructions:
                activityInstructions.value
                    .trim(),

            submissionType:
                submissionType.value,

            status:
                activityStatus.value,

            publishAt:
                publishAt.value ||
                null,

            dueAt:
                dueAt.value ||
                null,

            maxFiles:
                Number(
                    maxFiles.value
                ),

            maxFileSizeMb:
                Number(
                    maxFileSize.value
                ),

            allowsLateSubmission:
                allowsLateSubmission.checked,

            allowsResubmission:
                allowsResubmission.checked,

            allowsComments:
                allowsComments.checked
        };
    }


    /*====================================================
                    SALVAR
    ====================================================*/

    async function saveActivity(event) {

        event.preventDefault();

        if (
            operationRunning
        ) {

            return;
        }

        if (
            !activityForm.reportValidity()
        ) {

            return;
        }

        const payload =
            getPayload();

        if (
            !payload.classSubjectId
        ) {

            PrimeWayFeedback.warning(
                "Selecione a turma e a disciplina."
            );

            classSubject.focus();

            return;
        }

        if (
            !payload.periodId
        ) {

            PrimeWayFeedback.warning(
                "Selecione o período letivo."
            );

            activityPeriod.focus();

            return;
        }

        operationRunning =
            true;

        saveActivityButton.disabled =
            true;

        saveActivityButton.innerHTML = `
            <i
                class="fa-solid fa-spinner fa-spin"
            ></i>

            Salvando...
        `;

        try {

            const response =
                await fetch(
                    SAVE_ACTIVITY_URL,
                    {
                        method: "POST",
                        credentials: "same-origin",
                        cache: "no-store",

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
                await readJson(response);

            if (
                !response.ok ||
                !data?.success
            ) {

                throw new Error(
                    data?.message ||
                    "Não foi possível salvar a atividade."
                );
            }

            PrimeWayFeedback.success(
                data.message ||
                "Atividade salva com sucesso."
            );

            operationRunning =
                false;

            closeModal(true);

            await loadActivities();

        } catch (error) {

            console.error(
                "Erro ao salvar atividade:",
                error
            );

            PrimeWayFeedback.error(
                error.message ||
                "Não foi possível salvar a atividade."
            );

        } finally {

            operationRunning =
                false;

            saveActivityButton.disabled =
                false;

            saveActivityButton.innerHTML = `
                <i
                    class="fa-solid fa-floppy-disk"
                ></i>

                Salvar atividade
            `;
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
                        method: "POST",
                        credentials: "same-origin",
                        cache: "no-store",

                        headers: {
                            Accept:
                                "application/json",

                            "X-CSRF-Token":
                                csrfToken
                        }
                    }
                );

            const data =
                await readJson(response);

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

        } catch (error) {

            console.error(
                "Erro no logout:",
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

    newActivityButton.addEventListener(
        "click",
        newActivity
    );

    modalClose.addEventListener(
        "click",
        () => closeModal()
    );

    modalOverlay.addEventListener(
        "click",
        () => closeModal()
    );

    cancelActivityButton.addEventListener(
        "click",
        () => closeModal()
    );

    activityStatus.addEventListener(
        "change",
        updatePublishField
    );

    activityForm.addEventListener(
        "submit",
        saveActivity
    );

    logoutButton.addEventListener(
        "click",
        logout
    );

    activitySearch.addEventListener(
        "input",
        renderActivities
    );

    statusFilter.addEventListener(
        "change",
        renderActivities
    );

    activitiesList.addEventListener(
        "click",
        event => {

            const submissionsButton =
                event.target.closest(
                    ".view-submissions-button"
                );

            if (submissionsButton) {

                openSubmissions(
                    submissionsButton.dataset.id
                );

                return;
            }

            const editButton =
                event.target.closest(
                    ".edit-activity-button"
                );

            if (editButton) {

                editActivity(
                    editButton.dataset.id
                );
            }
        }
    );

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                modal.classList.contains(
                    "active"
                )
            ) {

                closeModal();
            }
        }
    );


    /*====================================================
                    INICIALIZAÇÃO
    ====================================================*/

    if (
        !await validateSession()
    ) {

        return;
    }

    await loadActivities();

});