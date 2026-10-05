document.addEventListener("DOMContentLoaded", async function () {
    const INDEX_URL = "../api/secretaria/chat/index.php";
    const START_URL = "../api/secretaria/chat/iniciar.php";
    const MESSAGES_URL = "../api/secretaria/chat/mensagens.php";
    const SEND_URL = "../api/secretaria/chat/enviar.php";
    const UPLOAD_URL = "../api/secretaria/chat/upload.php";
    const READ_URL = "../api/secretaria/chat/marcar_lida.php";
    const SUSPENSION_URL = "../api/secretaria/chat/suspensao.php";

    const session = await window.PrimeWaySecretaria.ensureSecretary();
    if (!session) return;

    window.PrimeWaySecretaria.bindLogout();

    const conversationList = document.querySelector("#conversationList");
    const conversationSearch = document.querySelector("#conversationSearch");
    const conversationTitle = document.querySelector("#conversationTitle");
    const conversationRole = document.querySelector("#conversationRole");
    const toggleChatSuspensionButton = document.querySelector("#toggleChatSuspensionButton");
    const chatSuspensionNotice = document.querySelector("#chatSuspensionNotice");
    const chatSuspensionNoticeText = document.querySelector("#chatSuspensionNoticeText");

    const messageList = document.querySelector("#messageList");
    const messageForm = document.querySelector("#messageForm");
    const messageInput = document.querySelector("#messageInput");
    const sendMessageButton = document.querySelector("#sendMessageButton");
    const attachFileButton = document.querySelector("#attachFileButton");
    const chatFileInput = document.querySelector("#chatFileInput");
    const selectedFileBox = document.querySelector("#selectedFileBox");
    const selectedFileName = document.querySelector("#selectedFileName");
    const selectedFileSize = document.querySelector("#selectedFileSize");
    const removeSelectedFile = document.querySelector("#removeSelectedFile");

    const newConversationButton = document.querySelector("#newConversationButton");
    const contactDialog = document.querySelector("#contactDialog");
    const closeContactDialog = document.querySelector("#closeContactDialog");
    const contactSearch = document.querySelector("#contactSearch");
    const contactRoleFilter = document.querySelector("#contactRoleFilter");
    const contactList = document.querySelector("#contactList");

    const suspensionDialog = document.querySelector("#suspensionDialog");
    const suspensionDialogIcon = document.querySelector("#suspensionDialogIcon");
    const suspensionDialogTitle = document.querySelector("#suspensionDialogTitle");
    const suspensionDialogMessage = document.querySelector("#suspensionDialogMessage");
    const suspensionReasonField = document.querySelector("#suspensionReasonField");
    const suspensionReason = document.querySelector("#suspensionReason");
    const cancelSuspensionAction = document.querySelector("#cancelSuspensionAction");
    const confirmSuspensionAction = document.querySelector("#confirmSuspensionAction");

    const attachmentPreviewDialog = document.querySelector("#attachmentPreviewDialog");
    const attachmentPreviewTitle = document.querySelector("#attachmentPreviewTitle");
    const attachmentPreviewBody = document.querySelector("#attachmentPreviewBody");
    const attachmentOpenLink = document.querySelector("#attachmentOpenLink");
    const attachmentDownloadLink = document.querySelector("#attachmentDownloadLink");
    const closeAttachmentPreview = document.querySelector("#closeAttachmentPreview");

    let conversations = [];
    let contacts = [];
    let activeConversationId = null;
    let activeConversation = null;
    let selectedFile = null;
    let refreshTimer = null;

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const ALLOWED_EXTENSIONS = new Set([
        "pdf", "png", "jpg", "jpeg", "txt",
        "doc", "docx", "xls", "xlsx", "ppt", "pptx"
    ]);

    function normalize(value) {
        return String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function initials(name) {
        return String(name || "?")
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part.charAt(0).toUpperCase())
            .join("") || "?";
    }

    function roleLabel(role) {
        const labels = {
            admin: "Administrador",
            professor: "Professor(a)",
            aluno: "Aluno",
            responsavel: "Responsável",
            secretaria: "Secretaria"
        };

        return labels[role] || "Contato";
    }

    function formatBytes(bytes) {
        const size = Number(bytes || 0);
        if (!Number.isFinite(size) || size <= 0) return "0 B";
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }

    function fileExtension(name) {
        const parts = String(name || "").toLowerCase().split(".");
        return parts.length > 1 ? parts.pop() : "";
    }

    function clearSelectedFile() {
        selectedFile = null;
        chatFileInput.value = "";
        selectedFileBox.hidden = true;
        selectedFileName.textContent = "";
        selectedFileSize.textContent = "";
    }

    function setSelectedFile(file) {
        if (!file) {
            clearSelectedFile();
            return;
        }

        const extension = fileExtension(file.name);

        if (!ALLOWED_EXTENSIONS.has(extension)) {
            clearSelectedFile();
            window.PrimeWayFeedback?.error("Formato de arquivo não permitido no chat.");
            return;
        }

        if (file.size <= 0) {
            clearSelectedFile();
            window.PrimeWayFeedback?.error("O arquivo está vazio.");
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            clearSelectedFile();
            window.PrimeWayFeedback?.error("O arquivo deve possuir no máximo 10 MB.");
            return;
        }

        selectedFile = file;
        selectedFileName.textContent = file.name;
        selectedFileSize.textContent = formatBytes(file.size);
        selectedFileBox.hidden = false;
    }

    function updateSuspensionControls() {
        if (!activeConversation?.userId) {
            toggleChatSuspensionButton.hidden = true;
            chatSuspensionNotice.hidden = true;
            return;
        }

        const suspended = Boolean(activeConversation.suspended);
        toggleChatSuspensionButton.hidden = false;
        toggleChatSuspensionButton.classList.toggle("is-suspended", suspended);

        const icon = toggleChatSuspensionButton.querySelector("i");
        const label = toggleChatSuspensionButton.querySelector("span");

        if (icon) {
            icon.className = suspended ? "fa-solid fa-unlock" : "fa-solid fa-ban";
        }

        if (label) {
            label.textContent = suspended ? "Reativar chat" : "Suspender chat";
        }

        chatSuspensionNotice.hidden = !suspended;

        if (suspended) {
            const reason = String(activeConversation.suspensionReason || "").trim();
            chatSuspensionNoticeText.textContent = reason
                ? `Este usuário está impedido de enviar mensagens. Motivo: ${reason}`
                : "Este usuário está impedido de iniciar novas conversas ou enviar mensagens.";
        }
    }

    function renderConversations() {
        const query = normalize(conversationSearch.value);
        const list = conversations.filter(item =>
            !query || normalize(`${item.title} ${item.lastMessage} ${item.role}`).includes(query)
        );

        conversationList.replaceChildren();

        if (!list.length) {
            conversationList.innerHTML = '<div class="secretary-chat-empty">Nenhuma conversa encontrada.</div>';
            return;
        }

        for (const item of list) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = `secretary-conversation-item${Number(item.id) === Number(activeConversationId) ? " active" : ""}`;

            const avatar = document.createElement("span");
            avatar.className = "secretary-conversation-avatar";
            avatar.textContent = initials(item.title);

            const info = document.createElement("span");
            info.className = "secretary-conversation-info";

            const name = document.createElement("strong");
            name.textContent = item.title;

            const preview = document.createElement("span");
            preview.textContent = item.lastMessage || roleLabel(item.role);

            info.append(name, preview);
            button.append(avatar, info);

            if (Number(item.unread || 0) > 0) {
                const unread = document.createElement("span");
                unread.className = "secretary-conversation-unread";
                unread.textContent = Number(item.unread) > 99 ? "99+" : String(item.unread);
                button.append(unread);
            }

            button.addEventListener("click", () => selectConversation(item.id));
            conversationList.append(button);
        }
    }

    function renderContacts() {
        const query = normalize(contactSearch.value);
        const role = contactRoleFilter.value;

        const list = contacts.filter(item => {
            if (role && item.role !== role) return false;
            return !query || normalize(`${item.name} ${item.email || ""} ${item.description} ${item.role}`).includes(query);
        });

        contactList.replaceChildren();

        if (!list.length) {
            contactList.innerHTML = '<div class="secretary-chat-empty">Nenhum contato disponível.</div>';
            return;
        }

        for (const item of list) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "secretary-contact-item";

            const avatar = document.createElement("span");
            avatar.className = "secretary-contact-avatar";
            avatar.textContent = initials(item.name);

            const info = document.createElement("span");
            info.className = "secretary-contact-info";

            const name = document.createElement("strong");
            name.textContent = item.name;

            const description = document.createElement("span");
            description.textContent = [item.description || roleLabel(item.role), item.email || ""]
                .filter(Boolean)
                .join(" • ");

            info.append(name, description);

            const icon = document.createElement("i");
            icon.className = "fa-solid fa-chevron-right";
            icon.setAttribute("aria-hidden", "true");

            button.append(avatar, info, icon);

            button.addEventListener("click", async () => {
                button.disabled = true;

                try {
                    const { response, data } = await window.PrimeWaySecretaria.requestJson(
                        START_URL,
                        { contactUserId: item.userId }
                    );

                    if (!response.ok || !data?.success) {
                        throw new Error(data?.message || "Não foi possível iniciar a conversa.");
                    }

                    contactDialog.close();
                    await loadIndex();
                    await selectConversation(data.conversationId);
                } catch (error) {
                    window.PrimeWayFeedback?.error(error?.message || "Não foi possível iniciar a conversa.");
                } finally {
                    button.disabled = false;
                }
            });

            contactList.append(button);
        }
    }

    function attachmentIcon(attachment) {
        if (attachment.kind === "image") return "fa-file-image";
        if (attachment.kind === "pdf") return "fa-file-pdf";

        const extension = fileExtension(attachment.name);
        if (["doc", "docx"].includes(extension)) return "fa-file-word";
        if (["xls", "xlsx"].includes(extension)) return "fa-file-excel";
        if (["ppt", "pptx"].includes(extension)) return "fa-file-powerpoint";
        return "fa-file-lines";
    }

    function openAttachmentPreview(attachment) {
        attachmentPreviewTitle.textContent = attachment.name || "Arquivo";
        attachmentPreviewBody.replaceChildren();
        attachmentOpenLink.href = attachment.url;
        attachmentDownloadLink.href = attachment.downloadUrl || `${attachment.url}&download=1`;

        if (attachment.kind === "image") {
            const image = document.createElement("img");
            image.src = attachment.url;
            image.alt = attachment.name || "Imagem enviada no chat";
            image.className = "secretary-attachment-preview-image";
            attachmentPreviewBody.append(image);
        } else if (attachment.kind === "pdf") {
            const frame = document.createElement("iframe");
            frame.src = attachment.url;
            frame.title = attachment.name || "PDF enviado no chat";
            frame.className = "secretary-attachment-preview-frame";
            attachmentPreviewBody.append(frame);
        } else {
            const box = document.createElement("div");
            box.className = "secretary-attachment-document-preview";
            box.innerHTML = '<i class="fa-solid fa-file-arrow-down" aria-hidden="true"></i><strong>Este tipo de documento será aberto pelo aplicativo compatível do seu dispositivo.</strong>';
            attachmentPreviewBody.append(box);
        }

        attachmentPreviewDialog.showModal();
    }

    function renderAttachment(attachment) {
        if (attachment.kind === "image") {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "secretary-message-image";
            button.setAttribute("aria-label", `Abrir ${attachment.name}`);

            const image = document.createElement("img");
            image.src = attachment.url;
            image.alt = attachment.name || "Imagem enviada no chat";
            image.loading = "lazy";
            button.append(image);
            button.addEventListener("click", () => openAttachmentPreview(attachment));
            return button;
        }

        const button = document.createElement("button");
        button.type = "button";
        button.className = "secretary-message-file";

        const icon = document.createElement("i");
        icon.className = `fa-solid ${attachmentIcon(attachment)}`;
        icon.setAttribute("aria-hidden", "true");

        const info = document.createElement("span");
        const name = document.createElement("strong");
        name.textContent = attachment.name;
        const meta = document.createElement("small");
        meta.textContent = `${attachment.kind === "pdf" ? "PDF" : "Arquivo"} • ${formatBytes(attachment.size)}`;
        info.append(name, meta);

        const openIcon = document.createElement("i");
        openIcon.className = "fa-solid fa-arrow-up-right-from-square";
        openIcon.setAttribute("aria-hidden", "true");

        button.append(icon, info, openIcon);
        button.addEventListener("click", () => openAttachmentPreview(attachment));
        return button;
    }

    function renderMessages(data) {
        messageList.replaceChildren();

        if (!Array.isArray(data.messages) || !data.messages.length) {
            messageList.innerHTML = '<div class="secretary-chat-empty"><i class="fa-regular fa-comments"></i>Nenhuma mensagem nesta conversa.</div>';
            return;
        }

        for (const item of data.messages) {
            const article = document.createElement("article");
            article.className = `secretary-message ${item.own ? "own" : "other"}`;

            const sender = document.createElement("strong");
            sender.textContent = item.own ? "Você" : item.senderName;
            article.append(sender);

            if (String(item.content || "").trim() !== "") {
                const content = document.createElement("p");
                content.textContent = item.content;
                article.append(content);
            }

            if (Array.isArray(item.attachments) && item.attachments.length) {
                const attachments = document.createElement("div");
                attachments.className = "secretary-message-attachments";

                for (const attachment of item.attachments) {
                    attachments.append(renderAttachment(attachment));
                }

                article.append(attachments);
            }

            const time = document.createElement("time");
            time.textContent = window.PrimeWaySecretaria.formatDate(item.sentAt, true);
            article.append(time);
            messageList.append(article);
        }

        messageList.scrollTop = messageList.scrollHeight;
    }

    async function markConversationRead(conversationId) {
        const { response } = await window.PrimeWaySecretaria.requestJson(
            READ_URL,
            { conversationId }
        );

        if (response.ok) {
            const item = conversations.find(conversation => Number(conversation.id) === Number(conversationId));
            if (item) item.unread = 0;
            renderConversations();
            await window.PrimeWaySecretaria.refreshNavigationBadges();
        }
    }

    async function loadMessages(conversationId, quiet = false) {
        try {
            const { response, data } = await window.PrimeWaySecretaria.request(
                `${MESSAGES_URL}?conversationId=${encodeURIComponent(conversationId)}`
            );

            if (!response.ok || !data?.success) {
                throw new Error(data?.message || "Não foi possível carregar as mensagens.");
            }

            if (Number(activeConversationId) !== Number(conversationId)) return;

            activeConversation = data.conversation || null;
            conversationTitle.textContent = activeConversation?.title || "Conversa";
            conversationRole.textContent = `${roleLabel(activeConversation?.role)}${activeConversation?.suspended ? " • Chat suspenso" : ""}`;

            updateSuspensionControls();
            renderMessages(data);
            await markConversationRead(conversationId);
        } catch (error) {
            if (!quiet) {
                window.PrimeWayFeedback?.error(error?.message || "Não foi possível carregar as mensagens.");
            }
        }
    }

    async function selectConversation(id) {
        activeConversationId = Number(id);
        activeConversation = null;
        clearSelectedFile();

        messageInput.disabled = false;
        sendMessageButton.disabled = false;
        attachFileButton.disabled = false;
        toggleChatSuspensionButton.hidden = true;
        chatSuspensionNotice.hidden = true;

        renderConversations();
        await loadMessages(activeConversationId);
        messageInput.focus();
    }

    async function loadIndex(quiet = false) {
        try {
            const { response, data } = await window.PrimeWaySecretaria.request(INDEX_URL);

            if (!response.ok || !data?.success) {
                throw new Error(data?.message || "Não foi possível carregar o chat.");
            }

            conversations = Array.isArray(data.conversations) ? data.conversations : [];
            contacts = Array.isArray(data.contacts) ? data.contacts : [];

            renderConversations();
            renderContacts();

            if (activeConversationId && !conversations.some(item => Number(item.id) === Number(activeConversationId))) {
                activeConversationId = null;
                activeConversation = null;
                clearSelectedFile();
                messageInput.disabled = true;
                sendMessageButton.disabled = true;
                attachFileButton.disabled = true;
                toggleChatSuspensionButton.hidden = true;
                chatSuspensionNotice.hidden = true;
            }

            await window.PrimeWaySecretaria.refreshNavigationBadges();
        } catch (error) {
            if (!quiet) {
                console.error("Erro ao carregar chat da Secretaria:", error);
                window.PrimeWayFeedback?.error(error?.message || "Não foi possível carregar o chat.");
            }
        }
    }

    async function sendMessage(event) {
        event.preventDefault();
        if (!activeConversationId) return;

        const content = messageInput.value.trim();
        if (!content && !selectedFile) return;

        sendMessageButton.disabled = true;
        attachFileButton.disabled = true;

        try {
            let response;
            let data;

            if (selectedFile) {
                const formData = new FormData();
                formData.append("conversationId", String(activeConversationId));
                formData.append("content", content);
                formData.append("file", selectedFile, selectedFile.name);

                ({ response, data } = await window.PrimeWaySecretaria.request(
                    UPLOAD_URL,
                    { method: "POST", body: formData }
                ));
            } else {
                ({ response, data } = await window.PrimeWaySecretaria.requestJson(
                    SEND_URL,
                    { conversationId: activeConversationId, content }
                ));
            }

            if (!response.ok || !data?.success) {
                throw new Error(data?.message || "Não foi possível enviar a mensagem.");
            }

            messageInput.value = "";
            clearSelectedFile();
            await loadMessages(activeConversationId);
            await loadIndex(true);
        } catch (error) {
            window.PrimeWayFeedback?.error(error?.message || "Não foi possível enviar a mensagem.");
        } finally {
            sendMessageButton.disabled = false;
            attachFileButton.disabled = !activeConversationId;
            messageInput.focus();
        }
    }

    function openSuspensionDialog() {
        if (!activeConversation?.userId) return;

        const reactivating = Boolean(activeConversation.suspended);
        suspensionReason.value = "";
        suspensionReasonField.hidden = reactivating;
        suspensionDialogIcon.classList.toggle("is-reactivate", reactivating);
        suspensionDialogIcon.innerHTML = reactivating
            ? '<i class="fa-solid fa-unlock" aria-hidden="true"></i>'
            : '<i class="fa-solid fa-ban" aria-hidden="true"></i>';
        suspensionDialogTitle.textContent = reactivating ? "Reativar chat?" : "Suspender chat?";
        suspensionDialogMessage.textContent = reactivating
            ? `O acesso de ${activeConversation.title} ao chat será restaurado.`
            : `O usuário ${activeConversation.title} não poderá iniciar novas conversas nem enviar mensagens enquanto a suspensão estiver ativa.`;
        confirmSuspensionAction.textContent = reactivating ? "Reativar chat" : "Suspender chat";
        confirmSuspensionAction.classList.toggle("is-reactivate", reactivating);
        suspensionDialog.showModal();
        if (!reactivating) suspensionReason.focus();
    }

    async function confirmSuspension() {
        if (!activeConversation?.userId) return;

        const shouldSuspend = !Boolean(activeConversation.suspended);
        confirmSuspensionAction.disabled = true;
        cancelSuspensionAction.disabled = true;

        try {
            const { response, data } = await window.PrimeWaySecretaria.requestJson(
                SUSPENSION_URL,
                {
                    userId: activeConversation.userId,
                    suspended: shouldSuspend,
                    reason: shouldSuspend ? suspensionReason.value.trim() : ""
                }
            );

            if (!response.ok || !data?.success) {
                throw new Error(data?.message || "Não foi possível alterar a suspensão do chat.");
            }

            suspensionDialog.close();
            window.PrimeWayFeedback?.success(
                data.message || (shouldSuspend ? "Chat suspenso com sucesso." : "Chat reativado com sucesso.")
            );
            await loadMessages(activeConversationId);
            await loadIndex(true);
        } catch (error) {
            window.PrimeWayFeedback?.error(error?.message || "Não foi possível alterar a suspensão do chat.");
        } finally {
            confirmSuspensionAction.disabled = false;
            cancelSuspensionAction.disabled = false;
        }
    }

    newConversationButton.addEventListener("click", () => {
        contactSearch.value = "";
        contactRoleFilter.value = "";
        renderContacts();
        contactDialog.showModal();
    });

    closeContactDialog.addEventListener("click", () => contactDialog.close());
    toggleChatSuspensionButton.addEventListener("click", openSuspensionDialog);
    cancelSuspensionAction.addEventListener("click", () => suspensionDialog.close());
    confirmSuspensionAction.addEventListener("click", confirmSuspension);

    suspensionDialog.addEventListener("click", event => {
        if (event.target === suspensionDialog) suspensionDialog.close();
    });

    attachFileButton.addEventListener("click", () => {
        if (!activeConversationId) return;
        chatFileInput.click();
    });

    chatFileInput.addEventListener("change", () => {
        setSelectedFile(chatFileInput.files?.[0] || null);
    });

    removeSelectedFile.addEventListener("click", clearSelectedFile);

    closeAttachmentPreview.addEventListener("click", () => attachmentPreviewDialog.close());
    attachmentPreviewDialog.addEventListener("click", event => {
        if (event.target === attachmentPreviewDialog) attachmentPreviewDialog.close();
    });

    conversationSearch.addEventListener("input", renderConversations);
    contactSearch.addEventListener("input", renderContacts);
    contactRoleFilter.addEventListener("change", renderContacts);
    messageForm.addEventListener("submit", sendMessage);

    messageInput.addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            messageForm.requestSubmit();
        }
    });

    await loadIndex();

    refreshTimer = window.setInterval(async () => {
        await loadIndex(true);
        if (activeConversationId) {
            await loadMessages(activeConversationId, true);
        }
    }, 15000);

    window.addEventListener("beforeunload", () => {
        if (refreshTimer) window.clearInterval(refreshTimer);
    });
});
