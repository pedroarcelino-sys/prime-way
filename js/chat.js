document.addEventListener("DOMContentLoaded", async () => {
    "use strict";
    const q=s=>document.querySelector(s), api="../api/chat/central.php";
    const list=q(".chat-conversations"), messages=q(".chat-messages"), input=q('.chat-input-area input[type="text"]');
    const send=q(".chat-send"), file=q("#attachmentInput"), error=e=>window.PrimeWayFeedback?.error(e.message);
    const title=q(".conversation-person h2"), subtitle=q(".conversation-person span"), container=q(".chat-container");
    let conversations=[],active=null,csrf="",busy=false,requestId=0,timer;
    list.replaceChildren();list.dataset.ready="true";messages.replaceChildren();input.disabled=true;send.disabled=true;
    q("#newChatButton").hidden=true;q("#conversationOptionsButton").hidden=true;
    async function request(url,payload) {
        const response=await fetch(url,{method:payload===undefined?"GET":"POST",credentials:"same-origin",cache:"no-store",
            headers:{Accept:"application/json",...(payload===undefined?{}:{"Content-Type":"application/json","X-CSRF-Token":csrf})},
            ...(payload===undefined?{}:{body:JSON.stringify(payload)})});
        const data=await response.json();
        if(!response.ok||data.success===false)throw Error(data.message||"Não foi possível carregar o Chat.");
        return data;
    }
    const make=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls;if(text!==undefined)el.textContent=text;return el;};
    try {
        const session=await request("../api/auth/session.php");
        if(!session.authenticated){location.replace("login.html");return;}
        const role=session.usuario.perfil;
        if(role!=="admin") {location.replace(({professor:"professor_chat.html",secretaria:"secretaria_chat.html",aluno:"aluno_chat.html",responsavel:"responsavel_chat.html"})[role]||"login.html");return;}
        csrf=session.csrfToken||"";
    } catch(e){error(e);return;}
    function renderList() {
        const search=q('.chat-search input').value.toLocaleLowerCase();list.replaceChildren();
        for(const item of conversations.filter(x=>x.title.toLocaleLowerCase().includes(search))) {
            const button=make("button","conversation"+(item.id===active?" active":""));button.type="button";button.dataset.conversationId=item.id;
            const avatar=make("div","conversation-avatar");avatar.append(make("i","fa-solid fa-comments"));
            const info=make("div","conversation-info");info.append(make("strong","",item.title),make("p","",item.role||"Conversa"));
            button.append(avatar,info);if(item.unread)button.append(make("span","unread-badge",String(item.unread)));
            button.onclick=()=>open(item.id).catch(error);list.append(button);
        }
        if(!list.children.length)list.append(make("p","", "Nenhuma conversa disponível."));
    }
    async function loadMessages(followEnd=false) {
        if(!active)return;const id=active,serial=++requestId;
        const data=await request(api+"?conversationId="+id);if(serial!==requestId||id!==active)return;
        title.textContent=data.conversation.title;subtitle.textContent=data.conversation.role||"Comunicação escolar";
        window.PrimeWayChatMessageExperience.updateMessageList(messages,data.messages,item=>{
            const article=make("div","message "+(item.own?"sent":"received")),bubble=make("div","message-bubble");
            bubble.append(make("p","",item.content||""));window.PrimeWayChatAttachments.renderMessageAttachments(bubble,item.attachments||[]);
            bubble.append(make("span","message-time",new Date(item.sentAt.replace(" ","T")).toLocaleString("pt-BR")));article.append(bubble);
            window.PrimeWayChatMessageExperience.decorateMessage(article,item,{csrfToken:csrf,managePinnedBanner:false,onChanged:()=>loadMessages(),onError:message=>error(Error(message))});return article;
        },{conversationId:id,followEnd,emptyHtml:"<p>Nenhuma mensagem nesta conversa.</p>"});
        input.disabled=Boolean(data.conversation.suspended);send.disabled=input.disabled;
        if(document.visibilityState==="visible"&&id===active){await request(api,{action:"read",conversationId:id});const item=conversations.find(x=>x.id===id);if(item)item.unread=0;renderList();}
    }
    async function open(id) {if(busy)return;active=id;file.value="";renderList();container.classList.add("mobile-show-chat");await loadMessages(true);}
    async function loadIndex() {
        const data=await request(api);conversations=data.conversations;renderList();
        if(active&&!conversations.some(x=>x.id===active)){active=null;requestId++;messages.replaceChildren();input.disabled=true;send.disabled=true;title.textContent="Selecione uma conversa";}
    }
    async function sendMessage() {
        if(busy||!active||input.disabled||(!input.value.trim()&&!file.files.length))return;busy=true;send.disabled=true;
        try {
            if(file.files.length){const body=new FormData();body.set("conversationId",active);body.set("content",input.value.trim());body.set("file",file.files[0]);
                const response=await fetch("../api/chat/upload.php",{method:"POST",credentials:"same-origin",headers:{"X-CSRF-Token":csrf},body});const data=await response.json();if(!response.ok||!data.success)throw Error(data.message||"Falha ao enviar anexo.");
            }else await request(api,{action:"send",conversationId:active,content:input.value.trim()});
            input.value="";file.value="";q("#attachmentButton").title="Anexar arquivo";await loadMessages(true);await loadIndex();
        }catch(e){error(e);}finally{busy=false;send.disabled=input.disabled;}
    }
    q("#attachmentButton").onclick=()=>{if(active&&!input.disabled&&!busy)file.click();};
    file.onchange=()=>{q("#attachmentButton").title=file.files[0]?.name||"Anexar arquivo";};
    send.onclick=sendMessage;input.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();sendMessage();}};
    q('.chat-search input').oninput=renderList;
    const back=make("button","mobile-conversations-button","Conversas");back.type="button";back.onclick=()=>container.classList.remove("mobile-show-chat");q(".conversation-header").prepend(back);
    q("#logoutButton").onclick=async()=>{try{await request("../api/auth/logout.php",{});location.replace("login.html");}catch(e){error(e);}};
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")loadMessages().catch(error);});
    const stop=()=>{clearInterval(timer);requestId++;};window.addEventListener("pagehide",stop);
    try{await loadIndex();title.textContent="Selecione uma conversa";
        timer=setInterval(async()=>{if(document.visibilityState!=="visible"||busy)return;try{await loadIndex();await loadMessages();}catch(e){error(e);}},12000);
    }catch(e){error(e);}
});
