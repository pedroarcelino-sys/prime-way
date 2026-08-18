console.log("CHAT JS CARREGADO");

document.addEventListener("DOMContentLoaded", function () {

    /*====================================================
                    ELEMENTOS PRINCIPAIS
    ====================================================*/

    const chatContainer =
        document.querySelector(".chat-container");

    const conversationTitle =
        document.querySelector(".conversation-person h2");

    const conversationSubtitle =
        document.querySelector(".conversation-person span");

    const conversationAvatar =
        document.querySelector(
            ".conversation-person .conversation-avatar"
        );

    const messagesContainer =
        document.querySelector(".chat-messages");

    const messageInput =
        document.querySelector(
            ".chat-input-area input[type='text']"
        );

    const sendButton =
        document.querySelector(".chat-send");

    const searchInput =
        document.querySelector(".chat-search input");

    const conversationsContainer =
        document.querySelector(".chat-conversations");


    /*====================================================
                    MENU DA CONVERSA
    ====================================================*/

    const conversationOptionsButton =
        document.querySelector("#conversationOptionsButton");

    const conversationMenu =
        document.querySelector("#conversationMenu");

    const conversationInfoButton =
        document.querySelector("#conversationInfoButton");

    const clearConversationButton =
        document.querySelector("#clearConversationButton");

    const deleteConversationButton =
        document.querySelector("#deleteConversationButton");


    /*====================================================
                MODAL DE INFORMAÇÕES
    ====================================================*/

    const infoChatModal =
        document.querySelector("#infoChatModal");

    const infoChatOverlay =
        document.querySelector(".info-chat-overlay");

    const infoChatClose =
        document.querySelector("#infoChatClose");

    const infoChatAvatar =
        document.querySelector("#infoChatAvatar");

    const infoChatName =
        document.querySelector("#infoChatName");

    const infoChatSubtitle =
        document.querySelector("#infoChatSubtitle");

    const infoChatMessageCount =
        document.querySelector("#infoChatMessageCount");

    const infoChatType =
        document.querySelector("#infoChatType");


    /*====================================================
                MODAL DE CONFIRMAÇÃO
    ====================================================*/

    const confirmChatModal =
        document.querySelector("#confirmChatModal");

    const confirmChatOverlay =
        document.querySelector(".confirm-chat-overlay");

    const confirmChatIcon =
        document.querySelector("#confirmChatIcon");

    const confirmChatTitle =
        document.querySelector("#confirmChatTitle");

    const confirmChatMessage =
        document.querySelector("#confirmChatMessage");

    const confirmChatCancel =
        document.querySelector("#confirmChatCancel");

    const confirmChatConfirm =
        document.querySelector("#confirmChatConfirm");

    let confirmacaoAtual =
        null;


    /*====================================================
                    MOBILE
    ====================================================*/

    const mobileConversationsButton =
        document.querySelector("#mobileConversationsButton");


    /*====================================================
                    ANEXO
    ====================================================*/

    const attachmentButton =
        document.querySelector("#attachmentButton");

    const attachmentInput =
        document.querySelector("#attachmentInput");


    /*====================================================
                NOVA CONVERSA
    ====================================================*/

    const newChatButton =
        document.querySelector("#newChatButton");

    const newChatModal =
        document.querySelector("#newChatModal");

    const newChatClose =
        document.querySelector("#newChatClose");

    const newChatOverlay =
        document.querySelector(".new-chat-overlay");

    const newChatPeople =
        document.querySelectorAll(".new-chat-person");


    /*====================================================
                        DADOS
    ====================================================*/

    const CHAT_STORAGE_KEY =
        "primewayChatProfessor";


    const dadosPadrao = {

        "Coordenação": {

            subtitle:
                "Equipe pedagógica",

            icon:
                "fa-user-tie",

            unread:
                2,

            messages: [

                {
                    type: "received",
                    text:
                        "Olá, professor! Lembrando que teremos reunião pedagógica amanhã às 14h.",
                    time: "08:35"
                },

                {
                    type: "sent",
                    text:
                        "Olá! Certo, estarei presente.",
                    time: "08:38"
                },

                {
                    type: "received",
                    text:
                        "Perfeito. Também vamos conversar sobre o desempenho das turmas.",
                    time: "08:42"
                }

            ]

        },


        "1º Ano A": {

            subtitle:
                "Turma • Ensino Fundamental",

            icon:
                "fa-users",

            unread:
                0,

            messages: [

                {
                    type: "received",
                    text:
                        "Professor, a atividade de matemática já está disponível?",
                    time: "09:10"
                },

                {
                    type: "sent",
                    text:
                        "Sim. A atividade já foi publicada no sistema.",
                    time: "09:14"
                }

            ]

        },


        "2º Ano B": {

            subtitle:
                "Turma • Ensino Fundamental",

            icon:
                "fa-users",

            unread:
                1,

            messages: [

                {
                    type: "received",
                    text:
                        "Professor, podemos conversar sobre a próxima atividade?",
                    time: "10:20"
                },

                {
                    type: "sent",
                    text:
                        "Claro. Podemos conversar durante o intervalo.",
                    time: "10:25"
                }

            ]

        },


        "Secretaria": {

            subtitle:
                "Secretaria escolar",

            icon:
                "fa-building",

            unread:
                0,

            messages: [

                {
                    type: "received",
                    text:
                        "Professor, o documento solicitado já está disponível.",
                    time: "11:05"
                },

                {
                    type: "sent",
                    text:
                        "Perfeito. Obrigado pelo aviso.",
                    time: "11:08"
                }

            ]

        }

    };


    let chatData =
        JSON.parse(
            JSON.stringify(dadosPadrao)
        );


    /*====================================================
                    FUNÇÕES AUXILIARES
    ====================================================*/

    function getConversations() {

        return document.querySelectorAll(
            ".conversation"
        );

    }


    function gerarHorarioAtual() {

        const agora =
            new Date();


        const hora =
            String(
                agora.getHours()
            ).padStart(
                2,
                "0"
            );


        const minuto =
            String(
                agora.getMinutes()
            ).padStart(
                2,
                "0"
            );


        return `${hora}:${minuto}`;

    }


    function encontrarConversa(
        nomeConversa
    ) {

        return Array
            .from(
                getConversations()
            )
            .find(
                function (item) {

                    const strong =
                        item.querySelector(
                            ".conversation-info strong"
                        );


                    return (
                        strong &&
                        strong
                            .textContent
                            .trim() ===
                        nomeConversa
                    );

                }
            );

    }


    function pegarNomeConversaAtiva() {

        const ativa =
            document.querySelector(
                ".conversation.active"
            );


        if (!ativa) {

            return null;

        }


        const strong =
            ativa.querySelector(
                ".conversation-info strong"
            );


        return strong
            ? strong.textContent.trim()
            : null;

    }


    /*====================================================
                    RESPONSIVIDADE
    ====================================================*/

    function estaNoMobile() {

        return window
            .matchMedia(
                "(max-width: 750px)"
            )
            .matches;

    }


    function mostrarListaMobile() {

        if (
            !chatContainer ||
            !estaNoMobile()
        ) {

            return;

        }


        chatContainer.classList.remove(
            "mobile-show-chat"
        );


        chatContainer.classList.add(
            "mobile-show-list"
        );

    }


    function mostrarChatMobile() {

        if (
            !chatContainer ||
            !estaNoMobile()
        ) {

            return;

        }


        chatContainer.classList.remove(
            "mobile-show-list"
        );


        chatContainer.classList.add(
            "mobile-show-chat"
        );

    }


    function ajustarModoResponsivo() {

        if (!chatContainer) {

            return;

        }


        if (estaNoMobile()) {

            if (
                !chatContainer.classList.contains(
                    "mobile-show-list"
                ) &&
                !chatContainer.classList.contains(
                    "mobile-show-chat"
                )
            ) {

                chatContainer.classList.add(
                    "mobile-show-chat"
                );

            }

        } else {

            chatContainer.classList.remove(
                "mobile-show-list",
                "mobile-show-chat"
            );

        }

    }


    if (mobileConversationsButton) {

        mobileConversationsButton.addEventListener(
            "click",
            mostrarListaMobile
        );

    }


    window.addEventListener(
        "resize",
        ajustarModoResponsivo
    );


    /*====================================================
                ELEMENTO DA CONVERSA
    ====================================================*/

    function criarElementoConversa(
        nome,
        subtitle,
        icon,
        preview = "Nova conversa",
        horario = "Agora"
    ) {

        const conversation =
            document.createElement(
                "button"
            );


        conversation.type =
            "button";


        conversation.className =
            "conversation";


        const avatar =
            document.createElement(
                "div"
            );


        avatar.className =
            "conversation-avatar";


        avatar.innerHTML =
            `<i class="fa-solid ${icon}"></i>`;


        const info =
            document.createElement(
                "div"
            );


        info.className =
            "conversation-info";


        const strong =
            document.createElement(
                "strong"
            );


        strong.textContent =
            nome;


        const span =
            document.createElement(
                "span"
            );


        span.textContent =
            preview;


        info.appendChild(
            strong
        );


        info.appendChild(
            span
        );


        const meta =
            document.createElement(
                "div"
            );


        meta.className =
            "conversation-meta";


        const small =
            document.createElement(
                "small"
            );


        small.textContent =
            horario;


        meta.appendChild(
            small
        );


        conversation.appendChild(
            avatar
        );


        conversation.appendChild(
            info
        );


        conversation.appendChild(
            meta
        );


        return conversation;

    }


    function criarConversa(
        nome,
        subtitle,
        icon
    ) {

        const existente =
            encontrarConversa(
                nome
            );


        if (existente) {

            return existente;

        }


        if (!chatData[nome]) {

            chatData[nome] = {

                subtitle:
                    subtitle,

                icon:
                    icon,

                unread:
                    0,

                messages:
                    []

            };

        }


        const elemento =
            criarElementoConversa(
                nome,
                subtitle,
                icon
            );


        if (conversationsContainer) {

            conversationsContainer.prepend(
                elemento
            );

        }


        return elemento;

    }


    /*====================================================
                    CONTADORES
    ====================================================*/

    function atualizarContador(
        nomeConversa
    ) {

        const conversa =
            chatData[nomeConversa];


        const elemento =
            encontrarConversa(
                nomeConversa
            );


        if (
            !conversa ||
            !elemento
        ) {

            return;

        }


        const meta =
            elemento.querySelector(
                ".conversation-meta"
            );


        if (!meta) {

            return;

        }


        const contadorExistente =
            meta.querySelector(
                "b"
            );


        if (contadorExistente) {

            contadorExistente.remove();

        }


        if (conversa.unread > 0) {

            const contador =
                document.createElement(
                    "b"
                );


            contador.textContent =
                conversa.unread;


            meta.appendChild(
                contador
            );

        }

    }


    function atualizarTodosOsContadores() {

        Object
            .keys(
                chatData
            )
            .forEach(
                atualizarContador
            );

    }


    /*====================================================
                    PREVIEW
    ====================================================*/

    function atualizarPreview(
        nomeConversa,
        texto,
        horario
    ) {

        const elemento =
            encontrarConversa(
                nomeConversa
            );


        if (!elemento) {

            return;

        }


        const preview =
            elemento.querySelector(
                ".conversation-info span"
            );


        const small =
            elemento.querySelector(
                ".conversation-meta small"
            );


        if (preview) {

            preview.textContent =
                texto;

        }


        if (small) {

            small.textContent =
                horario;

        }

    }


    /*====================================================
                    LOCALSTORAGE
    ====================================================*/

    function salvarEstadoChat() {

        try {

            const conversas =
                Array
                    .from(
                        getConversations()
                    )
                    .map(
                        function (elemento) {

                            const nomeElemento =
                                elemento.querySelector(
                                    ".conversation-info strong"
                                );


                            const previewElemento =
                                elemento.querySelector(
                                    ".conversation-info span"
                                );


                            const horarioElemento =
                                elemento.querySelector(
                                    ".conversation-meta small"
                                );


                            if (!nomeElemento) {

                                return null;

                            }


                            const nome =
                                nomeElemento
                                    .textContent
                                    .trim();


                            const dados =
                                chatData[nome];


                            if (!dados) {

                                return null;

                            }


                            return {

                                nome:
                                    nome,

                                subtitle:
                                    dados.subtitle,

                                icon:
                                    dados.icon,

                                preview:
                                    previewElemento
                                        ? previewElemento.textContent
                                        : "Nova conversa",

                                horario:
                                    horarioElemento
                                        ? horarioElemento.textContent
                                        : "Agora"

                            };

                        }
                    )
                    .filter(
                        Boolean
                    );


            const estado = {

                versao:
                    1,

                chatData:
                    chatData,

                conversas:
                    conversas,

                conversaAtiva:
                    pegarNomeConversaAtiva()

            };


            localStorage.setItem(
                CHAT_STORAGE_KEY,
                JSON.stringify(
                    estado
                )
            );

        } catch (erro) {

            console.warn(
                "Erro ao salvar chat:",
                erro
            );

        }

    }


    function carregarEstadoChat() {

        try {

            const salvo =
                localStorage.getItem(
                    CHAT_STORAGE_KEY
                );


            if (!salvo) {

                return null;

            }


            const estado =
                JSON.parse(
                    salvo
                );


            if (
                !estado ||
                !estado.chatData ||
                typeof estado.chatData !==
                "object"
            ) {

                return null;

            }


            chatData =
                estado.chatData;


            if (
                conversationsContainer &&
                Array.isArray(
                    estado.conversas
                )
            ) {

                conversationsContainer.innerHTML =
                    "";


                estado.conversas.forEach(
                    function (item) {

                        if (!item.nome) {

                            return;

                        }


                        const dados =
                            chatData[
                                item.nome
                            ];


                        if (!dados) {

                            return;

                        }


                        const elemento =
                            criarElementoConversa(

                                item.nome,

                                dados.subtitle,

                                dados.icon,

                                item.preview ||
                                "Nova conversa",

                                item.horario ||
                                "Agora"

                            );


                        if (
                            estado.conversaAtiva ===
                            item.nome
                        ) {

                            elemento.classList.add(
                                "active"
                            );

                        }


                        conversationsContainer.appendChild(
                            elemento
                        );

                    }
                );

            }


            return estado.conversaAtiva ||
                null;

        } catch (erro) {

            console.warn(
                "Erro ao carregar chat:",
                erro
            );


            return null;

        }

    }


    /*====================================================
                RENDERIZAR MENSAGENS
    ====================================================*/

    function renderMessages(
        nomeConversa
    ) {

        const conversa =
            chatData[
                nomeConversa
            ];


        if (
            !conversa ||
            !messagesContainer
        ) {

            return;

        }


        messagesContainer.innerHTML =
            "";


        const data =
            document.createElement(
                "div"
            );


        data.className =
            "chat-date";


        data.textContent =
            "Hoje";


        messagesContainer.appendChild(
            data
        );


        conversa.messages.forEach(
            function (message) {

                const elemento =
                    document.createElement(
                        "div"
                    );


                elemento.className =
                    `message ${message.type}`;


                const bubble =
                    document.createElement(
                        "div"
                    );


                bubble.className =
                    "message-bubble";


                const texto =
                    document.createElement(
                        "p"
                    );


                texto.textContent =
                    message.text;


                const horario =
                    document.createElement(
                        "span"
                    );


                horario.textContent =
                    message.time;


                bubble.appendChild(
                    texto
                );


                bubble.appendChild(
                    horario
                );


                elemento.appendChild(
                    bubble
                );


                messagesContainer.appendChild(
                    elemento
                );

            }
        );


        messagesContainer.scrollTop =
            messagesContainer.scrollHeight;

    }


    /*====================================================
                TROCAR CONVERSA
    ====================================================*/

    function trocarConversa(
        nomeConversa
    ) {

        const conversa =
            chatData[
                nomeConversa
            ];


        if (!conversa) {

            return;

        }


        if (conversationTitle) {

            conversationTitle.textContent =
                nomeConversa;

        }


        if (conversationSubtitle) {

            conversationSubtitle.textContent =
                conversa.subtitle;

        }


        if (conversationAvatar) {

            conversationAvatar.innerHTML =
                `<i class="fa-solid ${conversa.icon}"></i>`;

        }


        conversa.unread =
            0;


        atualizarContador(
            nomeConversa
        );


        renderMessages(
            nomeConversa
        );


        salvarEstadoChat();


        fecharMenuConversa();

    }


    function ativarConversa(
        elemento
    ) {

        if (!elemento) {

            return;

        }


        getConversations()
            .forEach(
                function (item) {

                    item.classList.remove(
                        "active"
                    );

                }
            );


        elemento.classList.add(
            "active"
        );


        const strong =
            elemento.querySelector(
                ".conversation-info strong"
            );


        if (!strong) {

            return;

        }


        trocarConversa(
            strong
                .textContent
                .trim()
        );


        mostrarChatMobile();

    }


    if (conversationsContainer) {

        conversationsContainer.addEventListener(
            "click",
            function (event) {

                const conversation =
                    event.target.closest(
                        ".conversation"
                    );


                if (!conversation) {

                    return;

                }


                ativarConversa(
                    conversation
                );

            }
        );

    }


    /*====================================================
                    ENVIAR MENSAGEM
    ====================================================*/

    function enviarMensagem() {

        if (!messageInput) {

            return;

        }


        const texto =
            messageInput
                .value
                .trim();


        if (texto === "") {

            return;

        }


        const nomeConversa =
            pegarNomeConversaAtiva();


        if (
            !nomeConversa ||
            !chatData[
                nomeConversa
            ]
        ) {

            return;

        }


        const horario =
            gerarHorarioAtual();


        chatData[
            nomeConversa
        ].messages.push({

            type:
                "sent",

            text:
                texto,

            time:
                horario

        });


        messageInput.value =
            "";


        renderMessages(
            nomeConversa
        );


        atualizarPreview(
            nomeConversa,
            texto,
            horario
        );


        salvarEstadoChat();


        messageInput.focus();

    }


    if (sendButton) {

        sendButton.addEventListener(
            "click",
            enviarMensagem
        );

    }


    if (messageInput) {

        messageInput.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                    enviarMensagem();

                }

            }
        );

    }


    /*====================================================
                    ANEXO
    ====================================================*/

    if (
        attachmentButton &&
        attachmentInput
    ) {

        attachmentButton.addEventListener(
            "click",
            function () {

                attachmentInput.click();

            }
        );


        attachmentInput.addEventListener(
            "change",
            function () {

                const arquivo =
                    attachmentInput.files[
                        0
                    ];


                if (!arquivo) {

                    return;

                }


                const nomeConversa =
                    pegarNomeConversaAtiva();


                if (
                    !nomeConversa ||
                    !chatData[
                        nomeConversa
                    ]
                ) {

                    attachmentInput.value =
                        "";

                    return;

                }


                const horario =
                    gerarHorarioAtual();


                const texto =
                    `📎 Arquivo anexado: ${arquivo.name}`;


                chatData[
                    nomeConversa
                ].messages.push({

                    type:
                        "sent",

                    text:
                        texto,

                    time:
                        horario

                });


                renderMessages(
                    nomeConversa
                );


                atualizarPreview(

                    nomeConversa,

                    `📎 ${arquivo.name}`,

                    horario

                );


                salvarEstadoChat();


                attachmentInput.value =
                    "";

            }
        );

    }


    /*====================================================
                    PESQUISA
    ====================================================*/

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            function () {

                const termo =
                    searchInput
                        .value
                        .toLowerCase()
                        .trim();


                getConversations()
                    .forEach(
                        function (
                            conversation
                        ) {

                            const strong =
                                conversation.querySelector(
                                    ".conversation-info strong"
                                );


                            const span =
                                conversation.querySelector(
                                    ".conversation-info span"
                                );


                            if (
                                !strong ||
                                !span
                            ) {

                                return;

                            }


                            const texto =
                                (
                                    strong.textContent +
                                    " " +
                                    span.textContent
                                )
                                    .toLowerCase();


                            conversation.style.display =
                                texto.includes(
                                    termo
                                )
                                    ? ""
                                    : "none";

                        }
                    );

            }
        );

    }


    /*====================================================
                NOVA CONVERSA
    ====================================================*/

    function abrirNovaConversa() {

        if (!newChatModal) {

            return;

        }


        newChatModal.classList.add(
            "active"
        );


        newChatModal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.classList.add(
            "modal-open"
        );


        if (newChatClose) {

            newChatClose.focus();

        }

    }


    function fecharNovaConversa() {

        if (!newChatModal) {

            return;

        }


        newChatModal.classList.remove(
            "active"
        );


        newChatModal.setAttribute(
            "aria-hidden",
            "true"
        );


        document.body.classList.remove(
            "modal-open"
        );

    }


    if (newChatButton) {

        newChatButton.addEventListener(
            "click",
            abrirNovaConversa
        );

    }


    if (newChatClose) {

        newChatClose.addEventListener(
            "click",
            fecharNovaConversa
        );

    }


    if (newChatOverlay) {

        newChatOverlay.addEventListener(
            "click",
            fecharNovaConversa
        );

    }


    newChatPeople.forEach(
        function (person) {

            person.addEventListener(
                "click",
                function () {

                    const nome =
                        person.dataset.chat;


                    const subtitle =
                        person.dataset.subtitle;


                    const icon =
                        person.dataset.icon;


                    if (!nome) {

                        return;

                    }


                    let elemento =
                        encontrarConversa(
                            nome
                        );


                    if (!elemento) {

                        elemento =
                            criarConversa(
                                nome,
                                subtitle,
                                icon
                            );

                    }


                    if (searchInput) {

                        searchInput.value =
                            "";

                    }


                    getConversations()
                        .forEach(
                            function (item) {

                                item.style.display =
                                    "";

                            }
                        );


                    fecharNovaConversa();


                    ativarConversa(
                        elemento
                    );


                    salvarEstadoChat();

                }
            );

        }
    );


    /*====================================================
                    MENU ⋮
    ====================================================*/

    function abrirMenuConversa() {

        if (
            !conversationMenu ||
            !conversationOptionsButton
        ) {

            return;

        }


        conversationMenu.classList.add(
            "active"
        );


        conversationOptionsButton.setAttribute(
            "aria-expanded",
            "true"
        );

    }


    function fecharMenuConversa() {

        if (
            !conversationMenu ||
            !conversationOptionsButton
        ) {

            return;

        }


        conversationMenu.classList.remove(
            "active"
        );


        conversationOptionsButton.setAttribute(
            "aria-expanded",
            "false"
        );

    }


    function alternarMenuConversa() {

        if (!conversationMenu) {

            return;

        }


        if (
            conversationMenu
                .classList
                .contains(
                    "active"
                )
        ) {

            fecharMenuConversa();

        } else {

            abrirMenuConversa();

        }

    }


    if (conversationOptionsButton) {

        conversationOptionsButton.addEventListener(
            "click",
            function (event) {

                event.stopPropagation();

                alternarMenuConversa();

            }
        );

    }


    /*====================================================
                INFORMAÇÕES DA CONVERSA
    ====================================================*/

    function abrirInfoConversa() {

        const nomeConversa =
            pegarNomeConversaAtiva();


        if (
            !nomeConversa ||
            !chatData[
                nomeConversa
            ] ||
            !infoChatModal
        ) {

            return;

        }


        const conversa =
            chatData[
                nomeConversa
            ];


        if (infoChatName) {

            infoChatName.textContent =
                nomeConversa;

        }


        if (infoChatSubtitle) {

            infoChatSubtitle.textContent =
                conversa.subtitle;

        }


        if (infoChatAvatar) {

            infoChatAvatar.innerHTML =
                `<i class="fa-solid ${conversa.icon}"></i>`;

        }


        if (infoChatMessageCount) {

            infoChatMessageCount.textContent =
                conversa.messages.length;

        }


        if (infoChatType) {

            infoChatType.textContent =
                conversa.subtitle;

        }


        infoChatModal.classList.add(
            "active"
        );


        infoChatModal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.classList.add(
            "modal-open"
        );


        fecharMenuConversa();


        if (infoChatClose) {

            infoChatClose.focus();

        }

    }


    function fecharInfoConversa() {

        if (!infoChatModal) {

            return;

        }


        infoChatModal.classList.remove(
            "active"
        );


        infoChatModal.setAttribute(
            "aria-hidden",
            "true"
        );


        document.body.classList.remove(
            "modal-open"
        );

    }


    if (conversationInfoButton) {

        conversationInfoButton.addEventListener(
            "click",
            abrirInfoConversa
        );

    }


    if (infoChatClose) {

        infoChatClose.addEventListener(
            "click",
            fecharInfoConversa
        );

    }


    if (infoChatOverlay) {

        infoChatOverlay.addEventListener(
            "click",
            fecharInfoConversa
        );

    }


    /*====================================================
                MODAL DE CONFIRMAÇÃO
    ====================================================*/

    function abrirConfirmacao(
        configuracao
    ) {

        if (!confirmChatModal) {

            return;

        }


        confirmacaoAtual =
            configuracao.onConfirm ||
            null;


        if (confirmChatTitle) {

            confirmChatTitle.textContent =
                configuracao.title ||
                "Confirmar ação";

        }


        if (confirmChatMessage) {

            confirmChatMessage.textContent =
                configuracao.message ||
                "Deseja continuar?";

        }


        if (confirmChatIcon) {

            confirmChatIcon.classList.toggle(
                "danger",
                configuracao.danger ===
                true
            );


            confirmChatIcon.innerHTML =
                configuracao.danger
                    ? '<i class="fa-solid fa-trash"></i>'
                    : '<i class="fa-solid fa-broom"></i>';

        }


        if (confirmChatConfirm) {

            confirmChatConfirm.classList.toggle(
                "danger",
                configuracao.danger ===
                true
            );


            confirmChatConfirm.textContent =
                configuracao.confirmText ||
                "Confirmar";

        }


        confirmChatModal.classList.add(
            "active"
        );


        confirmChatModal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.classList.add(
            "modal-open"
        );


        fecharMenuConversa();


        if (confirmChatCancel) {

            confirmChatCancel.focus();

        }

    }


    function fecharConfirmacao() {

        if (!confirmChatModal) {

            return;

        }


        confirmChatModal.classList.remove(
            "active"
        );


        confirmChatModal.setAttribute(
            "aria-hidden",
            "true"
        );


        confirmacaoAtual =
            null;


        document.body.classList.remove(
            "modal-open"
        );

    }


    if (confirmChatCancel) {

        confirmChatCancel.addEventListener(
            "click",
            fecharConfirmacao
        );

    }


    if (confirmChatOverlay) {

        confirmChatOverlay.addEventListener(
            "click",
            fecharConfirmacao
        );

    }


    if (confirmChatConfirm) {

        confirmChatConfirm.addEventListener(
            "click",
            function () {

                const acao =
                    confirmacaoAtual;


                fecharConfirmacao();


                if (
                    typeof acao ===
                    "function"
                ) {

                    acao();

                }

            }
        );

    }


    /*====================================================
                LIMPAR CONVERSA
    ====================================================*/

    if (clearConversationButton) {

        clearConversationButton.addEventListener(
            "click",
            function () {

                const nomeConversa =
                    pegarNomeConversaAtiva();


                if (
                    !nomeConversa ||
                    !chatData[
                        nomeConversa
                    ]
                ) {

                    return;

                }


                abrirConfirmacao({

                    title:
                        "Limpar conversa",

                    message:
                        `Todas as mensagens da conversa "${nomeConversa}" serão removidas deste protótipo.`,

                    confirmText:
                        "Limpar",

                    danger:
                        false,

                    onConfirm:
                        function () {

                            chatData[
                                nomeConversa
                            ].messages =
                                [];


                            renderMessages(
                                nomeConversa
                            );


                            atualizarPreview(
                                nomeConversa,
                                "Conversa limpa",
                                "Agora"
                            );


                            salvarEstadoChat();

                        }

                });

            }
        );

    }


    /*====================================================
                EXCLUIR CONVERSA
    ====================================================*/

    if (deleteConversationButton) {

        deleteConversationButton.addEventListener(
            "click",
            function () {

                const nomeConversa =
                    pegarNomeConversaAtiva();


                if (!nomeConversa) {

                    return;

                }


                abrirConfirmacao({

                    title:
                        "Excluir conversa",

                    message:
                        `A conversa "${nomeConversa}" será removida da sua lista.`,

                    confirmText:
                        "Excluir",

                    danger:
                        true,

                    onConfirm:
                        function () {

                            const elemento =
                                encontrarConversa(
                                    nomeConversa
                                );


                            if (elemento) {

                                elemento.remove();

                            }


                            delete chatData[
                                nomeConversa
                            ];


                            const proximaConversa =
                                document.querySelector(
                                    ".conversation"
                                );


                            if (proximaConversa) {

                                ativarConversa(
                                    proximaConversa
                                );

                            } else {

                                if (conversationTitle) {

                                    conversationTitle.textContent =
                                        "Nenhuma conversa";

                                }


                                if (conversationSubtitle) {

                                    conversationSubtitle.textContent =
                                        "Selecione ou inicie uma conversa";

                                }


                                if (conversationAvatar) {

                                    conversationAvatar.innerHTML =
                                        '<i class="fa-solid fa-comments"></i>';

                                }


                                if (messagesContainer) {

                                    messagesContainer.innerHTML =
                                        "";

                                }


                                mostrarListaMobile();

                            }


                            salvarEstadoChat();

                        }

                });

            }
        );

    }


    /*====================================================
                FECHAR MENU CLICANDO FORA
    ====================================================*/

    document.addEventListener(
        "click",
        function (event) {

            if (
                !conversationMenu ||
                !conversationOptionsButton
            ) {

                return;

            }


            const clicouNoMenu =
                conversationMenu.contains(
                    event.target
                );


            const clicouNoBotao =
                conversationOptionsButton.contains(
                    event.target
                );


            if (
                !clicouNoMenu &&
                !clicouNoBotao
            ) {

                fecharMenuConversa();

            }

        }
    );


    /*====================================================
                    TECLA ESC
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


            fecharMenuConversa();


            if (
                confirmChatModal &&
                confirmChatModal
                    .classList
                    .contains(
                        "active"
                    )
            ) {

                fecharConfirmacao();

                return;

            }


            if (
                infoChatModal &&
                infoChatModal
                    .classList
                    .contains(
                        "active"
                    )
            ) {

                fecharInfoConversa();

                return;

            }


            if (
                newChatModal &&
                newChatModal
                    .classList
                    .contains(
                        "active"
                    )
            ) {

                fecharNovaConversa();

            }

        }
    );


    /*====================================================
                    INICIALIZAÇÃO
    ====================================================*/

    ajustarModoResponsivo();


    const conversaAtivaSalva =
        carregarEstadoChat();


    atualizarTodosOsContadores();


    let conversaInicial =
        null;


    if (conversaAtivaSalva) {

        conversaInicial =
            encontrarConversa(
                conversaAtivaSalva
            );

    }


    if (!conversaInicial) {

        conversaInicial =
            document.querySelector(
                ".conversation.active"
            );

    }


    if (!conversaInicial) {

        conversaInicial =
            document.querySelector(
                ".conversation"
            );

    }


    if (conversaInicial) {

        ativarConversa(
            conversaInicial
        );

    } else {

        if (conversationTitle) {

            conversationTitle.textContent =
                "Nenhuma conversa";

        }


        if (conversationSubtitle) {

            conversationSubtitle.textContent =
                "Selecione ou inicie uma conversa";

        }


        if (conversationAvatar) {

            conversationAvatar.innerHTML =
                '<i class="fa-solid fa-comments"></i>';

        }


        if (messagesContainer) {

            messagesContainer.innerHTML =
                "";

        }


        mostrarListaMobile();

    }


    salvarEstadoChat();

});