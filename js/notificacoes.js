/*====================================================
        NOTIFICAÇÕES - PRIMEWAY SCHOOL
====================================================*/

document.addEventListener("DOMContentLoaded", async function () {
    await window.PrimeWayStorage?.ready;

    /*====================================================
                STORAGE / AUTENTICAÇÃO
    ====================================================*/

    const NOTIFICATIONS_STORAGE_KEY =
        "primewayNotifications";

    const CALENDAR_STORAGE_KEY =
        "primewayCalendarEvents";


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
                "Erro ao validar a sessão de Notificações:",
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
        Nesta etapa, Admin gerencia a central de
        notificações.

        Professor pode consultar as notificações
        destinadas a Professores, a Todos e as
        notificações derivadas do Calendário, mas
        não altera o estado compartilhado do protótipo.

        A autorização real das operações de dados será
        reforçada também nos endpoints PHP quando as
        notificações deixarem o localStorage.
    */

    const usuarioPodeGerenciarNotificacoes =
        perfilUsuario ===
        "admin";


    /*====================================================
                    ELEMENTOS
    ====================================================*/

    const notificationsList =
        document.querySelector(
            "#notificationsList"
        );

    const notificationsEmpty =
        document.querySelector(
            "#notificationsEmpty"
        );


    /* FILTROS */

    const notificationSearch =
        document.querySelector(
            "#notificationSearch"
        );

    const notificationTypeFilter =
        document.querySelector(
            "#notificationTypeFilter"
        );

    const notificationStatusFilter =
        document.querySelector(
            "#notificationStatusFilter"
        );


    /* CARDS */

    const totalNotifications =
        document.querySelector(
            "#totalNotifications"
        );

    const unreadNotifications =
        document.querySelector(
            "#unreadNotifications"
        );

    const eventNotifications =
        document.querySelector(
            "#eventNotifications"
        );

    const noticeNotifications =
        document.querySelector(
            "#noticeNotifications"
        );


    /* BOTÕES */

    const newNotificationButton =
        document.querySelector(
            "#newNotificationButton"
        );

    const markAllReadButton =
        document.querySelector(
            "#markAllReadButton"
        );


    /* MODAL CADASTRO */

    const notificationModal =
        document.querySelector(
            "#notificationModal"
        );

    const notificationModalOverlay =
        document.querySelector(
            ".notification-modal-overlay"
        );

    const notificationModalClose =
        document.querySelector(
            "#notificationModalClose"
        );

    const notificationCancelButton =
        document.querySelector(
            "#notificationCancelButton"
        );

    const notificationForm =
        document.querySelector(
            "#notificationForm"
        );


    /* CAMPOS */

    const notificationTitle =
        document.querySelector(
            "#notificationTitle"
        );

    const notificationType =
        document.querySelector(
            "#notificationType"
        );

    const notificationAudience =
        document.querySelector(
            "#notificationAudience"
        );

    const notificationMessage =
        document.querySelector(
            "#notificationMessage"
        );


    /* VISUALIZAÇÃO */

    const notificationViewModal =
        document.querySelector(
            "#notificationViewModal"
        );

    const notificationViewOverlay =
        document.querySelector(
            ".notification-view-overlay"
        );

    const notificationViewClose =
        document.querySelector(
            "#notificationViewClose"
        );

    const viewNotificationIcon =
        document.querySelector(
            "#viewNotificationIcon"
        );

    const viewNotificationType =
        document.querySelector(
            "#viewNotificationType"
        );

    const viewNotificationTitle =
        document.querySelector(
            "#viewNotificationTitle"
        );

    const viewNotificationAudience =
        document.querySelector(
            "#viewNotificationAudience"
        );

    const viewNotificationDate =
        document.querySelector(
            "#viewNotificationDate"
        );

    const viewNotificationMessage =
        document.querySelector(
            "#viewNotificationMessage"
        );

    const toggleReadButton =
        document.querySelector(
            "#toggleReadButton"
        );

    const deleteNotificationButton =
        document.querySelector(
            "#deleteNotificationButton"
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

        notificationsList,
        notificationsEmpty,

        notificationSearch,
        notificationTypeFilter,
        notificationStatusFilter,

        totalNotifications,
        unreadNotifications,
        eventNotifications,
        noticeNotifications,

        newNotificationButton,
        markAllReadButton,

        notificationModal,
        notificationModalOverlay,
        notificationModalClose,
        notificationCancelButton,
        notificationForm,

        notificationTitle,
        notificationType,
        notificationAudience,
        notificationMessage,

        notificationViewModal,
        notificationViewOverlay,
        notificationViewClose,

        viewNotificationIcon,
        viewNotificationType,
        viewNotificationTitle,
        viewNotificationAudience,
        viewNotificationDate,
        viewNotificationMessage,

        toggleReadButton,
        deleteNotificationButton,


    ];


    if (
        elementosObrigatorios.some(
            elemento =>
                !elemento
        )
    ) {

        console.error(
            "Notificações: a estrutura esperada da página não foi encontrada."
        );


        return;

    }


    function aplicarPermissoesInterface() {

        if (
            usuarioPodeGerenciarNotificacoes
        ) {

            return;

        }


        /*
            O perfil Professor permanece em modo
            somente leitura nesta etapa.

            Como o campo "read" ainda pertence ao
            storage compartilhado, permitir alterações
            aqui faria uma ação do Professor modificar
            o estado visto pelo Admin.
        */

        [
            newNotificationButton,
            markAllReadButton,
            toggleReadButton,
            deleteNotificationButton
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
                    TIPOS
    ====================================================*/

    const TIPOS_NOTIFICACAO =
        new Set([
            "Aviso",
            "Evento",
            "Prova",
            "Atividade",
            "Reunião",
            "Sistema"
        ]);


    /*
        O formulário manual atual permite somente
        Aviso e Sistema.

        Os demais tipos entram pelo Calendário.
    */

    const TIPOS_MANUAIS =
        new Set([
            "Aviso",
            "Sistema"
        ]);


    const PUBLICOS_MANUAIS =
        new Set([
            "Todos",
            "Alunos",
            "Responsáveis",
            "Professores",
            "Secretaria"
        ]);


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
            ).padStart(
                2,
                "0"
            );


        const dia =
            String(
                agora.getDate()
            ).padStart(
                2,
                "0"
            );


        return `${ano}-${mes}-${dia}`;

    }


    function dataLocal(
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
            ano,
            mes,
            dia
        ] =
            valor
                .split("-")
                .map(Number);


        const data =
            new Date(
                ano,
                mes - 1,
                dia
            );


        const valida =
            data.getFullYear() ===
                ano &&
            data.getMonth() ===
                mes - 1 &&
            data.getDate() ===
                dia;


        return valida
            ? data
            : null;

    }


    function formatarData(
        dateString
    ) {

        const data =
            dataLocal(
                dateString
            );


        if (!data) {

            return "-";

        }


        return data.toLocaleDateString(
            "pt-BR"
        );

    }


    function horarioAtual() {

        return new Date()
            .toLocaleTimeString(
                "pt-BR",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );

    }


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


    function gerarIdManual() {

        if (
            typeof crypto !==
                "undefined" &&
            typeof crypto.randomUUID ===
                "function"
        ) {

            return `manual-${crypto.randomUUID()}`;

        }


        return (
            `manual-${Date.now()}-` +
            Math.random()
                .toString(36)
                .slice(
                    2,
                    8
                )
        );

    }


    function normalizarTipo(
        tipo,
        source = "manual"
    ) {

        const valor =
            String(
                tipo || ""
            ).trim();


        /*
            Feriado é um tipo do Calendário,
            mas não uma categoria própria da
            central de Notificações.
        */

        if (
            valor ===
            "Feriado"
        ) {

            return "Evento";

        }


        if (
            TIPOS_NOTIFICACAO.has(
                valor
            )
        ) {

            return valor;

        }


        return source ===
            "calendar"
                ? "Evento"
                : "Aviso";

    }


    /*====================================================
                NOTIFICAÇÕES PADRÃO
    ====================================================*/

    const defaultNotifications = [

        {
            id: "default-1",
            title:
                "Bem-vindo ao PrimeWay School",
            type: "Sistema",
            audience: "Todos",
            message:
                "A central de notificações está disponível para acompanhar avisos e informações importantes da escola.",
            date: hojeISO(),
            time: "08:00",
            read: false,
            source: "manual"
        },

        {
            id: "default-2",
            title:
                "Atualização de calendário",
            type: "Aviso",
            audience: "Todos",
            message:
                "Confira regularmente o calendário escolar para acompanhar provas, reuniões e atividades.",
            date: hojeISO(),
            time: "08:30",
            read: false,
            source: "manual"
        }

    ];


    function clonarNotificacoesPadrao() {

        return [];

    }


    /*====================================================
            NORMALIZAÇÃO DE NOTIFICAÇÕES
    ====================================================*/

    function normalizarNotificacao(
        notification,
        index = 0
    ) {

        if (
            !notification ||
            typeof notification !==
                "object"
        ) {

            return null;

        }


        const source =
            notification.source ===
                "calendar"
                ? "calendar"
                : "manual";


        const id =
            String(
                notification.id ??
                `notification-${
                    Date.now() +
                    index
                }`
            );


        const eventIdOriginal =
            notification.eventId;


        let eventId =
            eventIdOriginal ??
            null;


        /*
            Compatibilidade com notificações antigas
            que possuam apenas:

            calendar-123
        */

        if (
            eventId ===
                null &&
            source ===
                "calendar" &&
            id.startsWith(
                "calendar-"
            )
        ) {

            eventId =
                id.slice(
                    "calendar-".length
                );

        }


        const eventClassId =
            normalizarIdOpcional(
                notification.eventClassId
            );


        const eventType =
            String(
                notification.eventType ||
                (
                    notification.type ===
                        "Feriado"
                        ? "Feriado"
                        : notification.type ||
                            ""
                )
            ).trim();


        const date =
            dataLocal(
                notification.date
            )
                ? String(
                    notification.date
                )
                : hojeISO();


        const time =
            /^([01]\d|2[0-3]):[0-5]\d$/
                .test(
                    String(
                        notification.time ||
                        ""
                    )
                )
                ? String(
                    notification.time
                )
                : "";


        return {

            ...notification,

            id,

            title:
                String(
                    notification.title ||
                    "Notificação"
                ).trim(),

            type:
                normalizarTipo(
                    notification.type,
                    source
                ),

            audience:
                String(
                    notification.audience ||
                    "Todos"
                ).trim(),

            message:
                String(
                    notification.message ||
                    ""
                ).trim(),

            date,

            time,

            read:
                notification.read ===
                    true ||
                notification.read ===
                    "true",

            source,

            eventId,

            eventType,

            eventClassId,

            eventDate:
                String(
                    notification.eventDate ||
                    ""
                ).trim(),

            eventTime:
                String(
                    notification.eventTime ||
                    ""
                ).trim(),

            eventLocation:
                String(
                    notification.eventLocation ||
                    ""
                ).trim(),

            eventDescription:
                String(
                    notification.eventDescription ||
                    ""
                ).trim()

        };

    }


    /*====================================================
            STORAGE DE NOTIFICAÇÕES
    ====================================================*/

    function carregarNotificacoes() {

        try {

            const saved =
                localStorage.getItem(
                    NOTIFICATIONS_STORAGE_KEY
                );


            if (!saved) {

                return clonarNotificacoesPadrao();

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

                return clonarNotificacoesPadrao();

            }


            return data
                .map(
                    normalizarNotificacao
                )
                .filter(
                    Boolean
                );

        } catch (erro) {

            console.warn(
                "Erro ao carregar notificações:",
                erro
            );


            return clonarNotificacoesPadrao();

        }

    }


    function salvarNotificacoes(
        lista = notifications
    ) {

        try {

            localStorage.setItem(
                NOTIFICATIONS_STORAGE_KEY,
                JSON.stringify(
                    lista
                )
            );


            return true;

        } catch (erro) {

            console.error(
                "Erro ao salvar notificações:",
                erro
            );


            return false;

        }

    }


    /*====================================================
                    ESTADO
    ====================================================*/

    let notifications =
        carregarNotificacoes();


    let selectedNotificationId =
        null;
const focoAnteriorPorModal =
        new WeakMap();


    /*====================================================
            STORAGE DO CALENDÁRIO
    ====================================================*/

    function carregarEstadoCalendario() {

        const saved =
            localStorage.getItem(
                CALENDAR_STORAGE_KEY
            );


        if (
            saved ===
            null
        ) {

            return {
                exists: false,
                valid: true,
                data: []
            };

        }


        try {

            const data =
                JSON.parse(
                    saved
                );


            if (
                !Array.isArray(
                    data
                )
            ) {

                return {
                    exists: true,
                    valid: false,
                    data: []
                };

            }


            return {
                exists: true,
                valid: true,
                data
            };

        } catch (erro) {

            console.warn(
                "Erro ao carregar eventos do calendário:",
                erro
            );


            return {
                exists: true,
                valid: false,
                data: []
            };

        }

    }


    /*====================================================
            MENSAGEM DO CALENDÁRIO
    ====================================================*/

    function criarMensagemEvento(
        evento
    ) {

        let mensagem =
            `Novo evento agendado para ${
                formatarData(
                    evento.date
                )
            }.`;


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


    /*====================================================
        SINCRONIZAÇÃO COM O CALENDÁRIO
    ====================================================*/

    /*
        IMPORTANTE:

        Esta página NÃO cria notificações novas a partir
        do calendário.

        A criação acontece em calendario.js.

        Aqui apenas atualizamos notificações de calendário
        que já existem.

        Dessa forma, se o usuário excluir manualmente uma
        notificação, ela não será recriada ao abrir esta
        página novamente.
    */

    function sincronizarNotificacoesComCalendario(
        persistir =
            usuarioPodeGerenciarNotificacoes
    ) {

        const estadoCalendario =
            carregarEstadoCalendario();


        if (
            !estadoCalendario.exists ||
            !estadoCalendario.valid
        ) {

            return false;

        }


        const eventos =
            estadoCalendario.data;


        const eventosPorId =
            new Map();


        eventos.forEach(
            function (evento) {

                if (
                    !evento ||
                    typeof evento !==
                        "object" ||
                    evento.id ===
                        undefined ||
                    evento.id ===
                        null
                ) {

                    return;

                }


                eventosPorId.set(
                    String(
                        evento.id
                    ),
                    evento
                );

            }
        );


        let alterou =
            false;


        const sincronizadas =
            notifications
                .map(
                    function (
                        notification
                    ) {

                        if (
                            notification.source !==
                            "calendar"
                        ) {

                            return notification;

                        }


                        const eventId =
                            notification.eventId ??
                            (
                                String(
                                    notification.id
                                ).startsWith(
                                    "calendar-"
                                )
                                    ? String(
                                        notification.id
                                    ).slice(
                                        "calendar-".length
                                    )
                                    : null
                            );


                        if (
                            eventId ===
                            null
                        ) {

                            return notification;

                        }


                        const evento =
                            eventosPorId.get(
                                String(
                                    eventId
                                )
                            );


                        /*
                            Notificação órfã:

                            o evento correspondente não
                            existe mais no calendário.
                        */

                        if (!evento) {

                            alterou =
                                true;


                            return null;

                        }


                        const eventType =
                            String(
                                evento.type ||
                                "Evento"
                            );


                        const classId =
                            normalizarIdOpcional(
                                evento.classId
                            );


                        const atualizada = {

                            ...notification,

                            id:
                                `calendar-${evento.id}`,

                            title:
                                String(
                                    evento.title ||
                                    "Evento"
                                ),

                            type:
                                normalizarTipo(
                                    eventType,
                                    "calendar"
                                ),

                            audience:
                                String(
                                    evento.className ||
                                    "Todos"
                                ),

                            message:
                                criarMensagemEvento(
                                    evento
                                ),

                            source:
                                "calendar",

                            eventId:
                                evento.id,

                            eventType,

                            eventClassId:
                                classId,

                            eventDate:
                                String(
                                    evento.date ||
                                    ""
                                ),

                            eventTime:
                                String(
                                    evento.time ||
                                    ""
                                ),

                            eventLocation:
                                String(
                                    evento.location ||
                                    ""
                                ),

                            eventDescription:
                                String(
                                    evento.description ||
                                    ""
                                )

                        };


                        if (
                            JSON.stringify(
                                atualizada
                            ) !==
                            JSON.stringify(
                                notification
                            )
                        ) {

                            alterou =
                                true;

                        }


                        return atualizada;

                    }
                )
                .filter(
                    Boolean
                );


        if (
            !alterou
        ) {

            return false;

        }


        /*
            Em modo somente leitura, a sincronização
            com o Calendário ocorre apenas em memória.

            Nenhum storage é alterado pelo Professor.
        */

        if (
            !persistir
        ) {

            notifications =
                sincronizadas;


            return true;

        }


        if (
            !salvarNotificacoes(
                sincronizadas
            )
        ) {

            return false;

        }


        notifications =
            sincronizadas;


        return true;

    }


    /*====================================================
                    ÍCONES
    ====================================================*/

    function getIcon(
        type
    ) {

        const icons = {

            "Aviso":
                "fa-bullhorn",

            "Evento":
                "fa-calendar-day",

            "Prova":
                "fa-file-pen",

            "Atividade":
                "fa-list-check",

            "Reunião":
                "fa-people-group",

            "Sistema":
                "fa-gear"

        };


        return (
            icons[type] ||
            "fa-bell"
        );

    }


    function getTypeClass(
        type
    ) {

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


    function criarIcone(
        type
    ) {

        const icon =
            document.createElement(
                "i"
            );


        icon.classList.add(
            "fa-solid",
            getIcon(
                type
            )
        );


        icon.setAttribute(
            "aria-hidden",
            "true"
        );


        return icon;

    }


    /*====================================================
                VISIBILIDADE POR PERFIL
    ====================================================*/

    function notificacaoVisivelParaPerfil(
        notification
    ) {

        if (
            usuarioPodeGerenciarNotificacoes
        ) {

            return true;

        }


        /*
            Sem vínculo individual de professor com
            turmas nesta fase, as notificações vindas
            do Calendário seguem a mesma visibilidade
            do calendário atual: consulta geral.

            Para avisos manuais, respeitamos o público
            declarado e não exibimos mensagens destinadas
            a Alunos, Responsáveis ou Secretaria.
        */

        if (
            notification.source ===
            "calendar"
        ) {

            return true;

        }


        const audience =
            normalizarTexto(
                notification.audience
            );


        return (
            audience === "todos" ||
            audience === "professores"
        );

    }


    /*====================================================
                    FILTROS
    ====================================================*/

    function pegarNotificacoesFiltradas() {

        const termo =
            normalizarTexto(
                notificationSearch.value
            );


        const tipo =
            notificationTypeFilter.value;


        const status =
            notificationStatusFilter.value;


        return notifications
            .filter(
                notificacaoVisivelParaPerfil
            )
            .filter(
                function (
                    notification
                ) {

                    const texto =
                        normalizarTexto(
                            [
                                notification.title,
                                notification.message,
                                notification.type,
                                notification.audience,
                                notification.eventType
                            ].join(
                                " "
                            )
                        );


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
                function (
                    a,
                    b
                ) {

                    const dataA =
                        `${
                            a.date ||
                            ""
                        } ${
                            a.time ||
                            ""
                        }`;


                    const dataB =
                        `${
                            b.date ||
                            ""
                        } ${
                            b.time ||
                            ""
                        }`;


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

        const visiveis =
            notifications.filter(
                notificacaoVisivelParaPerfil
            );


        const total =
            visiveis.length;


        const naoLidas =
            visiveis.filter(
                notification =>
                    !notification.read
            ).length;


        const eventos =
            visiveis.filter(
                notification =>
                    notification.source ===
                    "calendar"
            ).length;


        const avisos =
            visiveis.filter(
                notification =>
                    notification.type ===
                    "Aviso"
            ).length;


        totalNotifications.textContent =
            String(
                total
            );


        unreadNotifications.textContent =
            String(
                naoLidas
            );


        eventNotifications.textContent =
            String(
                eventos
            );


        noticeNotifications.textContent =
            String(
                avisos
            );


        /*
            Evita uma ação sem efeito quando
            não existem notificações não lidas.
        */

        markAllReadButton.disabled =
            !usuarioPodeGerenciarNotificacoes ||
            naoLidas === 0;

    }


    /*====================================================
            CARD DE NOTIFICAÇÃO
    ====================================================*/

    function criarCardNotificacao(
        notification
    ) {

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


        card.setAttribute(
            "role",
            "button"
        );


        card.tabIndex =
            0;


        card.setAttribute(
            "aria-label",
            `${
                notification.read
                    ? ""
                    : "Não lida. "
            }${notification.type}: ${
                notification.title
            }`
        );


        /*============================================
                    ÍCONE
        ============================================*/

        const iconContainer =
            document.createElement(
                "div"
            );


        iconContainer.className =
            "notification-icon";


        const typeClass =
            getTypeClass(
                notification.type
            );


        if (
            typeClass
        ) {

            iconContainer.classList.add(
                typeClass
            );

        }


        iconContainer.appendChild(
            criarIcone(
                notification.type
            )
        );


        /*============================================
                    CONTEÚDO
        ============================================*/

        const content =
            document.createElement(
                "div"
            );


        content.className =
            "notification-content";


        const meta =
            document.createElement(
                "div"
            );


        meta.className =
            "notification-meta";


        const type =
            document.createElement(
                "span"
            );


        type.className =
            "notification-type";


        type.textContent =
            notification.type;


        const audience =
            document.createElement(
                "span"
            );


        audience.className =
            "notification-audience";


        audience.textContent =
            notification.audience;


        meta.append(
            type,
            audience
        );


        const title =
            document.createElement(
                "h3"
            );


        title.textContent =
            notification.title;


        const message =
            document.createElement(
                "p"
            );


        message.textContent =
            notification.message;


        content.append(
            meta,
            title,
            message
        );


        /*============================================
                    LATERAL
        ============================================*/

        const side =
            document.createElement(
                "div"
            );


        side.className =
            "notification-side";


        const date =
            document.createElement(
                "span"
            );


        date.className =
            "notification-date";


        date.textContent =
            notification.time
                ? `${
                    formatarData(
                        notification.date
                    )
                } • ${
                    notification.time
                }`
                : formatarData(
                    notification.date
                );


        side.appendChild(
            date
        );


        if (
            !notification.read
        ) {

            const dot =
                document.createElement(
                    "span"
                );


            dot.className =
                "unread-dot";


            dot.title =
                "Não lida";


            dot.setAttribute(
                "aria-hidden",
                "true"
            );


            side.appendChild(
                dot
            );

        }


        card.append(
            iconContainer,
            content,
            side
        );


        return card;

    }


    /*====================================================
                    RENDERIZAÇÃO
    ====================================================*/

    function renderNotifications() {

        notificationsList.replaceChildren();


        const filtered =
            pegarNotificacoesFiltradas();


        notificationsEmpty.classList.toggle(
            "active",
            filtered.length === 0
        );


        filtered.forEach(
            function (
                notification
            ) {

                notificationsList
                    .appendChild(
                        criarCardNotificacao(
                            notification
                        )
                    );

            }
        );


        atualizarResumo();

    }


    /*====================================================
                    MODAIS
    ====================================================*/

    function existeModalAtivo() {

        return [

            notificationModal,
            notificationViewModal

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

        if (
            !modal
        ) {

            return;

        }


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

        if (
            !modal
        ) {

            return;

        }


        const {

            restaurarFoco = true,

            fallbackFoco =
                usuarioPodeGerenciarNotificacoes
                    ? newNotificationButton
                    : notificationSearch

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
                VALIDAÇÃO DO FORMULÁRIO
    ====================================================*/

    function limparValidacoesFormulario() {

        notificationTitle.setCustomValidity(
            ""
        );


        notificationType.setCustomValidity(
            ""
        );


        notificationAudience.setCustomValidity(
            ""
        );


        notificationMessage.setCustomValidity(
            ""
        );

    }


    function validarFormularioNotificacao() {

        const title =
            notificationTitle.value
                .trim();


        const type =
            notificationType.value;


        const audience =
            notificationAudience.value;


        const message =
            notificationMessage.value
                .trim();


        notificationTitle.setCustomValidity(
            title
                ? ""
                : "Informe o título da notificação."
        );


        if (
            !title
        ) {

            notificationTitle.reportValidity();


            return null;

        }


        notificationType.setCustomValidity(
            TIPOS_MANUAIS.has(
                type
            )
                ? ""
                : "Selecione um tipo válido."
        );


        if (
            !TIPOS_MANUAIS.has(
                type
            )
        ) {

            notificationType.reportValidity();


            return null;

        }


        notificationAudience.setCustomValidity(
            PUBLICOS_MANUAIS.has(
                audience
            )
                ? ""
                : "Selecione um destinatário válido."
        );


        if (
            !PUBLICOS_MANUAIS.has(
                audience
            )
        ) {

            notificationAudience.reportValidity();


            return null;

        }


        notificationMessage.setCustomValidity(
            message
                ? ""
                : "Informe a mensagem."
        );


        if (
            !message
        ) {

            notificationMessage.reportValidity();


            return null;

        }


        return {

            title,
            type,
            audience,
            message

        };

    }


    /*====================================================
                    NOVO AVISO
    ====================================================*/

    function abrirNovoAviso() {

        if (
            !usuarioPodeGerenciarNotificacoes
        ) {

            return;

        }


        notificationForm.reset();


        limparValidacoesFormulario();


        notificationType.value =
            "Aviso";


        notificationAudience.value =
            "Todos";


        abrirModal(
            notificationModal,
            notificationTitle
        );

    }


    function fecharNovoAviso() {

        fecharModal(
            notificationModal
        );

    }


    /*====================================================
                SALVAR NOTIFICAÇÃO MANUAL
    ====================================================*/

    notificationForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            if (
                !usuarioPodeGerenciarNotificacoes
            ) {

                return;

            }


            const validacao =
                validarFormularioNotificacao();


            if (
                !validacao
            ) {

                return;

            }


            const novaNotificacao = {

                id:
                    gerarIdManual(),

                title:
                    validacao.title,

                type:
                    validacao.type,

                audience:
                    validacao.audience,

                message:
                    validacao.message,

                date:
                    hojeISO(),

                time:
                    horarioAtual(),

                read:
                    false,

                source:
                    "manual",

                eventId:
                    null,

                eventType:
                    "",

                eventClassId:
                    null,

                eventDate:
                    "",

                eventTime:
                    "",

                eventLocation:
                    "",

                eventDescription:
                    ""

            };


            const novaLista = [

                novaNotificacao,

                ...notifications.map(
                    notification => ({
                        ...notification
                    })
                )

            ];


            if (
                !salvarNotificacoes(
                    novaLista
                )
            ) {

                PrimeWayFeedback.error(
                    "Não foi possível salvar a notificação. Tente novamente."
                );


                return;

            }


            notifications =
                novaLista;


            fecharNovoAviso();


            renderNotifications();


            PrimeWayFeedback.success(
                "Notificação publicada com sucesso."
            );

        }
    );


    /*====================================================
            BOTÃO DE MARCAR LEITURA
    ====================================================*/

    function atualizarBotaoLeitura(
        notification
    ) {

        const icon =
            document.createElement(
                "i"
            );


        icon.classList.add(
            "fa-solid"
        );


        icon.classList.add(
            notification.read
                ? "fa-envelope"
                : "fa-envelope-open"
        );


        icon.setAttribute(
            "aria-hidden",
            "true"
        );


        const text =
            document.createElement(
                "span"
            );


        text.textContent =
            notification.read
                ? "Marcar como não lida"
                : "Marcar como lida";


        toggleReadButton.replaceChildren(
            icon,
            text
        );


        toggleReadButton.setAttribute(
            "aria-label",
            text.textContent
        );

    }


    /*====================================================
            PREENCHER VISUALIZAÇÃO
    ====================================================*/

    function preencherVisualizacao(
        notification
    ) {

        viewNotificationIcon.className =
            "notification-view-icon";


        const typeClass =
            getTypeClass(
                notification.type
            );


        if (
            typeClass
        ) {

            viewNotificationIcon.classList.add(
                typeClass
            );

        }


        viewNotificationIcon.replaceChildren(
            criarIcone(
                notification.type
            )
        );


        viewNotificationType.textContent =
            notification.type;


        viewNotificationTitle.textContent =
            notification.title;


        viewNotificationAudience.textContent =
            notification.audience;


        viewNotificationDate.textContent =
            notification.time
                ? `${
                    formatarData(
                        notification.date
                    )
                } • ${
                    notification.time
                }`
                : formatarData(
                    notification.date
                );


        viewNotificationMessage.textContent =
            notification.message;


        atualizarBotaoLeitura(
            notification
        );

    }


    /*====================================================
                    VISUALIZAÇÃO
    ====================================================*/

    function abrirVisualizacao(
        notification
    ) {

        selectedNotificationId =
            String(
                notification.id
            );


        let atual =
            notification;


        /*
            Abrir uma notificação marca como lida.

            A alteração só entra no estado local
            se também puder ser persistida.
        */

        if (
            usuarioPodeGerenciarNotificacoes &&
            !notification.read
        ) {

            const novaLista =
                notifications.map(
                    function (
                        item
                    ) {

                        if (
                            String(
                                item.id
                            ) !==
                            String(
                                notification.id
                            )
                        ) {

                            return {
                                ...item
                            };

                        }


                        return {

                            ...item,

                            read: true

                        };

                    }
                );


            if (
                salvarNotificacoes(
                    novaLista
                )
            ) {

                notifications =
                    novaLista;


                atual =
                    notifications.find(
                        item =>
                            String(
                                item.id
                            ) ===
                            String(
                                selectedNotificationId
                            )
                    ) ||
                    notification;

            }

        }


        preencherVisualizacao(
            atual
        );


        abrirModal(
            notificationViewModal,
            notificationViewClose
        );


        renderNotifications();

    }


    function fecharVisualizacao() {

        selectedNotificationId =
            null;


        fecharModal(
            notificationViewModal
        );

    }


    /*====================================================
                    LEITURA
    ====================================================*/

    function alternarLeitura() {

        if (
            !usuarioPodeGerenciarNotificacoes
        ) {

            return;

        }


        const notification =
            notifications.find(
                item =>
                    String(
                        item.id
                    ) ===
                    String(
                        selectedNotificationId
                    )
            );


        if (
            !notification
        ) {

            return;

        }


        const novoEstado =
            !notification.read;


        const novaLista =
            notifications.map(
                function (item) {

                    if (
                        String(
                            item.id
                        ) !==
                        String(
                            notification.id
                        )
                    ) {

                        return {
                            ...item
                        };

                    }


                    return {

                        ...item,

                        read:
                            novoEstado

                    };

                }
            );


        if (
            !salvarNotificacoes(
                novaLista
            )
        ) {

            PrimeWayFeedback.error(
                "Não foi possível alterar o status da notificação."
            );


            return;

        }


        notifications =
            novaLista;


        const atualizada =
            notifications.find(
                item =>
                    String(
                        item.id
                    ) ===
                    String(
                        selectedNotificationId
                    )
            );


        if (
            atualizada
        ) {

            atualizarBotaoLeitura(
                atualizada
            );

        }


        renderNotifications();



        PrimeWayFeedback.success(
            novoEstado
                ? "Notificação marcada como lida."
                : "Notificação marcada como não lida."
        );

    }


    function marcarTodasComoLidas() {

        if (
            !usuarioPodeGerenciarNotificacoes
        ) {

            return;

        }


        const existemNaoLidas =
            notifications.some(
                notification =>
                    !notification.read
            );


        if (
            !existemNaoLidas
        ) {

            return;

        }


        const novaLista =
            notifications.map(
                notification => ({

                    ...notification,

                    read: true

                })
            );


        if (
            !salvarNotificacoes(
                novaLista
            )
        ) {

            PrimeWayFeedback.error(
                "Não foi possível marcar as notificações como lidas."
            );


            return;

        }


        notifications =
            novaLista;


        /*
            Se o modal estiver aberto, mantém seu
            botão sincronizado com o novo estado.
        */

        if (
            notificationViewModal.classList.contains(
                "active"
            )
        ) {

            const selecionada =
                notifications.find(
                    notification =>
                        String(
                            notification.id
                        ) ===
                        String(
                            selectedNotificationId
                        )
                );


            if (
                selecionada
            ) {

                atualizarBotaoLeitura(
                    selecionada
                );

            }

        }


        renderNotifications();



        PrimeWayFeedback.success(
            "Todas as notificações foram marcadas como lidas."
        );

    }


    /*====================================================
                    EXCLUSÃO
    ====================================================*/

    async function abrirExclusao() {

        if (
            !usuarioPodeGerenciarNotificacoes
        ) {

            return;

        }


        const notification =
            notifications.find(
                item =>
                    String(
                        item.id
                    ) ===
                    String(
                        selectedNotificationId
                    )
            );


        if (
            !notification
        ) {

            return;

        }


        const focoRetorno =
            focoAnteriorPorModal.get(
                notificationViewModal
            ) ||
            null;


        fecharModal(
            notificationViewModal,
            {
                restaurarFoco:
                    false
            }
        );


        selectedNotificationId =
            null;


        const confirmado =
            await PrimeWayConfirm.danger(
                `Deseja realmente excluir "${notification.title}"?`,
                {
                    title:
                        "Excluir notificação?",
                    confirmText:
                        "Excluir",
                    cancelText:
                        "Cancelar"
                }
            );


        const fallback =
            elementoPodeReceberFoco(
                focoRetorno
            )
                ? focoRetorno
                : (
                    usuarioPodeGerenciarNotificacoes
                        ? newNotificationButton
                        : notificationSearch
                );


        if (
            !confirmado
        ) {

            if (
                fallback &&
                typeof fallback.focus ===
                    "function"
            ) {

                requestAnimationFrame(
                    () =>
                        fallback.focus()
                );

            }


            return;

        }


        const idExclusao =
            String(
                notification.id
            );


        const novaLista =
            notifications.filter(
                item =>
                    String(
                        item.id
                    ) !==
                    idExclusao
            );


        if (
            !salvarNotificacoes(
                novaLista
            )
        ) {

            PrimeWayFeedback.error(
                "Não foi possível excluir a notificação. Tente novamente."
            );


            if (
                fallback &&
                typeof fallback.focus ===
                    "function"
            ) {

                requestAnimationFrame(
                    () =>
                        fallback.focus()
                );

            }


            return;

        }


        notifications =
            novaLista;


        renderNotifications();


        PrimeWayFeedback.success(
            "Notificação excluída com sucesso."
        );


        if (
            fallback &&
            typeof fallback.focus ===
                "function"
        ) {

            requestAnimationFrame(
                () =>
                    fallback.focus()
            );

        }

    }





    /*====================================================
            ABRIR NOTIFICAÇÃO POR ID
    ====================================================*/

    function abrirNotificacaoPorId(
        id
    ) {

        const notification =
            notifications.find(
                item =>
                    String(
                        item.id
                    ) ===
                    String(
                        id
                    )
            );


        if (
            notification &&
            notificacaoVisivelParaPerfil(
                notification
            )
        ) {

            abrirVisualizacao(
                notification
            );

        }

    }


    /*====================================================
                EVENTOS DA LISTA
    ====================================================*/

    notificationsList.addEventListener(
        "click",
        function (event) {

            if (
                !(
                    event.target instanceof
                    Element
                )
            ) {

                return;

            }


            const card =
                event.target.closest(
                    "[data-notification-id]"
                );


            if (
                !card
            ) {

                return;

            }


            abrirNotificacaoPorId(
                card.dataset.notificationId
            );

        }
    );


    notificationsList.addEventListener(
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
                !(
                    event.target instanceof
                    Element
                )
            ) {

                return;

            }


            const card =
                event.target.closest(
                    "[data-notification-id]"
                );


            if (
                !card
            ) {

                return;

            }


            event.preventDefault();


            abrirNotificacaoPorId(
                card.dataset.notificationId
            );

        }
    );


    /*====================================================
                    BOTÕES
    ====================================================*/

    newNotificationButton.addEventListener(
        "click",
        abrirNovoAviso
    );


    markAllReadButton.addEventListener(
        "click",
        marcarTodasComoLidas
    );


    toggleReadButton.addEventListener(
        "click",
        alternarLeitura
    );


    deleteNotificationButton.addEventListener(
        "click",
        abrirExclusao
    );
/*====================================================
                    FILTROS
    ====================================================*/

    notificationSearch.addEventListener(
        "input",
        renderNotifications
    );


    notificationSearch.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key !==
                    "Escape" ||
                notificationSearch.value ===
                    ""
            ) {

                return;

            }


            notificationSearch.value =
                "";


            renderNotifications();

        }
    );


    notificationTypeFilter.addEventListener(
        "change",
        renderNotifications
    );


    notificationStatusFilter.addEventListener(
        "change",
        renderNotifications
    );


    /*====================================================
            LIMPAR VALIDADE AO EDITAR
    ====================================================*/

    notificationTitle.addEventListener(
        "input",
        function () {

            notificationTitle.setCustomValidity(
                ""
            );

        }
    );


    notificationType.addEventListener(
        "change",
        function () {

            notificationType.setCustomValidity(
                ""
            );

        }
    );


    notificationAudience.addEventListener(
        "change",
        function () {

            notificationAudience.setCustomValidity(
                ""
            );

        }
    );


    notificationMessage.addEventListener(
        "input",
        function () {

            notificationMessage.setCustomValidity(
                ""
            );

        }
    );


    /*====================================================
                FECHAR NOVO AVISO
    ====================================================*/

    notificationModalClose.addEventListener(
        "click",
        fecharNovoAviso
    );


    notificationCancelButton.addEventListener(
        "click",
        fecharNovoAviso
    );


    notificationModalOverlay.addEventListener(
        "click",
        fecharNovoAviso
    );


    /*====================================================
                FECHAR VISUALIZAÇÃO
    ====================================================*/

    notificationViewClose.addEventListener(
        "click",
        fecharVisualizacao
    );


    notificationViewOverlay.addEventListener(
        "click",
        fecharVisualizacao
    );
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


            /*
                Fecha somente o modal de maior
                prioridade que estiver aberto.
            */
if (
                notificationViewModal.classList.contains(
                    "active"
                )
            ) {

                fecharVisualizacao();


                return;

            }


            if (
                notificationModal.classList.contains(
                    "active"
                )
            ) {

                fecharNovoAviso();

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


            PrimeWayFeedback.error(
                error?.message ||
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
        ATUALIZAR VISUALIZAÇÃO ABERTA
    ====================================================*/

    function atualizarVisualizacaoAberta() {

        if (
            !notificationViewModal.classList.contains(
                "active"
            )
        ) {

            return;

        }


        const notification =
            notifications.find(
                item =>
                    String(
                        item.id
                    ) ===
                    String(
                        selectedNotificationId
                    )
            );


        /*
            A notificação pode ter sido excluída
            em outra aba ou pode deixar de ser
            visível para o perfil atual.
        */

        if (
            !notification ||
            !notificacaoVisivelParaPerfil(
                notification
            )
        ) {

            fecharVisualizacao();


            return;

        }


        preencherVisualizacao(
            notification
        );

    }


    /*====================================================
            SINCRONIZAÇÃO ENTRE ABAS
    ====================================================*/

    window.addEventListener(
        "storage",
        function (event) {

            /*============================================
                NOTIFICAÇÕES ALTERADAS
            ============================================*/

            if (
                event.key ===
                NOTIFICATIONS_STORAGE_KEY
            ) {

                notifications =
                    carregarNotificacoes();


                atualizarVisualizacaoAberta();


                renderNotifications();


                return;

            }


            /*============================================
                    CALENDÁRIO ALTERADO
            ============================================*/

            if (
                event.key ===
                CALENDAR_STORAGE_KEY
            ) {

                /*
                    Apenas notificações de calendário
                    já existentes são sincronizadas.

                    Não criamos novas notificações aqui.
                */

                sincronizarNotificacoesComCalendario();


                atualizarVisualizacaoAberta();


                renderNotifications();

            }

        }
    );


    /*====================================================
                    INICIALIZAÇÃO
    ====================================================*/

    /*
        Migra estruturas antigas e padroniza tipos.

        Exemplo:

        Feriado vindo do Calendário
            ↓
        Evento na central de Notificações

        O tipo original continua armazenado em
        eventType.
    */

    const normalizadas =
        notifications
            .map(
                normalizarNotificacao
            )
            .filter(
                Boolean
            );


    if (
        JSON.stringify(
            normalizadas
        ) !==
        JSON.stringify(
            notifications
        )
    ) {

        if (
            usuarioPodeGerenciarNotificacoes
        ) {

            if (
                salvarNotificacoes(
                    normalizadas
                )
            ) {

                notifications =
                    normalizadas;

            }

        } else {

            /*
                Para Professor, migrações e correções
                acontecem somente em memória.
            */

            notifications =
                normalizadas;

        }

    }


    /*
        Atualiza somente notificações de calendário
        que já estejam presentes.

        Notificações excluídas manualmente não são
        recriadas.

        Para Professor, essa sincronização é somente
        em memória.
    */

    sincronizarNotificacoesComCalendario(
        usuarioPodeGerenciarNotificacoes
    );


    if (
        usuarioPodeGerenciarNotificacoes
    ) {

        /*
            Persiste os dois avisos padrão na primeira
            abertura e eventuais migrações apenas para
            quem gerencia a central.
        */

        salvarNotificacoes();

    }


    aplicarPermissoesInterface();


    renderNotifications();

});
