document.addEventListener(
"DOMContentLoaded",
async function(){

const INDEX_URL="../api/secretaria/chat/index.php";
const START_URL="../api/secretaria/chat/iniciar.php";
const MESSAGES_URL="../api/secretaria/chat/mensagens.php";
const SEND_URL="../api/secretaria/chat/enviar.php";
const READ_URL="../api/secretaria/chat/marcar_lida.php";
const SUSPENSION_URL="../api/secretaria/chat/suspensao.php";

const session=await window.PrimeWaySecretaria.ensureSecretary();
if(!session)return;

window.PrimeWaySecretaria.bindLogout();

const conversationList=document.querySelector("#conversationList");
const conversationSearch=document.querySelector("#conversationSearch");

const conversationTitle=document.querySelector("#conversationTitle");
const conversationRole=document.querySelector("#conversationRole");
const toggleChatSuspensionButton=document.querySelector("#toggleChatSuspensionButton");
const chatSuspensionNotice=document.querySelector("#chatSuspensionNotice");
const chatSuspensionNoticeText=document.querySelector("#chatSuspensionNoticeText");

const messageList=document.querySelector("#messageList");
const messageForm=document.querySelector("#messageForm");
const messageInput=document.querySelector("#messageInput");
const sendMessageButton=document.querySelector("#sendMessageButton");

const newConversationButton=document.querySelector("#newConversationButton");
const contactDialog=document.querySelector("#contactDialog");
const closeContactDialog=document.querySelector("#closeContactDialog");
const contactSearch=document.querySelector("#contactSearch");
const contactRoleFilter=document.querySelector("#contactRoleFilter");
const contactList=document.querySelector("#contactList");

const suspensionDialog=document.querySelector("#suspensionDialog");
const suspensionDialogIcon=document.querySelector("#suspensionDialogIcon");
const suspensionDialogTitle=document.querySelector("#suspensionDialogTitle");
const suspensionDialogMessage=document.querySelector("#suspensionDialogMessage");
const suspensionReasonField=document.querySelector("#suspensionReasonField");
const suspensionReason=document.querySelector("#suspensionReason");
const cancelSuspensionAction=document.querySelector("#cancelSuspensionAction");
const confirmSuspensionAction=document.querySelector("#confirmSuspensionAction");

let conversations=[];
let contacts=[];
let activeConversationId=null;
let activeConversation=null;
let refreshTimer=null;

function normalize(value){
    return String(value??"")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g,"")
        .toLowerCase()
        .trim();
}

function initials(name){
    return String(name||"?")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0,2)
        .map(part=>part.charAt(0).toUpperCase())
        .join("")||"?";
}

function roleLabel(role){
    const labels={
        admin:"Administrador",
        professor:"Professor(a)",
        aluno:"Aluno",
        responsavel:"Responsável",
        secretaria:"Secretaria"
    };

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
    toggleChatSuspensionButton.classList.toggle(
        "is-suspended",
        suspended
    );

    const icon=toggleChatSuspensionButton.querySelector("i");
    const label=toggleChatSuspensionButton.querySelector("span");

    if(icon){
        icon.className=suspended
            ?"fa-solid fa-unlock"
            :"fa-solid fa-ban";
    }

    if(label){
        label.textContent=suspended
            ?"Reativar chat"
            :"Suspender chat";
    }

    chatSuspensionNotice.hidden=!suspended;

    if(suspended){
        const reason=String(
            activeConversation.suspensionReason||""
        ).trim();

        chatSuspensionNoticeText.textContent=reason
            ?`Este usuário está impedido de enviar mensagens. Motivo: ${reason}`
            :"Este usuário está impedido de iniciar novas conversas ou enviar mensagens.";
    }
}

function renderConversations(){
    const query=normalize(conversationSearch.value);

    const list=conversations.filter(
        item=>
            !query
            ||
            normalize(
                `${item.title} ${item.lastMessage} ${item.role}`
            ).includes(query)
    );

    conversationList.replaceChildren();

    if(!list.length){
        conversationList.innerHTML=`
            <div class="secretary-chat-empty">
                Nenhuma conversa encontrada.
            </div>
        `;
        return;
    }

    for(const item of list){
        const button=document.createElement("button");
        button.type="button";

        button.className=
            `secretary-conversation-item${Number(item.id)===Number(activeConversationId)?" active":""}`;

        const avatar=document.createElement("span");
        avatar.className="secretary-conversation-avatar";
        avatar.textContent=initials(item.title);

        const info=document.createElement("span");
        info.className="secretary-conversation-info";

        const name=document.createElement("strong");
        name.textContent=item.title;

        const preview=document.createElement("span");
        preview.textContent=
            item.lastMessage
            || roleLabel(item.role);

        info.append(name,preview);

        button.append(avatar,info);

        if(Number(item.unread||0)>0){
            const unread=document.createElement("span");
            unread.className="secretary-conversation-unread";
            unread.textContent=
                Number(item.unread)>99
                    ?"99+"
                    :String(item.unread);

            button.append(unread);
        }

        button.addEventListener(
            "click",
            ()=>selectConversation(item.id)
        );

        conversationList.append(button);
    }
}

