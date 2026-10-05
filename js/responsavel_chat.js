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

const session=await window.PrimeWayResponsavel.ensureGuardian();
if(!session)return;
window.PrimeWayResponsavel.bindLogout();

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

const INDEX="../api/responsavel/chat/index.php";
const START="../api/responsavel/chat/iniciar.php";
const MESSAGES="../api/responsavel/chat/mensagens.php";
const SEND="../api/responsavel/chat/enviar.php";
const READ="../api/responsavel/chat/marcar_lida.php";
const UPLOAD="../api/chat/upload.php";

let conv=[];
let contacts=[];
let active=null;
let timer=null;

const q=selector=>document.querySelector(selector);
const newBtn=q("#newConversationButton");
const search=q("#conversationSearch");
const list=q("#conversationList");
const title=q("#conversationTitle");
const role=q("#conversationRole");
const msgs=q("#messageList");
const form=q("#messageForm");
const input=q("#messageInput");
const send=q("#sendMessageButton");
const dialog=q("#contactDialog");
const close=q("#closeContactDialog");
const contactSearch=q("#contactSearch");
const roleFilter=q("#contactRoleFilter");
const contactList=q("#contactList");

const attachmentUi=Attachments.createComposer({
    form,
    input,
    csrfToken:session?.csrfToken||"",
    uploadUrl:UPLOAD,
    onError:message=>window.PrimeWayFeedback?.error(message)
});
attachmentUi.setEnabled(false);

const norm=value=>String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const initials=name=>String(name||"?").trim().split(/\s+/).slice(0,2).map(part=>part[0]||"").join("").toUpperCase();
const roleLabel=value=>value==="professor"?"Professor(a)":value==="secretaria"?"Secretaria":value==="aluno"?"Aluno":value||"Contato";

function renderConv(){
    const query=norm(search.value);
    const items=conv.filter(item=>!query||norm(`${item.title} ${item.role} ${item.lastMessage||""}`).includes(query));
    list.replaceChildren();

    if(!items.length){
        list.innerHTML='<div class="guardian-empty">Nenhuma conversa encontrada.</div>';
        return;
    }

    for(const item of items){
        const button=document.createElement("button");
        button.type="button";
        button.className=`guardian-conversation-item${Number(item.id)===Number(active)?" active":""}`;
        const avatar=document.createElement("span");
        avatar.className="guardian-avatar";
        avatar.textContent=initials(item.title);
        const info=document.createElement("span");
        info.className="guardian-conversation-info";
        const name=document.createElement("strong");
        name.textContent=item.title;
        const preview=document.createElement("span");
        preview.textContent=item.lastMessage||roleLabel(item.role);
        info.append(name,preview);
        button.append(avatar,info);

        if(Number(item.unread||0)>0){
            const unread=document.createElement("span");
            unread.className="guardian-unread";
            unread.textContent=Number(item.unread)>99?"99+":String(item.unread);
            button.append(unread);
        }

        button.addEventListener("click",()=>select(item.id));
        list.append(button);
    }
}

