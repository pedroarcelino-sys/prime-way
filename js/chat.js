document.addEventListener("DOMContentLoaded", async function () {
    await window.PrimeWayStorage?.ready;

    /*====================================================
                STORAGE / AUTENTICAÇÃO
    ====================================================*/

    const CHAT_STORAGE_KEY =
        "primewayChatProfessor";


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


    const PAGINA_LOGIN =
        "login.html";


    /*====================================================
            COMPATIBILIDADE COM O FRONT-END ATUAL
    ====================================================*/

    /*
        A sessão PHP é a fonte de verdade.

        O sessionStorage continua sendo mantido
        temporariamente apenas para compatibilidade
        com páginas que ainda não foram migradas.

        As regras de quem pode conversar com quem
        ainda NÃO são definidas neste arquivo.
        Elas serão implementadas posteriormente no
        backend, quando os vínculos reais existirem.
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

    /*
        O Chat é um módulo compartilhado do sistema.

        Nesta fase, o JavaScript apenas confirma que
        existe uma sessão autenticada no servidor.

        Nenhuma regra definitiva de comunicação entre
        Admin, Professor, Aluno e Responsável é criada
        aqui. Essas regras serão definidas depois no
        backend, conforme os vínculos reais do sistema.
    */

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


            sincronizarSessaoCompatibilidade(
                data.usuario
            );


            return data.usuario;

        } catch (
            error
        ) {

            console.error(
                "Erro ao validar a sessão do Chat:",
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


    /*====================================================
                        ELEMENTOS
    ====================================================*/

    const chatContainer =
        document.querySelector(
            ".chat-container"
        );


    const logoutButton =
        document.querySelector(
            "#logoutButton"
        );


    const conversationTitle =
        document.querySelector(
            ".conversation-person h2"
        );


    const conversationSubtitle =
        document.querySelector(
            ".conversation-person span"
        );


    const conversationAvatar =
        document.querySelector(
            ".conversation-person .conversation-avatar"
        );


    const messagesContainer =
        document.querySelector(
            ".chat-messages"
        );


    const messageInput =
        document.querySelector(
            ".chat-input-area input[type='text']"
        );


    const sendButton =
        document.querySelector(
            ".chat-send"
        );


    const searchInput =
        document.querySelector(
            ".chat-search input"
        );


    const conversationsContainer =
        document.querySelector(
            ".chat-conversations"
        );


    /*====================================================
                    MENU DA CONVERSA
    ====================================================*/

    const conversationOptionsButton =
        document.querySelector(
            "#conversationOptionsButton"
        );


    const conversationMenu =
        document.querySelector(
            "#conversationMenu"
        );


    const conversationInfoButton =
        document.querySelector(
            "#conversationInfoButton"
        );


    const clearConversationButton =
        document.querySelector(
            "#clearConversationButton"
        );


    const deleteConversationButton =
        document.querySelector(
            "#deleteConversationButton"
        );


    /*====================================================
                MODAL DE INFORMAÇÕES
    ====================================================*/

    const infoChatModal =
        document.querySelector(
            "#infoChatModal"
        );


    const infoChatOverlay =
        document.querySelector(
            ".info-chat-overlay"
        );


    const infoChatClose =
        document.querySelector(
            "#infoChatClose"
        );


    const infoChatAvatar =
        document.querySelector(
            "#infoChatAvatar"
        );


    const infoChatName =
        document.querySelector(
            "#infoChatName"
        );


    const infoChatSubtitle =
        document.querySelector(
            "#infoChatSubtitle"
        );


    const infoChatMessageCount =
        document.querySelector(
            "#infoChatMessageCount"
        );


    const infoChatType =
        document.querySelector(
            "#infoChatType"
        );


    /*====================================================
                MODAL DE CONFIRMAÇÃO
    ====================================================*/

    const confirmChatModal =
        document.querySelector(
            "#confirmChatModal"
        );


    const confirmChatOverlay =
        document.querySelector(
            ".confirm-chat-overlay"
        );


    const confirmChatIcon =
        document.querySelector(
            "#confirmChatIcon"
        );


    const confirmChatTitle =
        document.querySelector(
            "#confirmChatTitle"
        );


    const confirmChatMessage =
        document.querySelector(
            "#confirmChatMessage"
        );


    const confirmChatCancel =
        document.querySelector(
            "#confirmChatCancel"
        );


    const confirmChatConfirm =
        document.querySelector(
            "#confirmChatConfirm"
        );


    /*====================================================
                        MOBILE
    ====================================================*/

    const mobileConversationsButton =
        document.querySelector(
            "#mobileConversationsButton"
        );


    /*====================================================
                        ANEXO
    ====================================================*/

    const attachmentButton =
        document.querySelector(
            "#attachmentButton"
        );


    const attachmentInput =
        document.querySelector(
            "#attachmentInput"
        );


    /*====================================================
                    NOVA CONVERSA
    ====================================================*/

    const newChatButton =
        document.querySelector(
            "#newChatButton"
        );


    const newChatModal =
        document.querySelector(
            "#newChatModal"
        );


    const newChatClose =
        document.querySelector(
            "#newChatClose"
        );


    const newChatOverlay =
        document.querySelector(
            ".new-chat-overlay"
        );


    const newChatPeople =
        document.querySelectorAll(
            ".new-chat-person"
        );


    /*====================================================
                    DADOS PADRÃO
    ====================================================*/

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
                    type:
                        "received",

                    text:
                        "Olá, professor! Lembrando que teremos reunião pedagógica amanhã às 14h.",

                    time:
                        "08:35"
                },


                {
                    type:
                        "sent",

                    text:
                        "Olá! Certo, estarei presente.",

                    time:
                        "08:38"
                },


                {
                    type:
                        "received",

                    text:
                        "Perfeito. Também vamos conversar sobre o desempenho das turmas.",

                    time:
                        "08:42"
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
                    type:
                        "received",

                    text:
                        "Professor, a atividade de matemática já está disponível?",

                    time:
                        "09:10"
                },


                {
                    type:
                        "sent",

                    text:
                        "Sim. A atividade já foi publicada no sistema.",

                    time:
                        "09:14"
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
                    type:
                        "received",

                    text:
                        "Professor, podemos conversar sobre a próxima atividade?",

                    time:
                        "10:20"
                },


                {
                    type:
                        "sent",

                    text:
                        "Claro. Podemos conversar durante o intervalo.",

                    time:
                        "10:25"
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
                    type:
                        "received",

                    text:
                        "Professor, o documento solicitado já está disponível.",

                    time:
                        "11:05"
                },


                {
                    type:
                        "sent",

                    text:
                        "Perfeito. Obrigado pelo aviso.",

                    time:
                        "11:08"
                }

            ]

        }

    };


    /*====================================================
                        ESTADO
    ====================================================*/

    let chatData =
        {};


    let confirmacaoAtual =
        null;


    const focoAnteriorPorModal =
        new WeakMap();


    /*====================================================
                    UTILITÁRIOS
    ====================================================*/

    function getConversations() {

        return document.querySelectorAll(
            ".conversation"
        );
    }


    function normalizarTexto(
        valor
    ) {

        return String(
            valor ?? ""
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


    function sanitizarIcone(
        icon
    ) {

        const valor =
            String(
                icon || ""
            ).trim();


        return /^fa-[a-z0-9-]+$/i.test(
            valor
        )
            ? valor
            : "fa-comments";
    }


    function definirIcone(
        container,
        icon
    ) {

        if (!container) {

            return;
        }


        const elemento =
            document.createElement(
                "i"
            );


        elemento.className =
            `fa-solid ${sanitizarIcone(
                icon
            )}`;


        elemento.setAttribute(
            "aria-hidden",
            "true"
        );


        container.replaceChildren(
            elemento
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


    function normalizarMensagem(
        mensagem
    ) {

        if (
            !mensagem ||
            typeof mensagem !==
                "object"
        ) {

            return null;
        }


        const texto =
            String(
                mensagem.text ??
                ""
            );


        if (
            !texto.trim()
        ) {

            return null;
        }


        return {

            type:
                mensagem.type ===
                "received"
                    ? "received"
                    : "sent",

            text:
                texto,

            time:
                String(
                    mensagem.time ||
                    "Agora"
                )

        };
    }


    function normalizarDadosConversa(
        dados
    ) {

        if (
            !dados ||
            typeof dados !==
                "object" ||
            Array.isArray(
                dados
            )
        ) {

            return null;
        }


        const unread =
            Number(
                dados.unread
            );


        return {

            subtitle:
                String(
                    dados.subtitle ||
                    "Conversa"
                ),

            icon:
                sanitizarIcone(
                    dados.icon
                ),

            unread:
                Number.isFinite(
                    unread
                )
                    ? Math.max(
                        0,
                        Math.trunc(
                            unread
                        )
                    )
                    : 0,

            messages:
                Array.isArray(
                    dados.messages
                )
                    ? dados.messages
                        .map(
                            normalizarMensagem
                        )
                        .filter(
                            Boolean
                        )
                    : []

        };
    }


    function normalizarChatData(
        dados
    ) {

        const resultado =
            Object.create(
                null
            );


        if (
            !dados ||
            typeof dados !==
                "object" ||
            Array.isArray(
                dados
            )
        ) {

            return resultado;
        }


        Object.entries(
            dados
        )
            .forEach(
                function (
                    [
                        nome,
                        conversa
                    ]
                ) {

                    const nomeSeguro =
                        String(
                            nome
                        ).trim();


                    const dadosSeguros =
                        normalizarDadosConversa(
                            conversa
                        );


                    if (
                        nomeSeguro &&
                        dadosSeguros
                    ) {

                        resultado[
                            nomeSeguro
                        ] =
                            dadosSeguros;
                    }
                }
            );


        return resultado;
    }


    function encontrarConversa(
        nomeConversa
    ) {

        return Array
            .from(
                getConversations()
            )
            .find(
                function (
                    item
                ) {

                    if (
                        item.dataset.chat ===
                        nomeConversa
                    ) {

                        return true;
                    }


                    const strong =
                        item.querySelector(
                            ".conversation-info strong"
                        );


                    return (
                        strong &&                        strong
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


        if (
            ativa.dataset.chat
        ) {

            return ativa
                .dataset
                .chat;
        }


        const strong =
            ativa.querySelector(
                ".conversation-info strong"
            );


        return strong
            ? strong
                .textContent
                .trim()
            : null;
    }


    function atualizarDisponibilidadeChat() {

        const temConversa =
            Boolean(
                pegarNomeConversaAtiva()
            );


        if (
            messageInput
        ) {

            messageInput.disabled =
                !temConversa;
        }


        if (
            sendButton
        ) {

            sendButton.disabled =
                !temConversa;
        }


        if (
            attachmentButton
        ) {

            attachmentButton.disabled =
                !temConversa;
        }


        if (
            conversationOptionsButton
        ) {

            conversationOptionsButton.disabled =
                !temConversa;
        }
    }


    /*====================================================
                        MODAIS
    ====================================================*/

    function existeModalAtivo() {

        return [

            newChatModal,

            infoChatModal,

            confirmChatModal

        ].some(
            modal =>
                modal &&
                modal
                    .classList
                    .contains(
                        "active"
                    )
        );
    }


    function abrirModalChat(
        modal,
        focoInicial = null
    ) {

        if (!modal) {

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
                () =>
                    focoInicial.focus()
            );
        }
    }


    function fecharModalChat(
        modal,
        fallback = null
    ) {

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


        const destinoFoco =
            focoAnterior &&
            focoAnterior.isConnected &&
            typeof focoAnterior.focus ===
                "function"
                ? focoAnterior
                : fallback;


        if (
            destinoFoco &&
            typeof destinoFoco.focus ===
                "function"
        ) {

            requestAnimationFrame(
                () =>
                    destinoFoco.focus()
            );
        }
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

        if (
            !chatContainer
        ) {

            return;
        }


        if (
            estaNoMobile()
        ) {

            const semEstado =
                !chatContainer
                    .classList
                    .contains(
                        "mobile-show-list"
                    ) &&
                !chatContainer
                    .classList
                    .contains(
                        "mobile-show-chat"
                    );


            if (
                semEstado
            ) {

                chatContainer
                    .classList
                    .add(
                        "mobile-show-chat"
                    );
            }


            return;
        }


        chatContainer.classList.remove(
            "mobile-show-list",
            "mobile-show-chat"
        );
    }


    mobileConversationsButton
        ?.addEventListener(
            "click",
            mostrarListaMobile
        );


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


        conversation.dataset.chat =
            nome;


        const avatar =
            document.createElement(
                "div"
            );


        avatar.className =
            "conversation-avatar";


        definirIcone(
            avatar,
            icon
        );


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


        info.append(
            strong,
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


        conversation.append(
            avatar,
            info,
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


        if (
            existente
        ) {

            return existente;
        }


        if (
            !chatData[
                nome
            ]
        ) {

            chatData[
                nome
            ] = {

                subtitle:
                    String(
                        subtitle ||
                        "Conversa"
                    ),

                icon:
                    sanitizarIcone(
                        icon
                    ),

                unread:
                    0,

                messages:
                    []

            };
        }


        const dados =
            chatData[
                nome
            ];


        const elemento =
            criarElementoConversa(
                nome,
                dados.subtitle,
                dados.icon
            );


        conversationsContainer
            ?.prepend(
                elemento
            );


        return elemento;
    }


    /*====================================================
                        CONTADORES
    ====================================================*/

    function atualizarContador(
        nomeConversa
    ) {

        const conversa =
            chatData[
                nomeConversa
            ];


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


        if (
            !meta
        ) {

            return;
        }


        meta
            .querySelector(
                "b"
            )
            ?.remove();


        if (
            conversa.unread <=
            0
        ) {

            return;
        }


        const contador =
            document.createElement(
                "b"
            );


        contador.textContent =
            String(
                conversa.unread
            );


        contador.setAttribute(
            "aria-label",
            `${conversa.unread} mensagem(ns) não lida(s)`
        );


        meta.appendChild(
            contador
        );
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


        if (
            !elemento
        ) {

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


        if (
            preview
        ) {

            preview.textContent =
                texto;
        }


        if (
            small
        ) {

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
                        function (
                            elemento
                        ) {

                            const nomeElemento =
                                elemento.querySelector(
                                    ".conversation-info strong"
                                );


                            if (
                                !nomeElemento
                            ) {

                                return null;
                            }


                            const nome =
                                elemento.dataset.chat ||
                                nomeElemento
                                    .textContent
                                    .trim();


                            const dados =
                                chatData[
                                    nome
                                ];


                            if (
                                !dados
                            ) {

                                return null;
                            }


                            const previewElemento =
                                elemento.querySelector(
                                    ".conversation-info span"
                                );


                            const horarioElemento =
                                elemento.querySelector(
                                    ".conversation-meta small"
                                );


                            return {

                                nome,

                                subtitle:
                                    dados.subtitle,

                                icon:
                                    dados.icon,

                                preview:
                                    previewElemento
                                        ? previewElemento
                                            .textContent
                                        : "Nova conversa",

                                horario:
                                    horarioElemento
                                        ? horarioElemento
                                            .textContent
                                        : "Agora"

                            };
                        }
                    )
                    .filter(
                        Boolean
                    );


            const estado = {

                versao:
                    2,

                chatData,

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


            return true;

        } catch (
            erro
        ) {

            console.error(
                "Erro ao salvar chat:",
                erro
            );


            return false;
        }
    }


    function carregarEstadoChat() {

        try {

            const salvo =
                localStorage.getItem(
                    CHAT_STORAGE_KEY
                );


            if (
                !salvo
            ) {

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
                normalizarChatData(
                    estado.chatData
                );


            if (
                conversationsContainer
            ) {

                conversationsContainer
                    .replaceChildren();


                const nomesRenderizados =
                    new Set();


                const conversasSalvas =
                    Array.isArray(
                        estado.conversas
                    )
                        ? estado.conversas
                        : [];


                conversasSalvas
                    .forEach(
                        function (
                            item
                        ) {

                            const nome =
                                String(
                                    item?.nome ||
                                    ""
                                ).trim();


                            if (
                                !nome ||
                                nomesRenderizados
                                    .has(
                                        nome
                                    )
                            ) {

                                return;
                            }


                            const dados =
                                chatData[
                                    nome
                                ];


                            if (
                                !dados
                            ) {

                                return;
                            }


                            nomesRenderizados.add(
                                nome
                            );


                            const elemento =
                                criarElementoConversa(
                                    nome,
                                    dados.subtitle,
                                    dados.icon,
                                    String(
                                        item.preview ||
                                        "Nova conversa"
                                    ),
                                    String(
                                        item.horario ||
                                        "Agora"
                                    )
                                );


                            if (
                                estado.conversaAtiva ===
                                nome
                            ) {

                                elemento
                                    .classList
                                    .add(
                                        "active"
                                    );
                            }


                            conversationsContainer
                                .appendChild(
                                    elemento
                                );
                        }
                    );


                Object
                    .keys(
                        chatData
                    )
                    .forEach(
                        function (
                            nome
                        ) {

                            if (
                                nomesRenderizados
                                    .has(
                                        nome
                                    )
                            ) {

                                return;
                            }


                            const dados =
                                chatData[
                                    nome
                                ];


                            const ultimaMensagem =
                                dados.messages[
                                    dados.messages.length -
                                    1
                                ];


                            const elemento =
                                criarElementoConversa(
                                    nome,
                                    dados.subtitle,
                                    dados.icon,
                                    ultimaMensagem
                                        ? ultimaMensagem
                                            .text
                                        : "Nova conversa",
                                    ultimaMensagem
                                        ? ultimaMensagem
                                            .time
                                        : "Agora"
                                );


                            if (
                                estado.conversaAtiva ===
                                nome
                            ) {

                                elemento
                                    .classList
                                    .add(
                                        "active"
                                    );
                            }


                            conversationsContainer
                                .appendChild(
                                    elemento
                                );
                        }
                    );
            }


            const conversaAtiva =
                String(
                    estado.conversaAtiva ||
                    ""
                ).trim();


            return (
                conversaAtiva &&
                chatData[
                    conversaAtiva
                ]
            )
                ? conversaAtiva
                : null;

        } catch (
            erro
        ) {

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


        messagesContainer
            .replaceChildren();


        const data =
            document.createElement(
                "div"
            );


        data.className =
            "chat-date";


        data.textContent =
            "Hoje";


        messagesContainer
            .appendChild(
                data
            );


        conversa.messages
            .forEach(
                function (
                    message
                ) {

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


                    bubble.append(
                        texto,
                        horario
                    );


                    elemento.appendChild(
                        bubble
                    );


                    messagesContainer
                        .appendChild(
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
        nomeConversa,
        persistir = true
    ) {

        const conversa =
            chatData[
                nomeConversa
            ];


        if (
            !conversa
        ) {

            return;
        }


        if (
            conversationTitle
        ) {

            conversationTitle.textContent =
                nomeConversa;
        }


        if (
            conversationSubtitle
        ) {

            conversationSubtitle.textContent =
                conversa.subtitle;
        }


        definirIcone(
            conversationAvatar,
            conversa.icon
        );


        conversa.unread =
            0;


        atualizarContador(
            nomeConversa
        );


        renderMessages(
            nomeConversa
        );


        atualizarDisponibilidadeChat();


        if (
            persistir
        ) {

            salvarEstadoChat();
        }


        fecharMenuConversa();
    }


    function ativarConversa(
        elemento,
        persistir = true
    ) {

        if (
            !elemento
        ) {

            return;
        }


        getConversations()
            .forEach(
                function (
                    item
                ) {

                    item.classList.remove(
                        "active"
                    );


                    item.removeAttribute(
                        "aria-current"
                    );
                }
            );


        elemento.classList.add(
            "active"
        );


        elemento.setAttribute(
            "aria-current",
            "true"
        );


        const strong =
            elemento.querySelector(
                ".conversation-info strong"
            );


        const nome =
            elemento.dataset.chat ||
            (
                strong
                    ? strong
                        .textContent
                        .trim()
                    : ""
            );


        if (
            !nome
        ) {

            return;
        }


        elemento.dataset.chat =
            nome;


        trocarConversa(
            nome,
            persistir
        );


        mostrarChatMobile();
    }


    conversationsContainer
        ?.addEventListener(
            "click",
            function (
                event
            ) {

                if (
                    !(
                        event.target instanceof
                        Element
                    )
                ) {

                    return;
                }


                const conversation =
                    event.target.closest(
                        ".conversation"
                    );


                if (
                    !conversation
                ) {

                    return;
                }


                ativarConversa(
                    conversation
                );
            }
        );


    /*====================================================
                    ENVIAR MENSAGEM
    ====================================================*/

    function enviarMensagem() {

        if (
            !messageInput
        ) {

            return;
        }


        const texto =
            messageInput.value.trim();


        if (
            !texto
        ) {

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
        ]
            .messages
            .push(
                {

                    type:
                        "sent",

                    text:
                        texto,

                    time:
                        horario

                }
            );


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


        if (
            !salvarEstadoChat()
        ) {

            console.warn(
                "A mensagem foi exibida, mas não pôde ser persistida no navegador."
            );
        }


        messageInput.focus();
    }


    sendButton
        ?.addEventListener(
            "click",
            enviarMensagem
        );


    messageInput
        ?.addEventListener(
            "keydown",
            function (
                event
            ) {

                if (
                    event.key !==
                    "Enter"
                ) {

                    return;
                }


                event.preventDefault();


                enviarMensagem();
            }
        );


    /*====================================================
                        ANEXO
    ====================================================*/

    if (
        attachmentButton &&
        attachmentInput
    ) {

        attachmentButton
            .addEventListener(
                "click",
                function () {

                    attachmentInput.click();
                }
            );


        attachmentInput
            .addEventListener(
                "change",
                function () {

                    const arquivo =
                        attachmentInput
                            .files?.[
                                0
                            ];


                    if (
                        !arquivo
                    ) {

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


                    /*
                        O protótipo registra somente o nome
                        do arquivo.

                        O conteúdo real do arquivo não é
                        enviado nem armazenado.
                    */


                    const texto =
                        `📎 Arquivo anexado: ${arquivo.name}`;


                    chatData[
                        nomeConversa
                    ]
                        .messages
                        .push(
                            {

                                type:
                                    "sent",

                                text:
                                    texto,

                                time:
                                    horario

                            }
                        );


                    renderMessages(
                        nomeConversa
                    );


                    atualizarPreview(
                        nomeConversa,
                        `📎 ${arquivo.name}`,
                        horario
                    );


                    if (
                        !salvarEstadoChat()
                    ) {

                        console.warn(
                            "O anexo foi exibido, mas não pôde ser persistido no navegador."
                        );
                    }


                    attachmentInput.value =
                        "";
                }
            );
    }
        /*====================================================
                        PESQUISA
    ====================================================*/

    function filtrarConversas() {

        if (
            !searchInput
        ) {

            return;
        }


        const termo =
            normalizarTexto(
                searchInput.value
            );


        getConversations()
            .forEach(
                function (
                    conversation
                ) {

                    const strong =
                        conversation
                            .querySelector(
                                ".conversation-info strong"
                            );


                    const span =
                        conversation
                            .querySelector(
                                ".conversation-info span"
                            );


                    const nome =
                        conversation
                            .dataset
                            .chat ||
                        (
                            strong
                                ? strong
                                    .textContent
                                : ""
                        );


                    const subtitle =
                        chatData[
                            nome
                        ]?.subtitle ||
                        "";


                    const texto =
                        normalizarTexto(
                            [

                                strong
                                    ? strong
                                        .textContent
                                    : "",

                                span
                                    ? span
                                        .textContent
                                    : "",

                                subtitle

                            ].join(
                                " "
                            )
                        );


                    conversation.style.display =
                        texto.includes(
                            termo
                        )
                            ? ""
                            : "none";
                }
            );
    }


    function limparPesquisaConversas() {

        if (
            !searchInput
        ) {

            return;
        }


        searchInput.value =
            "";


        filtrarConversas();
    }


    searchInput
        ?.addEventListener(
            "input",
            filtrarConversas
        );


    searchInput
        ?.addEventListener(
            "keydown",
            function (
                event
            ) {

                if (
                    event.key !==
                        "Escape" ||
                    searchInput.value ===
                        ""
                ) {

                    return;
                }


                event.stopPropagation();


                limparPesquisaConversas();
            }
        );


    /*====================================================
                    NOVA CONVERSA
    ====================================================*/

    function abrirNovaConversa() {

        abrirModalChat(
            newChatModal,
            newChatClose
        );
    }


    function fecharNovaConversa() {

        fecharModalChat(
            newChatModal,
            newChatButton
        );
    }


    newChatButton
        ?.addEventListener(
            "click",
            abrirNovaConversa
        );


    newChatClose
        ?.addEventListener(
            "click",
            fecharNovaConversa
        );


    newChatOverlay
        ?.addEventListener(
            "click",
            fecharNovaConversa
        );


    newChatPeople.forEach(
        function (
            person
        ) {

            person.addEventListener(
                "click",
                function () {

                    const nome =
                        String(
                            person
                                .dataset
                                .chat ||
                            ""
                        ).trim();


                    const subtitle =
                        person
                            .dataset
                            .subtitle ||
                        "Conversa";


                    const icon =
                        sanitizarIcone(
                            person
                                .dataset
                                .icon
                        );


                    if (
                        !nome
                    ) {

                        return;
                    }


                    let elemento =
                        encontrarConversa(
                            nome
                        );


                    if (
                        !elemento
                    ) {

                        elemento =
                            criarConversa(
                                nome,
                                subtitle,
                                icon
                            );
                    }


                    limparPesquisaConversas();


                    fecharNovaConversa();


                    ativarConversa(
                        elemento
                    );
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
            !conversationOptionsButton ||
            !pegarNomeConversaAtiva()
        ) {

            return;
        }


        conversationMenu
            .classList
            .add(
                "active"
            );


        conversationMenu.setAttribute(
            "aria-hidden",
            "false"
        );


        conversationOptionsButton
            .setAttribute(
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


        conversationMenu
            .classList
            .remove(
                "active"
            );


        conversationMenu.setAttribute(
            "aria-hidden",
            "true"
        );


        conversationOptionsButton
            .setAttribute(
                "aria-expanded",
                "false"
            );
    }


    function alternarMenuConversa() {

        if (
            !conversationMenu
        ) {

            return;
        }


        conversationMenu
            .classList
            .contains(
                "active"
            )
                ? fecharMenuConversa()
                : abrirMenuConversa();
    }


    conversationOptionsButton
        ?.addEventListener(
            "click",
            function (
                event
            ) {

                event.stopPropagation();


                alternarMenuConversa();
            }
        );


    /*====================================================
                INFORMAÇÕES DA CONVERSA
    ====================================================*/

    function abrirInfoConversa() {

        const nomeConversa =
            pegarNomeConversaAtiva();


        const conversa =
            nomeConversa
                ? chatData[
                    nomeConversa
                ]
                : null;


        if (
            !nomeConversa ||
            !conversa ||
            !infoChatModal
        ) {

            return;
        }


        if (
            infoChatName
        ) {

            infoChatName.textContent =
                nomeConversa;
        }


        if (
            infoChatSubtitle
        ) {

            infoChatSubtitle.textContent =
                conversa.subtitle;
        }


        definirIcone(
            infoChatAvatar,
            conversa.icon
        );


        if (
            infoChatMessageCount
        ) {

            infoChatMessageCount.textContent =
                String(
                    conversa.messages.length
                );
        }


        if (
            infoChatType
        ) {

            infoChatType.textContent =
                normalizarTexto(
                    conversa.subtitle
                ).startsWith(
                    "turma"
                )
                    ? "Turma"
                    : "Institucional";
        }


        fecharMenuConversa();


        abrirModalChat(
            infoChatModal,
            infoChatClose
        );
    }


    function fecharInfoConversa() {

        fecharModalChat(
            infoChatModal,
            conversationOptionsButton
        );
    }


    conversationInfoButton
        ?.addEventListener(
            "click",
            abrirInfoConversa
        );


    infoChatClose
        ?.addEventListener(
            "click",
            fecharInfoConversa
        );


    infoChatOverlay
        ?.addEventListener(
            "click",
            fecharInfoConversa
        );


    /*====================================================
                MODAL DE CONFIRMAÇÃO
    ====================================================*/

    function abrirConfirmacao(
        configuracao
    ) {

        if (
            !confirmChatModal
        ) {

            return;
        }


        confirmacaoAtual =
            configuracao.onConfirm ||
            null;


        if (
            confirmChatTitle
        ) {

            confirmChatTitle.textContent =
                configuracao.title ||
                "Confirmar ação";
        }


        if (
            confirmChatMessage
        ) {

            confirmChatMessage.textContent =
                configuracao.message ||
                "Deseja continuar?";
        }


        if (
            confirmChatIcon
        ) {

            const perigoso =
                configuracao.danger ===
                true;


            confirmChatIcon
                .classList
                .toggle(
                    "danger",
                    perigoso
                );


            definirIcone(
                confirmChatIcon,
                perigoso
                    ? "fa-trash"
                    : "fa-broom"
            );
        }


        if (
            confirmChatConfirm
        ) {

            confirmChatConfirm
                .classList
                .toggle(
                    "danger",
                    configuracao.danger ===
                        true
                );


            confirmChatConfirm.textContent =
                configuracao.confirmText ||
                "Confirmar";
        }


        fecharMenuConversa();


        abrirModalChat(
            confirmChatModal,
            confirmChatCancel
        );
    }


    function fecharConfirmacao() {

        confirmacaoAtual =
            null;


        fecharModalChat(
            confirmChatModal,
            conversationOptionsButton
        );
    }


    confirmChatCancel
        ?.addEventListener(
            "click",
            fecharConfirmacao
        );


    confirmChatOverlay
        ?.addEventListener(
            "click",
            fecharConfirmacao
        );


    confirmChatConfirm
        ?.addEventListener(
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


    /*====================================================
                    LIMPAR CONVERSA
    ====================================================*/

    clearConversationButton
        ?.addEventListener(
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


                abrirConfirmacao(
                    {

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

                                const conversa =
                                    chatData[
                                        nomeConversa
                                    ];


                                if (
                                    !conversa
                                ) {

                                    return;
                                }


                                conversa.messages =
                                    [];


                                conversa.unread =
                                    0;


                                atualizarContador(
                                    nomeConversa
                                );


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

                    }
                );
            }
        );


    /*====================================================
                ESTADO SEM CONVERSA
    ====================================================*/

    function mostrarEstadoSemConversa() {

        if (
            conversationTitle
        ) {

            conversationTitle.textContent =
                "Nenhuma conversa";
        }


        if (
            conversationSubtitle
        ) {

            conversationSubtitle.textContent =
                "Selecione ou inicie uma conversa";
        }


        definirIcone(
            conversationAvatar,
            "fa-comments"
        );


        messagesContainer
            ?.replaceChildren();


        if (
            messageInput
        ) {

            messageInput.value =
                "";
        }


        getConversations()
            .forEach(
                function (
                    item
                ) {

                    item
                        .classList
                        .remove(
                            "active"
                        );


                    item.removeAttribute(
                        "aria-current"
                    );
                }
            );


        atualizarDisponibilidadeChat();


        fecharMenuConversa();


        mostrarListaMobile();
    }


    /*====================================================
                    EXCLUIR CONVERSA
    ====================================================*/

    deleteConversationButton
        ?.addEventListener(
            "click",
            function () {

                const nomeConversa =
                    pegarNomeConversaAtiva();


                if (
                    !nomeConversa
                ) {

                    return;
                }


                abrirConfirmacao(
                    {

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

                                encontrarConversa(
                                    nomeConversa
                                )?.remove();


                                delete chatData[
                                    nomeConversa
                                ];


                                limparPesquisaConversas();


                                const proximaConversa =
                                    document.querySelector(
                                        ".conversation"
                                    );


                                if (
                                    proximaConversa
                                ) {

                                    ativarConversa(
                                        proximaConversa
                                    );


                                    return;
                                }


                                mostrarEstadoSemConversa();


                                salvarEstadoChat();
                            }

                    }
                );
            }
        );


    /*====================================================
                    CLIQUE FORA DO MENU
    ====================================================*/

    document.addEventListener(
        "click",
        function (
            event
        ) {

            if (
                !conversationMenu ||
                !conversationOptionsButton ||
                !(
                    event.target instanceof
                    Node
                )
            ) {

                return;
            }


            const clicouNoMenu =
                conversationMenu.contains(
                    event.target
                );


            const clicouNoBotao =
                conversationOptionsButton
                    .contains(
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
        function (
            event
        ) {

            if (
                event.key !==
                "Escape"
            ) {

                return;
            }


            if (
                confirmChatModal
                    ?.classList
                    .contains(
                        "active"
                    )
            ) {

                fecharConfirmacao();


                return;
            }


            if (
                infoChatModal
                    ?.classList
                    .contains(
                        "active"
                    )
            ) {

                fecharInfoConversa();


                return;
            }


            if (
                newChatModal
                    ?.classList
                    .contains(
                        "active"
                    )
            ) {

                fecharNovaConversa();


                return;
            }


            if (
                conversationMenu
                    ?.classList
                    .contains(
                        "active"
                    )
            ) {

                fecharMenuConversa();
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


    logoutButton
        ?.addEventListener(
            "click",
            fazerLogout
        );


    /*====================================================
                SINCRONIZAÇÃO ENTRE ABAS
    ====================================================*/

    window.addEventListener(
        "storage",
        function (
            event
        ) {

            if (
                event.key !==
                CHAT_STORAGE_KEY
            ) {

                return;
            }


            const conversaAtiva =
                carregarEstadoChat();


            atualizarTodosOsContadores();


            let conversa =
                conversaAtiva
                    ? encontrarConversa(
                        conversaAtiva
                    )
                    : null;


            if (
                !conversa
            ) {

                conversa =
                    document.querySelector(
                        ".conversation"
                    );
            }


            if (
                conversa
            ) {

                ativarConversa(
                    conversa,
                    false
                );

            } else {

                mostrarEstadoSemConversa();
            }


            filtrarConversas();
        }
    );


    /*====================================================
                    INICIALIZAÇÃO
    ====================================================*/

    ajustarModoResponsivo();


    if (
        conversationMenu
    ) {

        conversationMenu.setAttribute(
            "aria-hidden",
            conversationMenu
                .classList
                .contains(
                    "active"
                )
                    ? "false"
                    : "true"
        );
    }


    /*
        As conversas iniciais já existem no HTML.

        data-chat é usado para identificar cada
        conversa sem depender somente do texto
        que aparece visualmente.
    */


    getConversations()
        .forEach(
            function (
                conversation
            ) {

                const strong =
                    conversation
                        .querySelector(
                            ".conversation-info strong"
                        );


                if (
                    strong &&
                    !conversation
                        .dataset
                        .chat
                ) {

                    conversation
                        .dataset
                        .chat =
                            strong
                                .textContent
                                .trim();
                }
            }
        );


    const conversaAtivaSalva =
        carregarEstadoChat();


    if (
        conversaAtivaSalva === null &&
        conversationsContainer
    ) {
        conversationsContainer.replaceChildren();
        chatData = {};
    }

    conversationsContainer?.setAttribute(
        "data-ready",
        "true"
    );


    atualizarTodosOsContadores();


    let conversaInicial =
        conversaAtivaSalva
            ? encontrarConversa(
                conversaAtivaSalva
            )
            : null;


    if (
        !conversaInicial
    ) {

        conversaInicial =
            document.querySelector(
                ".conversation.active"
            );
    }


    if (
        !conversaInicial
    ) {

        conversaInicial =
            document.querySelector(
                ".conversation"
            );
    }


    if (
        conversaInicial
    ) {

        ativarConversa(
            conversaInicial
        );

    } else {

        mostrarEstadoSemConversa();
    }


    salvarEstadoChat();

});
