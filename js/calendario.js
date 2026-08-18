console.log("CALENDÁRIO JS CARREGADO");

document.addEventListener("DOMContentLoaded", function () {

    /*====================================================
                    STORAGE
    ====================================================*/

    const EVENTS_STORAGE_KEY =
        "primewayCalendarEvents";

    const CLASSES_STORAGE_KEY =
        "primewayClasses";

    const NOTIFICATIONS_STORAGE_KEY =
        "primewayNotifications";


    /*====================================================
                    ELEMENTOS
    ====================================================*/

    const calendarGrid =
        document.querySelector("#calendarGrid");

    const calendarMonth =
        document.querySelector("#calendarMonth");

    const calendarYear =
        document.querySelector("#calendarYear");

    const previousMonthButton =
        document.querySelector("#previousMonthButton");

    const nextMonthButton =
        document.querySelector("#nextMonthButton");

    const todayButton =
        document.querySelector("#todayButton");


    /* FILTROS */

    const eventTypeFilter =
        document.querySelector("#eventTypeFilter");

    const eventClassFilter =
        document.querySelector("#eventClassFilter");


    /* CARDS */

    const monthEventsCount =
        document.querySelector("#monthEventsCount");

    const examEventsCount =
        document.querySelector("#examEventsCount");

    const meetingEventsCount =
        document.querySelector("#meetingEventsCount");

    const upcomingEventsCount =
        document.querySelector("#upcomingEventsCount");


    /* AGENDA */

    const upcomingEventsList =
        document.querySelector("#upcomingEventsList");

    const upcomingEventsEmpty =
        document.querySelector("#upcomingEventsEmpty");


    /* MODAL CADASTRO */

    const newEventButton =
        document.querySelector("#newEventButton");

    const eventModal =
        document.querySelector("#eventModal");

    const eventModalOverlay =
        document.querySelector(".event-modal-overlay");

    const eventModalClose =
        document.querySelector("#eventModalClose");

    const eventCancelButton =
        document.querySelector("#eventCancelButton");

    const eventModalTitle =
        document.querySelector("#eventModalTitle");

    const eventForm =
        document.querySelector("#eventForm");


    /* CAMPOS */

    const eventId =
        document.querySelector("#eventId");

    const eventTitle =
        document.querySelector("#eventTitle");

    const eventType =
        document.querySelector("#eventType");

    const eventClass =
        document.querySelector("#eventClass");

    const eventDate =
        document.querySelector("#eventDate");

    const eventTime =
        document.querySelector("#eventTime");

    const eventLocation =
        document.querySelector("#eventLocation");

    const eventDescription =
        document.querySelector("#eventDescription");


    /* VISUALIZAÇÃO */

    const eventViewModal =
        document.querySelector("#eventViewModal");

    const eventViewOverlay =
        document.querySelector(".event-view-overlay");

    const eventViewClose =
        document.querySelector("#eventViewClose");

    const viewEventIcon =
        document.querySelector("#viewEventIcon");

    const viewEventType =
        document.querySelector("#viewEventType");

    const viewEventTitle =
        document.querySelector("#viewEventTitle");

    const viewEventDate =
        document.querySelector("#viewEventDate");

    const viewEventTime =
        document.querySelector("#viewEventTime");

    const viewEventClass =
        document.querySelector("#viewEventClass");

    const viewEventLocation =
        document.querySelector("#viewEventLocation");

    const viewEventDescription =
        document.querySelector("#viewEventDescription");

    const editEventButton =
        document.querySelector("#editEventButton");

    const deleteEventButton =
        document.querySelector("#deleteEventButton");


    /* EXCLUSÃO */

    const deleteEventModal =
        document.querySelector("#deleteEventModal");

    const deleteEventOverlay =
        document.querySelector(".delete-event-overlay");

    const deleteEventCancel =
        document.querySelector("#deleteEventCancel");

    const deleteEventConfirm =
        document.querySelector("#deleteEventConfirm");

    const deleteEventMessage =
        document.querySelector("#deleteEventMessage");


    const logoutButton =
        document.querySelector("#logoutButton");


    /*====================================================
                    DATAS
    ====================================================*/

    const monthNames = [

        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro"

    ];


    const today =
        new Date();


    let currentDate =
        new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        );


    let selectedEventId =
        null;

    let eventToDelete =
        null;


    /*====================================================
                    FUNÇÕES DE DATA
    ====================================================*/

    function hojeISO() {

        const agora =
            new Date();

        return formatDateKey(
            agora
        );

    }


    function formatDateKey(date) {

        const year =
            date.getFullYear();

        const month =
            String(
                date.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                date.getDate()
            ).padStart(2, "0");


        return `${year}-${month}-${day}`;

    }


    function parseLocalDate(dateString) {

        const [
            year,
            month,
            day
        ] =
            dateString
                .split("-")
                .map(Number);


        return new Date(
            year,
            month - 1,
            day
        );

    }


    function formatBrazilianDate(dateString) {

        if (!dateString) {

            return "-";

        }


        return parseLocalDate(
            dateString
        ).toLocaleDateString(
            "pt-BR"
        );

    }


    /*====================================================
                    EVENTOS PADRÃO
    ====================================================*/

    function criarDataNoAnoAtual(
        month,
        day
    ) {

        const year =
            today.getFullYear();


        return [
            year,
            String(month).padStart(2, "0"),
            String(day).padStart(2, "0")
        ].join("-");

    }


    const defaultEvents = [

        {
            id: 1,
            title: "Avaliação de Matemática",
            type: "Prova",
            className: "1º Ano A",
            date: criarDataNoAnoAtual(8, 21),
            time: "09:00",
            location: "Sala 01",
            description: "Avaliação referente aos conteúdos trabalhados durante o mês."
        },

        {
            id: 2,
            title: "Reunião de responsáveis",
            type: "Reunião",
            className: "",
            date: criarDataNoAnoAtual(8, 24),
            time: "18:30",
            location: "Auditório",
            description: "Reunião geral com responsáveis para acompanhamento do período letivo."
        },

        {
            id: 3,
            title: "Feira de Ciências",
            type: "Evento",
            className: "",
            date: criarDataNoAnoAtual(8, 29),
            time: "10:00",
            location: "Quadra escolar",
            description: "Apresentação dos projetos desenvolvidos pelas turmas."
        }

    ];


    let events =
        carregarEventos();


    /*====================================================
                    STORAGE EVENTOS
    ====================================================*/

    function carregarEventos() {

        try {

            const saved =
                localStorage.getItem(
                    EVENTS_STORAGE_KEY
                );


            if (!saved) {

                return JSON.parse(
                    JSON.stringify(
                        defaultEvents
                    )
                );

            }


            const data =
                JSON.parse(saved);


            return Array.isArray(data)
                ? data
                : [];

        } catch (error) {

            console.warn(
                "Erro ao carregar calendário:",
                error
            );


            return JSON.parse(
                JSON.stringify(
                    defaultEvents
                )
            );

        }

    }


    function salvarEventos() {

        localStorage.setItem(
            EVENTS_STORAGE_KEY,
            JSON.stringify(
                events
            )
        );

    }


    /*====================================================
                    NOTIFICAÇÕES
    ====================================================*/

    function carregarNotificacoes() {

        try {

            const saved =
                localStorage.getItem(
                    NOTIFICATIONS_STORAGE_KEY
                );


            if (!saved) {

                return [];

            }


            const data =
                JSON.parse(saved);


            return Array.isArray(data)
                ? data
                : [];

        } catch (error) {

            console.warn(
                "Erro ao carregar notificações:",
                error
            );


            return [];

        }

    }


    function salvarNotificacoes(
        notifications
    ) {

        localStorage.setItem(
            NOTIFICATIONS_STORAGE_KEY,
            JSON.stringify(
                notifications
            )
        );

    }


    function criarMensagemNotificacao(
        evento
    ) {

        let mensagem =
            `Novo evento agendado para ${formatBrazilianDate(evento.date)}.`;


        if (evento.time) {

            mensagem +=
                ` Horário: ${evento.time}.`;

        }


        if (evento.className) {

            mensagem +=
                ` Turma: ${evento.className}.`;

        } else {

            mensagem +=
                " Destinado a toda a escola.";

        }


        if (evento.location) {

            mensagem +=
                ` Local: ${evento.location}.`;

        }


        if (evento.description) {

            mensagem +=
                ` ${evento.description}`;

        }


        return mensagem;

    }


    function sincronizarNotificacaoEvento(
        evento
    ) {

        const notifications =
            carregarNotificacoes();


        const notificationId =
            `calendar-${evento.id}`;


        const index =
            notifications.findIndex(
                notification =>
                    String(notification.id) ===
                    notificationId
            );


        const agora =
            new Date();


        const novaNotificacao = {

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
                criarMensagemNotificacao(
                    evento
                ),

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

        };


        /*
         * Se já existia uma notificação,
         * preservamos o status de leitura.
         */

        if (index >= 0) {

            novaNotificacao.read =
                Boolean(
                    notifications[index].read
                );


            notifications[index] =
                novaNotificacao;

        } else {

            notifications.push(
                novaNotificacao
            );

        }


        salvarNotificacoes(
            notifications
        );

    }


    function excluirNotificacaoEvento(
        eventoId
    ) {

        let notifications =
            carregarNotificacoes();


        notifications =
            notifications.filter(
                notification =>
                    String(notification.id) !==
                    `calendar-${eventoId}`
            );


        salvarNotificacoes(
            notifications
        );

    }


    /*====================================================
                    TURMAS
    ====================================================*/

    function carregarTurmas() {

        try {

            const saved =
                localStorage.getItem(
                    CLASSES_STORAGE_KEY
                );


            if (!saved) {

                return [];

            }


            const data =
                JSON.parse(saved);


            return Array.isArray(data)
                ? data
                : [];

        } catch (error) {

            console.warn(
                "Erro ao carregar turmas:",
                error
            );


            return [];

        }

    }


    function preencherTurmas() {

        const turmaAtual =
            eventClass.value;


        const filtroAtual =
            eventClassFilter.value;


        const turmas =
            carregarTurmas();


        eventClass.innerHTML = `

            <option value="">
                Toda a escola
            </option>

        `;


        eventClassFilter.innerHTML = `

            <option value="">
                Todas as turmas
            </option>

        `;


        turmas.forEach(
            function (turma) {

                const optionForm =
                    document.createElement(
                        "option"
                    );


                optionForm.value =
                    turma.name;

                optionForm.textContent =
                    turma.name;


                eventClass.appendChild(
                    optionForm
                );


                const optionFilter =
                    document.createElement(
                        "option"
                    );


                optionFilter.value =
                    turma.name;

                optionFilter.textContent =
                    turma.name;


                eventClassFilter.appendChild(
                    optionFilter
                );

            }
        );


        if (
            turmaAtual &&
            turmas.some(
                turma =>
                    turma.name === turmaAtual
            )
        ) {

            eventClass.value =
                turmaAtual;

        }


        if (
            filtroAtual &&
            turmas.some(
                turma =>
                    turma.name === filtroAtual
            )
        ) {

            eventClassFilter.value =
                filtroAtual;

        }

    }


    /*====================================================
                    HELPERS
    ====================================================*/

    function escapeHtml(value) {

        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    }


    function getEventTypeClass(type) {

        const map = {

            "Prova":
                "type-prova",

            "Atividade":
                "type-atividade",

            "Reunião":
                "type-reuniao",

            "Feriado":
                "type-feriado",

            "Aviso":
                "type-aviso"

        };


        return (
            map[type] ||
            "type-evento"
        );

    }


    function getEventIcon(type) {

        const map = {

            "Prova":
                "fa-solid fa-file-pen",

            "Atividade":
                "fa-solid fa-list-check",

            "Reunião":
                "fa-solid fa-people-group",

            "Evento":
                "fa-solid fa-star",

            "Feriado":
                "fa-solid fa-umbrella-beach",

            "Aviso":
                "fa-solid fa-bullhorn"

        };


        return (
            map[type] ||
            "fa-solid fa-calendar-day"
        );

    }


    /*====================================================
                    FILTROS
    ====================================================*/

    function filtrarEventos() {

        const type =
            eventTypeFilter.value;


        const className =
            eventClassFilter.value;


        return events.filter(
            function (evento) {

                const matchType =
                    !type ||
                    evento.type === type;


                const matchClass =
                    !className ||
                    evento.className ===
                    className;


                return (
                    matchType &&
                    matchClass
                );

            }
        );

    }


    /*====================================================
                    CALENDÁRIO
    ====================================================*/

    function renderCalendar() {

        calendarGrid.innerHTML =
            "";


        const year =
            currentDate.getFullYear();


        const month =
            currentDate.getMonth();


        calendarMonth.textContent =
            monthNames[month];


        calendarYear.textContent =
            year;


        const firstDay =
            new Date(
                year,
                month,
                1
            );


        const startDate =
            new Date(
                year,
                month,
                1 - firstDay.getDay()
            );


        const filteredEvents =
            filtrarEventos();


        for (
            let index = 0;
            index < 42;
            index++
        ) {

            const date =
                new Date(
                    startDate
                );


            date.setDate(
                startDate.getDate() +
                index
            );


            const day =
                document.createElement(
                    "div"
                );


            day.className =
                "calendar-day";


            if (
                date.getMonth() !==
                month
            ) {

                day.classList.add(
                    "other-month"
                );

            }


            const dateKey =
                formatDateKey(
                    date
                );


            if (
                dateKey ===
                formatDateKey(today)
            ) {

                day.classList.add(
                    "today"
                );

            }


            const dayEvents =
                filteredEvents
                    .filter(
                        evento =>
                            evento.date ===
                            dateKey
                    )
                    .sort(
                        function (a, b) {

                            return (
                                (a.time || "")
                                    .localeCompare(
                                        b.time ||
                                        ""
                                    )
                            );

                        }
                    );


            const visibleEvents =
                dayEvents.slice(
                    0,
                    3
                );


            const eventsHtml =
                visibleEvents
                    .map(
                        function (evento) {

                            return `

                                <div
                                    class="calendar-event ${getEventTypeClass(evento.type)}"
                                    data-event-id="${evento.id}"
                                    title="${escapeHtml(evento.title)}"
                                >

                                    ${
                                        evento.time
                                            ? escapeHtml(evento.time) + " "
                                            : ""
                                    }

                                    ${escapeHtml(evento.title)}

                                </div>

                            `;

                        }
                    )
                    .join("");


            const more =
                dayEvents.length > 3
                    ? `
                        <span class="more-events">

                            +${dayEvents.length - 3} evento(s)

                        </span>
                    `
                    : "";


            day.innerHTML = `

                <div class="day-number">

                    ${date.getDate()}

                </div>


                <div class="day-events">

                    ${eventsHtml}

                    ${more}

                </div>

            `;


            day.dataset.date =
                dateKey;


            calendarGrid.appendChild(
                day
            );

        }


        atualizarResumo();

        renderUpcomingEvents();

    }


    /*====================================================
                    RESUMO
    ====================================================*/

    function atualizarResumo() {

        const month =
            currentDate.getMonth();


        const year =
            currentDate.getFullYear();


        const monthEvents =
            events.filter(
                function (evento) {

                    const date =
                        parseLocalDate(
                            evento.date
                        );


                    return (
                        date.getMonth() ===
                        month &&
                        date.getFullYear() ===
                        year
                    );

                }
            );


        monthEventsCount.textContent =
            monthEvents.length;


        examEventsCount.textContent =
            monthEvents.filter(
                evento =>
                    evento.type ===
                    "Prova"
            ).length;


        meetingEventsCount.textContent =
            monthEvents.filter(
                evento =>
                    evento.type ===
                    "Reunião"
            ).length;


        const todayKey =
            formatDateKey(
                today
            );


        upcomingEventsCount.textContent =
            events.filter(
                evento =>
                    evento.date >=
                    todayKey
            ).length;

    }


    /*====================================================
                    PRÓXIMOS EVENTOS
    ====================================================*/

    function renderUpcomingEvents() {

        const todayKey =
            formatDateKey(
                today
            );


        const upcoming =
            filtrarEventos()
                .filter(
                    evento =>
                        evento.date >=
                        todayKey
                )
                .sort(
                    function (a, b) {

                        const dateCompare =
                            a.date.localeCompare(
                                b.date
                            );


                        if (
                            dateCompare !== 0
                        ) {

                            return dateCompare;

                        }


                        return (
                            (a.time || "")
                                .localeCompare(
                                    b.time || ""
                                )
                        );

                    }
                )
                .slice(
                    0,
                    6
                );


        upcomingEventsList.innerHTML =
            "";


        upcomingEventsEmpty.classList.toggle(
            "active",
            upcoming.length === 0
        );


        upcoming.forEach(
            function (evento) {

                const card =
                    document.createElement(
                        "article"
                    );


                card.className =
                    "upcoming-card";


                card.dataset.eventId =
                    evento.id;


                card.innerHTML = `

                    <div class="upcoming-card-top">

                        <span class="upcoming-type">

                            ${escapeHtml(evento.type)}

                        </span>

                        <span class="upcoming-date">

                            ${formatBrazilianDate(evento.date)}

                        </span>

                    </div>


                    <strong>

                        ${escapeHtml(evento.title)}

                    </strong>


                    <p>

                        ${
                            evento.className
                                ? escapeHtml(evento.className)
                                : "Toda a escola"
                        }

                        ${
                            evento.time
                                ? " • " + escapeHtml(evento.time)
                                : ""
                        }

                    </p>

                `;


                upcomingEventsList.appendChild(
                    card
                );

            }
        );

    }


    /*====================================================
                    MODAL EVENTO
    ====================================================*/

    function abrirModalEvento(
        eventData = null,
        selectedDate = null
    ) {

        eventForm.reset();

        preencherTurmas();


        if (eventData) {

            eventModalTitle.textContent =
                "Editar evento";


            eventId.value =
                eventData.id;


            eventTitle.value =
                eventData.title;


            eventType.value =
                eventData.type;


            eventClass.value =
                eventData.className ||
                "";


            eventDate.value =
                eventData.date;


            eventTime.value =
                eventData.time ||
                "";


            eventLocation.value =
                eventData.location ||
                "";


            eventDescription.value =
                eventData.description ||
                "";

        } else {

            eventModalTitle.textContent =
                "Novo evento";


            eventId.value =
                "";


            eventDate.value =
                selectedDate ||
                formatDateKey(
                    today
                );

        }


        abrirModal(
            eventModal
        );


        eventTitle.focus();

    }


    /*====================================================
                    SALVAR EVENTO
    ====================================================*/

    eventForm.addEventListener(
        "submit",
        function (formEvent) {

            formEvent.preventDefault();


            const id =
                eventId.value
                    ? Number(
                        eventId.value
                    )
                    : Date.now();


            const data = {

                id:

                    id,

                title:

                    eventTitle
                        .value
                        .trim(),

                type:

                    eventType.value,

                className:

                    eventClass.value,

                date:

                    eventDate.value,

                time:

                    eventTime.value,

                location:

                    eventLocation
                        .value
                        .trim(),

                description:

                    eventDescription
                        .value
                        .trim()

            };


            const index =
                events.findIndex(
                    evento =>
                        Number(evento.id) ===
                        Number(id)
                );


            if (
                index >= 0
            ) {

                events[index] =
                    data;

            } else {

                events.push(
                    data
                );

            }


            /*
             * Primeiro salva o calendário.
             */

            salvarEventos();


            /*
             * Depois cria ou atualiza
             * a notificação correspondente.
             */

            sincronizarNotificacaoEvento(
                data
            );


            const savedDate =
                parseLocalDate(
                    data.date
                );


            currentDate =
                new Date(
                    savedDate.getFullYear(),
                    savedDate.getMonth(),
                    1
                );


            fecharModal(
                eventModal
            );


            renderCalendar();

        }
    );


    /*====================================================
                    VISUALIZAÇÃO
    ====================================================*/

    function abrirVisualizacao(
        eventData
    ) {

        selectedEventId =
            eventData.id;


        viewEventIcon.className =
            getEventIcon(
                eventData.type
            );


        viewEventType.textContent =
            eventData.type;


        viewEventTitle.textContent =
            eventData.title;


        viewEventDate.textContent =
            formatBrazilianDate(
                eventData.date
            );


        viewEventTime.textContent =
            eventData.time ||
            "Não informado";


        viewEventClass.textContent =
            eventData.className ||
            "Toda a escola";


        viewEventLocation.textContent =
            eventData.location ||
            "Não informado";


        viewEventDescription.textContent =
            eventData.description ||
            "Nenhuma descrição informada.";


        abrirModal(
            eventViewModal
        );

    }


    /*====================================================
                    EXCLUSÃO
    ====================================================*/

    function abrirConfirmacaoExclusao(
        eventData
    ) {

        eventToDelete =
            eventData.id;


        deleteEventMessage.textContent =
            `Deseja realmente excluir "${eventData.title}"?`;


        fecharModal(
            eventViewModal
        );


        abrirModal(
            deleteEventModal
        );

    }


    function confirmarExclusao() {

        if (
            eventToDelete ===
            null
        ) {

            return;

        }


        /*
         * Remove evento.
         */

        events =
            events.filter(
                evento =>
                    Number(evento.id) !==
                    Number(eventToDelete)
            );


        salvarEventos();


        /*
         * Remove também a notificação
         * ligada ao evento.
         */

        excluirNotificacaoEvento(
            eventToDelete
        );


        eventToDelete =
            null;


        selectedEventId =
            null;


        fecharModal(
            deleteEventModal
        );


        renderCalendar();

    }


    /*====================================================
                    MODAIS
    ====================================================*/

    function abrirModal(modal) {

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

        modal.classList.remove(
            "active"
        );


        modal.setAttribute(
            "aria-hidden",
            "true"
        );


        const anyOpen =
            document.querySelector(
                ".event-modal.active, .event-view-modal.active, .delete-event-modal.active"
            );


        if (!anyOpen) {

            document.body.classList.remove(
                "modal-open"
            );

        }

    }


    /*====================================================
                    CLIQUE CALENDÁRIO
    ====================================================*/

    calendarGrid.addEventListener(
        "click",
        function (clickEvent) {

            const eventElement =
                clickEvent.target.closest(
                    "[data-event-id]"
                );


            if (eventElement) {

                clickEvent.stopPropagation();


                const data =
                    events.find(
                        evento =>
                            Number(evento.id) ===
                            Number(
                                eventElement.dataset.eventId
                            )
                    );


                if (data) {

                    abrirVisualizacao(
                        data
                    );

                }


                return;

            }


            const day =
                clickEvent.target.closest(
                    ".calendar-day"
                );


            if (!day) {

                return;

            }


            abrirModalEvento(
                null,
                day.dataset.date
            );

        }
    );


    /*====================================================
                    AGENDA
    ====================================================*/

    upcomingEventsList.addEventListener(
        "click",
        function (clickEvent) {

            const card =
                clickEvent.target.closest(
                    "[data-event-id]"
                );


            if (!card) {

                return;

            }


            const data =
                events.find(
                    evento =>
                        Number(evento.id) ===
                        Number(
                            card.dataset.eventId
                        )
                );


            if (data) {

                abrirVisualizacao(
                    data
                );

            }

        }
    );


    /*====================================================
                    BOTÕES
    ====================================================*/

    newEventButton.addEventListener(
        "click",
        function () {

            abrirModalEvento();

        }
    );


    previousMonthButton.addEventListener(
        "click",
        function () {

            currentDate =
                new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth() - 1,
                    1
                );


            renderCalendar();

        }
    );


    nextMonthButton.addEventListener(
        "click",
        function () {

            currentDate =
                new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth() + 1,
                    1
                );


            renderCalendar();

        }
    );


    todayButton.addEventListener(
        "click",
        function () {

            currentDate =
                new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    1
                );


            renderCalendar();

        }
    );


    eventTypeFilter.addEventListener(
        "change",
        renderCalendar
    );


    eventClassFilter.addEventListener(
        "change",
        renderCalendar
    );


    /*====================================================
                    EDITAR
    ====================================================*/

    editEventButton.addEventListener(
        "click",
        function () {

            const data =
                events.find(
                    evento =>
                        Number(evento.id) ===
                        Number(
                            selectedEventId
                        )
                );


            if (!data) {

                return;

            }


            fecharModal(
                eventViewModal
            );


            abrirModalEvento(
                data
            );

        }
    );


    /*====================================================
                    EXCLUIR
    ====================================================*/

    deleteEventButton.addEventListener(
        "click",
        function () {

            const data =
                events.find(
                    evento =>
                        Number(evento.id) ===
                        Number(
                            selectedEventId
                        )
                );


            if (data) {

                abrirConfirmacaoExclusao(
                    data
                );

            }

        }
    );


    deleteEventConfirm.addEventListener(
        "click",
        confirmarExclusao
    );


    /*====================================================
                    FECHAR MODAIS
    ====================================================*/

    eventModalClose.addEventListener(
        "click",
        () =>
            fecharModal(
                eventModal
            )
    );


    eventCancelButton.addEventListener(
        "click",
        () =>
            fecharModal(
                eventModal
            )
    );


    eventModalOverlay.addEventListener(
        "click",
        () =>
            fecharModal(
                eventModal
            )
    );


    eventViewClose.addEventListener(
        "click",
        () =>
            fecharModal(
                eventViewModal
            )
    );


    eventViewOverlay.addEventListener(
        "click",
        () =>
            fecharModal(
                eventViewModal
            )
    );


    deleteEventCancel.addEventListener(
        "click",
        function () {

            eventToDelete =
                null;


            fecharModal(
                deleteEventModal
            );

        }
    );


    deleteEventOverlay.addEventListener(
        "click",
        function () {

            eventToDelete =
                null;


            fecharModal(
                deleteEventModal
            );

        }
    );


    /*====================================================
                    ESC
    ====================================================*/

    document.addEventListener(
        "keydown",
        function (keyEvent) {

            if (
                keyEvent.key !==
                "Escape"
            ) {

                return;

            }


            [
                eventModal,
                eventViewModal,
                deleteEventModal
            ].forEach(
                function (modal) {

                    if (
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

    salvarEventos();

    preencherTurmas();

    renderCalendar();

});