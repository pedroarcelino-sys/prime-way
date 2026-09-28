document.addEventListener(
    "DOMContentLoaded",
    async function () {

        const INDEX =
            "../api/secretaria/saida_segura/index.php";

        const UPDATE =
            "../api/secretaria/saida_segura/alterar_status.php";

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

        const list =
            document.querySelector(
                "#pickupList"
            );

        const search =
            document.querySelector(
                "#pickupSearch"
            );

        const filter =
            document.querySelector(
                "#pickupStatusFilter"
            );

        let state = {
            requests: []
        };

        function escapeHtml(value) {
            return String(value ?? "")
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll('"', "&quot;")
                .replaceAll("'", "&#039;");
        }

        function statusClass(status) {
            if (status === "Liberado") {
                return "success";
            }

            if (status === "Cancelado") {
                return "danger";
            }

            if (status === "No raio") {
                return "warning";
            }

            if (status === "Preparando") {
                return "info";
            }

            return "neutral";
        }

        function actionHtml(item) {
            if (item.status === "No raio") {
                return `
                    <button
                        type="button"
                        class="secretary-primary-button"
                        data-request-action="Preparando"
                        data-request-id="${item.id}"
                    >
                        <i class="fa-solid fa-person-walking-arrow-right"></i>
                        Preparar aluno
                    </button>
                `;
            }

            if (item.status === "Preparando") {
                return `
                    <button
                        type="button"
                        class="secretary-primary-button success"
                        data-request-action="Liberado"
                        data-request-id="${item.id}"
                    >
                        <i class="fa-solid fa-circle-check"></i>
                        Liberar aluno
                    </button>
                `;
            }

            if (item.status === "Aguardando") {
                return `
                    <span class="secretary-action-note">
                        Aguardando entrada no raio.
                    </span>
                `;
            }

            return `
                <span class="secretary-action-note">
                    Solicitação encerrada.
                </span>
            `;
        }

        function visibleItems() {
            const term =
                search.value
                    .trim()
                    .toLowerCase();

            const status =
                filter.value;

            return state.requests.filter(
                item => {
                    const matchesStatus =
                        !status
                        ||
                        item.status === status;

                    const haystack = [
                        item.studentName,
                        item.guardianName,
                        item.registration,
                        item.className,
                        item.observation
                    ]
                        .join(" ")
                        .toLowerCase();

                    const matchesSearch =
                        !term
                        ||
                        haystack.includes(term);

                    return (
                        matchesStatus
                        &&
                        matchesSearch
                    );
                }
            );
        }

        function render() {
            const items =
                visibleItems();

            list.replaceChildren();

            if (!items.length) {
                list.innerHTML =
                    '<div class="secretary-empty">'
                    +
                    '<i class="fa-solid fa-magnifying-glass"></i>'
                    +
                    '<span>Nenhuma solicitação encontrada.</span>'
                    +
                    '</div>';

                return;
            }

            for (const item of items) {
                const card =
                    document.createElement(
                        "article"
                    );

                card.className =
                    "secretary-pickup-card";

                const classInfo =
                    [
                        item.className,
                        item.shift
                    ]
                        .filter(Boolean)
                        .join(" • ");

                card.innerHTML = `
                    <div class="secretary-pickup-top">
                        <div>
                            <span class="secretary-eyebrow">
                                Solicitação #${item.id}
                            </span>

                            <h3>
                                ${escapeHtml(item.studentName)}
                            </h3>

                            <p>
                                ${escapeHtml(classInfo || "Turma não informada")}
                            </p>
                        </div>

                        <span class="secretary-status ${statusClass(item.status)}">
                            ${escapeHtml(item.status)}
                        </span>
                    </div>

                    <div class="secretary-pickup-details">
                        <div>
                            <span>Responsável</span>
                            <strong>
                                ${escapeHtml(item.guardianName)}
                            </strong>
                        </div>

                        <div>
                            <span>Telefone</span>
                            <strong>
                                ${escapeHtml(item.guardianPhone || "—")}
                            </strong>
                        </div>

                        <div>
                            <span>Solicitado em</span>
                            <strong>
                                ${window.PrimeWaySecretaria.formatDate(item.requestedAt, true)}
                            </strong>
                        </div>

                        <div>
                            <span>Entrada no raio</span>
                            <strong>
                                ${window.PrimeWaySecretaria.formatDate(item.enteredRadiusAt, true)}
                            </strong>
                        </div>
                    </div>

                    <div class="secretary-pickup-observation">
                        <span>Observação</span>
                        <p>
                            ${escapeHtml(item.observation || "Sem observação.")}
                        </p>
                    </div>

                    <div class="secretary-pickup-actions">
                        ${actionHtml(item)}
                    </div>
                `;

                list.append(card);
            }

            bindActions();
        }

        function bindActions() {
            document
                .querySelectorAll(
                    "[data-request-action]"
                )
                .forEach(
                    button => {
                        button.addEventListener(
                            "click",
                            async () => {
                                const requestId =
                                    Number(
                                        button.dataset.requestId
                                    );

                                const nextStatus =
                                    button.dataset.requestAction;

                                await changeStatus(
                                    requestId,
                                    nextStatus
                                );
                            }
                        );
                    }
                );
        }

        async function changeStatus(
            requestId,
            nextStatus
        ) {
            const item =
                state.requests.find(
                    request =>
                        Number(request.id)
                        ===
                        Number(requestId)
                );

            if (!item) {
                return;
            }

            const message =
                nextStatus === "Preparando"
                    ? `Iniciar a preparação de ${item.studentName}?`
                    : `Confirmar a liberação de ${item.studentName}?`;

            const confirmed =
                await window
                    .PrimeWayConfirm
                    ?.warning?.(
                        message,
                        {
                            title:
                                nextStatus === "Preparando"
                                    ? "Preparar aluno?"
                                    : "Liberar aluno?",
                            confirmText:
                                nextStatus === "Preparando"
                                    ? "Iniciar preparação"
                                    : "Confirmar liberação",
                            cancelText:
                                "Voltar"
                        }
                    );

            if (confirmed === false) {
                return;
            }

            try {
                const {
                    response,
                    data
                } =
                    await window
                        .PrimeWaySecretaria
                        .requestJson(
                            UPDATE,
                            {
                                requestId,
                                nextStatus
                            }
                        );

                if (
                    !response.ok
                    ||
                    !data?.success
                ) {
                    throw new Error(
                        data?.message
                        ||
                        "Não foi possível atualizar a solicitação."
                    );
                }

                window.PrimeWayFeedback?.success(
                    data.message
                    ||
                    "Saída segura atualizada."
                );

                await load();

            } catch (error) {
                window.PrimeWayFeedback?.error(
                    error?.message
                    ||
                    "Não foi possível atualizar a solicitação."
                );
            }
        }

        async function load() {
            try {
                const {
                    response,
                    data
                } =
                    await window
                        .PrimeWaySecretaria
                        .request(INDEX);

                if (
                    !response.ok
                    ||
                    !data?.success
                ) {
                    throw new Error(
                        data?.message
                        ||
                        "Não foi possível carregar as solicitações."
                    );
                }

                state.requests =
                    data.requests
                    || [];

                document.querySelector(
                    "#summaryActive"
                ).textContent =
                    data.summary.active;

                document.querySelector(
                    "#summaryInside"
                ).textContent =
                    data.summary.insideRadius;

                document.querySelector(
                    "#summaryPreparing"
                ).textContent =
                    data.summary.preparing;

                document.querySelector(
                    "#summaryReleased"
                ).textContent =
                    data.summary.releasedToday;

                render();

                await window
                    .PrimeWaySecretaria
                    .refreshNavigationBadges();

            } catch (error) {
                console.error(error);

                window.PrimeWayFeedback?.error(
                    error?.message
                    ||
                    "Não foi possível carregar a Saída Segura."
                );
            }
        }

        search.addEventListener(
            "input",
            render
        );

        filter.addEventListener(
            "change",
            render
        );

        await load();

        window.setInterval(
            load,
            7000
        );
    }
);
