document.addEventListener("DOMContentLoaded", async function () {
    await window.PrimeWayStorage?.ready;

    const INDEX_URL =
        "../api/professor/chat/index.php";

    const START_URL =
        "../api/professor/chat/iniciar.php";

    const MESSAGES_URL =
        "../api/professor/chat/mensagens.php";

    const SEND_URL =
        "../api/professor/chat/enviar.php";

    const READ_URL =
        "../api/professor/chat/marcar_lida.php";

    let conversations = [];
    let contacts = [];
    let activeConversationId = null;
    let refreshTimer = null;

    const newConversationButton =
        document.querySelector(
            "#newConversationButton"
        );

    const conversationSearch =
        document.querySelector(
            "#conversationSearch"
        );

    const conversationList =
        document.querySelector(
            "#conversationList"
        );

    const conversationTitle =
        document.querySelector(
            "#conversationTitle"
        );

    const conversationRole =
        document.querySelector(
            "#conversationRole"
        );

    const messageList =
        document.querySelector(
            "#messageList"
        );

    const messageForm =
        document.querySelector(
            "#messageForm"
        );

    const messageInput =
        document.querySelector(
            "#messageInput"
        );

    const sendMessageButton =
        document.querySelector(
            "#sendMessageButton"
        );

    const contactDialog =
        document.querySelector(
            "#contactDialog"
        );

    const closeContactDialog =
        document.querySelector(
            "#closeContactDialog"
        );

    const contactSearch =
        document.querySelector(
            "#contactSearch"
        );

    const contactRoleFilter =
        document.querySelector(
            "#contactRoleFilter"
        );

    const contactList =
        document.querySelector(
            "#contactList"
        );

    function initials(name) {
        return String(name || "?")
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(
                part =>
                    part[0] || ""
            )
            .join("")
            .toUpperCase();
    }

    function normalize(value) {
        return String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function roleLabel(role) {
        switch (role) {
            case "aluno":
                return "Aluno";
            case "responsavel":
                return "Responsável";
            case "secretaria":
                return "Secretaria";
            default:
                return role || "Contato";
        }
    }

    function renderConversations() {
        const query =
            normalize(
                conversationSearch.value
            );

        const filtered =
            conversations.filter(
                item =>
                    !query ||
                    normalize(
                        `${item.title} ${item.role} ${item.lastMessage || ""}`
                    ).includes(
                        query
                    )
            );

        conversationList.replaceChildren();

        if (!filtered.length) {
            conversationList.innerHTML =
                '<div class="professor-empty">Nenhuma conversa encontrada.</div>';
            return;
        }

        for (const item of filtered) {
            const button =
                document.createElement(
                    "button"
                );

            button.type =
                "button";

            button.className =
                `teacher-conversation-item${Number(item.id) === Number(activeConversationId) ? " active" : ""}`;

            const avatar =
                document.createElement(
                    "span"
                );

            avatar.className =
                "teacher-conversation-avatar";

            avatar.textContent =
                initials(
                    item.title
                );

            const info =
                document.createElement(
                    "span"
                );

            info.className =
                "teacher-conversation-info";

            const title =
                document.createElement(
                    "strong"
                );

            title.textContent =
                item.title;

            const preview =
                document.createElement(
                    "span"
                );

            preview.textContent =
                item.lastMessage ||
                roleLabel(
                    item.role
                );

            info.append(
                title,
                preview
            );

            button.append(
                avatar,
                info
            );

            if (
                Number(
                    item.unread ||
                    0
                ) > 0
            ) {
                const badge =
                    document.createElement(
                        "span"
                    );

                badge.className =
                    "teacher-conversation-unread";

                badge.textContent =
                    Number(item.unread) > 99
                        ? "99+"
                        : String(
                            item.unread
                        );

                button.append(
                    badge
                );
            }

            button.addEventListener(
                "click",
                () =>
                    selectConversation(
                        item.id
                    )
            );

            conversationList.append(
                button
            );
        }
    }

    function filteredContacts() {
        const query =
            normalize(
                contactSearch.value
            );

        const role =
            contactRoleFilter.value;

        return contacts.filter(
            item => {
                if (
                    role &&
                    item.role !==
                        role
                ) {
                    return false;
                }

                if (
                    query &&
                    !normalize(
                        `${item.name} ${item.description} ${item.role}`
                    ).includes(
                        query
                    )
                ) {
                    return false;
                }

                return true;
            }
        );
    }

    function renderContacts() {
        contactList.replaceChildren();

        const items =
            filteredContacts();

        if (!items.length) {
            contactList.innerHTML =
                '<div class="professor-empty">Nenhum contato disponível.</div>';
            return;
        }

        for (const item of items) {
            const button =
                document.createElement(
                    "button"
                );

            button.type =
                "button";

            button.className =
                "teacher-contact-item";

            const avatar =
                document.createElement(
                    "span"
                );

            avatar.className =
                "teacher-contact-avatar";

            avatar.textContent =
                initials(
                    item.name
                );

            const info =
                document.createElement(
                    "span"
                );

            info.className =
                "teacher-contact-info";

            const name =
                document.createElement(
                    "strong"
                );

            name.textContent =
                item.name;

            const description =
                document.createElement(
                    "span"
                );

            description.textContent =
                item.description ||
                roleLabel(
                    item.role
                );

            info.append(
                name,
                description
            );

            const icon =
                document.createElement(
                    "i"
                );

            icon.className =
                "fa-solid fa-chevron-right";

            icon.setAttribute(
                "aria-hidden",
                "true"
            );

            button.append(
                avatar,
                info,
                icon
            );

            button.addEventListener(
                "click",
                async () => {
                    button.disabled =
                        true;

                    try {
                        const {
                            response,
                            data
                        } =
                            await window
                                .PrimeWayProfessor
                                .requestJson(
                                    START_URL,
                                    {
                                        contactUserId:
                                            item.userId
                                    }
                                );

                        if (
                            !response.ok ||
                            !data?.success
                        ) {
                            throw new Error(
                                data?.message ||
                                "Não foi possível iniciar a conversa."
                            );
                        }

                        contactDialog.close();

                        await loadIndex();

                        await selectConversation(
                            data.conversationId
                        );

                    } catch (error) {
                        window.PrimeWayFeedback
                            ?.error(
                                error?.message ||
                                "Não foi possível iniciar a conversa."
                            );

                    } finally {
                        button.disabled =
                            false;
                    }
                }
            );

            contactList.append(
                button
            );
        }
    }

    function renderMessages(data) {
        messageList.replaceChildren();

        if (
            !Array.isArray(
                data.messages
            ) ||
            !data.messages.length
        ) {
            messageList.innerHTML =
                '<div class="professor-empty"><i class="fa-regular fa-comments" aria-hidden="true"></i>Nenhuma mensagem nesta conversa.</div>';
            return;
        }

        for (const item of data.messages) {
            const article =
                document.createElement(
                    "article"
                );

            article.className =
                `teacher-message ${item.own ? "own" : "other"}`;

            const sender =
                document.createElement(
                    "strong"
                );

            sender.textContent =
                item.own
                    ? "Você"
                    : item.senderName;

            const content =
                document.createElement(
                    "p"
                );

            content.textContent =
                item.content;

            const time =
                document.createElement(
                    "time"
                );

            time.textContent =
                window.PrimeWayProfessor
                    .formatDate(
                        item.sentAt,
                        true
                    );

            article.append(
                sender,
                content,
                time
            );

            messageList.append(
                article
            );
        }

        messageList.scrollTop =
            messageList.scrollHeight;
    }

    async function markConversationRead(
        conversationId
    ) {
        const {
            response
        } =
            await window
                .PrimeWayProfessor
                .requestJson(
                    READ_URL,
                    {
                        conversationId
                    }
                );

        if (response.ok) {
            const item =
                conversations.find(
                    conversation =>
                        Number(
                            conversation.id
                        ) ===
                            Number(
                                conversationId
                            )
                );

            if (item) {
                item.unread = 0;
            }

            renderConversations();

            await window
                .PrimeWayProfessor
                .refreshNavigationBadges();
        }
    }

    async function loadMessages(
        conversationId,
        quiet = false
    ) {
        try {
            const {
                response,
                data
            } =
                await window
                    .PrimeWayProfessor
                    .request(
                        `${MESSAGES_URL}?conversationId=${encodeURIComponent(conversationId)}`
                    );

            if (
                !response.ok ||
                !data?.success
            ) {
                throw new Error(
                    data?.message ||
                    "Não foi possível carregar as mensagens."
                );
            }

            if (
                Number(
                    activeConversationId
                ) !==
                Number(
                    conversationId
                )
            ) {
                return;
            }

            conversationTitle.textContent =
                data.conversation.title;

            conversationRole.textContent =
                roleLabel(
                    data.conversation.role
                );

            renderMessages(
                data
            );

            await markConversationRead(
                conversationId
            );

        } catch (error) {
            if (!quiet) {
                window.PrimeWayFeedback
                    ?.error(
                        error?.message ||
                        "Não foi possível carregar as mensagens."
                    );
            }
        }
    }

    async function selectConversation(id) {
        activeConversationId =
            Number(id);

        messageInput.disabled =
            false;

        sendMessageButton.disabled =
            false;

        renderConversations();

        await loadMessages(
            activeConversationId
        );

        messageInput.focus();
    }

    async function loadIndex(
        quiet = false
    ) {
        try {
            const {
                response,
                data
            } =
                await window
                    .PrimeWayProfessor
                    .request(
                        INDEX_URL
                    );

            if (
                !response.ok ||
                !data?.success
            ) {
                throw new Error(
                    data?.message ||
                    "Não foi possível carregar o chat."
                );
            }

            conversations =
                Array.isArray(
                    data.conversations
                )
                    ? data.conversations
                    : [];

            contacts =
                Array.isArray(
                    data.contacts
                )
                    ? data.contacts
                    : [];

            renderConversations();
            renderContacts();

            if (
                activeConversationId &&
                !conversations.some(
                    item =>
                        Number(
                            item.id
                        ) ===
                            Number(
                                activeConversationId
                            )
                )
            ) {
                activeConversationId =
                    null;

                messageInput.disabled =
                    true;

                sendMessageButton.disabled =
                    true;
            }

            await window
                .PrimeWayProfessor
                .refreshNavigationBadges();

        } catch (error) {
            if (!quiet) {
                console.error(
                    "Erro ao carregar chat:",
                    error
                );

                window.PrimeWayFeedback
                    ?.error(
                        error?.message ||
                        "Não foi possível carregar o chat."
                    );
            }
        }
    }

    async function sendMessage(event) {
        event.preventDefault();

        if (!activeConversationId) {
            return;
        }

        const content =
            messageInput.value.trim();

        if (!content) {
            return;
        }

        sendMessageButton.disabled =
            true;

        try {
            const {
                response,
                data
            } =
                await window
                    .PrimeWayProfessor
                    .requestJson(
                        SEND_URL,
                        {
                            conversationId:
                                activeConversationId,

                            content
                        }
                    );

            if (
                !response.ok ||
                !data?.success
            ) {
                throw new Error(
                    data?.message ||
                    "Não foi possível enviar a mensagem."
                );
            }

            messageInput.value =
                "";

            await loadMessages(
                activeConversationId
            );

            await loadIndex(
                true
            );

        } catch (error) {
            window.PrimeWayFeedback
                ?.error(
                    error?.message ||
                    "Não foi possível enviar a mensagem."
                );

        } finally {
            sendMessageButton.disabled =
                false;

            messageInput.focus();
        }
    }

    const session =
        await window
            .PrimeWayProfessor
            .ensureProfessor();

    if (!session) {
        return;
    }

    window.PrimeWayProfessor
        .bindLogout();

    newConversationButton.addEventListener(
        "click",
        function () {
            contactSearch.value =
                "";

            contactRoleFilter.value =
                "";

            renderContacts();
            contactDialog.showModal();
        }
    );

    closeContactDialog.addEventListener(
        "click",
        function () {
            contactDialog.close();
        }
    );

    conversationSearch.addEventListener(
        "input",
        renderConversations
    );

    contactSearch.addEventListener(
        "input",
        renderContacts
    );

    contactRoleFilter.addEventListener(
        "change",
        renderContacts
    );

    messageForm.addEventListener(
        "submit",
        sendMessage
    );

    messageInput.addEventListener(
        "keydown",
        event => {
            if (
                event.key ===
                    "Enter" &&
                !event.shiftKey
            ) {
                event.preventDefault();
                messageForm.requestSubmit();
            }
        }
    );

    await loadIndex();

    refreshTimer =
        window.setInterval(
            async function () {
                await loadIndex(
                    true
                );

                if (
                    activeConversationId
                ) {
                    await loadMessages(
                        activeConversationId,
                        true
                    );
                }
            },
            15000
        );

    window.addEventListener(
        "beforeunload",
        function () {
            if (refreshTimer) {
                window.clearInterval(
                    refreshTimer
                );
            }
        }
    );
});
