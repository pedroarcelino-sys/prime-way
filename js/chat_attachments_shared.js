(function(){
"use strict";

const MAX_FILE_SIZE=10*1024*1024;
const MAX_RECORD_SECONDS=300;
const ACCEPTED_EXTENSIONS=[
    "pdf","png","jpg","jpeg","txt",
    "doc","docx","xls","xlsx","ppt","pptx",
    "webm","ogg","mp3","m4a","wav"
];
const AUDIO_EXTENSIONS=new Set(["webm","ogg","mp3","m4a","wav"]);
const ACCEPT_ATTRIBUTE=ACCEPTED_EXTENSIONS.map(ext=>`.${ext}`).join(",");

function ensureStyles(){
    if(document.querySelector('link[data-primeway-chat-attachments="1"]'))return;
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href="../css/chat_attachments_shared.css?v=20261005-2";
    link.dataset.primewayChatAttachments="1";
    document.head.append(link);
}

function formatSize(bytes){
    const size=Number(bytes||0);
    if(!Number.isFinite(size)||size<=0)return"Arquivo";
    if(size<1024)return`${size} B`;
    if(size<1024*1024)return`${(size/1024).toFixed(1)} KB`;
    return`${(size/(1024*1024)).toFixed(1)} MB`;
}

function formatDuration(totalSeconds){
    const seconds=Math.max(0,Math.floor(Number(totalSeconds)||0));
    const minutes=Math.floor(seconds/60);
    const rest=seconds%60;
    return`${String(minutes).padStart(2,"0")}:${String(rest).padStart(2,"0")}`;
}

function extensionOf(name){
    const value=String(name||"");
    const index=value.lastIndexOf(".");
    return index>=0?value.slice(index+1).toLowerCase():"";
}

function isAudioFile(file){
    return AUDIO_EXTENSIONS.has(extensionOf(file?.name))||String(file?.type||"").startsWith("audio/");
}

function iconFor(attachment){
    if(attachment?.kind==="audio")return"fa-solid fa-microphone";
    if(attachment?.kind==="pdf")return"fa-solid fa-file-pdf";
    if(attachment?.kind==="image")return"fa-solid fa-image";
    const ext=extensionOf(attachment?.name);
    if(["doc","docx"].includes(ext))return"fa-solid fa-file-word";
    if(["xls","xlsx"].includes(ext))return"fa-solid fa-file-excel";
    if(["ppt","pptx"].includes(ext))return"fa-solid fa-file-powerpoint";
    if(ext==="txt")return"fa-solid fa-file-lines";
    return"fa-solid fa-file";
}

let previewDialog=null;
let previewTitle=null;
let previewBody=null;
let previewOpenLink=null;
let previewDownloadLink=null;

function ensurePreviewDialog(){
    if(previewDialog)return;
    previewDialog=document.createElement("dialog");
    previewDialog.className="pw-chat-preview-dialog";
    previewDialog.innerHTML=`
        <div class="pw-chat-preview-header">
            <div class="pw-chat-preview-title"></div>
            <a class="pw-chat-preview-action pw-chat-preview-open" target="_blank" rel="noopener">
                <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i><span>Abrir</span>
            </a>
            <a class="pw-chat-preview-action pw-chat-preview-download">
                <i class="fa-solid fa-download" aria-hidden="true"></i><span>Baixar</span>
            </a>
            <button type="button" class="pw-chat-preview-close" aria-label="Fechar">
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
        </div>
        <div class="pw-chat-preview-body"></div>`;
    previewTitle=previewDialog.querySelector(".pw-chat-preview-title");
    previewBody=previewDialog.querySelector(".pw-chat-preview-body");
    previewOpenLink=previewDialog.querySelector(".pw-chat-preview-open");
    previewDownloadLink=previewDialog.querySelector(".pw-chat-preview-download");
    previewDialog.querySelector(".pw-chat-preview-close")?.addEventListener("click",()=>previewDialog.close());
    previewDialog.addEventListener("click",event=>{if(event.target===previewDialog)previewDialog.close();});
    previewDialog.addEventListener("close",()=>previewBody.replaceChildren());
    document.body.append(previewDialog);
}

function openPreview(attachment){
    ensurePreviewDialog();
    previewTitle.textContent=String(attachment?.name||"Arquivo");
    previewOpenLink.href=String(attachment?.url||"#");
    previewDownloadLink.href=String(attachment?.downloadUrl||attachment?.url||"#");
    previewBody.replaceChildren();

    if(attachment?.kind==="image"){
        const image=document.createElement("img");
        image.src=attachment.url;
        image.alt=attachment.name||"Imagem enviada no chat";
        previewBody.append(image);
    }else if(attachment?.kind==="pdf"){
        const frame=document.createElement("iframe");
        frame.src=attachment.url;
        frame.title=attachment.name||"PDF enviado no chat";
        previewBody.append(frame);
    }else{
        window.open(attachment?.url||attachment?.downloadUrl,"_blank","noopener");
        return;
    }
    previewDialog.showModal();
}

function createFileAction(icon,title,handlerOrUrl,isDownload=false){
    let element;
    if(typeof handlerOrUrl==="function"){
        element=document.createElement("button");
        element.type="button";
        element.addEventListener("click",handlerOrUrl);
    }else{
        element=document.createElement("a");
        element.href=String(handlerOrUrl||"#");
        if(!isDownload){element.target="_blank";element.rel="noopener";}
    }
    element.className="pw-chat-file-action";
    element.title=title;
    element.setAttribute("aria-label",title);
    const i=document.createElement("i");
    i.className=icon;
    i.setAttribute("aria-hidden","true");
    element.append(i);
    return element;
}

function renderMessageAttachments(container,attachments){
    if(!container||!Array.isArray(attachments)||!attachments.length)return;
    const group=document.createElement("div");
    group.className="pw-chat-attachments";

    for(const attachment of attachments){
        if(attachment?.kind==="image"){
            const button=document.createElement("button");
            button.type="button";
            button.className="pw-chat-image-button";
            button.title=`Abrir ${attachment.name||"imagem"}`;
            const image=document.createElement("img");
            image.src=attachment.url;
            image.alt=attachment.name||"Imagem enviada no chat";
            image.loading="lazy";
            button.append(image);
            button.addEventListener("click",()=>openPreview(attachment));
            group.append(button);
            continue;
        }

        if(attachment?.kind==="audio"){
            const card=document.createElement("div");
            card.className="pw-chat-audio-card";

            const icon=document.createElement("span");
            icon.className="pw-chat-audio-icon";
            icon.innerHTML='<i class="fa-solid fa-microphone" aria-hidden="true"></i>';

            const player=document.createElement("audio");
            player.controls=true;
            player.preload="metadata";
            player.src=attachment.url;
            player.setAttribute("aria-label",attachment.name||"Áudio do chat");

            const download=createFileAction(
                "fa-solid fa-download",
                "Baixar áudio",
                attachment.downloadUrl||attachment.url,
                true
            );

            card.append(icon,player,download);
            group.append(card);
            continue;
        }

        const card=document.createElement("div");
        card.className="pw-chat-file-card";
        const icon=document.createElement("span");
        icon.className="pw-chat-file-icon";
        const iconElement=document.createElement("i");
        iconElement.className=iconFor(attachment);
        iconElement.setAttribute("aria-hidden","true");
        icon.append(iconElement);

        const info=document.createElement("span");
        info.className="pw-chat-file-info";
        const name=document.createElement("strong");
        name.textContent=attachment.name||"Arquivo";
        const meta=document.createElement("span");
        meta.textContent=[attachment.kind==="pdf"?"PDF":"Arquivo",formatSize(attachment.size)].join(" • ");
        info.append(name,meta);

        const actions=document.createElement("span");
        actions.className="pw-chat-file-actions";
        if(attachment.kind==="pdf"){
            actions.append(createFileAction("fa-solid fa-eye","Visualizar PDF",()=>openPreview(attachment)));
        }else{
            actions.append(createFileAction("fa-solid fa-arrow-up-right-from-square","Abrir arquivo",attachment.url));
        }
        actions.append(createFileAction("fa-solid fa-download","Baixar arquivo",attachment.downloadUrl||attachment.url,true));
        card.append(icon,info,actions);
        group.append(card);
    }
    container.append(group);
}

function chooseRecorderMime(){
    if(typeof MediaRecorder==="undefined")return"";
    const options=["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/mp4"];
    if(typeof MediaRecorder.isTypeSupported!=="function")return"";
    return options.find(type=>MediaRecorder.isTypeSupported(type))||"";
}

function extensionForMime(mime){
    const value=String(mime||"").toLowerCase();
    if(value.includes("ogg"))return"ogg";
    if(value.includes("mp4"))return"m4a";
    if(value.includes("mpeg"))return"mp3";
    if(value.includes("wav"))return"wav";
    return"webm";
}

function createAudioRecorder({
    form,
    input,
    container=input?.parentNode,
    before=input,
    onFileReady,
    onError,
    canStart,
    onRecordingChange,
    maxSeconds=MAX_RECORD_SECONDS
}){
    ensureStyles();
    if(!container||!before)throw new Error("Não foi possível preparar o gravador do chat.");

    const micButton=document.createElement("button");
    micButton.type="button";
    micButton.className="pw-chat-audio-button";
    micButton.title="Gravar áudio";
    micButton.setAttribute("aria-label","Gravar áudio");
    micButton.innerHTML='<i class="fa-solid fa-microphone" aria-hidden="true"></i>';

    const status=document.createElement("span");
    status.className="pw-chat-recording-status";
    status.hidden=true;

    const dot=document.createElement("span");
    dot.className="pw-chat-recording-dot";
    dot.setAttribute("aria-hidden","true");

    const time=document.createElement("strong");
    time.textContent="00:00";

    const cancel=document.createElement("button");
    cancel.type="button";
    cancel.className="pw-chat-recording-cancel";
    cancel.title="Cancelar gravação";
    cancel.setAttribute("aria-label","Cancelar gravação");
    cancel.innerHTML='<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
    status.append(dot,time,cancel);

    container.insertBefore(micButton,before);
    container.insertBefore(status,before);

    let enabled=true;
    let recorder=null;
    let stream=null;
    let chunks=[];
    let startedAt=0;
    let timer=null;
    let cancelRequested=false;
    let previousInputDisabled=false;

    function reportError(message){
        if(typeof onError==="function")onError(message);
        else window.PrimeWayFeedback?.error(message);
    }

    function notifyRecording(value){
        if(typeof onRecordingChange==="function")onRecordingChange(Boolean(value));
    }

    function stopTracks(){
        if(stream){
            for(const track of stream.getTracks())track.stop();
        }
        stream=null;
    }

    function stopTimer(){
        if(timer){window.clearInterval(timer);timer=null;}
    }

    function setRecordingUi(recording){
        micButton.classList.toggle("is-recording",recording);
        micButton.title=recording?"Parar gravação":"Gravar áudio";
        micButton.setAttribute("aria-label",recording?"Parar gravação":"Gravar áudio");
        micButton.innerHTML=recording
            ?'<i class="fa-solid fa-stop" aria-hidden="true"></i>'
            :'<i class="fa-solid fa-microphone" aria-hidden="true"></i>';
        status.hidden=!recording;
        if(input){
            if(recording){previousInputDisabled=input.disabled;input.disabled=true;}
            else input.disabled=previousInputDisabled||!enabled;
        }
        notifyRecording(recording);
    }

    function cleanupAfterStop(){
        stopTimer();
        stopTracks();
        setRecordingUi(false);
        recorder=null;
    }

    function recordingSeconds(){
        return startedAt?Math.max(0,Math.floor((Date.now()-startedAt)/1000)):0;
    }

    function stopRecording(cancelled=false){
        if(!recorder||recorder.state==="inactive")return;
        cancelRequested=Boolean(cancelled);
        recorder.stop();
    }

    async function startRecording(){
        if(!enabled)return;
        if(typeof canStart==="function"&&!canStart()){
            reportError("Remova o arquivo selecionado antes de gravar um áudio.");
            return;
        }
        if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){
            reportError("Este navegador não oferece suporte à gravação de áudio.");
            return;
        }

        try{
            stream=await navigator.mediaDevices.getUserMedia({audio:true});
            const mime=chooseRecorderMime();
            try{
                recorder=mime
                    ?new MediaRecorder(stream,{mimeType:mime,audioBitsPerSecond:64000})
                    :new MediaRecorder(stream);
            }catch{
                recorder=new MediaRecorder(stream);
            }

            chunks=[];
            cancelRequested=false;
            startedAt=Date.now();
            time.textContent="00:00";

            recorder.addEventListener("dataavailable",event=>{
                if(event.data&&event.data.size>0)chunks.push(event.data);
            });

            recorder.addEventListener("stop",()=>{
                const duration=recordingSeconds();
                const mimeType=recorder?.mimeType||chunks[0]?.type||"audio/webm";
                const cancelled=cancelRequested;
                const parts=chunks.slice();
                chunks=[];
                cleanupAfterStop();

                if(cancelled)return;
                const blob=new Blob(parts,{type:mimeType});
                if(blob.size<=0){
                    reportError("Não foi possível gerar o áudio gravado.");
                    return;
                }
                if(blob.size>MAX_FILE_SIZE){
                    reportError("O áudio excedeu o limite de 10 MB.");
                    return;
                }

                const extension=extensionForMime(mimeType);
                const stamp=new Date().toISOString().replace(/[:.]/g,"-");
                const file=new File([blob],`audio-${stamp}.${extension}`,{type:mimeType,lastModified:Date.now()});
                if(typeof onFileReady==="function")onFileReady(file,{duration});
            },{once:true});

            recorder.addEventListener("error",()=>{
                cleanupAfterStop();
                reportError("A gravação de áudio foi interrompida.");
            },{once:true});

            setRecordingUi(true);
            recorder.start(250);
            timer=window.setInterval(()=>{
                const seconds=recordingSeconds();
                time.textContent=formatDuration(seconds);
                if(seconds>=Number(maxSeconds||MAX_RECORD_SECONDS)){
                    stopRecording(false);
                }
            },500);
        }catch(error){
            stopTracks();
            const name=String(error?.name||"");
            if(name==="NotAllowedError"||name==="SecurityError"){
                reportError("Permita o acesso ao microfone para gravar mensagens de áudio.");
            }else if(name==="NotFoundError"){
                reportError("Nenhum microfone foi encontrado neste dispositivo.");
            }else{
                reportError("Não foi possível iniciar a gravação de áudio.");
            }
        }
    }

    micButton.addEventListener("click",()=>{
        if(recorder&&recorder.state!=="inactive")stopRecording(false);
        else startRecording();
    });
    cancel.addEventListener("click",()=>stopRecording(true));

    if(form){
        form.addEventListener("submit",event=>{
            if(recorder&&recorder.state!=="inactive"){
                event.preventDefault();
                event.stopImmediatePropagation();
                reportError("Finalize a gravação antes de enviar a mensagem.");
            }
        },true);
    }

    return Object.freeze({
        isRecording(){return Boolean(recorder&&recorder.state!=="inactive");},
        cancel(){stopRecording(true);},
        setEnabled(value){
            enabled=Boolean(value);
            micButton.disabled=!enabled;
            if(!enabled&&recorder&&recorder.state!=="inactive")stopRecording(true);
        }
    });
}

function createComposer({form,input,csrfToken,uploadUrl="../api/chat/upload.php",onError}){
    if(!form||!input)throw new Error("Campo de mensagem do chat não encontrado.");
    ensureStyles();

    const parent=input.parentNode;
    const wrapper=document.createElement("div");
    wrapper.className="pw-chat-composer";

    const selected=document.createElement("div");
    selected.className="pw-chat-selected-file";
    selected.hidden=true;

    const selectedIcon=document.createElement("i");
    selectedIcon.className="fa-solid fa-paperclip";
    selectedIcon.setAttribute("aria-hidden","true");

    const selectedMeta=document.createElement("span");
    selectedMeta.className="pw-chat-selected-meta";
    const selectedName=document.createElement("strong");
    const selectedSize=document.createElement("span");
    selectedMeta.append(selectedName,selectedSize);

    const removeButton=document.createElement("button");
    removeButton.type="button";
    removeButton.className="pw-chat-remove-file";
    removeButton.title="Remover arquivo";
    removeButton.setAttribute("aria-label","Remover arquivo selecionado");
    removeButton.innerHTML='<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
    selected.append(selectedIcon,selectedMeta,removeButton);

    const row=document.createElement("div");
    row.className="pw-chat-input-row";

    const attachButton=document.createElement("button");
    attachButton.type="button";
    attachButton.className="pw-chat-attach-button";
    attachButton.title="Anexar arquivo";
    attachButton.setAttribute("aria-label","Anexar arquivo");
    attachButton.innerHTML='<i class="fa-solid fa-paperclip" aria-hidden="true"></i>';

    const fileInput=document.createElement("input");
    fileInput.type="file";
    fileInput.className="pw-chat-file-input";
    fileInput.accept=ACCEPT_ATTRIBUTE;
    fileInput.tabIndex=-1;

    parent.insertBefore(wrapper,input);
    row.append(attachButton,input);
    wrapper.append(selected,row,fileInput);

    let selectedFile=null;
    let composerEnabled=true;

    function reportError(message){
        if(typeof onError==="function")onError(message);
        else window.PrimeWayFeedback?.error(message);
    }

    function clear(){
        selectedFile=null;
        fileInput.value="";
        selected.hidden=true;
        selectedName.textContent="";
        selectedSize.textContent="";
        selectedIcon.className="fa-solid fa-paperclip";
    }

    function chooseFile(file,meta={}){
        if(!file){clear();return false;}
        const extension=extensionOf(file.name);
        if(!ACCEPTED_EXTENSIONS.includes(extension)){
            clear();reportError("Formato de arquivo não permitido no chat.");return false;
        }
        if(file.size<=0){clear();reportError("O arquivo está vazio.");return false;}
        if(file.size>MAX_FILE_SIZE){clear();reportError("O arquivo deve possuir no máximo 10 MB.");return false;}

        selectedFile=file;
        const audio=isAudioFile(file);
        selectedIcon.className=audio?"fa-solid fa-microphone":"fa-solid fa-paperclip";
        selectedName.textContent=audio?"Áudio gravado":file.name;
        selectedSize.textContent=audio&&Number.isFinite(meta.duration)
            ?`${formatDuration(meta.duration)} • ${formatSize(file.size)}`
            :formatSize(file.size);
        selected.hidden=false;
        return true;
    }

    const recorder=createAudioRecorder({
        form,
        input,
        container:row,
        before:input,
        canStart:()=>!selectedFile,
        onFileReady:(file,meta)=>chooseFile(file,meta),
        onError:reportError,
        onRecordingChange:recording=>{
            attachButton.disabled=recording||!composerEnabled;
            fileInput.disabled=recording||!composerEnabled;
        }
    });

    attachButton.addEventListener("click",()=>{if(!attachButton.disabled)fileInput.click();});
    fileInput.addEventListener("change",()=>chooseFile(fileInput.files?.[0]||null));
    removeButton.addEventListener("click",clear);

    return Object.freeze({
        hasFile(){return selectedFile instanceof File;},
        isRecording(){return recorder.isRecording();},
        clear,
        selectFile:chooseFile,
        setEnabled(enabled){
            composerEnabled=Boolean(enabled);
            attachButton.disabled=!composerEnabled;
            fileInput.disabled=!composerEnabled;
            recorder.setEnabled(composerEnabled);
            if(!composerEnabled)clear();
        },
        async upload({conversationId,content=""}){
            if(!(selectedFile instanceof File))throw new Error("Nenhum arquivo selecionado.");
            const body=new FormData();
            body.append("conversationId",String(conversationId));
            body.append("content",String(content||""));
            body.append("file",selectedFile,selectedFile.name);

            const response=await fetch(uploadUrl,{
                method:"POST",
                credentials:"same-origin",
                cache:"no-store",
                headers:{Accept:"application/json","X-CSRF-Token":String(csrfToken||"")},
                body
            });

            let data=null;
            try{data=await response.json();}catch{data=null;}
            if(response.status===401)location.replace("login.html");
            return{response,data};
        }
    });
}

ensureStyles();
window.PrimeWayChatAttachments=Object.freeze({
    createComposer,
    createAudioRecorder,
    renderMessageAttachments,
    openPreview,
    formatSize,
    formatDuration
});

})();
