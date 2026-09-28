document.addEventListener("DOMContentLoaded", async function () {
    await window.PrimeWayStorage?.ready;

    const INDEX =
        "../api/responsavel/saida_segura/index.php";

    const START =
        "../api/responsavel/saida_segura/iniciar.php";

    const UPDATE =
        "../api/responsavel/saida_segura/atualizar_localizacao.php";

    const CANCEL =
        "../api/responsavel/saida_segura/cancelar.php";

    let state = {
        students: [],
        location: null,
        requests: []
    };

    // Distância e horário ficam apenas na memória da página.
    const liveLocation =
        new Map();

    let watchId =
        null;

    let watchedRequestId =
        null;

    let lastSent =
        0;

    const activeStatuses = [
        "Aguardando",
        "No raio",
        "Preparando"
    ];

    const q =
        (selector) =>
            document.querySelector(
                selector
            );

    const config =
        q("#pickupConfigCard");

    const student =
        q("#pickupStudent");

    const observation =
        q("#pickupObservation");

    const form =
        q("#pickupForm");

    const startButton =
        q("#startPickupButton");

    const activeBox =
        q("#activePickupBox");

    const history =
        q("#pickupHistory");

    function statusClass(status) {
        if (status === "Liberado") {
            return "success";
        }

        if (status === "Cancelado") {
            return "danger";
        }

        if (
            status === "No raio"
            ||
            status === "Preparando"
        ) {
            return "warning";
        }

        return "neutral";
    }

    function configUI() {
        const location =
            state.location;

        if (!location) {
            config.className =
                "pickup-config-card error";

            q(
                "#pickupConfigTitle"
            ).textContent =
                "Saída segura indisponível";

            q(
                "#pickupConfigText"
            ).textContent =
                "A configuração local da escola não pôde ser carregada.";

            q(
                "#radiusValue"
            ).textContent =
                "—";

            startButton.disabled =
                true;

            return;
        }

        config.className =
            "pickup-config-card success";

        q(
            "#pickupConfigTitle"
        ).textContent =
            `${location.name} configurada`;

        q(
            "#pickupConfigText"
        ).textContent =
            `O GPS real do dispositivo será usado somente durante a solicitação. `
            +
            `Ao entrar em aproximadamente ${location.radiusMeters} m da escola, `
            +
            `a equipe será avisada. As coordenadas atuais do responsável não são armazenadas.`;

        q(
            "#radiusValue"
        ).textContent =
            `${location.radiusMeters} m`;

        startButton.disabled =
            false;
    }

    function fillStudents() {
        student
            .querySelectorAll(
                "option:not(:first-child)"
            )
            .forEach(
                (option) =>
                    option.remove()
            );

        const items =
            state.students.filter(
                (item) =>
                    item.authorizedPickup
            );

        for (
            const item
            of items
        ) {
            const option =
                document.createElement(
                    "option"
                );

            option.value =
                String(
                    item.studentId
                );

            option.textContent =
                `${item.name} • ${
                    item.enrollment?.className
                    ||
                    "Sem turma"
                }`;

            student.append(
                option
            );
        }

        q(
            "#authorizedCount"
        ).textContent =
            items.length;

        const selected =
            new URLSearchParams(
                location.search
            ).get(
                "studentId"
            );

        if (
            selected
            &&
            items.some(
                (item) =>
                    String(
                        item.studentId
                    )
                    ===
                    selected
            )
        ) {
            student.value =
                selected;
        }
    }

    function progress(status) {
        const order = [
            "Aguardando",
            "No raio",
            "Preparando",
            "Liberado"
        ];

        const currentIndex =
            order.indexOf(
                status
            );

        return order
            .map(
                (
                    item,
                    index
                ) => {
                    let cssClass =
                        "";

                    if (
                        status
                        !== "Cancelado"
                    ) {
                        if (
                            index
                            < currentIndex
                        ) {
                            cssClass =
                                "done";
                        } else if (
                            index
                            === currentIndex
                        ) {
                            cssClass =
                                "current";
                        }
                    }

                    return (
                        `<div class="pickup-step ${cssClass}">`
                        +
                        `${item}`
                        +
                        `</div>`
                    );
                }
            )
            .join("");
    }

    function stopWatch() {
        if (
            watchId !== null
            &&
            navigator.geolocation
        ) {
            navigator.geolocation
                .clearWatch(
                    watchId
                );
        }

        watchId =
            null;

        watchedRequestId =
            null;

        renderActive();
    }

    async function sendPosition(
        request,
        position
    ) {
        const now =
            Date.now();

        if (
            now - lastSent
            < 5000
        ) {
            return;
        }

        lastSent =
            now;

        const {
            response,
            data
        } =
            await window
                .PrimeWayResponsavel
                .requestJson(
                    UPDATE,
                    {
                        requestId:
                            request.id,

                        latitude:
                            position
                                .coords
                                .latitude,

                        longitude:
                            position
                                .coords
                                .longitude
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
                "Não foi possível processar a localização."
            );
        }

        liveLocation.set(
            Number(
                request.id
            ),
            {
                distanceMeters:
                    Number(
                        data.distanceMeters
                    ),

                insideRadius:
                    Boolean(
                        data.insideRadius
                    ),

                updatedAt:
                    new Date()
            }
        );

        const local =
            state.requests.find(
                (item) =>
                    Number(
                        item.id
                    )
                    ===
                    Number(
                        request.id
                    )
            );

        if (local) {
            local.status =
                data.status;
        }

        if (
            data.staffNotified
        ) {
            window.PrimeWayFeedback?.success(
                "Você entrou no raio configurado. A equipe escolar foi notificada."
            );
        }

        renderAll();

        await window
            .PrimeWayResponsavel
            .refreshNavigationBadges();
    }

    function geolocationError(
        error
    ) {
        let message =
            "Não foi possível obter sua localização.";

        if (
            error?.code
            === 1
        ) {
            message =
                "Permissão de localização negada. Autorize o navegador para usar a Saída Segura.";
        } else if (
            error?.code
            === 2
        ) {
            message =
                "O dispositivo não conseguiu determinar sua localização agora.";
        } else if (
            error?.code
            === 3
        ) {
            message =
                "O GPS demorou demais para responder. Tente novamente.";
        }

        window.PrimeWayFeedback?.error(
            message
        );
    }

    function startWatch(
        request
    ) {
        if (
            !navigator.geolocation
        ) {
            window.PrimeWayFeedback?.error(
                "Este navegador não oferece suporte à geolocalização."
            );

            return;
        }

        if (
            watchId !== null
        ) {
            return;
        }

        watchedRequestId =
            Number(
                request.id
            );

        window.PrimeWayFeedback?.info(
            "Aguardando a localização real do dispositivo..."
        );

        watchId =
            navigator.geolocation
                .watchPosition(
                    (position) => {
                        sendPosition(
                            request,
                            position
                        ).catch(
                            (error) =>
                                window.PrimeWayFeedback?.error(
                                    error?.message
                                    ||
                                    "Não foi possível processar a localização."
                                )
                        );
                    },

                    geolocationError,

                    {
                        enableHighAccuracy:
                            true,

                        timeout:
                            20000,

                        maximumAge:
                            3000
                    }
                );

        renderActive();
    }

    function renderActive() {
        const request =
            state.requests.find(
                (item) =>
                    activeStatuses
                        .includes(
                            item.status
                        )
            );

        q(
            "#activeCount"
        ).textContent =
            request
                ? 1
                : 0;

        if (!request) {
            activeBox.className =
                "guardian-empty";

            activeBox.innerHTML =
                '<i class="fa-solid fa-route"></i>'
                +
                'Nenhuma solicitação ativa.';

            if (
                watchId !== null
            ) {
                stopWatch();
            }

            return;
        }

        activeBox.className =
            "pickup-active";

        activeBox.replaceChildren();

        const top =
            document.createElement(
                "div"
            );

        top.className =
            "pickup-active-top";

        const info =
            document.createElement(
                "div"
            );

        const title =
            document.createElement(
                "h3"
            );

        title.textContent =
            request.studentName;

        const description =
            document.createElement(
                "p"
            );

        description.textContent =
            `Solicitada em ${
                window
                    .PrimeWayResponsavel
                    .formatDate(
                        request.requestedAt,
                        true
                    )
            }`;

        info.append(
            title,
            description
        );

        const badge =
            document.createElement(
                "span"
            );

        badge.className =
            `guardian-badge ${
                statusClass(
                    request.status
                )
            }`;

        badge.textContent =
            request.status;

        top.append(
            info,
            badge
        );

        const distance =
            document.createElement(
                "div"
            );

        distance.className =
            "pickup-distance";

        const strong =
            document.createElement(
                "strong"
            );

        const live =
            liveLocation.get(
                Number(
                    request.id
                )
            );

        strong.textContent =
            live
                ? `${Math.round(
                    live.distanceMeters
                )} m da escola`
                : "GPS ainda não iniciado";

        const small =
            document.createElement(
                "span"
            );

        small.textContent =
            live
                ? `Última leitura nesta página: ${
                    new Intl.DateTimeFormat(
                        "pt-BR",
                        {
                            hour:
                                "2-digit",
                            minute:
                                "2-digit",
                            second:
                                "2-digit"
                        }
                    ).format(
                        live.updatedAt
                    )
                }. Coordenadas não armazenadas.`
                : "Ative o GPS para calcular a distância em tempo real.";

        distance.append(
            strong,
            small
        );

        const actions =
            document.createElement(
                "div"
            );

        actions.className =
            "pickup-actions";

        const isWatching =
            watchId !== null
            &&
            watchedRequestId
            ===
            Number(
                request.id
            );

        const gpsButton =
            document.createElement(
                "button"
            );

        gpsButton.type =
            "button";

        gpsButton.className =
            isWatching
                ? "secondary-button"
                : "primary-button";

        gpsButton.innerHTML =
            isWatching
                ? '<i class="fa-solid fa-location-dot"></i> Parar GPS'
                : '<i class="fa-solid fa-location-crosshairs"></i> Usar GPS real';

        gpsButton.addEventListener(
            "click",
            () => {
                if (isWatching) {
                    stopWatch();
                } else {
                    startWatch(
                        request
                    );
                }
            }
        );

        const cancelButton =
            document.createElement(
                "button"
            );

        cancelButton.type =
            "button";

        cancelButton.className =
            "secondary-button";

        cancelButton.innerHTML =
            '<i class="fa-solid fa-xmark"></i> Cancelar solicitação';

        cancelButton.addEventListener(
            "click",
            () =>
                cancelRequest(
                    request
                )
        );

        actions.append(
            gpsButton,
            cancelButton
        );

        const steps =
            document.createElement(
                "div"
            );

        steps.className =
            "pickup-progress";

        steps.innerHTML =
            progress(
                request.status
            );

        activeBox.append(
            top,
            distance,
            actions,
            steps
        );
    }

    function renderHistory() {
        history.replaceChildren();

        const items =
            state.requests;

        if (!items.length) {
            history.innerHTML =
                '<div class="guardian-empty">'
                +
                'Nenhuma solicitação registrada.'
                +
                '</div>';

            q(
                "#historyCount"
            ).textContent =
                "0";

            return;
        }

        for (
            const item
            of items
        ) {
            const row =
                document.createElement(
                    "article"
                );

            row.className =
                "pickup-history-row";

            const info =
                document.createElement(
                    "div"
                );

            const title =
                document.createElement(
                    "h3"
                );

            title.textContent =
                item.studentName;

            const description =
                document.createElement(
                    "p"
                );

            description.textContent =
                item.observation
                ||
                "Sem observação.";

            info.append(
                title,
                description
            );

            const date =
                document.createElement(
                    "span"
                );

            date.textContent =
                window
                    .PrimeWayResponsavel
                    .formatDate(
                        item.requestedAt,
                        true
                    );

            const privacy =
                document.createElement(
                    "span"
                );

            privacy.textContent =
                "Sem coordenadas armazenadas";

            const badge =
                document.createElement(
                    "span"
                );

            badge.className =
                `guardian-badge ${
                    statusClass(
                        item.status
                    )
                }`;

            badge.textContent =
                item.status;

            row.append(
                info,
                date,
                privacy,
                badge
            );

            history.append(
                row
            );
        }

        q(
            "#historyCount"
        ).textContent =
            items.length;
    }

    function renderAll() {
        configUI();
        fillStudents();
        renderActive();
        renderHistory();
    }

    async function cancelRequest(
        request
    ) {
        const confirmed =
            await window
                .PrimeWayConfirm
                ?.warning?.(
                    `Cancelar a solicitação de retirada de ${request.studentName}?`,
                    {
                        title:
                            "Cancelar retirada?",
                        confirmText:
                            "Cancelar solicitação",
                        cancelText:
                            "Voltar"
                    }
                );

        if (
            confirmed
            === false
        ) {
            return;
        }

        try {
            const {
                response,
                data
            } =
                await window
                    .PrimeWayResponsavel
                    .requestJson(
                        CANCEL,
                        {
                            requestId:
                                request.id
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
                    "Não foi possível cancelar."
                );
            }

            liveLocation.delete(
                Number(
                    request.id
                )
            );

            stopWatch();

            window.PrimeWayFeedback?.success(
                data.message
                ||
                "Solicitação cancelada."
            );

            await load();

        } catch (error) {
            window.PrimeWayFeedback?.error(
                error?.message
                ||
                "Não foi possível cancelar a solicitação."
            );
        }
    }

    async function startRequest(
        event
    ) {
        event.preventDefault();

        if (
            !form.checkValidity()
        ) {
            form.reportValidity();
            return;
        }

        startButton.disabled =
            true;

        try {
            const {
                response,
                data
            } =
                await window
                    .PrimeWayResponsavel
                    .requestJson(
                        START,
                        {
                            studentId:
                                student.value,

                            observation:
                                observation
                                    .value
                                    .trim()
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
                    "Não foi possível iniciar a solicitação."
                );
            }

            observation.value =
                "";

            window.PrimeWayFeedback?.success(
                data.message
                ||
                "Solicitação iniciada."
            );

            await load();

            const request =
                state.requests.find(
                    (item) =>
                        Number(
                            item.id
                        )
                        ===
                        Number(
                            data.requestId
                        )
                );

            if (request) {
                startWatch(
                    request
                );
            }

        } catch (error) {
            window.PrimeWayFeedback?.error(
                error?.message
                ||
                "Não foi possível iniciar a solicitação."
            );

        } finally {
            configUI();
        }
    }

    async function load() {
        try {
            const {
                response,
                data
            } =
                await window
                    .PrimeWayResponsavel
                    .request(
                        INDEX
                    );

            if (
                !response.ok
                ||
                !data?.success
            ) {
                throw new Error(
                    data?.message
                    ||
                    "Não foi possível carregar a saída segura."
                );
            }

            state = {
                students:
                    data.students
                    || [],

                location:
                    data.location
                    || null,

                requests:
                    data.requests
                    || []
            };

            renderAll();

            await window
                .PrimeWayResponsavel
                .refreshNavigationBadges();

        } catch (error) {
            console.error(
                error
            );

            window.PrimeWayFeedback?.error(
                error?.message
                ||
                "Não foi possível carregar a saída segura."
            );
        }
    }

    const session =
        await window
            .PrimeWayResponsavel
            .ensureGuardian();

    if (!session) {
        return;
    }

    window
        .PrimeWayResponsavel
        .bindLogout();

    form.addEventListener(
        "submit",
        startRequest
    );

    await load();

    window.addEventListener(
        "beforeunload",
        () => {
            if (
                watchId !== null
                &&
                navigator.geolocation
            ) {
                navigator.geolocation
                    .clearWatch(
                        watchId
                    );
            }
        }
    );
});