function renderContacts(){
    const query=normalize(contactSearch.value);
    const role=contactRoleFilter.value;

    const list=contacts.filter(item=>{
        if(role&&item.role!==role)return false;

        if(
            query
            &&
            !normalize(
                `${item.name} ${item.email||""} ${item.description} ${item.role}`
            ).includes(query)
        ){
            return false;
        }

        return true;
    });

    contactList.replaceChildren();

    if(!list.length){
        contactList.innerHTML=`
            <div class="secretary-chat-empty">
                Nenhum contato disponível.
            </div>
        `;
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
        description.textContent=
            [
                item.description||roleLabel(item.role),
                item.email||""
            ]
            .filter(Boolean)
            .join(" • ");

        info.append(name,description);

        const icon=document.createElement("i");
        icon.className="fa-solid fa-chevron-right";
        icon.setAttribute("aria-hidden","true");

        button.append(avatar,info,icon);

        button.addEventListener(
            "click",
            async()=>{
                button.disabled=true;

                try{
                    const{response,data}=
                        await window.PrimeWaySecretaria.requestJson(
                            START_URL,
                            {contactUserId:item.userId}
                        );

                    if(!response.ok||!data?.success){
                        throw new Error(
                            data?.message||
                            "Não foi possível iniciar a conversa."
                        );
                    }

                    contactDialog.close();

                    await loadIndex();
                    await selectConversation(
                        data.conversationId
                    );

                }catch(error){
                    window.PrimeWayFeedback?.error(
                        error?.message||
                        "Não foi possível iniciar a conversa."
                    );

                }finally{
                    button.disabled=false;
                }
            }
        );

        contactList.append(button);
    }
}

function renderMessages(data){
    messageList.replaceChildren();

    if(
        !Array.isArray(data.messages)
        ||
        !data.messages.length
    ){
        messageList.innerHTML=`
            <div class="secretary-chat-empty">
                <i class="fa-regular fa-comments"></i>
                Nenhuma mensagem nesta conversa.
            </div>
        `;
        return;
    }

    for(const item of data.messages){
        const article=document.createElement("article");

        article.className=
            `secretary-message ${item.own?"own":"other"}`;

        const sender=document.createElement("strong");
        sender.textContent=
            item.own
                ?"Você"
                :item.senderName;

        const content=document.createElement("p");
        content.textContent=item.content;

        const time=document.createElement("time");
        time.textContent=
            window.PrimeWaySecretaria.formatDate(
                item.sentAt,
                true
            );

        article.append(sender,content,time);
        messageList.append(article);
    }

    messageList.scrollTop=
        messageList.scrollHeight;
}

async function markConversationRead(conversationId){
    const{response}=
        await window.PrimeWaySecretaria.requestJson(
            READ_URL,
            {conversationId}
        );

    if(response.ok){
        const item=conversations.find(
            conversation=>
                Number(conversation.id)
                ===
                Number(conversationId)
        );

        if(item){
            item.unread=0;
        }

        renderConversations();

        await window.PrimeWaySecretaria
            .refreshNavigationBadges();
    }
}

async function loadMessages(
    conversationId,
    quiet=false
){
    try{
        const{response,data}=
            await window.PrimeWaySecretaria.request(
                `${MESSAGES_URL}?conversationId=${encodeURIComponent(conversationId)}`
            );

        if(!response.ok||!data?.success){
            throw new Error(
                data?.message||
                "Não foi possível carregar as mensagens."
            );
        }

        if(
            Number(activeConversationId)
            !==
            Number(conversationId)
        ){
            return;
        }

        activeConversation=data.conversation||null;

        conversationTitle.textContent=
            activeConversation?.title||"Conversa";

        conversationRole.textContent=
            `${roleLabel(activeConversation?.role)}${activeConversation?.suspended?" • Chat suspenso":""}`;

        updateSuspensionControls();
        renderMessages(data);

        await markConversationRead(
            conversationId
        );

    }catch(error){
        if(!quiet){
            window.PrimeWayFeedback?.error(
                error?.message||
                "Não foi possível carregar as mensagens."
            );
        }
    }
}

async function selectConversation(id){
    activeConversationId=Number(id);
    activeConversation=null;

    messageInput.disabled=false;
    sendMessageButton.disabled=false;
    toggleChatSuspensionButton.hidden=true;
    chatSuspensionNotice.hidden=true;

    renderConversations();

    await loadMessages(
        activeConversationId
    );

    messageInput.focus();
}

