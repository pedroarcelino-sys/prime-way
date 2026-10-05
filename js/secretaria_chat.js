document.addEventListener("DOMContentLoaded",async function(){
    const INDEX_URL="../api/secretaria/chat/index.php";
    const START_URL="../api/secretaria/chat/iniciar.php";
    const MESSAGES_URL="../api/secretaria/chat/mensagens.php";
    const SEND_URL="../api/secretaria/chat/enviar.php";
    const UPLOAD_URL="../api/chat/upload.php";
    const READ_URL="../api/secretaria/chat/marcar_lida.php";
    const SUSPENSION_URL="../api/secretaria/chat/suspensao.php";

    const session=await window.PrimeWaySecretaria.ensureSecretary();
    if(!session)return;
    window.PrimeWaySecretaria.bindLogout();

    const Attachments=window.PrimeWayChatAttachments;
    const Experience=window.PrimeWayChatMessageExperience;

    if(!Attachments||!Experience){
        window.PrimeWayFeedback?.error("Não foi possível carregar os recursos do Chat.");
        return;
    }

    const q=selector=>document.querySelector(selector);
    const conversationList=q("#conversationList");
    const conversationSearch=q("#conversationSearch");
    const conversationTitle=q("#conversationTitle");
    const conversationRole=q("#conversationRole");
    const toggleChatSuspensionButton=q("#toggleChatSuspensionButton");
    const chatSuspensionNotice=q("#chatSuspensionNotice");
    const chatSuspensionNoticeText=q("#chatSuspensionNoticeText");
    const messageList=q("#messageList");
    const messageForm=q("#messageForm");
    const messageInput=q("#messageInput");
    const sendMessageButton=q("#sendMessageButton");
    const newConversationButton=q("#newConversationButton");
    const contactDialog=q("#contactDialog");
    const closeContactDialog=q("#closeContactDialog");
    const contactSearch=q("#contactSearch");
    const contactRoleFilter=q("#contactRoleFilter");
    const contactList=q("#contactList");
    const suspensionDialog=q("#suspensionDialog");
    const suspensionDialogIcon=q("#suspensionDialogIcon");
    const suspensionDialogTitle=q("#suspensionDialogTitle");
    const suspensionDialogMessage=q("#suspensionDialogMessage");
    const suspensionReasonField=q("#suspensionReasonField");
    const suspensionReason=q("#suspensionReason");
    const cancelSuspensionAction=q("#cancelSuspensionAction");
    const confirmSuspensionAction=q("#confirmSuspensionAction");

    let conversations=[];
    let contacts=[];
    let activeConversationId=null;
    let activeConversation=null;
    let refreshTimer=null;

    const attachmentUi=Attachments.createComposer({
        form:messageForm,
        input:messageInput,
        csrfToken:session?.csrfToken||"",
        uploadUrl:UPLOAD_URL,
        onError:message=>window.PrimeWayFeedback?.error(message)
    });
    attachmentUi.setEnabled(false);

    const normalize=value=>String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
    const initials=name=>String(name||"?").split(/\s+/).filter(Boolean).slice(0,2).map(part=>part.charAt(0).toUpperCase()).join("")||"?";

    function roleLabel(role){
        const labels={admin:"Administrador",professor:"Professor(a)",aluno:"Aluno",responsavel:"Responsável",secretaria:"Secretaria"};
        return labels[role]||"Contato";
    }

    function updateSuspensionControls(){
        if(!activeConversation?.userId){
            toggleChatSuspensionButton.hidden=true;
            chatSuspensionNotice.hidden=true;
            return;
        }

        const suspended=Boolean(activeConversation.suspended);
        toggleChatSuspensionButton.hidden=false;
        toggleChatSuspensionButton.classList.toggle("is-suspended",suspended);
        const icon=toggleChatSuspensionButton.querySelector("i");
        const label=toggleChatSuspensionButton.querySelector("span");
        if(icon)icon.className=suspended?"fa-solid fa-unlock":"fa-solid fa-ban";
        if(label)label.textContent=suspended?"Reativar chat":"Suspender chat";
        chatSuspensionNotice.hidden=!suspended;

        if(suspended){
            const reason=String(activeConversation.suspensionReason||"").trim();
            chatSuspensionNoticeText.textContent=reason
                ?`Este usuário está impedido de enviar mensagens. Motivo: ${reason}`
                :"Este usuário está impedido de iniciar novas conversas ou enviar mensagens.";
        }
    }

    function renderConversations(){
        const query=normalize(conversationSearch.value);
        const list=conversations.filter(item=>!query||normalize(`${item.title} ${item.lastMessage||""} ${item.role||""}`).includes(query));
        conversationList.replaceChildren();

        if(!list.length){
            conversationList.innerHTML='<div class="secretary-chat-empty">Nenhuma conversa encontrada.</div>';
            return;
        }

        for(const item of list){
            const button=document.createElement("button");
            button.type="button";
            button.className=`secretary-conversation-item${Number(item.id)===Number(activeConversationId)?" active":""}`;
            const avatar=document.createElement("span");
            avatar.className="secretary-conversation-avatar";
            avatar.textContent=initials(item.title);
            const info=document.createElement("span");
            info.className="secretary-conversation-info";
            const name=document.createElement("strong");
            name.textContent=item.title;
            const preview=document.createElement("span");
            preview.textContent=item.lastMessage||roleLabel(item.role);
            info.append(name,preview);
            button.append(avatar,info);

            if(Number(item.unread||0)>0){
                const unread=document.createElement("span");
                unread.className="secretary-conversation-unread";
                unread.textContent=Number(item.unread)>99?"99+":String(item.unread);
                button.append(unread);
            }

            button.addEventListener("click",()=>selectConversation(item.id));
            conversationList.append(button);
        }
    }

    function renderContacts(){
        const query=normalize(contactSearch.value);
        const role=contactRoleFilter.value;
        const list=contacts.filter(item=>{
            if(role&&item.role!==role)return false;
            return !query||normalize(`${item.name} ${item.email||""} ${item.description||""} ${item.role||""}`).includes(query);
        });

        contactList.replaceChildren();
        if(!list.length){
            contactList.innerHTML='<div class="secretary-chat-empty">Nenhum contato disponível.</div>';
            return;
        }

        for(const item of list){
            const button=document.createElement("button");
            button.type="button";
            button.className="secretary-contact-item";
            const avatar=document.createElement("span");
            avatar.className="secretary-contact-avatar";
            avatar.textContent=initials(item.name);
            const info=document.createElement("span");
            info.className="secretary-contact-info";
            const name=document.createElement("strong");
            name.textContent=item.name;
            const description=document.createElement("span");
            description.textContent=[item.description||roleLabel(item.role),item.email||""].filter(Boolean).join(" • ");
            info.append(name,description);
            const icon=document.createElement("i");
            icon.className="fa-solid fa-chevron-right";
            icon.setAttribute("aria-hidden","true");
            button.append(avatar,info,icon);

            button.addEventListener("click",async()=>{
                button.disabled=true;
                try{
                    const{response,data}=await window.PrimeWaySecretaria.requestJson(START_URL,{contactUserId:item.userId});
                    if(!response.ok||!data?.success)throw new Error(data?.message||"Não foi possível iniciar a conversa.");
                    contactDialog.close();
                    await loadIndex();
                    await selectConversation(data.conversationId);
                }catch(error){
                    window.PrimeWayFeedback?.error(error?.message||"Não foi possível iniciar a conversa.");
                }finally{
                    button.disabled=false;
                }
            });
            contactList.append(button);
        }
    }

    function renderMessages(data){
        messageList.replaceChildren();
        if(!Array.isArray(data.messages)||!data.messages.length){
            messageList.innerHTML='<div class="secretary-chat-empty"><i class="fa-regular fa-comments"></i>Nenhuma mensagem nesta conversa.</div>';
            return;
        }

        for(const item of data.messages){
            const article=document.createElement("article");
            article.className=`secretary-message ${item.own?"own":"other"}`;
            const sender=document.createElement("strong");
            sender.textContent=item.own?"Você":item.senderName;
            article.append(sender);

            if(String(item.content||"").trim()!==""){
                const content=document.createElement("p");
                content.textContent=item.content;
                article.append(content);
            }

            Attachments.renderMessageAttachments(article,Array.isArray(item.attachments)?item.attachments:[]);

            const time=document.createElement("time");
            time.textContent=window.PrimeWaySecretaria.formatDate(item.sentAt,true);
            article.append(time);

            Experience.decorateMessage(article,item,{
                csrfToken:session?.csrfToken||"",
                onChanged:async()=>{
                    if(activeConversationId){
                        await loadMessages(activeConversationId,true);
                        await loadIndex(true);
                    }
                },
                onError:message=>window.PrimeWayFeedback?.error(message)
            });

            messageList.append(article);
        }
        messageList.scrollTop=messageList.scrollHeight;
    }

    async function markConversationRead(conversationId){
        const{response}=await window.PrimeWaySecretaria.requestJson(READ_URL,{conversationId});
        if(response.ok){
            const item=conversations.find(conversation=>Number(conversation.id)===Number(conversationId));
            if(item)item.unread=0;
            renderConversations();
            await window.PrimeWaySecretaria.refreshNavigationBadges();
        }
    }

    async function loadMessages(conversationId,quiet=false){
        try{
            const{response,data}=await window.PrimeWaySecretaria.request(`${MESSAGES_URL}?conversationId=${encodeURIComponent(conversationId)}`);
            if(!response.ok||!data?.success)throw new Error(data?.message||"Não foi possível carregar as mensagens.");
            if(Number(activeConversationId)!==Number(conversationId))return;

            activeConversation=data.conversation||null;
            conversationTitle.textContent=activeConversation?.title||"Conversa";
            conversationRole.textContent=`${roleLabel(activeConversation?.role)}${activeConversation?.suspended?" • Chat suspenso":""}`;
            updateSuspensionControls();
            renderMessages(data);
            await markConversationRead(conversationId);
        }catch(error){
            if(!quiet)window.PrimeWayFeedback?.error(error?.message||"Não foi possível carregar as mensagens.");
        }
    }

    async function selectConversation(id){
        activeConversationId=Number(id);
        activeConversation=null;
        attachmentUi.clear();
        messageInput.disabled=false;
        sendMessageButton.disabled=false;
        attachmentUi.setEnabled(true);
        toggleChatSuspensionButton.hidden=true;
        chatSuspensionNotice.hidden=true;
        renderConversations();
        await loadMessages(activeConversationId);
        messageInput.focus();
    }

    async function loadIndex(quiet=false){
        try{
            const{response,data}=await window.PrimeWaySecretaria.request(INDEX_URL);
            if(!response.ok||!data?.success)throw new Error(data?.message||"Não foi possível carregar o chat.");
            conversations=Array.isArray(data.conversations)?data.conversations:[];
            contacts=Array.isArray(data.contacts)?data.contacts:[];
            renderConversations();
            renderContacts();

            if(activeConversationId&&!conversations.some(item=>Number(item.id)===Number(activeConversationId))){
                activeConversationId=null;
                activeConversation=null;
                attachmentUi.setEnabled(false);
                messageInput.disabled=true;
                sendMessageButton.disabled=true;
                toggleChatSuspensionButton.hidden=true;
                chatSuspensionNotice.hidden=true;
            }

            await window.PrimeWaySecretaria.refreshNavigationBadges();
        }catch(error){
            if(!quiet){
                console.error("Erro ao carregar chat da Secretaria:",error);
                window.PrimeWayFeedback?.error(error?.message||"Não foi possível carregar o chat.");
            }
        }
    }

    async function sendMessage(event){
        event.preventDefault();
        if(!activeConversationId)return;
        const content=messageInput.value.trim();
        if(!content&&!attachmentUi.hasFile())return;
        sendMessageButton.disabled=true;

        try{
            let response;
            let data;
            if(attachmentUi.hasFile()){
                ({response,data}=await attachmentUi.upload({conversationId:activeConversationId,content}));
            }else{
                ({response,data}=await window.PrimeWaySecretaria.requestJson(SEND_URL,{conversationId:activeConversationId,content}));
            }
            if(!response.ok||!data?.success)throw new Error(data?.message||"Não foi possível enviar a mensagem.");
            messageInput.value="";
            attachmentUi.clear();
            await loadMessages(activeConversationId);
            await loadIndex(true);
        }catch(error){
            window.PrimeWayFeedback?.error(error?.message||"Não foi possível enviar a mensagem.");
        }finally{
            sendMessageButton.disabled=false;
            messageInput.focus();
        }
    }

    function openSuspensionDialog(){
        if(!activeConversation?.userId)return;
        const reactivating=Boolean(activeConversation.suspended);
        suspensionReason.value="";
        suspensionReasonField.hidden=reactivating;
        suspensionDialogIcon.classList.toggle("is-reactivate",reactivating);
        suspensionDialogIcon.innerHTML=reactivating?'<i class="fa-solid fa-unlock" aria-hidden="true"></i>':'<i class="fa-solid fa-ban" aria-hidden="true"></i>';
        suspensionDialogTitle.textContent=reactivating?"Reativar chat?":"Suspender chat?";
        suspensionDialogMessage.textContent=reactivating
            ?`O acesso de ${activeConversation.title} ao chat será restaurado.`
            :`O usuário ${activeConversation.title} não poderá iniciar novas conversas nem enviar mensagens enquanto a suspensão estiver ativa.`;
        confirmSuspensionAction.textContent=reactivating?"Reativar chat":"Suspender chat";
        confirmSuspensionAction.classList.toggle("is-reactivate",reactivating);
        suspensionDialog.showModal();
        if(!reactivating)suspensionReason.focus();
    }

    async function confirmSuspension(){
        if(!activeConversation?.userId)return;
        const shouldSuspend=!Boolean(activeConversation.suspended);
        confirmSuspensionAction.disabled=true;
        cancelSuspensionAction.disabled=true;

        try{
            const{response,data}=await window.PrimeWaySecretaria.requestJson(SUSPENSION_URL,{
                userId:activeConversation.userId,
                suspended:shouldSuspend,
                reason:shouldSuspend?suspensionReason.value.trim():""
            });
            if(!response.ok||!data?.success)throw new Error(data?.message||"Não foi possível alterar a suspensão do chat.");
            suspensionDialog.close();
            window.PrimeWayFeedback?.success(data.message||(shouldSuspend?"Chat suspenso com sucesso.":"Chat reativado com sucesso."));
            await loadMessages(activeConversationId);
            await loadIndex(true);
        }catch(error){
            window.PrimeWayFeedback?.error(error?.message||"Não foi possível alterar a suspensão do chat.");
        }finally{
            confirmSuspensionAction.disabled=false;
            cancelSuspensionAction.disabled=false;
        }
    }

    newConversationButton.addEventListener("click",()=>{
        contactSearch.value="";
        contactRoleFilter.value="";
        renderContacts();
        contactDialog.showModal();
    });
    closeContactDialog.addEventListener("click",()=>contactDialog.close());
    toggleChatSuspensionButton.addEventListener("click",openSuspensionDialog);
    cancelSuspensionAction.addEventListener("click",()=>suspensionDialog.close());
    confirmSuspensionAction.addEventListener("click",confirmSuspension);
    suspensionDialog.addEventListener("click",event=>{if(event.target===suspensionDialog)suspensionDialog.close();});
    conversationSearch.addEventListener("input",renderConversations);
    contactSearch.addEventListener("input",renderContacts);
    contactRoleFilter.addEventListener("change",renderContacts);
    messageForm.addEventListener("submit",sendMessage);
    messageInput.addEventListener("keydown",event=>{
        if(event.key==="Enter"&&!event.shiftKey){
            event.preventDefault();
            messageForm.requestSubmit();
        }
    });

    await loadIndex();
    refreshTimer=window.setInterval(async()=>{
        await loadIndex(true);
        if(activeConversationId)await loadMessages(activeConversationId,true);
    },15000);

    window.addEventListener("beforeunload",()=>{
        if(refreshTimer)window.clearInterval(refreshTimer);
    });
});
