(function(){
"use strict";

const AUDIO_EXTENSIONS=new Set(["webm","ogg","mp3","m4a","wav"]);
const DELIVERY_SYNC_URL="../api/chat/entregas.php";
const MESSAGE_STATUS_URL="../api/chat/status.php";
const DELIVERY_REFRESH_MS=12000;
let pendingMessageId=null;
let pendingExpiresAt=0;
let pendingFrame=0;
let statusRefreshFrame=0;
let deliveryTimer=null;
let statusTimer=null;

function ensureCompactLayout(){
    if(document.querySelector('link[data-primeway-chat-compact="1"]'))return;
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href="../css/chat_compact_layout.css?v=20261005-1";
    link.dataset.primewayChatCompact="1";
    document.head.append(link);
}

function ensureDeliveryStyles(){
    if(document.querySelector('link[data-primeway-chat-delivery-status="1"]'))return;
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href="../css/chat_delivery_status.css?v=20261006-1";
    link.dataset.primewayChatDeliveryStatus="1";
    document.head.append(link);
}

function feedbackError(message){
    window.PrimeWayFeedback?.error(message);
}

function extensionOf(name){
    const value=String(name||"");
    const index=value.lastIndexOf(".");
    return index>=0?value.slice(index+1).toLowerCase():"";
}

function isAudioFile(file){
    if(!file)return false;
    const type=String(file.type||"").toLowerCase();
    return AUDIO_EXTENSIONS.has(extensionOf(file.name))
        || type.startsWith("audio/")
        || type==="video/webm"
        || type==="application/ogg";
}

function composerHasAudio(composer){
    if(!composer)return false;
    const selected=composer.querySelector(".pw-chat-selected-file:not([hidden])");
    if(!selected)return false;
    return Boolean(selected.querySelector(".fa-microphone"));
}

function syncComposer(composer){
    if(!composer)return;

    const input=composer.querySelector("textarea");
    if(!input)return;

    if(!input.dataset.pwDefaultPlaceholder){
        input.dataset.pwDefaultPlaceholder=input.getAttribute("placeholder")||"Digite sua mensagem...";
    }

    const attachButton=composer.querySelector(".pw-chat-attach-button");
    const micButton=composer.querySelector(".pw-chat-audio-button");
    const audioSelected=composerHasAudio(composer);
    const recording=Boolean(micButton?.classList.contains("is-recording"));
    const composerEnabled=attachButton?!attachButton.disabled:!input.disabled;

    // O observer acompanha disabled: reatribuir true gera outra mutação no DOM.
    // Só altere o atributo quando o estado realmente precisar mudar.
    if(audioSelected){
        input.value="";
        if(!input.disabled)input.disabled=true;
        input.placeholder="Envie o áudio separadamente.";
        return;
    }

    input.placeholder=input.dataset.pwDefaultPlaceholder;

    if(recording){
        if(!input.disabled)input.disabled=true;
        return;
    }

    if(composerEnabled&&input.disabled){
        input.disabled=false;
    }
}

function syncAllComposers(){
    document.querySelectorAll(".pw-chat-composer").forEach(syncComposer);
}

function findScrollableAncestor(target){
    let current=target?.parentElement||null;

    while(current&&current!==document.body&&current!==document.documentElement){
        const style=window.getComputedStyle(current);
        const overflowY=String(style.overflowY||"");
        const canScroll=/(auto|scroll|overlay)/.test(overflowY)
            && current.scrollHeight>current.clientHeight+2;

        if(canScroll)return current;
        current=current.parentElement;
    }

    return document.scrollingElement||document.documentElement;
}

function highlightMessage(target){
    target.classList.remove("pw-chat-message-focus");
    void target.offsetWidth;
    target.classList.add("pw-chat-message-focus");
    window.setTimeout(()=>target.classList.remove("pw-chat-message-focus"),1400);
}

function forceElementScroll(scroller,top){
    const previous=scroller.style.scrollBehavior;
    scroller.style.scrollBehavior="auto";
    scroller.scrollTop=Math.max(0,top);
    window.requestAnimationFrame(()=>{
        scroller.style.scrollBehavior=previous;
    });
}

function forceWindowScroll(top){
    const root=document.documentElement;
    const body=document.body;
    const rootPrevious=root.style.scrollBehavior;
    const bodyPrevious=body.style.scrollBehavior;

    root.style.scrollBehavior="auto";
    body.style.scrollBehavior="auto";
    window.scrollTo(0,Math.max(0,top));

    window.requestAnimationFrame(()=>{
        root.style.scrollBehavior=rootPrevious;
        body.style.scrollBehavior=bodyPrevious;
    });
}

function jumpToMessage(messageId){
    const id=String(messageId||"");
    if(!id)return false;

    const escaped=window.CSS?.escape?CSS.escape(id):id.replace(/["\\]/g,"\\$&");
    const target=document.querySelector(`[data-message-id="${escaped}"]`);
    if(!target)return false;

    const scroller=findScrollableAncestor(target);
    const targetRect=target.getBoundingClientRect();

    if(
        scroller===document.scrollingElement||
        scroller===document.documentElement||
        scroller===document.body
    ){
        const destination=window.scrollY+targetRect.top-
            Math.max(16,(window.innerHeight-targetRect.height)/2);
        forceWindowScroll(destination);
    }else{
        const scrollerRect=scroller.getBoundingClientRect();
        const destination=scroller.scrollTop+(targetRect.top-scrollerRect.top)-
            Math.max(12,(scroller.clientHeight-targetRect.height)/2);
        forceElementScroll(scroller,destination);
    }

    highlightMessage(target);
    return true;
}

function schedulePendingFocus(){
    if(!pendingMessageId)return;
    if(Date.now()>pendingExpiresAt){
        pendingMessageId=null;
        pendingExpiresAt=0;
        return;
    }
    if(pendingFrame)return;

    pendingFrame=window.requestAnimationFrame(()=>{
        pendingFrame=window.requestAnimationFrame(()=>{
            pendingFrame=0;
            if(!pendingMessageId)return;
            if(jumpToMessage(pendingMessageId)){
                pendingMessageId=null;
                pendingExpiresAt=0;
            }
        });
    });
}

function deliveryStatusLabel(status){
    if(status==="read")return"Lida";
    if(status==="delivered")return"Entregue";
    return"Enviada";
}

function renderDeliveryStatus(node,status){
    const normalized=["sent","delivered","read"].includes(status)?status:"sent";
    const label=deliveryStatusLabel(normalized);
    node.dataset.status=normalized;
    node.title=label;
    node.setAttribute("aria-label",label);
    node.innerHTML=normalized==="sent"
        ?'<i class="fa-solid fa-check" aria-hidden="true"></i>'
        :'<i class="fa-solid fa-check" aria-hidden="true"></i><i class="fa-solid fa-check" aria-hidden="true"></i>';
}

function ensureStatusNodes(){
    ensureDeliveryStyles();

    document.querySelectorAll('[data-message-id].own').forEach(message=>{
        const time=message.querySelector("time");
        if(!time||time.querySelector(".pw-chat-delivery-status"))return;

        const status=document.createElement("span");
        status.className="pw-chat-delivery-status";
        renderDeliveryStatus(status,"sent");
        time.append(status);
    });
}

function visibleOwnMessageIds(){
    const ids=[];
    const seen=new Set();

    document.querySelectorAll('[data-message-id].own').forEach(message=>{
        const id=Number(message.dataset.messageId||0);
        if(!Number.isInteger(id)||id<=0||seen.has(id)||ids.length>=200)return;
        seen.add(id);
        ids.push(id);
    });

    return ids;
}

function applyStatuses(statuses){
    if(!statuses||typeof statuses!=="object")return;

    for(const [id,data] of Object.entries(statuses)){
        const escaped=window.CSS?.escape?CSS.escape(String(id)):String(id).replace(/["\\]/g,"\\$&");
        const message=document.querySelector(`[data-message-id="${escaped}"].own`);
        const statusNode=message?.querySelector(".pw-chat-delivery-status");
        if(!statusNode)continue;
        renderDeliveryStatus(statusNode,String(data?.status||"sent"));
    }
}

async function refreshDeliveryStatuses(){
    ensureStatusNodes();
    const ids=visibleOwnMessageIds();
    if(ids.length===0)return;

    try{
        const response=await fetch(
            `${MESSAGE_STATUS_URL}?messageIds=${encodeURIComponent(ids.join(","))}`,
            {
                method:"GET",
                credentials:"same-origin",
                cache:"no-store",
                headers:{Accept:"application/json"}
            }
        );

        if(!response.ok)return;
        const data=await response.json();
        if(data?.success)applyStatuses(data.statuses);
    }catch{
        // Atualização visual silenciosa: o envio continua independente.
    }
}

function scheduleStatusRefresh(){
    if(statusRefreshFrame)return;
    statusRefreshFrame=window.requestAnimationFrame(()=>{
        statusRefreshFrame=0;
        refreshDeliveryStatuses();
    });
}

async function syncDeliveries(){
    try{
        await fetch(DELIVERY_SYNC_URL,{
            method:"GET",
            credentials:"same-origin",
            cache:"no-store",
            headers:{Accept:"application/json"}
        });
    }catch{
        // O recibo de entrega não deve interromper o uso do Chat.
    }
}

function startDeliveryTracking(){
    ensureDeliveryStyles();
    syncDeliveries();
    scheduleStatusRefresh();

    if(!deliveryTimer){
        deliveryTimer=window.setInterval(syncDeliveries,DELIVERY_REFRESH_MS);
    }

    if(!statusTimer){
        statusTimer=window.setInterval(refreshDeliveryStatuses,DELIVERY_REFRESH_MS);
    }
}

// Regras do compositor: áudio e texto nunca pertencem à mesma mensagem.
document.addEventListener("click",event=>{
    const micButton=event.target.closest?.(".pw-chat-audio-button");
    if(micButton&&!micButton.classList.contains("is-recording")){
        const composer=micButton.closest(".pw-chat-composer");
        const input=composer?.querySelector("textarea");

        if(String(input?.value||"").trim()!==""){
            event.preventDefault();
            event.stopImmediatePropagation();
            feedbackError("Envie ou apague o texto antes de gravar um áudio.");
            input?.focus();
            return;
        }
    }

    const menuItem=event.target.closest?.(".pw-chat-message-menu-item");
    if(menuItem){
        const label=String(menuItem.textContent||"").trim().toLowerCase();
        if(label==="fixar mensagem"||label==="desafixar mensagem"){
            const message=menuItem.closest("[data-message-id]");
            const id=message?.dataset?.messageId;
            if(id){
                pendingMessageId=id;
                pendingExpiresAt=Date.now()+12000;
            }
        }
    }
},true);

document.addEventListener("change",event=>{
    const fileInput=event.target.closest?.(".pw-chat-file-input");
    if(!fileInput)return;

    const file=fileInput.files?.[0]||null;
    const composer=fileInput.closest(".pw-chat-composer");
    const input=composer?.querySelector("textarea");

    if(isAudioFile(file)&&String(input?.value||"").trim()!==""){
        event.preventDefault();
        event.stopImmediatePropagation();
        fileInput.value="";
        feedbackError("Envie ou apague o texto antes de selecionar um áudio.");
        input?.focus();
        return;
    }

    window.setTimeout(()=>syncComposer(composer),0);
},true);

// Intercepta o banner antes do listener antigo. O salto é absoluto e instantâneo.
document.addEventListener("click",event=>{
    const banner=event.target.closest?.(".pw-chat-pinned-banner");
    if(!banner)return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const id=banner.dataset.messageId;
    if(id)jumpToMessage(id);
},true);

document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState!=="visible")return;
    syncDeliveries();
    scheduleStatusRefresh();
});

const observer=new MutationObserver(mutations=>{
    let composerChanged=false;
    let messagesChanged=false;
    let statusChanged=false;

    for(const mutation of mutations){
        const target=mutation.target instanceof Element?mutation.target:null;

        if(
            target?.closest?.(".pw-chat-composer")||
            Array.from(mutation.addedNodes||[]).some(node=>
                node instanceof Element&&(
                    node.matches?.(".pw-chat-composer")||
                    node.querySelector?.(".pw-chat-composer")
                )
            )
        ){
            composerChanged=true;
        }

        // Para restaurar a mensagem fixada, só conta reconstrução real da lista.
        // Alterações de classe/hidden do menu não podem consumir o foco pendente.
        if(
            pendingMessageId&&
            mutation.type==="childList"&&(
                target?.matches?.("[class*='message-list']")||
                target?.closest?.("[class*='message-list']")||
                Array.from(mutation.addedNodes||[]).some(node=>
                    node instanceof Element&&(
                        node.matches?.("[data-message-id]")||
                        node.querySelector?.("[data-message-id]")
                    )
                )
            )
        ){
            messagesChanged=true;
        }

        if(
            mutation.type==="childList"&&
            Array.from(mutation.addedNodes||[]).some(node=>
                node instanceof Element&&(
                    node.matches?.("[data-message-id]")||
                    node.querySelector?.("[data-message-id]")
                )
            )
        ){
            statusChanged=true;
        }
    }

    if(composerChanged)syncAllComposers();
    if(messagesChanged)schedulePendingFocus();
    if(statusChanged)scheduleStatusRefresh();
});

observer.observe(document.body,{
    subtree:true,
    childList:true,
    attributes:true,
    attributeFilter:["hidden","disabled","class"]
});

ensureCompactLayout();
syncAllComposers();
startDeliveryTracking();

})();
