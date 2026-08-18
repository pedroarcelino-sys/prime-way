console.log("NOTIFICAÇÕES JS CARREGADO");

document.addEventListener("DOMContentLoaded", function () {

    /*====================================================
                    STORAGE
    ====================================================*/

    const NOTIFICATIONS_STORAGE_KEY =
        "primewayNotifications";

    const CALENDAR_STORAGE_KEY =
        "primewayCalendarEvents";


    /*====================================================
                    ELEMENTOS
    ====================================================*/

    const notificationsList =
        document.querySelector("#notificationsList");

    const notificationsEmpty =
        document.querySelector("#notificationsEmpty");


    const notificationSearch =
        document.querySelector("#notificationSearch");

    const notificationTypeFilter =
        document.querySelector("#notificationTypeFilter");

    const notificationStatusFilter =
        document.querySelector("#notificationStatusFilter");


    /* CARDS */

    const totalNotifications =
        document.querySelector("#totalNotifications");

    const unreadNotifications =
        document.querySelector("#unreadNotifications");

    const eventNotifications =
        document.querySelector("#eventNotifications");

    const noticeNotifications =
        document.querySelector("#noticeNotifications");


    /* BOTÕES */

    const newNotificationButton =
        document.querySelector("#newNotificationButton");

    const markAllReadButton =
        document.querySelector("#markAllReadButton");


    /* MODAL CADASTRO */

    const notificationModal =
        document.querySelector("#notificationModal");

    const notificationModalOverlay =
        document.querySelector(".notification-modal-overlay");

    const notificationModalClose =
        document.querySelector("#notificationModalClose");

    const notificationCancelButton =
        document.querySelector("#notificationCancelButton");

    const notificationForm =
        document.querySelector("#notificationForm");


    const notificationTitle =
        document.querySelector("#notificationTitle");

    const notificationType =
        document.querySelector("#notificationType");

    const notificationAudience =
        document.querySelector("#notificationAudience");

    const notificationMessage =
        document.querySelector("#notificationMessage");


    /* VISUALIZAÇÃO */

    const notificationViewModal =
        document.querySelector("#notificationViewModal");

    const notificationViewOverlay =
        document.querySelector(".notification-view-overlay");

    const notificationViewClose =
        document.querySelector("#notificationViewClose");

    const viewNotificationIcon =
        document.querySelector("#viewNotificationIcon");

    const viewNotificationType =
        document.querySelector("#viewNotificationType");

    const viewNotificationTitle =
        document.querySelector("#viewNotificationTitle");

    const viewNotificationAudience =
        document.querySelector("#viewNotificationAudience");

    const viewNotificationDate =
        document.querySelector("#viewNotificationDate");

    const viewNotificationMessage =
        document.querySelector("#viewNotificationMessage");

    const toggleReadButton =
        document.querySelector("#toggleReadButton");

    const deleteNotificationButton =
        document.querySelector("#deleteNotificationButton");


    /* EXCLUSÃO */

    const deleteNotificationModal =
        document.querySelector("#deleteNotificationModal");

    const deleteNotificationOverlay =
        document.querySelector(".delete-notification-overlay");

    const deleteNotificationCancel =
        document.querySelector("#deleteNotificationCancel");

    const deleteNotificationConfirm =
        document.querySelector("#deleteNotificationConfirm");

    const deleteNotificationMessage =
        document.querySelector("#deleteNotificationMessage");


    const logoutButton =
        document.querySelector("#logoutButton");


    /*====================================================
                    FUNÇÕES DE DATA
    ====================================================*/

    function hojeISO() {

        const agora =
            new Date();

        const ano =
            agora.getFullYear();

        const mes =
            String(
                agora.getMonth() + 1
            ).padStart(2, "0");

        const dia =
            String(
                agora.getDate()
            ).padStart(2, "0");


        return `${ano}-${mes}-${dia}`;

    }


    function dataLocal(dateString) {

        if (!dateString) {

            return null;

        }


        const partes =
            String(dateString)
                .split("-")
                .map(Number);


        if (
            partes.length !== 3 ||
            partes.some(
                numero =>
                    Number.isNaN(numero)
            )
        ) {

            return null;

        }


        return new Date(
            partes[0],
            partes[1] - 1,
            partes[2]
        );

    }


    function formatarData(dateString) {

        const data =
            dataLocal(dateString);


        if (!data) {

            return "-";

        }


        return data.toLocaleDateString(
            "pt-BR"
        );

    }


    /*====================================================
                NOTIFICAÇÕES PADRÃO
    ====================================================*/

    const defaultNotifications = [

        {
            id: "default-1",
            title: "Bem-vindo ao PrimeWay School",
            type: "Sistema",
            audience: "Todos",
            message: "A central de notificações está disponível para acompanhar avisos e informações importantes da escola.",
            date: hojeISO(),
            time: "08:00",
            read: false,
            source: "manual"
        },

        {
            id: "default-2",
            title: "Atualização de calendário",
            type: "Aviso",
            audience: "Todos",
            message: "Confira regularmente o calendário escolar para acompanhar provas, reuniões e atividades.",
            date: hojeISO(),
            time: "08:30",
            read: false,
            source: "manual"
        }

    ];


    /*====================================================
                    STORAGE
    ====================================================*/

    function carregarNotificacoes() {

        try {

            const saved =
                localStorage.getItem(
                    NOTIFICATIONS_STORAGE_KEY
                );


            if (!saved) {

                return JSON.parse(
                    JSON.stringify(
                        defaultNotifications
                    )
                );

            }


            const data =
                JSON.parse(saved);


            if (!Array.isArray(data)) {

                return JSON.parse(
                    JSON.stringify(
                        defaultNotifications
                    )
                );

            }


            return data;

        } catch (erro) {

            console.warn(
                "Erro ao carregar notificações:",
                erro
            );


            return JSON.parse(
                JSON.stringify(
                    defaultNotifications
                )
            );

        }

    }


    function salvarNotificacoes() {

        try {

            localStorage.setItem(
                NOTIFICATIONS_STORAGE_KEY,
                JSON.stringify(
                    notifications
                )
            );

        } catch (erro) {

            console.warn(
                "Erro ao salvar notificações:",
                erro
            );

        }

    }


    /*====================================================
                    ESTADO
    ====================================================*/

    let notifications =
        carregarNotificacoes();

    let selectedNotificationId =
        null;

    let notificationToDelete =
        null;


    /*====================================================
            INTEGRAÇÃO COM CALENDÁRIO
    ====================================================*/

    function carregarEventosCalendario() {

        try {

            const saved =
                localStorage.getItem(
                    CALENDAR_STORAGE_KEY
                );


            if (!saved) {

                return [];

            }


            const data =
                JSON.parse(saved);


            return Array.isArray(data)
                ? data
                : [];

        } catch (erro) {

            console.warn(
                "Erro ao carregar eventos:",
                erro
            );


            return [];

        }

    }


    function diasAteEvento(dateString) {

        const evento =
            dataLocal(
                dateString
            );


        if (!evento) {

            return null;

        }


        const hoje =
            new Date();


        hoje.setHours(
            0,
            0,
            0,
            0
        );


        evento.setHours(
            0,
            0,
            0,
            0
        );


        return Math.round(
            (
                evento.getTime() -
                hoje.getTime()
            ) /
            86400000
        );

    }


    function sincronizarEventosCalendario() {

        const eventos =
            carregarEventosCalendario();


        let alterou =
            false;


        eventos.forEach(
            function (evento) {

                const dias =
                    diasAteEvento(
                        evento.date
                    );


                /*
                 * Evento deve estar entre hoje
                 * e os próximos 7 dias.
                 */

                if (
                    dias === null ||
                    dias < 0 ||
                    dias > 7
                ) {

                    return;

                }


                const notificationId =
                    `calendar-${evento.id}`;


                const existente =
                    notifications.find(
                        item =>
                            String(item.id) ===
                            notificationId
                    );


                /*
                 * Se já existe, atualizamos os dados
                 * caso o evento tenha sido editado.
                 */

                if (existente) {

                    existente.title =
                        evento.title;

                    existente.type =
                        evento.type ||
                        "Evento";

                    existente.audience =
                        evento.className ||
                        "Todos";

                    existente.eventDate =
                        evento.date;

                    existente.eventTime =
                        evento.time || "";

                    existente.eventLocation =
                        evento.location || "";

                    existente.eventDescription =
                        evento.description || "";

                    alterou =
                        true;

                    return;

                }


                let mensagemTempo;


                if (dias === 0) {

                    mensagemTempo =
                        "Este evento acontece hoje.";

                } else if (dias === 1) {

                    mensagemTempo =
                        "Este evento acontece amanhã.";

                } else {

                    mensagemTempo =
                        `Este evento acontece em ${dias} dias.`;

                }


                let mensagem =
                    mensagemTempo;


                if (evento.className) {

                    mensagem +=
                        ` Turma: ${evento.className}.`;

                }


                if (evento.time) {

                    mensagem +=
                        ` Horário: ${evento.time}.`;

                }


                if (evento.location) {

                    mensagem +=
                        ` Local: ${evento.location}.`;

                }


                if (evento.description) {

                    mensagem +=
                        ` ${evento.description}`;

                }


                notifications.push({

                    id:
                        notificationId,

                    title:
                        evento.title,

                    type:
                        evento.type ||
                        "Evento",

                    audience:
                        evento.className ||
                        "Todos",

                    message:
                        mensagem,

                    date:
                        hojeISO(),

                    time:
                        new Date()
                            .toLocaleTimeString(
                                "pt-BR",
                                {
                                    hour: "2-digit",
                                    minute: "2-digit"
                                }
                            ),

                    read:
                        false,

                    source:
                        "calendar",

                    eventId:
                        evento.id,

                    eventDate:
                        evento.date,

                    eventTime:
                        evento.time || "",

                    eventLocation:
                        evento.location || "",

                    eventDescription:
                        evento.description || ""

                });


                alterou =
                    true;

            }
        );


        if (alterou) {

            salvarNotificacoes();

        }

    }


    /*====================================================
                    SEGURANÇA HTML
    ====================================================*/

    function escapeHtml(value) {

        return String(
            value ?? ""
        )
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    }


    /*====================================================
                    ÍCONES
    ====================================================*/

    function getIcon(type) {

        const icons = {

            "Aviso":
                "fa-solid fa-bullhorn",

            "Evento":
                "fa-solid fa-calendar-day",

            "Prova":
                "fa-solid fa-file-pen",

            "Atividade":
                "fa-solid fa-list-check",

            "Reunião":
                "fa-solid fa-people-group",

            "Feriado":
                "fa-solid fa-calendar-xmark",

            "Sistema":
                "fa-solid fa-gear"

        };


        return (
            icons[type] ||
            "fa-solid fa-bell"
        );

    }


    function getTypeClass(type) {

        const classes = {

            "Aviso":
                "type-aviso",

            "Prova":
                "type-prova",

            "Atividade":
                "type-atividade",

            "Reunião":
                "type-reuniao",

            "Sistema":
                "type-sistema"

        };


        return (
            classes[type] ||
            ""
        );

    }


    /*====================================================
                    FILTROS
    ====================================================*/

    function pegarNotificacoesFiltradas() {

        const termo =
            notificationSearch
                ? notificationSearch
                    .value
                    .trim()
                    .toLowerCase()
                : "";


        const tipo =
            notificationTypeFilter
                ? notificationTypeFilter.value
                : "";


        const status =
            notificationStatusFilter
                ? notificationStatusFilter.value
                : "";


        return notifications
            .filter(
                function (notification) {

                    const texto =
                        [
                            notification.title,
                            notification.message,
                            notification.type,
                            notification.audience
                        ]
                            .join(" ")
                            .toLowerCase();


                    const matchSearch =
                        texto.includes(
                            termo
                        );


                    const matchType =
                        !tipo ||
                        notification.type ===
                        tipo;


                    let matchStatus =
                        true;


                    if (
                        status ===
                        "read"
                    ) {

                        matchStatus =
                            notification.read ===
                            true;

                    }


                    if (
                        status ===
                        "unread"
                    ) {

                        matchStatus =
                            notification.read !==
                            true;

                    }


                    return (
                        matchSearch &&
                        matchType &&
                        matchStatus
                    );

                }
            )
            .sort(
                function (a, b) {

                    const dataA =
                        `${a.date || ""} ${a.time || ""}`;


                    const dataB =
                        `${b.date || ""} ${b.time || ""}`;


                    return dataB.localeCompare(
                        dataA
                    );

                }
            );

    }


    /*====================================================
                    RESUMO
    ====================================================*/

    function atualizarResumo() {

        if (totalNotifications) {

            totalNotifications.textContent =
                notifications.length;

        }


        if (unreadNotifications) {

            unreadNotifications.textContent =
                notifications.filter(
                    item =>
                        !item.read
                ).length;

        }


        if (eventNotifications) {

            eventNotifications.textContent =
                notifications.filter(
                    item =>
                        item.source ===
                        "calendar"
                ).length;

        }


        if (noticeNotifications) {

            noticeNotifications.textContent =
                notifications.filter(
                    item =>
                        item.type ===
                        "Aviso"
                ).length;

        }

    }


    /*====================================================
                    RENDERIZAÇÃO
    ====================================================*/

    function renderNotifications() {

        if (!notificationsList) {

            return;

        }


        const filtered =
            pegarNotificacoesFiltradas();


        notificationsList.innerHTML =
            "";


        if (notificationsEmpty) {

            notificationsEmpty.classList.toggle(
                "active",
                filtered.length === 0
            );

        }


        filtered.forEach(
            function (notification) {

                const card =
                    document.createElement(
                        "article"
                    );


                card.className =
                    "notification-card";


                if (
                    !notification.read
                ) {

                    card.classList.add(
                        "unread"
                    );

                }


                card.dataset.notificationId =
                    notification.id;


                const typeClass =
                    getTypeClass(
                        notification.type
                    );


                card.innerHTML = `

                    <div class="notification-icon ${typeClass}">

                        <i class="${getIcon(notification.type)}"></i>

                    </div>


                    <div class="notification-content">


                        <div class="notification-meta">

                            <span class="notification-type">

                                ${escapeHtml(notification.type)}

                            </span>


                            <span class="notification-audience">

                                ${escapeHtml(notification.audience)}

                            </span>

                        </div>


                        <h3>

                            ${escapeHtml(notification.title)}

                        </h3>


                        <p>

                            ${escapeHtml(notification.message)}

                        </p>


                    </div>


                    <div class="notification-side">

                        <span class="notification-date">

                            ${formatarData(notification.date)}

                            ${
                                notification.time
                                    ? " • " +
                                      escapeHtml(notification.time)
                                    : ""
                            }

                        </span>


                        ${
                            !notification.read
                                ? `
                                    <span
                                        class="unread-dot"
                                        title="Não lida"
                                    ></span>
                                `
                                : ""
                        }

                    </div>

                `;


                notificationsList.appendChild(
                    card
                );

            }
        );


        atualizarResumo();

    }


    /*====================================================
                    MODAIS
    ====================================================*/

    function abrirModal(modal) {

        if (!modal) {

            return;

        }


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

    }


    function fecharModal(modal) {

        if (!modal) {

            return;

        }


        modal.classList.remove(
            "active"
        );


        modal.setAttribute(
            "aria-hidden",
            "true"
        );


        const aberto =
            document.querySelector(
                ".notification-modal.active, .notification-view-modal.active, .delete-notification-modal.active"
            );


        if (!aberto) {

            document.body.classList.remove(
                "modal-open"
            );

        }

    }


    /*====================================================
                    NOVO AVISO
    ====================================================*/

    function abrirNovoAviso() {

        if (!notificationForm) {

            return;

        }


        notificationForm.reset();


        notificationType.value =
            "Aviso";


        notificationAudience.value =
            "Todos";


        abrirModal(
            notificationModal
        );


        notificationTitle.focus();

    }


    if (notificationForm) {

        notificationForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();


                const agora =
                    new Date();


                notifications.push({

                    id:
                        `manual-${Date.now()}`,

                    title:
                        notificationTitle
                            .value
                            .trim(),

                    type:
                        notificationType.value,

                    audience:
                        notificationAudience.value,

                    message:
                        notificationMessage
                            .value
                            .trim(),

                    date:
                        hojeISO(),

                    time:
                        agora.toLocaleTimeString(
                            "pt-BR",
                            {
                                hour: "2-digit",
                                minute: "2-digit"
                            }
                        ),

                    read:
                        false,

                    source:
                        "manual"

                });


                salvarNotificacoes();


                fecharModal(
                    notificationModal
                );


                renderNotifications();

            }
        );

    }


    /*====================================================
                    VISUALIZAÇÃO
    ====================================================*/

    function abrirVisualizacao(
        notification
    ) {

        selectedNotificationId =
            notification.id;


        /*
         * Abrir a notificação marca como lida.
         */

        notification.read =
            true;


        salvarNotificacoes();


        viewNotificationIcon.className =
            `notification-view-icon ${getTypeClass(notification.type)}`;


        viewNotificationIcon.innerHTML = `

            <i class="${getIcon(notification.type)}"></i>

        `;


        viewNotificationType.textContent =
            notification.type;


        viewNotificationTitle.textContent =
            notification.title;


        viewNotificationAudience.textContent =
            notification.audience;


        viewNotificationDate.textContent =
            `${formatarData(notification.date)}${
                notification.time
                    ? " • " +
                      notification.time
                    : ""
            }`;


        viewNotificationMessage.textContent =
            notification.message;


        atualizarBotaoLeitura(
            notification
        );


        abrirModal(
            notificationViewModal
        );


        renderNotifications();

    }


    function atualizarBotaoLeitura(
        notification
    ) {

        if (
            notification.read
        ) {

            toggleReadButton.innerHTML = `

                <i class="fa-solid fa-envelope"></i>

                Marcar como não lida

            `;

        } else {

            toggleReadButton.innerHTML = `

                <i class="fa-solid fa-envelope-open"></i>

                Marcar como lida

            `;

        }

    }


    /*====================================================
                    LEITURA
    ====================================================*/

    function alternarLeitura() {

        const notification =
            notifications.find(
                item =>
                    String(item.id) ===
                    String(
                        selectedNotificationId
                    )
            );


        if (!notification) {

            return;

        }


        notification.read =
            !notification.read;


        salvarNotificacoes();


        atualizarBotaoLeitura(
            notification
        );


        renderNotifications();

    }


    function marcarTodasComoLidas() {

        notifications.forEach(
            function (notification) {

                notification.read =
                    true;

            }
        );


        salvarNotificacoes();


        renderNotifications();

    }


    /*====================================================
                    EXCLUSÃO
    ====================================================*/

    function abrirExclusao() {

        const notification =
            notifications.find(
                item =>
                    String(item.id) ===
                    String(
                        selectedNotificationId
                    )
            );


        if (!notification) {

            return;

        }


        notificationToDelete =
            notification.id;


        deleteNotificationMessage.textContent =
            `Deseja realmente excluir "${notification.title}"?`;


        fecharModal(
            notificationViewModal
        );


        abrirModal(
            deleteNotificationModal
        );

    }


    function confirmarExclusao() {

        if (
            notificationToDelete ===
            null
        ) {

            return;

        }


        notifications =
            notifications.filter(
                item =>
                    String(item.id) !==
                    String(
                        notificationToDelete
                    )
            );


        notificationToDelete =
            null;


        selectedNotificationId =
            null;


        salvarNotificacoes();


        fecharModal(
            deleteNotificationModal
        );


        renderNotifications();

    }


    /*====================================================
                EVENTOS DA LISTA
    ====================================================*/

    if (notificationsList) {

        notificationsList.addEventListener(
            "click",
            function (event) {

                const card =
                    event.target.closest(
                        "[data-notification-id]"
                    );


                if (!card) {

                    return;

                }


                const notification =
                    notifications.find(
                        item =>
                            String(item.id) ===
                            String(
                                card.dataset.notificationId
                            )
                    );


                if (notification) {

                    abrirVisualizacao(
                        notification
                    );

                }

            }
        );

    }


    /*====================================================
                    BOTÕES
    ====================================================*/

    if (newNotificationButton) {

        newNotificationButton.addEventListener(
            "click",
            abrirNovoAviso
        );

    }


    if (markAllReadButton) {

        markAllReadButton.addEventListener(
            "click",
            marcarTodasComoLidas
        );

    }


    if (notificationSearch) {

        notificationSearch.addEventListener(
            "input",
            renderNotifications
        );

    }


    if (notificationTypeFilter) {

        notificationTypeFilter.addEventListener(
            "change",
            renderNotifications
        );

    }


    if (notificationStatusFilter) {

        notificationStatusFilter.addEventListener(
            "change",
            renderNotifications
        );

    }


    if (toggleReadButton) {

        toggleReadButton.addEventListener(
            "click",
            alternarLeitura
        );

    }


    if (deleteNotificationButton) {

        deleteNotificationButton.addEventListener(
            "click",
            abrirExclusao
        );

    }


    if (deleteNotificationConfirm) {

        deleteNotificationConfirm.addEventListener(
            "click",
            confirmarExclusao
        );

    }


    /*====================================================
                    FECHAR MODAIS
    ====================================================*/

    if (notificationModalClose) {

        notificationModalClose.addEventListener(
            "click",
            function () {

                fecharModal(
                    notificationModal
                );

            }
        );

    }


    if (notificationCancelButton) {

        notificationCancelButton.addEventListener(
            "click",
            function () {

                fecharModal(
                    notificationModal
                );

            }
        );

    }


    if (notificationModalOverlay) {

        notificationModalOverlay.addEventListener(
            "click",
            function () {

                fecharModal(
                    notificationModal
                );

            }
        );

    }


    if (notificationViewClose) {

        notificationViewClose.addEventListener(
            "click",
            function () {

                fecharModal(
                    notificationViewModal
                );

            }
        );

    }


    if (notificationViewOverlay) {

        notificationViewOverlay.addEventListener(
            "click",
            function () {

                fecharModal(
                    notificationViewModal
                );

            }
        );

    }


    if (deleteNotificationCancel) {

        deleteNotificationCancel.addEventListener(
            "click",
            function () {

                notificationToDelete =
                    null;


                fecharModal(
                    deleteNotificationModal
                );

            }
        );

    }


    if (deleteNotificationOverlay) {

        deleteNotificationOverlay.addEventListener(
            "click",
            function () {

                notificationToDelete =
                    null;


                fecharModal(
                    deleteNotificationModal
                );

            }
        );

    }


    /*====================================================
                    ESC
    ====================================================*/

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key !==
                "Escape"
            ) {

                return;

            }


            [
                notificationModal,
                notificationViewModal,
                deleteNotificationModal
            ].forEach(
                function (modal) {

                    if (
                        modal &&
                        modal.classList.contains(
                            "active"
                        )
                    ) {

                        fecharModal(
                            modal
                        );

                    }

                }
            );

        }
    );


    /*====================================================
                    LOGOUT
    ====================================================*/

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            function () {

                sessionStorage.removeItem(
                    "primewayLogado"
                );


                sessionStorage.removeItem(
                    "primewayUsuario"
                );


                window.location.href =
                    "login.html";

            }
        );

    }


    /*====================================================
                    INICIALIZAÇÃO
    ====================================================*/

    sincronizarEventosCalendario();


    salvarNotificacoes();


    renderNotifications();

});