async function loadIndex(quiet=false){
    try{
        const{response,data}=
            await window.PrimeWaySecretaria.request(
                INDEX_URL
            );

        if(!response.ok||!data?.success){
            throw new Error(
                data?.message||
                "Não foi possível carregar o chat."
            );
        }

        conversations=
            Array.isArray(data.conversations)
                ?data.conversations
                :[];

        contacts=
            Array.isArray(data.contacts)
                ?data.contacts
                :[];

        renderConversations();
        renderContacts();

        if(
            activeConversationId
            &&
            !conversations.some(
                item=>
                    Number(item.id)
                    ===
                    Number(activeConversationId)
            )
        ){
            activeConversationId=null;
            activeConversation=null;
            messageInput.disabled=true;
            sendMessageButton.disabled=true;
            toggleChatSuspensionButton.hidden=true;
            chatSuspensionNotice.hidden=true;
        }

        await window.PrimeWaySecretaria
            .refreshNavigationBadges();

    }catch(error){
        if(!quiet){
            console.error(
                "Erro ao carregar chat da Secretaria:",
                error
            );

            window.PrimeWayFeedback?.error(
                error?.message||
                "Não foi possível carregar o chat."
            );
        }
    }
}

async function sendMessage(event){
    event.preventDefault();

    if(!activeConversationId)return;

    const content=messageInput.value.trim();

    if(!content)return;

    sendMessageButton.disabled=true;

    try{
        const{response,data}=
            await window.PrimeWaySecretaria.requestJson(
                SEND_URL,
                {
                    conversationId:
                        activeConversationId,
                    content
                }
            );

        if(!response.ok||!data?.success){
            throw new Error(
                data?.message||
                "Não foi possível enviar a mensagem."
            );
        }

        messageInput.value="";

        await loadMessages(
            activeConversationId
        );

        await loadIndex(true);

    }catch(error){
        window.PrimeWayFeedback?.error(
            error?.message||
            "Não foi possível enviar a mensagem."
        );

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

    suspensionDialogIcon.classList.toggle(
        "is-reactivate",
        reactivating
    );

    suspensionDialogIcon.innerHTML=reactivating
        ?'<i class="fa-solid fa-unlock" aria-hidden="true"></i>'
        :'<i class="fa-solid fa-ban" aria-hidden="true"></i>';

    suspensionDialogTitle.textContent=reactivating
        ?"Reativar chat?"
        :"Suspender chat?";

    suspensionDialogMessage.textContent=reactivating
        ?`O acesso de ${activeConversation.title} ao chat será restaurado.`
        :`O usuário ${activeConversation.title} não poderá iniciar novas conversas nem enviar mensagens enquanto a suspensão estiver ativa.`;

    confirmSuspensionAction.textContent=reactivating
        ?"Reativar chat"
        :"Suspender chat";

    confirmSuspensionAction.classList.toggle(
        "is-reactivate",
        reactivating
    );

    suspensionDialog.showModal();

    if(!reactivating){
        suspensionReason.focus();
    }
}

async function confirmSuspension(){
    if(!activeConversation?.userId)return;

    const shouldSuspend=!Boolean(activeConversation.suspended);

    confirmSuspensionAction.disabled=true;
    cancelSuspensionAction.disabled=true;

    try{
        const{response,data}=
            await window.PrimeWaySecretaria.requestJson(
                SUSPENSION_URL,
                {
                    userId:activeConversation.userId,
                    suspended:shouldSuspend,
                    reason:shouldSuspend
                        ?suspensionReason.value.trim()
                        :""
                }
            );

        if(!response.ok||!data?.success){
            throw new Error(
                data?.message||
                "Não foi possível alterar a suspensão do chat."
            );
        }

        suspensionDialog.close();

        window.PrimeWayFeedback?.success(
            data.message||
            (shouldSuspend
                ?"Chat suspenso com sucesso."
                :"Chat reativado com sucesso.")
        );

        await loadMessages(activeConversationId);
        await loadIndex(true);

    }catch(error){
        window.PrimeWayFeedback?.error(
            error?.message||
            "Não foi possível alterar a suspensão do chat."
        );

    }finally{
        confirmSuspensionAction.disabled=false;
        cancelSuspensionAction.disabled=false;
    }
}

newConversationButton.addEventListener(
    "click",
    ()=>{
        contactSearch.value="";
        contactRoleFilter.value="";
        renderContacts();
        contactDialog.showModal();
    }
);

closeContactDialog.addEventListener(
    "click",
    ()=>contactDialog.close()
);

toggleChatSuspensionButton.addEventListener(
    "click",
    openSuspensionDialog
);

cancelSuspensionAction.addEventListener(
    "click",
    ()=>suspensionDialog.close()
);

confirmSuspensionAction.addEventListener(
    "click",
    confirmSuspension
);

suspensionDialog.addEventListener(
    "click",
    event=>{
        if(event.target===suspensionDialog){
            suspensionDialog.close();
        }
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
    event=>{
        if(
            event.key==="Enter"
            &&
            !event.shiftKey
        ){
            event.preventDefault();
            messageForm.requestSubmit();
        }
    }
);

await loadIndex();

refreshTimer=
    window.setInterval(
        async()=>{
            await loadIndex(true);

            if(activeConversationId){
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
    ()=>{
        if(refreshTimer){
            window.clearInterval(
                refreshTimer
            );
        }
    }
);

});
