(function(){
"use strict";

const MAX_FILE_SIZE=10*1024*1024;
const ACCEPTED_EXTENSIONS=[
    "pdf","png","jpg","jpeg","txt",
    "doc","docx","xls","xlsx","ppt","pptx"
];
const ACCEPT_ATTRIBUTE=ACCEPTED_EXTENSIONS.map(ext=>`.${ext}`).join(",");

function ensureStyles(){
    if(document.querySelector('link[data-primeway-chat-attachments="1"]'))return;

    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href="../css/chat_attachments_shared.css?v=20261005-1";
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

function extensionOf(name){
    const value=String(name||"");
    const index=value.lastIndexOf(".");
    return index>=0?value.slice(index+1).toLowerCase():"";
}

function iconFor(attachment){
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
                <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
                <span>Abrir</span>
            </a>
            <a class="pw-chat-preview-action pw-chat-preview-download">
                <i class="fa-solid fa-download" aria-hidden="true"></i>
                <span>Baixar</span>
            </a>
            <button type="button" class="pw-chat-preview-close" aria-label="Fechar">
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
        </div>
        <div class="pw-chat-preview-body"></div>
    `;

    previewTitle=previewDialog.querySelector(".pw-chat-preview-title");
    previewBody=previewDialog.querySelector(".pw-chat-preview-body");
    previewOpenLink=previewDialog.querySelector(".pw-chat-preview-open");
    previewDownloadLink=previewDialog.querySelector(".pw-chat-preview-download");

    previewDialog.querySelector(".pw-chat-preview-close")?.addEventListener(
        "click",
        ()=>previewDialog.close()
    );

    previewDialog.addEventListener("click",event=>{
        if(event.target===previewDialog){
            previewDialog.close();
        }
    });

    previewDialog.addEventListener("close",()=>{
        previewBody.replaceChildren();
    });

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
        if(!isDownload){
            element.target="_blank";
            element.rel="noopener";
        }
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
        meta.textContent=[
            attachment.kind==="pdf"?"PDF":"Arquivo",
            formatSize(attachment.size)
        ].join(" • ");

        info.append(name,meta);

        const actions=document.createElement("span");
        actions.className="pw-chat-file-actions";

        if(attachment.kind==="pdf"){
            actions.append(
                createFileAction(
                    "fa-solid fa-eye",
                    "Visualizar PDF",
                    ()=>openPreview(attachment)
                )
            );
        }else{
            actions.append(
                createFileAction(
                    "fa-solid fa-arrow-up-right-from-square",
                    "Abrir arquivo",
                    attachment.url
                )
            );
        }

        actions.append(
            createFileAction(
                "fa-solid fa-download",
                "Baixar arquivo",
                attachment.downloadUrl||attachment.url,
                true
            )
        );

        card.append(icon,info,actions);
        group.append(card);
    }

    container.append(group);
}

function createComposer({
    form,
    input,
    csrfToken,
    uploadUrl="../api/chat/upload.php",
    onError
}){
    if(!form||!input){
        throw new Error("Campo de mensagem do chat não encontrado.");
    }

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

    function reportError(message){
        if(typeof onError==="function"){
            onError(message);
        }else{
            window.PrimeWayFeedback?.error(message);
        }
    }

    function clear(){
        selectedFile=null;
        fileInput.value="";
        selected.hidden=true;
        selectedName.textContent="";
        selectedSize.textContent="";
    }

    function chooseFile(file){
        if(!file){
            clear();
            return;
        }

        const extension=extensionOf(file.name);

        if(!ACCEPTED_EXTENSIONS.includes(extension)){
            clear();
            reportError("Formato de arquivo não permitido no chat.");
            return;
        }

        if(file.size<=0){
            clear();
            reportError("O arquivo está vazio.");
            return;
        }

        if(file.size>MAX_FILE_SIZE){
            clear();
            reportError("O arquivo deve possuir no máximo 10 MB.");
            return;
        }

        selectedFile=file;
        selectedName.textContent=file.name;
        selectedSize.textContent=formatSize(file.size);
        selected.hidden=false;
    }

    attachButton.addEventListener("click",()=>{
        if(!attachButton.disabled)fileInput.click();
    });

    fileInput.addEventListener("change",()=>{
        chooseFile(fileInput.files?.[0]||null);
    });

    removeButton.addEventListener("click",clear);

    return Object.freeze({
        hasFile(){
            return selectedFile instanceof File;
        },

        clear,

        setEnabled(enabled){
            attachButton.disabled=!enabled;
            fileInput.disabled=!enabled;
            if(!enabled)clear();
        },

        async upload({conversationId,content=""}){
            if(!(selectedFile instanceof File)){
                throw new Error("Nenhum arquivo selecionado.");
            }

            const body=new FormData();
            body.append("conversationId",String(conversationId));
            body.append("content",String(content||""));
            body.append("file",selectedFile,selectedFile.name);

            const response=await fetch(uploadUrl,{
                method:"POST",
                credentials:"same-origin",
                cache:"no-store",
                headers:{
                    Accept:"application/json",
                    "X-CSRF-Token":String(csrfToken||"")
                },
                body
            });

            let data=null;
            try{
                data=await response.json();
            }catch{
                data=null;
            }

            if(response.status===401){
                location.replace("login.html");
            }

            return{response,data};
        }
    });
}

ensureStyles();

window.PrimeWayChatAttachments=Object.freeze({
    createComposer,
    renderMessageAttachments,
    openPreview,
    formatSize
});

})();
