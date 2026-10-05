(function(){
"use strict";

let activeAudio=null;
let openMenu=null;
let confirmDialog=null;
let confirmResolver=null;
let globalEventsBound=false;
let audioContext=null;
const processedAudios=new WeakMap();

function ensureStyles(){
    if(document.querySelector('link[data-primeway-chat-message-experience="1"]'))return;
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href="../css/chat_message_experience.css?v=20261005-3";
    link.dataset.primewayChatMessageExperience="1";
    document.head.append(link);
}

function formatDuration(value){
    const total=Math.max(0,Math.floor(Number(value)||0));
    const minutes=Math.floor(total/60);
    const seconds=total%60;
    return`${minutes}:${String(seconds).padStart(2,"0")}`;
}

function closeMenu(){
    if(!openMenu)return;
    openMenu.hidden=true;
    openMenu=null;
}

function bindGlobalEvents(){
    if(globalEventsBound)return;
    globalEventsBound=true;

    document.addEventListener("click",event=>{
        if(!openMenu)return;
        const wrapper=openMenu.closest(".pw-chat-message-options");
        if(wrapper?.contains(event.target))return;
        closeMenu();
    });

    document.addEventListener("keydown",event=>{
        if(event.key==="Escape")closeMenu();
    });
}

function ensureConfirmDialog(){
    if(confirmDialog)return;

    confirmDialog=document.createElement("dialog");
    confirmDialog.className="pw-chat-confirm-dialog";
    confirmDialog.innerHTML=`
        <div class="pw-chat-confirm-icon"><i class="fa-regular fa-trash-can" aria-hidden="true"></i></div>
        <h3>Excluir mensagem?</h3>
        <p>Esta mensagem será removida da conversa para todos os participantes.</p>
        <div class="pw-chat-confirm-actions">
            <button type="button" class="pw-chat-confirm-cancel">Cancelar</button>
            <button type="button" class="pw-chat-confirm-delete">Excluir</button>
        </div>`;

    confirmDialog.querySelector(".pw-chat-confirm-cancel")?.addEventListener("click",()=>confirmDialog.close("cancel"));
    confirmDialog.querySelector(".pw-chat-confirm-delete")?.addEventListener("click",()=>confirmDialog.close("delete"));
    confirmDialog.addEventListener("click",event=>{if(event.target===confirmDialog)confirmDialog.close("cancel");});
    confirmDialog.addEventListener("close",()=>{
        if(confirmResolver){
            const resolver=confirmResolver;
            confirmResolver=null;
            resolver(confirmDialog.returnValue==="delete");
        }
    });

    document.body.append(confirmDialog);
}

function confirmDelete(){
    ensureConfirmDialog();
    confirmDialog.returnValue="cancel";
    confirmDialog.showModal();
    return new Promise(resolve=>{confirmResolver=resolve;});
}

function getAudioContext(){
    const AudioContextClass=window.AudioContext||window.webkitAudioContext;
    if(!AudioContextClass)return null;

    if(!audioContext){
        try{
            audioContext=new AudioContextClass();
        }catch{
            audioContext=null;
        }
    }

    return audioContext;
}

function prepareVoiceAudio(audio){
    if(!audio)return null;
    if(processedAudios.has(audio))return processedAudios.get(audio);

    const context=getAudioContext();
    if(!context)return null;

    try{
        const source=context.createMediaElementSource(audio);

        const highpass=context.createBiquadFilter();
        highpass.type="highpass";
        highpass.frequency.value=80;
        highpass.Q.value=.7;

        const presence=context.createBiquadFilter();
        presence.type="peaking";
        presence.frequency.value=2600;
        presence.Q.value=.8;
        presence.gain.value=2.2;

        const compressor=context.createDynamicsCompressor();
        compressor.threshold.value=-24;
        compressor.knee.value=18;
        compressor.ratio.value=3;
        compressor.attack.value=.004;
        compressor.release.value=.24;

        const gain=context.createGain();
        gain.gain.value=1.08;

        source.connect(highpass);
        highpass.connect(presence);
        presence.connect(compressor);
        compressor.connect(gain);
        gain.connect(context.destination);

        const chain={context,source,highpass,presence,compressor,gain};
        processedAudios.set(audio,chain);
        return chain;
    }catch{
        return null;
    }
}

async function resumeVoiceAudio(audio){
    const chain=prepareVoiceAudio(audio);
    if(!chain?.context)return;

    if(chain.context.state==="suspended"){
        try{
            await chain.context.resume();
        }catch{
            // O áudio continua podendo tocar pelo elemento HTML sem o processamento.
        }
    }
}

function enhanceAudio(root){
    if(!root)return;

    const cards=root.querySelectorAll(".pw-chat-audio-card:not([data-pw-audio-enhanced])");
    const heights=[34,58,42,76,48,67,36,88,54,72,44,61,39,82,50,70,46,91,55,74,38,63,47,84,52,69,41,77,49,60,35,66,45,73,40,64];

    for(const card of cards){
        const audio=card.querySelector("audio");
        if(!audio)continue;

        card.dataset.pwAudioEnhanced="1";
        audio.controls=false;
        audio.preload="metadata";
        audio.className="pw-chat-audio-native";

        const playButton=document.createElement("button");
        playButton.type="button";
        playButton.className="pw-chat-voice-play";
        playButton.setAttribute("aria-label","Reproduzir áudio");
        playButton.innerHTML='<i class="fa-solid fa-play" aria-hidden="true"></i>';

        const body=document.createElement("div");
        body.className="pw-chat-voice-body";

        const waveform=document.createElement("button");
        waveform.type="button";
        waveform.className="pw-chat-waveform";
        waveform.setAttribute("aria-label","Avançar ou voltar no áudio");

        const bars=[];
        for(let index=0;index<heights.length;index+=1){
            const bar=document.createElement("span");
            bar.style.height=`${heights[index]}%`;
            bars.push(bar);
            waveform.append(bar);
        }

        const meta=document.createElement("div");
        meta.className="pw-chat-voice-meta";

        const duration=document.createElement("span");
        duration.textContent="0:00";

        const speed=document.createElement("button");
        speed.type="button";
        speed.className="pw-chat-voice-speed";
        speed.textContent="1x";
        speed.title="Velocidade de reprodução";
        speed.setAttribute("aria-label","Alterar velocidade de reprodução");

        meta.append(duration,speed);
        body.append(waveform,meta);
        card.replaceChildren(playButton,body,audio);

        function updateProgress(){
            const total=Number.isFinite(audio.duration)?audio.duration:0;
            const current=Number.isFinite(audio.currentTime)?audio.currentTime:0;
            const ratio=total>0?Math.min(1,Math.max(0,current/total)):0;
            const played=Math.round(ratio*bars.length);

            bars.forEach((bar,index)=>bar.classList.toggle("is-played",index<played));
            duration.textContent=audio.paused?formatDuration(total):formatDuration(current);
        }

        function setPlayIcon(){
            const playing=!audio.paused&&!audio.ended;
            if(card.classList.contains("is-loading")){
                playButton.innerHTML='<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>';
                playButton.setAttribute("aria-label","Carregando áudio");
                return;
            }

            playButton.innerHTML=playing
                ?'<i class="fa-solid fa-pause" aria-hidden="true"></i>'
                :'<i class="fa-solid fa-play" aria-hidden="true"></i>';
            playButton.setAttribute("aria-label",playing?"Pausar áudio":"Reproduzir áudio");
        }

        function setLoading(value){
            card.classList.toggle("is-loading",Boolean(value));
            setPlayIcon();
        }

        playButton.addEventListener("click",async()=>{
            if(!audio.paused&&!audio.ended){
                audio.pause();
                return;
            }

            if(activeAudio&&activeAudio!==audio){
                activeAudio.pause();
            }

            activeAudio=audio;
            audio.preload="auto";
            setLoading(true);

            try{
                await resumeVoiceAudio(audio);

                if(audio.ended||Number.isFinite(audio.duration)&&audio.currentTime>=audio.duration){
                    audio.currentTime=0;
                }

                const promise=audio.play();
                if(promise&&typeof promise.then==="function"){
                    await promise;
                }
            }catch(error){
                setLoading(false);
                if(activeAudio===audio)activeAudio=null;
                window.PrimeWayFeedback?.error("Não foi possível reproduzir este áudio. Tente novamente.");
            }
        });

        waveform.addEventListener("click",event=>{
            const total=Number.isFinite(audio.duration)?audio.duration:0;
            if(total<=0)return;

            const rect=waveform.getBoundingClientRect();
            const ratio=Math.min(1,Math.max(0,(event.clientX-rect.left)/Math.max(1,rect.width)));
            audio.currentTime=ratio*total;
            updateProgress();
        });

        speed.addEventListener("click",()=>{
            const current=Number(audio.playbackRate||1);
            const next=current===1?1.5:current===1.5?2:1;
            audio.playbackRate=next;
            speed.textContent=`${next}x`;
        });

        audio.addEventListener("loadstart",()=>{
            if(activeAudio===audio&&audio.paused)setLoading(true);
        });
        audio.addEventListener("loadedmetadata",updateProgress);
        audio.addEventListener("durationchange",updateProgress);
        audio.addEventListener("timeupdate",updateProgress);
        audio.addEventListener("canplay",()=>{
            if(activeAudio===audio&&!audio.paused)setLoading(false);
            updateProgress();
        });
        audio.addEventListener("playing",()=>{
            setLoading(false);
            setPlayIcon();
        });
        audio.addEventListener("waiting",()=>{
            if(activeAudio===audio&&!audio.paused)setLoading(true);
        });
        audio.addEventListener("stalled",()=>{
            if(activeAudio===audio&&!audio.paused)setLoading(true);
        });
        audio.addEventListener("play",()=>{
            setLoading(false);
            setPlayIcon();
        });
        audio.addEventListener("pause",()=>{
            setLoading(false);
            setPlayIcon();
            updateProgress();
        });
        audio.addEventListener("error",()=>{
            setLoading(false);
            setPlayIcon();
            if(activeAudio===audio)activeAudio=null;
        });
        audio.addEventListener("ended",()=>{
            audio.currentTime=0;
            setLoading(false);
            setPlayIcon();
            updateProgress();
            if(activeAudio===audio)activeAudio=null;
        });

        if(audio.readyState>=1)updateProgress();
    }
}

async function copyText(text){
    const value=String(text||"");
    if(!value)return false;

    if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(value);
        return true;
    }

    const area=document.createElement("textarea");
    area.value=value;
    area.style.position="fixed";
    area.style.opacity="0";
    document.body.append(area);
    area.select();
    const copied=document.execCommand("copy");
    area.remove();
    return copied;
}

async function requestAction({actionUrl,csrfToken,messageId,action}){
    const response=await fetch(actionUrl||"../api/chat/mensagem_acao.php",{
        method:"POST",
        credentials:"same-origin",
        cache:"no-store",
        headers:{
            Accept:"application/json",
            "Content-Type":"application/json",
            "X-CSRF-Token":String(csrfToken||"")
        },
        body:JSON.stringify({messageId,action})
    });

    let data=null;
    try{data=await response.json();}catch{data=null;}
    if(response.status===401)location.replace("login.html");
    if(!response.ok||!data?.success)throw new Error(data?.message||"Não foi possível concluir a ação.");
    return data;
}

function addMenuItem(panel,{icon,label,onClick,danger=false,href=null}){
    let item;
    if(href){
        item=document.createElement("a");
        item.href=href;
    }else{
        item=document.createElement("button");
        item.type="button";
        item.addEventListener("click",onClick);
    }
    item.className=`pw-chat-message-menu-item${danger?" is-danger":""}`;
    item.innerHTML=`<i class="${icon}" aria-hidden="true"></i><span>${label}</span>`;
    panel.append(item);
    return item;
}

function messagePreview(message){
    const text=String(message?.content||"").trim();
    if(text)return text.length>72?`${text.slice(0,72)}…`:text;

    const attachment=Array.isArray(message?.attachments)?message.attachments[0]:null;
    if(attachment?.kind==="audio")return"Mensagem de áudio";
    if(attachment?.kind==="image")return"Imagem";
    if(attachment?.kind==="pdf")return attachment.name||"Documento PDF";
    if(attachment)return attachment.name||"Arquivo";
    return"Mensagem";
}

function focusMessageInsideList(list,target,banner){
    if(!list||!target)return;

    const listRect=list.getBoundingClientRect();
    const targetRect=target.getBoundingClientRect();
    const bannerOffset=banner?.offsetHeight?banner.offsetHeight+12:12;
    const destination=list.scrollTop+(targetRect.top-listRect.top)-bannerOffset;

    list.scrollTo({
        top:Math.max(0,destination),
        behavior:"smooth"
    });

    target.classList.remove("pw-chat-message-focus");
    void target.offsetWidth;
    target.classList.add("pw-chat-message-focus");
    window.setTimeout(()=>target.classList.remove("pw-chat-message-focus"),1400);
}

function registerPinnedMessage(container,message){
    const list=container?.parentElement;
    if(!list||!message?.pinned)return;

    let banner=list.querySelector(":scope > .pw-chat-pinned-banner");
    if(!banner){
        banner=document.createElement("button");
        banner.type="button";
        banner.className="pw-chat-pinned-banner";
        banner.innerHTML=`
            <span class="pw-chat-pinned-banner-icon"><i class="fa-solid fa-thumbtack" aria-hidden="true"></i></span>
            <span class="pw-chat-pinned-banner-text"><strong>Mensagem fixada</strong><span></span></span>
            <i class="fa-solid fa-chevron-right pw-chat-pinned-banner-arrow" aria-hidden="true"></i>`;
        banner.dataset.count="0";
        banner.addEventListener("click",event=>{
            event.preventDefault();
            event.stopPropagation();

            const id=banner.dataset.messageId;
            if(!id)return;

            const target=list.querySelector(`[data-message-id="${CSS.escape(id)}"]`);
            if(!target)return;

            focusMessageInsideList(list,target,banner);
        });
        list.prepend(banner);
    }

    const count=Number(banner.dataset.count||0)+1;
    banner.dataset.count=String(count);
    banner.dataset.messageId=String(message.id||"");

    const title=banner.querySelector("strong");
    const preview=banner.querySelector(".pw-chat-pinned-banner-text > span");
    if(title)title.textContent=count>1?`${count} mensagens fixadas`:"Mensagem fixada";
    if(preview)preview.textContent=messagePreview(message);
}

function decorateMessage(container,message,{
    csrfToken="",
    actionUrl="../api/chat/mensagem_acao.php",
    onChanged,
    onError,
    onSuccess
}={}){
    if(!container||!message||container.dataset.pwMessageDecorated==="1")return;

    ensureStyles();
    bindGlobalEvents();
    container.dataset.pwMessageDecorated="1";
    container.dataset.messageId=String(message.id||"");
    container.classList.add("pw-chat-message-decorated");

    enhanceAudio(container);

    if(message.pinned){
        const pinned=document.createElement("span");
        pinned.className="pw-chat-pinned-badge";
        pinned.innerHTML='<i class="fa-solid fa-thumbtack" aria-hidden="true"></i><span>Fixada</span>';
        container.insertBefore(pinned,container.firstChild);
        queueMicrotask(()=>registerPinnedMessage(container,message));
    }

    const wrapper=document.createElement("div");
    wrapper.className="pw-chat-message-options";

    const toggle=document.createElement("button");
    toggle.type="button";
    toggle.className="pw-chat-message-options-button";
    toggle.title="Opções da mensagem";
    toggle.setAttribute("aria-label","Opções da mensagem");
    toggle.innerHTML='<i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';

    const panel=document.createElement("div");
    panel.className="pw-chat-message-menu";
    panel.hidden=true;

    const reportError=error=>{
        const text=error?.message||String(error||"Não foi possível concluir a ação.");
        if(typeof onError==="function")onError(text);
        else window.PrimeWayFeedback?.error(text);
    };

    const reportSuccess=text=>{
        if(typeof onSuccess==="function")onSuccess(text);
        else window.PrimeWayFeedback?.success(text);
    };

    if(String(message.content||"").trim()!==""){
        addMenuItem(panel,{
            icon:"fa-regular fa-copy",
            label:"Copiar mensagem",
            onClick:async()=>{
                closeMenu();
                try{
                    await copyText(message.content);
                    reportSuccess("Mensagem copiada.");
                }catch(error){
                    reportError(error);
                }
            }
        });
    }

    const attachments=Array.isArray(message.attachments)?message.attachments:[];
    const downloadable=attachments.find(item=>item?.downloadUrl||item?.url);

    if(downloadable){
        addMenuItem(panel,{
            icon:"fa-solid fa-download",
            label:downloadable.kind==="audio"?"Baixar áudio":"Baixar arquivo",
            href:downloadable.downloadUrl||downloadable.url
        });
    }

    addMenuItem(panel,{
        icon:"fa-solid fa-thumbtack",
        label:message.pinned?"Desafixar mensagem":"Fixar mensagem",
        onClick:async()=>{
            closeMenu();
            try{
                const data=await requestAction({
                    actionUrl,
                    csrfToken,
                    messageId:message.id,
                    action:message.pinned?"unpin":"pin"
                });
                reportSuccess(data.message||"Ação concluída.");
                if(typeof onChanged==="function")await onChanged(data);
            }catch(error){
                reportError(error);
            }
        }
    });

    if(message.own){
        addMenuItem(panel,{
            icon:"fa-regular fa-trash-can",
            label:"Excluir mensagem",
            danger:true,
            onClick:async()=>{
                closeMenu();
                const confirmed=await confirmDelete();
                if(!confirmed)return;

                try{
                    const data=await requestAction({
                        actionUrl,
                        csrfToken,
                        messageId:message.id,
                        action:"delete"
                    });
                    reportSuccess(data.message||"Mensagem excluída.");
                    if(typeof onChanged==="function")await onChanged(data);
                }catch(error){
                    reportError(error);
                }
            }
        });
    }

    toggle.addEventListener("click",event=>{
        event.stopPropagation();

        if(openMenu&&openMenu!==panel)openMenu.hidden=true;
        const shouldOpen=panel.hidden;
        panel.hidden=!shouldOpen;
        openMenu=shouldOpen?panel:null;
    });

    wrapper.append(toggle,panel);
    container.append(wrapper);
}

ensureStyles();
window.PrimeWayChatMessageExperience=Object.freeze({
    decorateMessage,
    enhanceAudio,
    formatDuration
});

})();
