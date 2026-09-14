/*====================================================
        CALENDÁRIO - PRIMEWAY SCHOOL
====================================================*/

document.addEventListener("DOMContentLoaded", async function () {
    await window.PrimeWayStorage?.ready;

    /*====================================================
                STORAGE / AUTENTICAÇÃO
    ====================================================*/

    const EVENTS_STORAGE_KEY =
        "primewayCalendarEvents";

    const CLASSES_STORAGE_KEY =
        "primewayClasses";

    const NOTIFICATIONS_STORAGE_KEY =
        "primewayNotifications";


    const AUTH_SESSION_URL =
        "../api/auth/session.php";

    const AUTH_LOGOUT_URL =
        "../api/auth/logout.php";


    const SESSION_LOGADO_KEY =
        "primewayLogado";

    const SESSION_USUARIO_KEY =
        "primewayUsuario";

    const SESSION_PERFIL_KEY =
        "primewayPerfil";


    const PERFIS_PERMITIDOS =
        new Set([
            "admin",
            "professor"
        ]);


    const PAGINA_LOGIN =
        "login.html";


    /*====================================================
            COMPATIBILIDADE COM O FRONT-END ATUAL
    ====================================================*/

    /*
        A sessão PHP é a fonte de verdade.

        O sessionStorage continua sendo mantido
        temporariamente apenas para compatibilidade
        com as páginas que ainda não foram migradas.
    */

    function limparSessaoCompatibilidade() {

        sessionStorage.removeItem(
            SESSION_LOGADO_KEY
        );


        sessionStorage.removeItem(
            SESSION_USUARIO_KEY
        );


        sessionStorage.removeItem(
            SESSION_PERFIL_KEY
        );
    }


    function sincronizarSessaoCompatibilidade(
        usuario
    ) {

        sessionStorage.setItem(
            SESSION_LOGADO_KEY,
            "true"
        );


        sessionStorage.setItem(
            SESSION_USUARIO_KEY,
            String(
                usuario.email || ""
            )
        );


        sessionStorage.setItem(
            SESSION_PERFIL_KEY,
            String(
                usuario.perfil || ""
            )
        );
    }


    /*====================================================
                RESPOSTA JSON SEGURA
    ====================================================*/

    async function lerJsonSeguro(
        response
    ) {

        try {

            return await response.json();

        } catch {

            return null;
        }
    }


    /*====================================================
                VERIFICAÇÃO DE SESSÃO PHP
    ====================================================*/

    async function obterSessaoServidor() {

        try {

            const response =
                await fetch(
                    AUTH_SESSION_URL,
                    {
                        method:
                            "GET",

                        credentials:
                            "same-origin",

                        cache:
                            "no-store",

                        headers: {
                            "Accept":
                                "application/json"
                        }
                    }
                );


            const data =
                await lerJsonSeguro(
                    response
                );


            if (
                !response.ok ||
                !data?.authenticated ||
                !data?.usuario
            ) {

                limparSessaoCompatibilidade();


                window.location.replace(
                    PAGINA_LOGIN
                );


                return null;
            }


            const usuario =
                data.usuario;


            const perfil =
                String(
                    usuario.perfil || ""
                ).trim();


            if (
                !PERFIS_PERMITIDOS.has(
                    perfil
                )
            ) {

                limparSessaoCompatibilidade();


                window.location.replace(
                    PAGINA_LOGIN
                );


                return null;
            }


            sincronizarSessaoCompatibilidade(
                usuario
            );


            return {
                ...usuario,
                perfil
            };

        } catch (
            error
        ) {

            console.error(
                "Erro ao validar a sessão do Calendário:",
                error
            );


            limparSessaoCompatibilidade();


            window.location.replace(
                PAGINA_LOGIN
            );


            return null;
        }
    }


    const usuarioSessao =
        await obterSessaoServidor();


    if (
        !usuarioSessao
    ) {

        return;
    }


    const perfilUsuario =
        usuarioSessao.perfil;


    /*
        Nesta etapa, Admin gerencia o calendário.

        Professor pode consultar eventos, filtros e
        agenda, mas não cria, edita ou exclui eventos
        enquanto a sessão ainda não possui um vínculo
        confiável com suas turmas e disciplinas.

        A autorização real das operações de dados será
        reforçada também nos endpoints PHP quando o
        calendário deixar o localStorage.
    */

    const usuarioPodeGerenciarCalendario =
        perfilUsuario ===
        "admin";


    /*====================================================
                    ELEMENTOS
    ====================================================*/

    const calendarGrid =
        document.querySelector(
            "#calendarGrid"
        );

    const calendarMonth =
        document.querySelector(
            "#calendarMonth"
        );

    const calendarYear =
        document.querySelector(
            "#calendarYear"
        );

    const previousMonthButton =
        document.querySelector(
            "#previousMonthButton"
        );

    const nextMonthButton =
        document.querySelector(
            "#nextMonthButton"
        );

    const todayButton =
        document.querySelector(
            "#todayButton"
        );


    /* FILTROS */

    const eventTypeFilter =
        document.querySelector(
            "#eventTypeFilter"
        );

    const eventClassFilter =
        document.querySelector(
            "#eventClassFilter"
        );


    /* CARDS */

    const monthEventsCount =
        document.querySelector(
            "#monthEventsCount"
        );

    const examEventsCount =
        document.querySelector(
            "#examEventsCount"
        );

    const meetingEventsCount =
        document.querySelector(
            "#meetingEventsCount"
        );

    const upcomingEventsCount =
        document.querySelector(
            "#upcomingEventsCount"
        );


    /* AGENDA */

    const upcomingEventsList =
        document.querySelector(
            "#upcomingEventsList"
        );

    const upcomingEventsEmpty =
        document.querySelector(
            "#upcomingEventsEmpty"
        );


    /* MODAL CADASTRO */

    const newEventButton =
        document.querySelector(
            "#newEventButton"
        );

    const eventModal =
        document.querySelector(
            "#eventModal"
        );

    const eventModalOverlay =
        document.querySelector(
            ".event-modal-overlay"
        );

    const eventModalClose =
        document.querySelector(
            "#eventModalClose"
        );

    const eventCancelButton =
        document.querySelector(
            "#eventCancelButton"
        );

    const eventModalTitle =
        document.querySelector(
            "#eventModalTitle"
        );

    const eventForm =
        document.querySelector(
            "#eventForm"
        );


    /* CAMPOS */

    const eventId =
        document.querySelector(
            "#eventId"
        );

    const eventTitle =
        document.querySelector(
            "#eventTitle"
        );

    const eventType =
        document.querySelector(
            "#eventType"
        );

    const eventClass =
        document.querySelector(
            "#eventClass"
        );

    const eventDate =
        document.querySelector(
            "#eventDate"
        );

    const eventTime =
        document.querySelector(
            "#eventTime"
        );

    const eventLocation =
        document.querySelector(
            "#eventLocation"
        );

    const eventDescription =
        document.querySelector(
            "#eventDescription"
        );


    /* VISUALIZAÇÃO */

    const eventViewModal =
        document.querySelector(
            "#eventViewModal"
        );

    const eventViewOverlay =
        document.querySelector(
            ".event-view-overlay"
        );

    const eventViewClose =
        document.querySelector(
            "#eventViewClose"
        );

    const viewEventIcon =
        document.querySelector(
            "#viewEventIcon"
        );

    const viewEventType =
        document.querySelector(
            "#viewEventType"
        );

    const viewEventTitle =
        document.querySelector(
            "#viewEventTitle"
        );

    const viewEventDate =
        document.querySelector(
            "#viewEventDate"
        );

    const viewEventTime =
        document.querySelector(
            "#viewEventTime"
        );

    const viewEventClass =
        document.querySelector(
            "#viewEventClass"
        );

    const viewEventLocation =
        document.querySelector(
            "#viewEventLocation"
        );

    const viewEventDescription =
        document.querySelector(
            "#viewEventDescription"
        );

    const editEventButton =
        document.querySelector(
            "#editEventButton"
        );

    const deleteEventButton =
        document.querySelector(
            "#deleteEventButton"
        );


    /* EXCLUSÃO */

    const deleteEventModal =
        document.querySelector(
            "#deleteEventModal"
        );

    const deleteEventOverlay =
        document.querySelector(
            ".delete-event-overlay"
        );

    const deleteEventCancel =
        document.querySelector(
            "#deleteEventCancel"
        );

    const deleteEventConfirm =
        document.querySelector(
            "#deleteEventConfirm"
        );

    const deleteEventMessage =
        document.querySelector(
            "#deleteEventMessage"
        );


    /* LOGOUT */

    const logoutButton =
        document.querySelector(
            "#logoutButton"
        );


    /*====================================================
            VALIDAÇÃO DA ESTRUTURA
    ====================================================*/

    const elementosObrigatorios = [

        calendarGrid,
        calendarMonth,
        calendarYear,

        previousMonthButton,
        nextMonthButton,
        todayButton,

        eventTypeFilter,
        eventClassFilter,

        monthEventsCount,
        examEventsCount,
        meetingEventsCount,
        upcomingEventsCount,

        upcomingEventsList,
        upcomingEventsEmpty,

        newEventButton,

        eventModal,
        eventModalOverlay,
        eventModalClose,
        eventCancelButton,
        eventModalTitle,
        eventForm,

        eventId,
        eventTitle,
        eventType,
        eventClass,
        eventDate,
        eventTime,
        eventLocation,
        eventDescription,

        eventViewModal,
        eventViewOverlay,
        eventViewClose,

        viewEventIcon,
        viewEventType,
        viewEventTitle,
        viewEventDate,
        viewEventTime,
        viewEventClass,
        viewEventLocation,
        viewEventDescription,

        editEventButton,
        deleteEventButton,

        deleteEventModal,
        deleteEventOverlay,
        deleteEventCancel,
        deleteEventConfirm,
        deleteEventMessage

    ];


    if (
        elementosObrigatorios.some(
            elemento =>
                !elemento
        )
    ) {

        console.error(
            "Calendário: a estrutura esperada da página não foi encontrada."
        );


        return;

    }


    function aplicarPermissoesInterface() {

        if (
            usuarioPodeGerenciarCalendario
        ) {

            return;

        }


        /*
            O perfil Professor permanece em modo
            somente leitura nesta etapa.

            Ocultar os controles evita oferecer ações
            que o protótipo ainda não consegue limitar
            com segurança às turmas do professor.
        */

        [
            newEventButton,
            editEventButton,
            deleteEventButton
        ].forEach(
            function (button) {

                button.hidden =
                    true;


                button.setAttribute(
                    "aria-hidden",
                    "true"
                );


                button.setAttribute(
                    "tabindex",
                    "-1"
                );

            }
        );

    }


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


    const EVENT_TYPES =
        new Set([
            "Prova",
            "Atividade",
            "Reunião",
            "Evento",
            "Feriado",
            "Aviso"
        ]);


    function formatDateKey(
        date
    ) {

        const year =
            date.getFullYear();


        const month =
            String(
                date.getMonth() + 1
            ).padStart(
                2,
                "0"
            );


        const day =
            String(
                date.getDate()
            ).padStart(
                2,
                "0"
            );


        return `${year}-${month}-${day}`;

    }


    function hojeISO() {

        return formatDateKey(
            new Date()
        );

    }


    function parseLocalDate(
        dateString
    ) {

        const valor =
            String(
                dateString || ""
            );


        if (
            !/^\d{4}-\d{2}-\d{2}$/.test(
                valor
            )
        ) {

            return null;

        }


        const [
            year,
            month,
            day
        ] =
            valor
                .split("-")
                .map(Number);


        const date =
            new Date(
                year,
                month - 1,
                day
            );


        const valida =
            date.getFullYear() ===
                year &&
            date.getMonth() ===
                month - 1 &&
            date.getDate() ===
                day;


        return valida
            ? date
            : null;

    }


    function formatBrazilianDate(
        dateString
    ) {

        const date =
            parseLocalDate(
                dateString
            );


        if (!date) {

            return "-";

        }


        return date.toLocaleDateString(
            "pt-BR"
        );

    }


    const agoraInicial =
        new Date();


    let currentDate =
        new Date(
            agoraInicial.getFullYear(),
            agoraInicial.getMonth(),
            1
        );


    let selectedEventId =
        null;


    let eventToDelete =
        null;


    const focoAnteriorPorModal =
        new WeakMap();


    /*====================================================
                UTILITÁRIOS
    ====================================================*/

    function normalizarTexto(
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


    function normalizarIdOpcional(
        value
    ) {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {

            return null;

        }


        const id =
            Number(
                value
            );


        return (
            Number.isFinite(
                id
            ) &&
            id > 0
        )
            ? id
            : null;

    }


    function elementoPodeReceberFoco(
        elemento
    ) {

        return Boolean(
            elemento &&
            elemento.isConnected &&
            typeof elemento.focus ===
                "function" &&
            elemento.getClientRects()
                .length > 0
        );

    }


    /*====================================================
                TURMAS PADRÃO
    ====================================================*/

    const defaultClasses = [

        {
            id: 1,
            name: "1º Ano A",
            status: "Ativa"
        },

        {
            id: 2,
            name: "2º Ano B",
            status: "Ativa"
        },

        {
            id: 3,
            name: "3º Ano A",
            status: "Ativa"
        },

        {
            id: 4,
            name: "4º Ano B",
            status: "Ativa"
        }

    ];


    function clonarTurmasPadrao() {

        return [];

    }


    function normalizarTurma(
        turma
    ) {

        if (
            !turma ||
            typeof turma !==
                "object"
        ) {

            return null;

        }


        const name =
            String(
                turma.name ??
                ""
            ).trim();


        if (!name) {

            return null;

        }


        return {

            ...turma,

            /*
                O Calendário apenas consulta as turmas.

                Ele não deve criar um identificador
                provisório para uma turma antiga sem ID.
                A geração e persistência do ID estável
                pertence ao módulo Turmas.
            */

            id:
                normalizarIdOpcional(
                    turma.id
                ),

            name,

            status:
                String(
                    turma.status ??
                    ""
                ).trim()

        };

    }


    function carregarTurmas() {

        try {

            const saved =
                localStorage.getItem(
                    CLASSES_STORAGE_KEY
                );


            /*
                O Calendário apenas consulta Turmas.

                Caso o módulo Turmas ainda não tenha
                sido inicializado, utiliza a lista
                padrão sem criar primewayClasses.
            */

            if (!saved) {

                return clonarTurmasPadrao();

            }


            const data =
                JSON.parse(
                    saved
                );


            if (
                !Array.isArray(
                    data
                )
            ) {

                return clonarTurmasPadrao();

            }


            return data
                .map(
                    normalizarTurma
                )
                .filter(
                    Boolean
                );

        } catch (error) {

            console.warn(
                "Erro ao carregar turmas:",
                error
            );


            return clonarTurmasPadrao();

        }

    }


    function turmaEstaAtiva(
        turma
    ) {

        const status =
            normalizarTexto(
                turma?.status
            );


        /*
            Turmas antigas sem status continuam
            disponíveis por compatibilidade.
        */

        return (
            !status ||
            status === "ativa" ||
            status === "ativo"
        );

    }


    function ordenarTurmas(
        turmas
    ) {

        return [
            ...turmas
        ].sort(
            function (
                a,
                b
            ) {

                return a.name.localeCompare(
                    b.name,
                    "pt-BR",
                    {
                        numeric: true,
                        sensitivity: "base"
                    }
                );

            }
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
            new Date()
                .getFullYear();


        return [

            year,

            String(
                month
            ).padStart(
                2,
                "0"
            ),

            String(
                day
            ).padStart(
                2,
                "0"
            )

        ].join("-");

    }


    const defaultEvents = [

        {
            id: 1,
            title: "Avaliação de Matemática",
            type: "Prova",
            classId: 1,
            className: "1º Ano A",
            date: criarDataNoAnoAtual(
                8,
                21
            ),
            time: "09:00",
            location: "Sala 01",
            description:
                "Avaliação referente aos conteúdos trabalhados durante o mês."
        },

        {
            id: 2,
            title: "Reunião de responsáveis",
            type: "Reunião",
            classId: null,
            className: "",
            date: criarDataNoAnoAtual(
                8,
                24
            ),
            time: "18:30",
            location: "Auditório",
            description:
                "Reunião geral com responsáveis para acompanhamento do período letivo."
        },

        {
            id: 3,
            title: "Feira de Ciências",
            type: "Evento",
            classId: null,
            className: "",
            date: criarDataNoAnoAtual(
                8,
                29
            ),
            time: "10:00",
            location:
                "Quadra escolar",
            description:
                "Apresentação dos projetos desenvolvidos pelas turmas."
        }

    ];


    function clonarEventosPadrao() {

        return [];

    }


    /*====================================================
            VÍNCULO EVENTO / TURMA
    ====================================================*/

    function localizarTurmaDoEvento(
        evento,
        turmas = carregarTurmas()
    ) {

        const classId =
            normalizarIdOpcional(
                evento?.classId
            );


        if (
            classId !==
            null
        ) {

            /*
                Quando o evento já possui classId,
                ele é a referência principal.

                Se a turma tiver sido removida, não
                fazemos fallback pelo nome para evitar
                religar silenciosamente o evento a uma
                nova turma homônima.
            */

            return (
                turmas.find(
                    turma =>
                        normalizarIdOpcional(
                            turma.id
                        ) ===
                        classId
                ) ||
                null
            );

        }


        /*
            O nome é usado somente como fallback de
            migração para registros antigos sem classId.
        */

        const nome =
            normalizarTexto(
                evento?.className ||
                evento?.class ||
                evento?.turma
            );


        if (!nome) {

            return null;

        }


        return (
            turmas.find(
                turma =>
                    normalizarTexto(
                        turma.name
                    ) ===
                    nome
            ) ||
            null
        );

    }


    function normalizarEvento(
        evento,
        index = 0,
        turmas = carregarTurmas()
    ) {

        if (
            !evento ||
            typeof evento !==
                "object"
        ) {

            return null;

        }


        const title =
            String(
                evento.title ??
                ""
            ).trim();


        const date =
            String(
                evento.date ??
                ""
            ).trim();


        if (
            !title ||
            !parseLocalDate(
                date
            )
        ) {

            return null;

        }


        const idOriginal =
            Number(
                evento.id
            );


        const classIdOriginal =
            normalizarIdOpcional(
                evento.classId
            );


        const turmaVinculada =
            localizarTurmaDoEvento(
                evento,
                turmas
            );


        const classNameOriginal =
            String(
                evento.className ||
                evento.class ||
                evento.turma ||
                ""
            ).trim();


        const typeOriginal =
            String(
                evento.type ||
                "Evento"
            ).trim();


        const timeOriginal =
            String(
                evento.time ||
                ""
            ).trim();


        const normalizado = {

            ...evento,

            id:
                Number.isFinite(
                    idOriginal
                )
                    ? idOriginal
                    : Date.now() +
                        index,

            title,

            type:
                EVENT_TYPES.has(
                    typeOriginal
                )
                    ? typeOriginal
                    : "Evento",

            classId:
                turmaVinculada
                    ? normalizarIdOpcional(
                        turmaVinculada.id
                    )
                    : classIdOriginal,

            className:
                turmaVinculada
                    ? turmaVinculada.name
                    : classNameOriginal,

            date,

            time:
                /^([01]\d|2[0-3]):[0-5]\d$/
                    .test(
                        timeOriginal
                    )
                    ? timeOriginal
                    : "",

            location:
                String(
                    evento.location ??
                    ""
                ).trim(),

            description:
                String(
                    evento.description ??
                    ""
                ).trim()

        };


        /*
            Compatibilidade com versões antigas.
        */

        delete normalizado.class;

        delete normalizado.turma;


        return normalizado;

    }


    /*====================================================
                STORAGE DE EVENTOS
    ====================================================*/

    function carregarEventos() {

        try {

            const saved =
                localStorage.getItem(
                    EVENTS_STORAGE_KEY
                );


            if (!saved) {

                return clonarEventosPadrao();

            }


            const data =
                JSON.parse(
                    saved
                );


            if (
                !Array.isArray(
                    data
                )
            ) {

                return clonarEventosPadrao();

            }


            const turmas =
                carregarTurmas();


            return data
                .map(
                    function (
                        evento,
                        index
                    ) {

                        return normalizarEvento(
                            evento,
                            index,
                            turmas
                        );

                    }
                )
                .filter(
                    Boolean
                );

        } catch (error) {

            console.warn(
                "Erro ao carregar calendário:",
                error
            );


            return clonarEventosPadrao();

        }

    }


    function salvarEventos(
        lista = events
    ) {

        try {

            localStorage.setItem(
                EVENTS_STORAGE_KEY,
                JSON.stringify(
                    lista
                )
            );


            return true;

        } catch (error) {

            console.error(
                "Erro ao salvar calendário:",
                error
            );


            return false;

        }

    }


    let events =
        carregarEventos();


    function gerarNovoId() {

        const maiorId =
            events.reduce(
                function (
                    maior,
                    evento
                ) {

                    const idAtual =
                        Number(
                            evento.id
                        );


                    return Number.isFinite(
                        idAtual
                    )
                        ? Math.max(
                            maior,
                            idAtual
                        )
                        : maior;

                },
                0
            );


        return Math.max(
            Date.now(),
            maiorId + 1
        );

    }


    /*====================================================
                STORAGE DE NOTIFICAÇÕES
    ====================================================*/

    function carregarEstadoNotificacoes() {

        const saved =
            localStorage.getItem(
                NOTIFICATIONS_STORAGE_KEY
            );


        /*
            É importante distinguir:

            storage inexistente
                ≠
            storage existente e vazio.

            Assim, excluir um evento antes da primeira
            visita à página Notificações não cria
            primewayNotifications = [] por acidente.
        */

        if (saved === null) {

            return {
                exists: false,
                data: []
            };

        }


        try {

            const data =
                JSON.parse(
                    saved
                );


            return {

                exists: true,

                data:
                    Array.isArray(
                        data
                    )
                        ? data
                        : []

            };

        } catch (error) {

            console.warn(
                "Erro ao carregar notificações:",
                error
            );


            return {
                exists: true,
                data: []
            };

        }

    }


    /*====================================================
            NOTIFICAÇÃO DO EVENTO
    ====================================================*/

    function tipoNotificacaoDoEvento(
        evento
    ) {

        /*
            A página de Notificações trabalha com:

            Aviso
            Evento
            Prova
            Atividade
            Reunião
            Sistema

            Feriado pertence ao Calendário.

            Para a central de notificações ele entra
            na categoria Evento, mas o tipo original
            continua disponível em eventType.
        */

        if (
            evento.type ===
            "Feriado"
        ) {

            return "Evento";

        }


        return (
            evento.type ||
            "Evento"
        );

    }


    function criarMensagemNotificacao(
        evento
    ) {

        let mensagem =
            `Novo evento agendado para ${formatBrazilianDate(evento.date)}.`;


        if (
            evento.time
        ) {

            mensagem +=
                ` Horário: ${evento.time}.`;

        }


        if (
            evento.className
        ) {

            mensagem +=
                ` Turma: ${evento.className}.`;

        } else {

            mensagem +=
                " Destinado a toda a escola.";

        }


        if (
            evento.location
        ) {

            mensagem +=
                ` Local: ${evento.location}.`;

        }


        if (
            evento.description
        ) {

            mensagem +=
                ` ${evento.description}`;

        }


        return mensagem;

    }


    function criarNotificacaoDoEvento(
        evento,
        notificacaoExistente = null,
        preservarData = false
    ) {

        const agora =
            new Date();


        return {

            id:
                `calendar-${evento.id}`,

            title:
                evento.title,

            type:
                tipoNotificacaoDoEvento(
                    evento
                ),

            audience:
                evento.className ||
                "Todos",

            message:
                criarMensagemNotificacao(
                    evento
                ),

            date:
                preservarData &&
                notificacaoExistente?.date
                    ? notificacaoExistente.date
                    : hojeISO(),

            time:
                preservarData &&
                notificacaoExistente?.time
                    ? notificacaoExistente.time
                    : agora.toLocaleTimeString(
                        "pt-BR",
                        {
                            hour: "2-digit",
                            minute: "2-digit"
                        }
                    ),

            read:
                Boolean(
                    notificacaoExistente?.read
                ),

            source:
                "calendar",

            eventId:
                evento.id,

            eventType:
                evento.type,

            eventClassId:
                evento.classId,

            eventDate:
                evento.date,

            eventTime:
                evento.time ||
                "",

            eventLocation:
                evento.location ||
                "",

            eventDescription:
                evento.description ||
                ""

        };

    }


    function prepararNotificacoesComEvento(
        evento
    ) {

        const estado =
            carregarEstadoNotificacoes();


        const notifications =
            [
                ...estado.data
            ];


        const notificationId =
            `calendar-${evento.id}`;


        const index =
            notifications.findIndex(
                notification =>
                    String(
                        notification?.id
                    ) ===
                    notificationId
            );


        const existente =
            index >= 0
                ? notifications[
                    index
                ]
                : null;


        const novaNotificacao =
            criarNotificacaoDoEvento(
                evento,
                existente,
                false
            );


        if (
            index >= 0
        ) {

            notifications[index] =
                novaNotificacao;

        } else {

            notifications.push(
                novaNotificacao
            );

        }


        return notifications;

    }


    function prepararNotificacoesSemEvento(
        eventoId
    ) {

        const estado =
            carregarEstadoNotificacoes();


        if (
            !estado.exists
        ) {

            return null;

        }


        return estado.data.filter(
            notification =>
                String(
                    notification?.id
                ) !==
                `calendar-${eventoId}`
        );

    }


    function atualizarNotificacoesExistentes(
        eventosAtualizados
    ) {

        const estado =
            carregarEstadoNotificacoes();


        /*
            Não cria o storage de Notificações
            apenas por carregar o Calendário.
        */

        if (
            !estado.exists
        ) {

            return null;

        }


        const notifications =
            estado.data.map(
                notification => ({
                    ...notification
                })
            );


        let alterou =
            false;


        eventosAtualizados.forEach(
            function (evento) {

                const notificationId =
                    `calendar-${evento.id}`;


                const index =
                    notifications.findIndex(
                        notification =>
                            String(
                                notification?.id
                            ) ===
                            notificationId
                    );


                /*
                    Se o usuário tiver excluído uma
                    notificação manualmente, não a
                    recriamos automaticamente.
                */

                if (
                    index < 0
                ) {

                    return;

                }


                const atualizada =
                    criarNotificacaoDoEvento(
                        evento,
                        notifications[
                            index
                        ],
                        true
                    );


                if (
                    JSON.stringify(
                        atualizada
                    ) !==
                    JSON.stringify(
                        notifications[
                            index
                        ]
                    )
                ) {

                    notifications[index] =
                        atualizada;


                    alterou =
                        true;

                }

            }
        );


        return alterou
            ? notifications
            : null;

    }


    /*====================================================
            PERSISTÊNCIA RELACIONADA
    ====================================================*/

    /*
        Um cadastro ou exclusão pode alterar ao mesmo
        tempo o calendário e a central de notificações.

        localStorage não possui transações.

        Portanto, guardamos os valores anteriores e,
        caso alguma gravação falhe, tentamos restaurar
        os storages modificados.
    */

    function persistirColecoes(
        alteracoes
    ) {

        const validas =
            alteracoes.filter(
                Boolean
            );


        const backups =
            validas.map(
                alteracao => ({

                    key:
                        alteracao.key,

                    value:
                        localStorage.getItem(
                            alteracao.key
                        )

                })
            );


        try {

            validas.forEach(
                function (alteracao) {

                    localStorage.setItem(
                        alteracao.key,
                        JSON.stringify(
                            alteracao.data
                        )
                    );

                }
            );


            return true;

        } catch (error) {

            console.error(
                "Erro ao salvar dados do calendário:",
                error
            );


            backups.forEach(
                function (backup) {

                    try {

                        if (
                            backup.value ===
                            null
                        ) {

                            localStorage.removeItem(
                                backup.key
                            );

                        } else {

                            localStorage.setItem(
                                backup.key,
                                backup.value
                            );

                        }

                    } catch (
                        rollbackError
                    ) {

                        console.error(
                            "Erro ao restaurar storage:",
                            backup.key,
                            rollbackError
                        );

                    }

                }
            );


            return false;

        }

    }


    /*====================================================
            SINCRONIZAR EVENTOS COM TURMAS
    ====================================================*/

    function sincronizarVinculosComTurmas(
        persistir =
            usuarioPodeGerenciarCalendario
    ) {

        const turmas =
            carregarTurmas();


        const normalizados =
            events
                .map(
                    function (
                        evento,
                        index
                    ) {

                        return normalizarEvento(
                            evento,
                            index,
                            turmas
                        );

                    }
                )
                .filter(
                    Boolean
                );


        const alterou =
            JSON.stringify(
                normalizados
            ) !==
            JSON.stringify(
                events
            );


        if (
            !alterou
        ) {

            return true;

        }


        /*
            Em modo somente leitura, os vínculos podem
            ser normalizados apenas em memória para a
            interface refletir renomeações de turmas.

            Nenhum storage é alterado pelo Professor.
        */

        if (
            !persistir
        ) {

            events =
                normalizados;


            return true;

        }


        const notificacoesAtualizadas =
            atualizarNotificacoesExistentes(
                normalizados
            );


        const alteracoes = [

            {
                key:
                    EVENTS_STORAGE_KEY,
                data:
                    normalizados
            },

            notificacoesAtualizadas
                ? {
                    key:
                        NOTIFICATIONS_STORAGE_KEY,
                    data:
                        notificacoesAtualizadas
                }
                : null

        ];


        if (
            !persistirColecoes(
                alteracoes
            )
        ) {

            return false;

        }


        events =
            normalizados;


        return true;

    }


    /*====================================================
                SELECT DE TURMAS
    ====================================================*/

    function obterTurmaSelecionadaNoFormulario() {

        const option =
            eventClass.options[
                eventClass.selectedIndex
            ];


        /*
            Valor vazio significa evento para
            toda a escola.
        */

        if (
            !eventClass.value
        ) {

            return {
                id: null,
                name: ""
            };

        }


        if (
            !option
        ) {

            return null;

        }


        const id =
            normalizarIdOpcional(
                option.dataset.classId
            );


        const name =
            String(
                option.dataset.className ||
                option.textContent ||
                ""
            )
                .replace(
                    /\s+\(indisponível\)$/,
                    ""
                )
                .trim();


        if (
            !name
        ) {

            return null;

        }


        return {

            id,

            name

        };

    }


    function obterValorOpcaoTurma(
        turma
    ) {

        const id =
            normalizarIdOpcional(
                turma?.id
            );


        if (
            id !==
            null
        ) {

            return `class:${id}`;

        }


        return `class-name:${normalizarTexto(
            turma?.name
        )}`;

    }


    function preencherTurmas(
        eventoAtual = null
    ) {

        const filtroAtual =
            eventClassFilter.value;


        /*
            Em uma atualização do storage entre abas,
            preservamos a seleção do formulário quando
            ele representa um novo evento.
        */

        const selecaoFormAtual =
            eventoAtual
                ? null
                : obterTurmaSelecionadaNoFormulario();


        const turmas =
            ordenarTurmas(
                carregarTurmas()
            );


        const turmasAtivas =
            turmas.filter(
                turmaEstaAtiva
            );


        /*============================================
                    SELECT DO FORMULÁRIO
        ============================================*/

        eventClass.replaceChildren();


        const todaEscola =
            document.createElement(
                "option"
            );


        todaEscola.value =
            "";


        todaEscola.textContent =
            "Toda a escola";


        eventClass.appendChild(
            todaEscola
        );


        turmasAtivas.forEach(
            function (turma) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    obterValorOpcaoTurma(
                        turma
                    );


                option.textContent =
                    turma.name;


                const idTurma =
                    normalizarIdOpcional(
                        turma.id
                    );


                if (
                    idTurma !==
                    null
                ) {

                    option.dataset.classId =
                        String(
                            idTurma
                        );

                }


                option.dataset.className =
                    turma.name;


                eventClass.appendChild(
                    option
                );

            }
        );


        const referencia =
            eventoAtual ||
            (
                selecaoFormAtual &&
                selecaoFormAtual.name
                    ? {
                        id:
                            "temp",

                        classId:
                            selecaoFormAtual.id,

                        className:
                            selecaoFormAtual.name
                    }
                    : null
            );


        if (
            referencia?.className
        ) {

            const turmaAtual =
                localizarTurmaDoEvento(
                    referencia,
                    turmas
                );


            if (
                turmaAtual &&
                turmaEstaAtiva(
                    turmaAtual
                )
            ) {

                eventClass.value =
                    obterValorOpcaoTurma(
                        turmaAtual
                    );

            } else {

                /*
                    Preserva vínculo histórico com
                    turma inativa ou removida.
                */

                const option =
                    document.createElement(
                        "option"
                    );


                const idAtual =
                    turmaAtual
                        ? normalizarIdOpcional(
                            turmaAtual.id
                        )
                        : normalizarIdOpcional(
                            referencia.classId
                        );


                const nomeAtual =
                    turmaAtual
                        ? turmaAtual.name
                        : referencia.className;


                option.value =
                    `legacy:${
                        referencia.id ??
                        "event"
                    }`;


                option.textContent =
                    `${nomeAtual} (indisponível)`;


                option.dataset.className =
                    nomeAtual;


                if (
                    idAtual !==
                    null
                ) {

                    option.dataset.classId =
                        String(
                            idAtual
                        );

                }


                eventClass.appendChild(
                    option
                );


                eventClass.value =
                    option.value;

            }

        }


        /*============================================
                    FILTRO DE TURMAS
        ============================================*/

        const nomesFiltro =
            new Set();


        /*
            Inclui turmas cadastradas.
        */

        turmas.forEach(
            turma =>
                nomesFiltro.add(
                    turma.name
                )
        );


        /*
            Inclui também turmas históricas que ainda
            aparecem em eventos existentes.

            Isso evita tornar esses eventos impossíveis
            de filtrar.
        */

        events.forEach(
            function (evento) {

                if (
                    evento.className
                ) {

                    nomesFiltro.add(
                        evento.className
                    );

                }

            }
        );


        const nomesOrdenados =
            [
                ...nomesFiltro
            ].sort(
                function (
                    a,
                    b
                ) {

                    return a.localeCompare(
                        b,
                        "pt-BR",
                        {
                            numeric: true,
                            sensitivity: "base"
                        }
                    );

                }
            );


        eventClassFilter.replaceChildren();


        const todasTurmas =
            document.createElement(
                "option"
            );


        todasTurmas.value =
            "";


        todasTurmas.textContent =
            "Todas as turmas";


        eventClassFilter.appendChild(
            todasTurmas
        );


        nomesOrdenados.forEach(
            function (nome) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    nome;


                option.textContent =
                    nome;


                eventClassFilter.appendChild(
                    option
                );

            }
        );


        if (
            filtroAtual &&
            nomesFiltro.has(
                filtroAtual
            )
        ) {

            eventClassFilter.value =
                filtroAtual;

        }

    }


    /*====================================================
                APARÊNCIA DO EVENTO
    ====================================================*/

    function getEventTypeClass(
        type
    ) {

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


    function getEventIcon(
        type
    ) {

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
                    evento.type ===
                        type;


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
            MARCADOR DO CALENDÁRIO
    ====================================================*/

    function criarMarcadorEvento(
        evento
    ) {

        const marcador =
            document.createElement(
                "div"
            );


        marcador.className =
            `calendar-event ${
                getEventTypeClass(
                    evento.type
                )
            }`;


        marcador.dataset.eventId =
            String(
                evento.id
            );


        marcador.title =
            evento.title;


        marcador.setAttribute(
            "role",
            "button"
        );


        marcador.tabIndex =
            0;


        const prefixo =
            evento.time
                ? `${evento.time} `
                : "";


        marcador.textContent =
            `${prefixo}${evento.title}`;


        marcador.setAttribute(
            "aria-label",
            `${evento.type}: ${
                evento.title
            }${
                evento.time
                    ? ` às ${evento.time}`
                    : ""
            }`
        );


        return marcador;

    }


    /*====================================================
                    CALENDÁRIO
    ====================================================*/

    function renderCalendar() {

        calendarGrid.replaceChildren();


        const year =
            currentDate.getFullYear();


        const month =
            currentDate.getMonth();


        calendarMonth.textContent =
            monthNames[
                month
            ];


        calendarYear.textContent =
            String(
                year
            );


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
                1 -
                    firstDay.getDay()
            );


        const filteredEvents =
            filtrarEventos();


        const todayKey =
            hojeISO();


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


            const dateKey =
                formatDateKey(
                    date
                );


            const day =
                document.createElement(
                    "div"
                );


            day.className =
                "calendar-day";


            day.dataset.date =
                dateKey;


            if (
                date.getMonth() !==
                month
            ) {

                day.classList.add(
                    "other-month"
                );

            }


            if (
                dateKey ===
                todayKey
            ) {

                day.classList.add(
                    "today"
                );

            }


            const dayNumber =
                document.createElement(
                    "div"
                );


            dayNumber.className =
                "day-number";


            dayNumber.textContent =
                String(
                    date.getDate()
                );


            const dayEventsContainer =
                document.createElement(
                    "div"
                );


            dayEventsContainer.className =
                "day-events";


            const dayEvents =
                filteredEvents
                    .filter(
                        evento =>
                            evento.date ===
                            dateKey
                    )
                    .sort(
                        function (
                            a,
                            b
                        ) {

                            return (
                                a.time ||
                                ""
                            ).localeCompare(
                                b.time ||
                                ""
                            );

                        }
                    );


            dayEvents
                .slice(
                    0,
                    3
                )
                .forEach(
                    function (
                        evento
                    ) {

                        dayEventsContainer
                            .appendChild(
                                criarMarcadorEvento(
                                    evento
                                )
                            );

                    }
                );


            if (
                dayEvents.length >
                3
            ) {

                const more =
                    document.createElement(
                        "span"
                    );


                more.className =
                    "more-events";


                more.textContent =
                    `+${
                        dayEvents.length -
                        3
                    } evento(s)`;


                dayEventsContainer
                    .appendChild(
                        more
                    );

            }


            day.append(
                dayNumber,
                dayEventsContainer
            );


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
                        date &&
                        date.getMonth() ===
                            month &&
                        date.getFullYear() ===
                            year
                    );

                }
            );


        monthEventsCount.textContent =
            String(
                monthEvents.length
            );


        examEventsCount.textContent =
            String(
                monthEvents.filter(
                    evento =>
                        evento.type ===
                        "Prova"
                ).length
            );


        meetingEventsCount.textContent =
            String(
                monthEvents.filter(
                    evento =>
                        evento.type ===
                        "Reunião"
                ).length
            );


        const todayKey =
            hojeISO();


        upcomingEventsCount.textContent =
            String(
                events.filter(
                    evento =>
                        evento.date >=
                        todayKey
                ).length
            );

    }


    /*====================================================
            CARD DE PRÓXIMO EVENTO
    ====================================================*/

    function criarCardProximoEvento(
        evento
    ) {

        const card =
            document.createElement(
                "article"
            );


        card.className =
            "upcoming-card";


        card.dataset.eventId =
            String(
                evento.id
            );


        card.setAttribute(
            "role",
            "button"
        );


        card.tabIndex =
            0;


        card.setAttribute(
            "aria-label",
            `Abrir ${
                evento.title
            }, ${
                formatBrazilianDate(
                    evento.date
                )
            }`
        );


        const top =
            document.createElement(
                "div"
            );


        top.className =
            "upcoming-card-top";


        const type =
            document.createElement(
                "span"
            );


        type.className =
            "upcoming-type";


        type.textContent =
            evento.type;


        const date =
            document.createElement(
                "span"
            );


        date.className =
            "upcoming-date";


        date.textContent =
            formatBrazilianDate(
                evento.date
            );


        top.append(
            type,
            date
        );


        const title =
            document.createElement(
                "strong"
            );


        title.textContent =
            evento.title;


        const details =
            document.createElement(
                "p"
            );


        const turma =
            evento.className ||
            "Toda a escola";


        details.textContent =
            evento.time
                ? `${turma} • ${evento.time}`
                : turma;


        card.append(
            top,
            title,
            details
        );


        return card;

    }


    /*====================================================
                PRÓXIMOS EVENTOS
    ====================================================*/

    function renderUpcomingEvents() {

        const todayKey =
            hojeISO();


        const upcoming =
            filtrarEventos()
                .filter(
                    evento =>
                        evento.date >=
                        todayKey
                )
                .sort(
                    function (
                        a,
                        b
                    ) {

                        const dateCompare =
                            a.date.localeCompare(
                                b.date
                            );


                        if (
                            dateCompare !==
                            0
                        ) {

                            return dateCompare;

                        }


                        return (
                            a.time ||
                            ""
                        ).localeCompare(
                            b.time ||
                            ""
                        );

                    }
                )
                .slice(
                    0,
                    6
                );


        upcomingEventsList.replaceChildren();


        upcomingEventsEmpty.classList.toggle(
            "active",
            upcoming.length === 0
        );


        upcoming.forEach(
            function (evento) {

                upcomingEventsList
                    .appendChild(
                        criarCardProximoEvento(
                            evento
                        )
                    );

            }
        );

    }


    /*====================================================
                    MODAIS
    ====================================================*/

    function existeModalAtivo() {

        return [

            eventModal,
            eventViewModal,
            deleteEventModal

        ].some(
            modal =>
                modal.classList.contains(
                    "active"
                )
        );

    }


    function abrirModal(
        modal,
        focoInicial = null
    ) {

        const elementoAtivo =
            document.activeElement;


        if (
            elementoAtivo instanceof
            HTMLElement
        ) {

            focoAnteriorPorModal.set(
                modal,
                elementoAtivo
            );

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


        if (
            focoInicial &&
            typeof focoInicial.focus ===
                "function"
        ) {

            requestAnimationFrame(
                function () {

                    focoInicial.focus();

                }
            );

        }

    }


    function fecharModal(
        modal,
        opcoes = {}
    ) {

        const {

            restaurarFoco = true,

            fallbackFoco =
                usuarioPodeGerenciarCalendario
                    ? newEventButton
                    : todayButton

        } = opcoes;


        modal.classList.remove(
            "active"
        );


        modal.setAttribute(
            "aria-hidden",
            "true"
        );


        if (
            !existeModalAtivo()
        ) {

            document.body.classList.remove(
                "modal-open"
            );

        }


        const focoAnterior =
            focoAnteriorPorModal.get(
                modal
            );


        focoAnteriorPorModal.delete(
            modal
        );


        if (
            !restaurarFoco
        ) {

            return;

        }


        const destinoFoco =
            elementoPodeReceberFoco(
                focoAnterior
            )
                ? focoAnterior
                : fallbackFoco;


        if (
            destinoFoco &&
            typeof destinoFoco.focus ===
                "function"
        ) {

            requestAnimationFrame(
                function () {

                    destinoFoco.focus();

                }
            );

        }

    }


    /*====================================================
                FORMULÁRIO DO EVENTO
    ====================================================*/

    function limparValidacoesFormulario() {

        eventTitle.setCustomValidity(
            ""
        );


        eventType.setCustomValidity(
            ""
        );


        eventDate.setCustomValidity(
            ""
        );

    }


    function abrirModalEvento(
        eventData = null,
        selectedDate = null
    ) {

        if (
            !usuarioPodeGerenciarCalendario
        ) {

            return;

        }


        eventForm.reset();


        limparValidacoesFormulario();


        preencherTurmas(
            eventData
        );


        if (
            eventData
        ) {

            eventModalTitle.textContent =
                "Editar evento";


            eventId.value =
                String(
                    eventData.id
                );


            eventTitle.value =
                eventData.title;


            eventType.value =
                eventData.type;


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
                hojeISO();

        }


        abrirModal(
            eventModal,
            eventTitle
        );

    }


    function fecharModalEvento() {

        fecharModal(
            eventModal
        );

    }


    /*====================================================
                VALIDAÇÃO DO EVENTO
    ====================================================*/

    function validarFormularioEvento() {

        const title =
            eventTitle.value
                .trim();


        const type =
            eventType.value;


        const date =
            eventDate.value;


        const turma =
            obterTurmaSelecionadaNoFormulario();


        eventTitle.setCustomValidity(
            title
                ? ""
                : "Informe o título do evento."
        );


        if (
            !title
        ) {

            eventTitle.reportValidity();


            return null;

        }


        eventType.setCustomValidity(
            EVENT_TYPES.has(
                type
            )
                ? ""
                : "Selecione um tipo de evento."
        );


        if (
            !EVENT_TYPES.has(
                type
            )
        ) {

            eventType.reportValidity();


            return null;

        }


        const dataValida =
            parseLocalDate(
                date
            );


        eventDate.setCustomValidity(
            dataValida
                ? ""
                : "Informe uma data válida."
        );


        if (
            !dataValida
        ) {

            eventDate.reportValidity();


            return null;

        }


        if (
            !turma
        ) {

            return null;

        }


        return {

            title,

            type,

            turma,

            date,

            time:
                eventTime.value,

            location:
                eventLocation.value
                    .trim(),

            description:
                eventDescription.value
                    .trim()

        };

    }


    /*====================================================
                    SALVAR EVENTO
    ====================================================*/

    eventForm.addEventListener(
        "submit",
        function (formEvent) {

            formEvent.preventDefault();


            if (
                !usuarioPodeGerenciarCalendario
            ) {

                return;

            }


            const validacao =
                validarFormularioEvento();


            if (
                !validacao
            ) {

                return;

            }


            const id =
                eventId.value
                    ? Number(
                        eventId.value
                    )
                    : gerarNovoId();


            const data = {

                id,

                title:
                    validacao.title,

                type:
                    validacao.type,

                classId:
                    validacao.turma.id,

                className:
                    validacao.turma.name,

                date:
                    validacao.date,

                time:
                    validacao.time,

                location:
                    validacao.location,

                description:
                    validacao.description

            };


            const novaLista =
                events.map(
                    evento => ({
                        ...evento
                    })
                );


            const index =
                novaLista.findIndex(
                    evento =>
                        Number(
                            evento.id
                        ) ===
                        Number(
                            id
                        )
                );


            if (
                index >= 0
            ) {

                novaLista[index] =
                    data;

            } else {

                novaLista.push(
                    data
                );

            }


            const notifications =
                prepararNotificacoesComEvento(
                    data
                );


            /*
                Evento e notificação são persistidos
                juntos.

                Se alguma gravação falhar, tentamos
                restaurar ambos ao estado anterior.
            */

            const salvo =
                persistirColecoes([

                    {
                        key:
                            EVENTS_STORAGE_KEY,
                        data:
                            novaLista
                    },

                    {
                        key:
                            NOTIFICATIONS_STORAGE_KEY,
                        data:
                            notifications
                    }

                ]);


            if (
                !salvo
            ) {

                alert(
                    "Não foi possível salvar o evento. Tente novamente."
                );


                return;

            }


            events =
                novaLista;


            const savedDate =
                parseLocalDate(
                    data.date
                );


            if (
                savedDate
            ) {

                currentDate =
                    new Date(
                        savedDate.getFullYear(),
                        savedDate.getMonth(),
                        1
                    );

            }


            fecharModalEvento();


            preencherTurmas();


            renderCalendar();

        }
    );


    /*====================================================
                    VISUALIZAÇÃO
    ====================================================*/

    function preencherVisualizacao(
        eventData
    ) {

        viewEventIcon.className =
            getEventIcon(
                eventData.type
            );


        viewEventIcon.setAttribute(
            "aria-hidden",
            "true"
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

    }


    function abrirVisualizacao(
        eventData
    ) {

        selectedEventId =
            Number(
                eventData.id
            );


        preencherVisualizacao(
            eventData
        );


        abrirModal(
            eventViewModal,
            eventViewClose
        );

    }


    function fecharVisualizacao() {

        selectedEventId =
            null;


        fecharModal(
            eventViewModal
        );

    }


    /*====================================================
                    EXCLUSÃO
    ====================================================*/

    function abrirConfirmacaoExclusao(
        eventData
    ) {

        if (
            !usuarioPodeGerenciarCalendario
        ) {

            return;

        }


        eventToDelete =
            Number(
                eventData.id
            );


        deleteEventMessage.textContent =
            `Deseja realmente excluir "${eventData.title}"?`;


        /*
            O modal de visualização é encerrado antes
            da confirmação sem devolver o foco para
            o calendário neste momento.
        */

        fecharModal(
            eventViewModal,
            {
                restaurarFoco:
                    false
            }
        );


        selectedEventId =
            null;


        abrirModal(
            deleteEventModal,
            deleteEventCancel
        );

    }


    function cancelarExclusao() {

        eventToDelete =
            null;


        selectedEventId =
            null;


        fecharModal(
            deleteEventModal
        );

    }


    function confirmarExclusao() {

        if (
            !usuarioPodeGerenciarCalendario
        ) {

            return;

        }


        if (
            eventToDelete ===
            null
        ) {

            return;

        }


        const idExclusao =
            eventToDelete;


        const novaLista =
            events.filter(
                evento =>
                    Number(
                        evento.id
                    ) !==
                    Number(
                        idExclusao
                    )
            );


        const notifications =
            prepararNotificacoesSemEvento(
                idExclusao
            );


        const alteracoes = [

            {
                key:
                    EVENTS_STORAGE_KEY,
                data:
                    novaLista
            },

            notifications !==
                null
                ? {
                    key:
                        NOTIFICATIONS_STORAGE_KEY,
                    data:
                        notifications
                }
                : null

        ];


        const salvo =
            persistirColecoes(
                alteracoes
            );


        if (
            !salvo
        ) {

            alert(
                "Não foi possível excluir o evento. Tente novamente."
            );


            return;

        }


        events =
            novaLista;


        eventToDelete =
            null;


        selectedEventId =
            null;


        fecharModal(
            deleteEventModal
        );


        preencherTurmas();


        renderCalendar();

    }


    /*====================================================
                ABRIR EVENTO POR ID
    ====================================================*/

    function abrirEventoPorId(
        id
    ) {

        const data =
            events.find(
                evento =>
                    Number(
                        evento.id
                    ) ===
                    Number(
                        id
                    )
            );


        if (
            data
        ) {

            abrirVisualizacao(
                data
            );

        }

    }


    /*====================================================
                CLIQUE NO CALENDÁRIO
    ====================================================*/

    calendarGrid.addEventListener(
        "click",
        function (clickEvent) {

            if (
                !(
                    clickEvent.target instanceof
                    Element
                )
            ) {

                return;

            }


            const eventElement =
                clickEvent.target.closest(
                    "[data-event-id]"
                );


            if (
                eventElement
            ) {

                clickEvent.stopPropagation();


                abrirEventoPorId(
                    eventElement.dataset.eventId
                );


                return;

            }


            /*
                O indicador "+X eventos" é apenas
                informativo.

                Clicar nele não deve abrir por engano
                um novo cadastro.
            */

            if (
                clickEvent.target.closest(
                    ".more-events"
                )
            ) {

                return;

            }


            if (
                !usuarioPodeGerenciarCalendario
            ) {

                return;

            }


            const day =
                clickEvent.target.closest(
                    ".calendar-day"
                );


            if (
                !day?.dataset.date
            ) {

                return;

            }


            abrirModalEvento(
                null,
                day.dataset.date
            );

        }
    );


    /*====================================================
            TECLADO NOS EVENTOS DO CALENDÁRIO
    ====================================================*/

    calendarGrid.addEventListener(
        "keydown",
        function (keyEvent) {

            if (
                keyEvent.key !==
                    "Enter" &&
                keyEvent.key !==
                    " "
            ) {

                return;

            }


            if (
                !(
                    keyEvent.target instanceof
                    Element
                )
            ) {

                return;

            }


            const eventElement =
                keyEvent.target.closest(
                    "[data-event-id]"
                );


            if (
                !eventElement
            ) {

                return;

            }


            keyEvent.preventDefault();


            abrirEventoPorId(
                eventElement.dataset.eventId
            );

        }
    );


    /*====================================================
                    AGENDA
    ====================================================*/

    function abrirEventoDaAgenda(
        target
    ) {

        if (
            !(
                target instanceof
                Element
            )
        ) {

            return false;

        }


        const card =
            target.closest(
                "[data-event-id]"
            );


        if (
            !card
        ) {

            return false;

        }


        abrirEventoPorId(
            card.dataset.eventId
        );


        return true;

    }


    upcomingEventsList.addEventListener(
        "click",
        function (event) {

            abrirEventoDaAgenda(
                event.target
            );

        }
    );


    upcomingEventsList.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key !==
                    "Enter" &&
                event.key !==
                    " "
            ) {

                return;

            }


            if (
                abrirEventoDaAgenda(
                    event.target
                )
            ) {

                event.preventDefault();

            }

        }
    );


    /*====================================================
                BOTÕES DE NAVEGAÇÃO
    ====================================================*/

    newEventButton.addEventListener(
        "click",
        function () {

            if (
                !usuarioPodeGerenciarCalendario
            ) {

                return;

            }


            abrirModalEvento();

        }
    );


    previousMonthButton.addEventListener(
        "click",
        function () {

            currentDate =
                new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth() -
                        1,
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
                    currentDate.getMonth() +
                        1,
                    1
                );


            renderCalendar();

        }
    );


    todayButton.addEventListener(
        "click",
        function () {

            const hoje =
                new Date();


            currentDate =
                new Date(
                    hoje.getFullYear(),
                    hoje.getMonth(),
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

            if (
                !usuarioPodeGerenciarCalendario
            ) {

                return;

            }


            const data =
                events.find(
                    evento =>
                        Number(
                            evento.id
                        ) ===
                        Number(
                            selectedEventId
                        )
                );


            if (
                !data
            ) {

                return;

            }


            fecharModal(
                eventViewModal,
                {
                    restaurarFoco:
                        false
                }
            );


            selectedEventId =
                null;


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

            if (
                !usuarioPodeGerenciarCalendario
            ) {

                return;

            }


            const data =
                events.find(
                    evento =>
                        Number(
                            evento.id
                        ) ===
                        Number(
                            selectedEventId
                        )
                );


            if (
                data
            ) {

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
                FECHAR MODAL DE EVENTO
    ====================================================*/

    eventModalClose.addEventListener(
        "click",
        fecharModalEvento
    );


    eventCancelButton.addEventListener(
        "click",
        fecharModalEvento
    );


    eventModalOverlay.addEventListener(
        "click",
        fecharModalEvento
    );


    /*====================================================
                FECHAR VISUALIZAÇÃO
    ====================================================*/

    eventViewClose.addEventListener(
        "click",
        fecharVisualizacao
    );


    eventViewOverlay.addEventListener(
        "click",
        fecharVisualizacao
    );


    /*====================================================
                FECHAR EXCLUSÃO
    ====================================================*/

    deleteEventCancel.addEventListener(
        "click",
        cancelarExclusao
    );


    deleteEventOverlay.addEventListener(
        "click",
        cancelarExclusao
    );


    /*====================================================
            LIMPAR VALIDADE AO EDITAR
    ====================================================*/

    eventTitle.addEventListener(
        "input",
        function () {

            eventTitle.setCustomValidity(
                ""
            );

        }
    );


    eventType.addEventListener(
        "change",
        function () {

            eventType.setCustomValidity(
                ""
            );

        }
    );


    eventDate.addEventListener(
        "input",
        function () {

            eventDate.setCustomValidity(
                ""
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


            /*
                Fecha somente o modal de maior
                prioridade que estiver aberto.
            */

            if (
                deleteEventModal.classList.contains(
                    "active"
                )
            ) {

                cancelarExclusao();


                return;

            }


            if (
                eventViewModal.classList.contains(
                    "active"
                )
            ) {

                fecharVisualizacao();


                return;

            }


            if (
                eventModal.classList.contains(
                    "active"
                )
            ) {

                fecharModalEvento();

            }

        }
    );


    /*====================================================
                    LOGOUT PHP
    ====================================================*/

    let logoutEmAndamento =
        false;


    async function fazerLogout() {

        if (
            logoutEmAndamento
        ) {

            return;
        }


        logoutEmAndamento =
            true;


        if (
            logoutButton
        ) {

            logoutButton.setAttribute(
                "aria-busy",
                "true"
            );


            if (
                "disabled" in
                logoutButton
            ) {

                logoutButton.disabled =
                    true;
            }
        }


        try {

            const response =
                await fetch(
                    AUTH_LOGOUT_URL,
                    {
                        method:
                            "POST",

                        credentials:
                            "same-origin",

                        cache:
                            "no-store",

                        headers: {
                            "Accept":
                                "application/json"
                        }
                    }
                );


            const data =
                await lerJsonSeguro(
                    response
                );


            if (
                !response.ok ||
                !data?.success
            ) {

                throw new Error(
                    data?.message ||
                    "O servidor não confirmou o logout."
                );
            }


            limparSessaoCompatibilidade();


            window.location.replace(
                PAGINA_LOGIN
            );

        } catch (
            error
        ) {

            console.error(
                "Erro ao encerrar a sessão:",
                error
            );


            alert(
                "Não foi possível encerrar a sessão. Tente novamente."
            );


            logoutEmAndamento =
                false;


            if (
                logoutButton
            ) {

                logoutButton.setAttribute(
                    "aria-busy",
                    "false"
                );


                if (
                    "disabled" in
                    logoutButton
                ) {

                    logoutButton.disabled =
                        false;
                }
            }
        }
    }


    logoutButton?.addEventListener(
        "click",
        fazerLogout
    );


    /*====================================================
            SINCRONIZAÇÃO ENTRE ABAS
    ====================================================*/

    window.addEventListener(
        "storage",
        function (storageEvent) {

            /*============================================
                    EVENTOS ALTERADOS
            ============================================*/

            if (
                storageEvent.key ===
                EVENTS_STORAGE_KEY
            ) {

                events =
                    carregarEventos();


                preencherTurmas();


                renderCalendar();


                /*
                    Se a visualização estiver aberta,
                    atualiza seus dados.

                    Caso o evento tenha sido excluído
                    em outra aba, fecha o modal.
                */

                if (
                    eventViewModal.classList.contains(
                        "active"
                    )
                ) {

                    const selecionado =
                        events.find(
                            evento =>
                                Number(
                                    evento.id
                                ) ===
                                Number(
                                    selectedEventId
                                )
                        );


                    if (
                        selecionado
                    ) {

                        preencherVisualizacao(
                            selecionado
                        );

                    } else {

                        fecharVisualizacao();

                    }

                }


                return;

            }


            /*============================================
                    TURMAS ALTERADAS
            ============================================*/

            if (
                storageEvent.key ===
                CLASSES_STORAGE_KEY
            ) {

                const eventoEmEdicao =
                    eventModal.classList.contains(
                        "active"
                    ) &&
                    eventId.value
                        ? events.find(
                            evento =>
                                Number(
                                    evento.id
                                ) ===
                                Number(
                                    eventId.value
                                )
                        ) ||
                        null
                        : null;


                sincronizarVinculosComTurmas();


                preencherTurmas(
                    eventoEmEdicao
                );


                renderCalendar();

            }

        }
    );


    /*====================================================
                    INICIALIZAÇÃO
    ====================================================*/

    aplicarPermissoesInterface();


    /*
        Consolida vínculos antigos:

        class
        turma
        className

        mantendo className para compatibilidade e
        adicionando classId sempre que a turma puder
        ser identificada.

        Para Professor, essa sincronização ocorre
        somente em memória.
    */

    sincronizarVinculosComTurmas(
        usuarioPodeGerenciarCalendario
    );


    if (
        usuarioPodeGerenciarCalendario
    ) {

        /*
            Persiste eventos padrão na primeira abertura
            e eventuais migrações.

            Isso NÃO cria notificações automaticamente para
            os eventos padrão. A notificação nasce quando
            o usuário cadastra ou salva um evento.
        */

        salvarEventos();


        /*
            Se já houver notificações de calendário,
            sincroniza informações como nome da turma
            depois de uma renomeação.

            Notificações excluídas pelo usuário não são
            recriadas.
        */

        const notificacoesSincronizadas =
            atualizarNotificacoesExistentes(
                events
            );


        if (
            notificacoesSincronizadas
        ) {

            persistirColecoes([
                {
                    key:
                        NOTIFICATIONS_STORAGE_KEY,
                    data:
                        notificacoesSincronizadas
                }
            ]);

        }

    }


    preencherTurmas();


    renderCalendar();

});
