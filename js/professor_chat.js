document.addEventListener("DOMContentLoaded",async function(){
await window.PrimeWayStorage?.ready;

async function loadAttachmentModule(){
    if(window.PrimeWayChatAttachments)return window.PrimeWayChatAttachments;

    await new Promise((resolve,reject)=>{
        const existing=document.querySelector('script[data-primeway-chat-attachments="1"]');
        if(existing){
            existing.addEventListener("load",resolve,{once:true});
            existing.addEventListener("error",reject,{once:true});
            return;
        }

        const script=document.createElement("script");
        script.src="../js/chat_attachments_shared.js?v=20261005-2";
        script.dataset.primewayChatAttachments="1";
        script.addEventListener("load",resolve,{once:true});
        script.addEventListener("error",reject,{once:true});
        document.head.append(script);
    });

    if(!window.PrimeWayChatAttachments){
        throw new Error("Não foi possível preparar os anexos do chat.");
    }

    return window.PrimeWayChatAttachments;
}

const session=await window.PrimeWayProfessor.ensureProfessor();
if(!session)return;
window.PrimeWayProfessor.bindLogout();

let Attachments;
try{
    Attachments=await loadAttachmentModule();
}catch(error){
    console.error(error);
    window.PrimeWayFeedback?.error("Não foi possível carregar o recurso de anexos.");
    return;
}

const Experience=window.PrimeWayChatMessageExperience;
if(!Experience){
    window.PrimeWayFeedback?.error("Não foi possível carregar as opções das mensagens.");
    return;
}

const INDEX_URL="../api/professor/chat/index.php";
const START_URL="../api/professor/chat/iniciar.php";
const MESSAGES_URL="../api/professor/chat/mensagens.php";
const SEND_URL="../api/professor/chat/enviar.php";
const READ_URL="../api/professor/chat/marcar_lida.php";
const UPLOAD_URL="../api/chat/upload.php";

let conversations=[];
let contacts=[];
let activeConversationId=null;
let refreshTimer=null;

const newConversationButton=document.querySelector("#newConversationButton");
const conversationSearch=document.querySelector("#conversationSearch");
const conversationList=document.querySelector("#conversationList");
const conversationTitle=document.querySelector("#conversationTitle");
const conversationRole=document.querySelector("#conversationRole");
const messageList=document.querySelector("#messageList");
const messageForm=document.querySelector("#messageForm");
const messageInput=document.querySelector("#messageInput");
const sendMessageButton=document.querySelector("#sendMessageButton");
const contactDialog=document.querySelector("#contactDialog");
const closeContactDialog=document.querySelector("#closeContactDialog");
const contactSearch=document.querySelector("#contactSearch");
const contactRoleFilter=document.querySelector("#contactRoleFilter");
const contactList=document.querySelector("#contactList");

const attachmentUi=Attachments.createComposer({
    form:messageForm,
    input:messageInput,
    csrfToken:session?.csrfToken||"",
    uploadUrl:UPLOAD_URL,
    onError:message=>window.PrimeWayFeedback?.error(message)
});
attachmentUi.setEnabled(false);

function initials(name){
    return String(name||"?").trim().split(/\s+/).slice(0,2).map(part=>part[0]||"").join("").toUpperCase();
}

function normalize(value){
    return String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
}

function roleLabel(role){
    const labels={aluno:"Aluno",responsavel:"Responsável",secretaria:"Secretaria",professor:"Professor(a)"};
    return labels[role]||role||"Contato";
}

function renderConversations(){
    const query=normalize(conversationSearch.value);
    const filtered=conversations.filter(item=>!query||normalize(`${item.title} ${item.role} ${item.lastMessage||""}`).includes(query));
    conversationList.replaceChildren();

    if(!filtered.length){
        conversationList.innerHTML='<div class="professor-empty">Nenhuma conversa encontrada.</div>';
        return;
    }

    for(const item of filtered){
        const button=document.createElement("button");
        button.type="button";
        button.className=`teacher-conversation-item${Number(item.id)===Number(activeConversationId)?" active":""}`;
        const avatar=document.createElement("span");
        avatar.className="teacher-conversation-avatar";
        avatar.textContent=initials(item.title);
        const info=document.createElement("span");
        info.className="teacher-conversation-info";
        const title=document.createElement("strong");
        title.textContent=item.title;
        const preview=document.createElement("span");
        preview.textContent=item.lastMessage||roleLabel(item.role);
        info.append(title,preview);
        button.append(avatar,info);

        if(Number(item.unread||0)>0){
            const badge=document.createElement("span");
            badge.className="teacher-conversation-unread";
            badge.textContent=Number(item.unread)>99?"99+":String(item.unread);
            button.append(badge);
        }

        button.addEventListener("click",()=>selectConversation(item.id));
        conversationList.append(button);
    }
}

function filteredContacts(){
    const query=normalize(contactSearch.value);
    const role=contactRoleFilter.value;
    return contacts.filter(item=>{
        if(role&&item.role!==role)return false;
        if(query&&!normalize(`${item.name} ${item.email||""} ${item.description||""} ${item.role}`).includes(query))return false;
        return true;
    });
}

function renderContacts(){
    contactList.replaceChildren();
    const items=filteredContacts();

    if(!items.length){
        contactList.innerHTML='<div class="professor-empty">Nenhum contato disponível.</div>';
        return;
    }

    for(const item of items){
        const button=document.createElement("button");
        button.type="button";
        button.className="teacher-contact-item";
        const avatar=document.createElement("span");
        avatar.className="teacher-contact-avatar";
        avatar.textContent=initials(item.name);
        const info=document.createElement("span");
        info.className="teacher-contact-info";
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
                const{response,data}=await window.PrimeWayProfessor.requestJson(START_URL,{contactUserId:item.userId});
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

function renderMessages(data,followEnd=false){
    Experience.updateMessageList(messageList,data.messages,item=>{
        const article=document.createElement("article");
        article.className=`teacher-message ${item.own?"own":"other"}`;

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
        time.textContent=window.PrimeWayProfessor.formatDate(item.sentAt,true);
        article.append(time);

        Experience.decorateMessage(article,item,{
            csrfToken:session?.csrfToken||"",
            managePinnedBanner:false,
            onChanged:async()=>{
                if(activeConversationId){
                    await loadMessages(activeConversationId,true);
                    await loadIndex(true);
                }
            },
            onError:message=>window.PrimeWayFeedback?.error(message)
        });
        return article;
    },{conversationId:activeConversationId,emptyHtml:'<div class="professor-empty"><i class="fa-regular fa-comments" aria-hidden="true"></i>Nenhuma mensagem nesta conversa.</div>',followEnd});
}

async function markConversationRead(conversationId){
    const{response}=await window.PrimeWayProfessor.requestJson(READ_URL,{conversationId});
    if(response.ok){
        const item=conversations.find(conversation=>Number(conversation.id)===Number(conversationId));
        if(item)item.unread=0;
        renderConversations();
        await window.PrimeWayProfessor.refreshNavigationBadges();
    }
}

async function loadMessages(conversationId,quiet=false){
    try{
        const{response,data}=await window.PrimeWayProfessor.request(`${MESSAGES_URL}?conversationId=${encodeURIComponent(conversationId)}`);
        if(!response.ok||!data?.success)throw new Error(data?.message||"Não foi possível carregar as mensagens.");
        if(Number(activeConversationId)!==Number(conversationId))return;
        conversationTitle.textContent=data.conversation.title;
        conversationRole.textContent=roleLabel(data.conversation.role);
        renderMessages(data,!quiet);
        await markConversationRead(conversationId);
    }catch(error){
        if(!quiet)window.PrimeWayFeedback?.error(error?.message||"Não foi possível carregar as mensagens.");
    }
}

async function selectConversation(id){
    activeConversationId=Number(id);
    messageInput.disabled=false;
    sendMessageButton.disabled=false;
    attachmentUi.setEnabled(true);
    renderConversations();
    await loadMessages(activeConversationId);
    messageInput.focus();
}

async function loadIndex(quiet=false){
    try{
        const{response,data}=await window.PrimeWayProfessor.request(INDEX_URL);
        if(!response.ok||!data?.success)throw new Error(data?.message||"Não foi possível carregar o chat.");
        conversations=Array.isArray(data.conversations)?data.conversations:[];
        contacts=Array.isArray(data.contacts)?data.contacts:[];
        renderConversations();
        renderContacts();

        if(activeConversationId&&!conversations.some(item=>Number(item.id)===Number(activeConversationId))){
            activeConversationId=null;
            messageInput.disabled=true;
            sendMessageButton.disabled=true;
            attachmentUi.setEnabled(false);
        }

        await window.PrimeWayProfessor.refreshNavigationBadges();
    }catch(error){
        if(!quiet){
            console.error("Erro ao carregar chat:",error);
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
            ({response,data}=await window.PrimeWayProfessor.requestJson(SEND_URL,{conversationId:activeConversationId,content}));
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

newConversationButton.addEventListener("click",()=>{
    contactSearch.value="";
    contactRoleFilter.value="";
    renderContacts();
    contactDialog.showModal();
});
closeContactDialog.addEventListener("click",()=>contactDialog.close());
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