function renderContacts(){
    const query=norm(contactSearch.value);
    const roleValue=roleFilter.value;
    const items=contacts.filter(item=>(!roleValue||item.role===roleValue)&&(!query||norm(`${item.name} ${item.email||""} ${item.description||""} ${item.role}`).includes(query)));
    contactList.replaceChildren();

    if(!items.length){
        contactList.innerHTML='<div class="guardian-empty">Nenhum contato disponível.</div>';
        return;
    }

    for(const item of items){
        const button=document.createElement("button");
        button.type="button";
        button.className="guardian-contact-item";
        const avatar=document.createElement("span");
        avatar.className="guardian-avatar";
        avatar.textContent=initials(item.name);
        const info=document.createElement("span");
        info.className="guardian-contact-info";
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
                const{response,data}=await window.PrimeWayResponsavel.requestJson(START,{contactUserId:item.userId});
                if(!response.ok||!data?.success)throw new Error(data?.message||"Não foi possível iniciar a conversa.");
                dialog.close();
                await loadIndex();
                await select(data.conversationId);
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
    msgs.replaceChildren();

    if(!Array.isArray(data.messages)||!data.messages.length){
        msgs.innerHTML='<div class="guardian-empty"><i class="fa-regular fa-comments"></i>Nenhuma mensagem nesta conversa.</div>';
        return;
    }

    for(const item of data.messages){
        const article=document.createElement("article");
        article.className=`guardian-message ${item.own?"own":"other"}`;
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
        time.textContent=window.PrimeWayResponsavel.formatDate(item.sentAt,true);
        article.append(time);

        Experience.decorateMessage(article,item,{
            csrfToken:session?.csrfToken||"",
            onChanged:async()=>{
                if(active){
                    await loadMessages(active,true);
                    await loadIndex(true);
                }
            },
            onError:message=>window.PrimeWayFeedback?.error(message)
        });

        msgs.append(article);
    }

    msgs.scrollTop=msgs.scrollHeight;
}

async function markRead(id){
    const{response}=await window.PrimeWayResponsavel.requestJson(READ,{conversationId:id});
    if(response.ok){
        const item=conv.find(conversation=>Number(conversation.id)===Number(id));
        if(item)item.unread=0;
        renderConv();
        await window.PrimeWayResponsavel.refreshNavigationBadges();
    }
}

async function loadMessages(id,quiet=false){
    try{
        const{response,data}=await window.PrimeWayResponsavel.request(`${MESSAGES}?conversationId=${encodeURIComponent(id)}`);
        if(!response.ok||!data?.success)throw new Error(data?.message||"Não foi possível carregar as mensagens.");
        if(Number(active)!==Number(id))return;
        title.textContent=data.conversation.title;
        role.textContent=roleLabel(data.conversation.role);
        renderMessages(data);
        await markRead(id);
    }catch(error){
        if(!quiet)window.PrimeWayFeedback?.error(error?.message||"Não foi possível carregar as mensagens.");
    }
}

async function select(id){
    active=Number(id);
    input.disabled=false;
    send.disabled=false;
    attachmentUi.setEnabled(true);
    renderConv();
    await loadMessages(active);
    input.focus();
}

async function loadIndex(quiet=false){
    try{
        const{response,data}=await window.PrimeWayResponsavel.request(INDEX);
        if(!response.ok||!data?.success)throw new Error(data?.message||"Não foi possível carregar o chat.");
        conv=Array.isArray(data.conversations)?data.conversations:[];
        contacts=Array.isArray(data.contacts)?data.contacts:[];
        renderConv();
        renderContacts();

        if(active&&!conv.some(item=>Number(item.id)===Number(active))){
            active=null;
            input.disabled=true;
            send.disabled=true;
            attachmentUi.setEnabled(false);
        }

        await window.PrimeWayResponsavel.refreshNavigationBadges();
    }catch(error){
        if(!quiet)window.PrimeWayFeedback?.error(error?.message||"Não foi possível carregar o chat.");
    }
}

async function sendMessage(event){
    event.preventDefault();
    if(!active)return;
    const content=input.value.trim();
    if(!content&&!attachmentUi.hasFile())return;
    send.disabled=true;

    try{
        let response;
        let data;
        if(attachmentUi.hasFile()){
            ({response,data}=await attachmentUi.upload({conversationId:active,content}));
        }else{
            ({response,data}=await window.PrimeWayResponsavel.requestJson(SEND,{conversationId:active,content}));
        }
        if(!response.ok||!data?.success)throw new Error(data?.message||"Não foi possível enviar a mensagem.");
        input.value="";
        attachmentUi.clear();
        await loadMessages(active);
        await loadIndex(true);
    }catch(error){
        window.PrimeWayFeedback?.error(error?.message||"Não foi possível enviar a mensagem.");
    }finally{
        send.disabled=false;
        input.focus();
    }
}

newBtn.addEventListener("click",()=>{
    contactSearch.value="";
    roleFilter.value="";
    renderContacts();
    dialog.showModal();
});
close.addEventListener("click",()=>dialog.close());
search.addEventListener("input",renderConv);
contactSearch.addEventListener("input",renderContacts);
roleFilter.addEventListener("change",renderContacts);
form.addEventListener("submit",sendMessage);
input.addEventListener("keydown",event=>{
    if(event.key==="Enter"&&!event.shiftKey){
        event.preventDefault();
        form.requestSubmit();
    }
});

await loadIndex();

timer=setInterval(async()=>{
    await loadIndex(true);
    if(active)await loadMessages(active,true);
},15000);

window.addEventListener("beforeunload",()=>{
    if(timer)clearInterval(timer);
});
});
