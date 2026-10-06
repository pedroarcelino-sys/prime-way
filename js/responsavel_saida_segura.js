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

    // Distância e precisão ficam apenas na memória da página.
    const liveLocation =
        new Map();

    let watchId =
        null;

    let watchedRequestId =
        null;

    let lastSent =
        0;

    let watchGeneration = 0;
    let pendingPosition = null;
    let gpsState = "GPS parado";
    let loadGeneration = 0;
    let statusVersion = 0;
    let pageActive = true;
    let pollTimer = null;
    const arrivalNotices = new Set();
    const mapView = window.PrimeWayPickupMap.create(
        document.querySelector("#pickupMap"), document.querySelector("#pickupMapNotice")
    );

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
        const previousSelection = student.value;
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
            previousSelection ||
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

    function stopWatch(message = "GPS parado", render = true) {
        watchGeneration++;
        if (watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
        watchId = null;
        watchedRequestId = null;
        lastSent = 0;
        pendingPosition = null;
        liveLocation.clear();
        mapView.clearPosition();
        gpsState = message;
        if (render) renderActive();
    }

    function isCurrentWatch(request, generation) {
        return pageActive && generation === watchGeneration
            && watchedRequestId === Number(request.id)
            && state.requests.some(item => Number(item.id) === Number(request.id)
                && activeStatuses.includes(item.status));
    }

    async function sendPosition(request, position, generation) {
        if (!isCurrentWatch(request, generation)) return;
        const now = Date.now();
        if (pendingPosition || (lastSent && now - lastSent < 5000)) return;
        lastSent = now;
        const operation = {};
        pendingPosition = operation;
        try {
            const { response, data } = await window.PrimeWayResponsavel.requestJson(UPDATE, {
                requestId: request.id,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            });
            // clearWatch não cancela callbacks ou requisições que já estavam em andamento.
            if (!isCurrentWatch(request, generation)) return;
            if (!response.ok || !data?.success) {
                stopWatch(data?.message || "GPS interrompido: não foi possível confirmar a solicitação.");
                await load();
                return;
            }
            const local = state.requests.find(item => Number(item.id) === Number(request.id));
            const order = ["Aguardando", "No raio", "Preparando", "Liberado", "Cancelado"];
            // Uma resposta de GPS anterior à consulta de status não regride Preparando/Liberado.
            if (local && order.indexOf(data.status) >= order.indexOf(local.status)) local.status = data.status;
            statusVersion++;
            if (data.staffNotified && !arrivalNotices.has(Number(request.id))) {
                arrivalNotices.add(Number(request.id));
                window.PrimeWayFeedback?.success(arrivalMessage(request));
            }
            renderActive();
            renderHistory();
            await window.PrimeWayResponsavel.refreshNavigationBadges();
        } catch {
            if (isCurrentWatch(request, generation)) {
                stopWatch("GPS interrompido: conexão indisponível. Ative novamente para tentar.");
            }
        } finally {
            if (pendingPosition === operation) pendingPosition = null;
        }
    }

    function arrivalMessage(request) {
        return `Você entrou no raio da escola. A equipe foi avisada. Estamos preparando ${request.studentName} para a retirada.`;
    }

    function geolocationError(error) {
        let message = "GPS indisponível. Tente novamente.";
        if (error?.code === 1) message = "Permissão negada. Autorize a localização no navegador e tente novamente.";
        else if (error?.code === 3) message = "GPS indisponível: tempo de espera esgotado. Tente novamente.";
        stopWatch(message);
        window.PrimeWayFeedback?.error(message);
    }

    function startWatch(request) {
        if (!navigator.geolocation) {
            stopWatch("GPS indisponível: este navegador não oferece geolocalização.");
            return;
        }
        if (!state.location || !activeStatuses.includes(request.status) || !pageActive) return;
        if (watchId !== null) return;
        watchedRequestId = Number(request.id);
        const generation = ++watchGeneration;
        gpsState = "Aguardando GPS";
        renderActive();
        try {
            watchId = navigator.geolocation.watchPosition(position => {
                if (!isCurrentWatch(request, generation)) return;
                const { latitude, longitude, accuracy } = position.coords;
                if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
                    || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
                    geolocationError({ code: 2 });
                    return;
                }
                const distance = window.PrimeWayPickupMap.distanceMeters(latitude, longitude, state.location);
                liveLocation.set(Number(request.id), {
                    distanceMeters: distance,
                    proximity: window.PrimeWayPickupMap.proximity(distance, state.location.radiusMeters),
                    accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null
                });
                mapView.update(latitude, longitude);
                gpsState = "Localização ativa";
                renderActive();
                sendPosition(request, position, generation);
            }, error => {
                if (isCurrentWatch(request, generation)) geolocationError(error);
            }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 3000 });
            renderActive();
        } catch { geolocationError({ code: 2 }); }
    }

    function renderActive() {
        const active = state.requests.filter(item => activeStatuses.includes(item.status));
        const request = active[0] || state.requests[0];
        if (watchedRequestId !== null && (!active.length || Number(active[0].id) !== watchedRequestId)) {
            stopWatch("GPS parado: solicitação encerrada ou substituída.", false);
        }
        q("#activeCount").textContent = active.length;
        const trackingInfo = q("#pickupTrackingInfo");
        trackingInfo.replaceChildren();
        if (!request) {
            activeBox.className = "guardian-empty";
            activeBox.textContent = "Nenhuma solicitação ativa.";
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

        strong.textContent = live ? `Distância: ${Math.round(live.distanceMeters)} m` : "Distância: —";
        const proximity = document.createElement("span");
        proximity.textContent = live ? `Status: ${live.proximity.text}` : "Ative o GPS para acompanhar a distância.";
        distance.dataset.proximity = live?.proximity.key || "unknown";
        const gps = document.createElement("span");
        gps.id = "pickupGpsState";
        gps.textContent = gpsState;
        const accuracy = document.createElement("span");
        accuracy.textContent = live?.accuracy != null ? `Precisão aproximada: ${Math.round(live.accuracy)} m. A confirmação de entrada é feita pela escola.` : "";
        distance.append(strong, proximity, gps, accuracy);

        const actions =
            document.createElement(
                "div"
            );

        actions.className =
            "pickup-actions";

        const isWatching =
            watchedRequestId !== null
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

        gpsButton.id = "pickupGpsButton";
        gpsButton.disabled = !activeStatuses.includes(request.status) || !state.location;
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

        cancelButton.id = "pickupCancelButton";
        cancelButton.disabled = !activeStatuses.includes(request.status);
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

        activeBox.append(top);
        if (activeStatuses.includes(request.status)
            && (request.enteredRadiusAt || arrivalNotices.has(Number(request.id)))) {
            const notice = document.createElement("p");
            notice.className = "pickup-arrival";
            notice.textContent = arrivalMessage(request);
            trackingInfo.append(notice);
        }
        trackingInfo.append(distance, actions, steps);
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
        if (state.location) mapView.configure(state.location);
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

        stopWatch();

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

            const local = state.requests.find(item => Number(item.id) === Number(request.id));
            if (local) local.status = "Cancelado";
            statusVersion++;
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
        const generation = ++loadGeneration;
        const version = statusVersion;
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

            if (!pageActive || generation !== loadGeneration || version !== statusVersion) return;

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
            if (!pageActive || generation !== loadGeneration || version !== statusVersion) return;
            if (watchedRequestId !== null) stopWatch("GPS interrompido: não foi possível atualizar a solicitação.");
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

    function leavePage() {
        pageActive = false;
        loadGeneration++;
        clearInterval(pollTimer);
        stopWatch();
    }
    pollTimer = setInterval(load, 7000);
    window.addEventListener("pagehide", leavePage);
    window.addEventListener("beforeunload", leavePage);
    q("#logoutButton")?.addEventListener("click", () => stopWatch(), { capture: true });
    window.addEventListener("pageshow", event => {
        if (event.persisted) {
            pageActive = true;
            clearInterval(pollTimer);
            pollTimer = setInterval(load, 7000);
            load();
        }
    });
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && pageActive) load();
    });
});
