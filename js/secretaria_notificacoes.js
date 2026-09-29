document.addEventListener(
"DOMContentLoaded",
async function(){

const INDEX_URL="../api/secretaria/notificacoes/index.php";
const PUBLISH_URL="../api/secretaria/notificacoes/publicar.php";
const READ_URL="../api/secretaria/notificacoes/marcar_lida.php";
const READ_ALL_URL="../api/secretaria/notificacoes/marcar_todas_lidas.php";

const session=await window.PrimeWaySecretaria.ensureSecretary();
if(!session)return;

window.PrimeWaySecretaria.bindLogout();

const tabs=[
    ...document.querySelectorAll("[data-notification-tab]")
];

const inboxView=document.querySelector("#inboxView");
const sentView=document.querySelector("#sentView");

const inboxList=document.querySelector("#inboxList");
const sentList=document.querySelector("#sentList");

const inboxSearch=document.querySelector("#inboxSearch");
const inboxReadFilter=document.querySelector("#inboxReadFilter");
const sentSearch=document.querySelector("#sentSearch");

const receivedCount=document.querySelector("#receivedCount");
const unreadCount=document.querySelector("#unreadCount");
const sentCount=document.querySelector("#sentCount");
const classesCount=document.querySelector("#classesCount");

const markAllReadButton=document.querySelector("#markAllReadButton");
const newNoticeButton=document.querySelector("#newNoticeButton");

const noticeDialog=document.querySelector("#noticeDialog");
const noticeForm=document.querySelector("#noticeForm");
const closeNoticeDialog=document.querySelector("#closeNoticeDialog");
const cancelNoticeButton=document.querySelector("#cancelNoticeButton");
const publishNoticeButton=document.querySelector("#publishNoticeButton");

const noticeAudience=document.querySelector("#noticeAudience");
const noticeClassGroup=document.querySelector("#noticeClassGroup");
const noticeClass=document.querySelector("#noticeClass");
const noticeType=document.querySelector("#noticeType");
const noticeTitle=document.querySelector("#noticeTitle");
const noticeMessage=document.querySelector("#noticeMessage");

let state={
    classes:[],
    inbox:[],
    sent:[]
};

function normalize(value){
    return String(value??"")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g,"")
        .toLowerCase()
        .trim();
}

function iconFor(item){
    const value=normalize(`${item.type} ${item.origin}`);

    if(value.includes("reuniao"))return"fa-people-group";
    if(value.includes("evento"))return"fa-calendar-check";
    if(value.includes("atividade"))return"fa-list-check";
    if(value.includes("prova"))return"fa-file-pen";
    if(value.includes("urgente"))return"fa-triangle-exclamation";
    if(value.includes("gps")||value.includes("saida"))return"fa-location-dot";

    return"fa-bell";
}

function setActiveTab(name){
    for(const tab of tabs){
        tab.classList.toggle(
            "active",
            tab.dataset.notificationTab===name
        );
    }

    inboxView.hidden=name!=="inbox";
    sentView.hidden=name!=="sent";
}

function fillClasses(){
    noticeClass.querySelectorAll(
        "option:not(:first-child)"
    ).forEach(option=>option.remove());

    for(const item of state.classes){
        const option=document.createElement("option");

        option.value=String(item.id);
        option.textContent=
            `${item.name} • ${item.series} • ${item.shift}`;

        noticeClass.append(option);
    }
}

function audienceNeedsClass(){
    return[
        "class_students",
        "class_guardians",
        "class_both"
    ].includes(noticeAudience.value);
}

function updateAudienceFields(){
    const needsClass=audienceNeedsClass();

    noticeClassGroup.hidden=!needsClass;
    noticeClass.required=needsClass;

    if(!needsClass){
        noticeClass.value="";
    }
}

function renderSummary(){
    receivedCount.textContent=String(state.inbox.length);

    unreadCount.textContent=String(
        state.inbox.filter(item=>!item.read).length
    );

    sentCount.textContent=String(state.sent.length);
    classesCount.textContent=String(state.classes.length);
}

async function markRead(item){
    if(item.read)return;

    const{response,data}=
        await window.PrimeWaySecretaria.requestJson(
            READ_URL,
            {notificationId:item.id}
        );

    if(!response.ok||!data?.success){
        throw new Error(
            data?.message||
            "Não foi possível marcar a notificação como lida."
        );
    }

    item.read=true;

    renderSummary();
    renderInbox();

    await window.PrimeWaySecretaria.refreshNavigationBadges();
}

function buildItem(item,mode){
    const article=document.createElement("article");

    article.className=
        `secretary-notification-item${mode==="inbox"?" clickable":""}${mode==="inbox"&&!item.read?" unread":""}`;

    if(mode==="inbox"){
        article.tabIndex=0;
    }

    const icon=document.createElement("div");
    icon.className="secretary-notification-icon";
    icon.innerHTML=
        `<i class="fa-solid ${iconFor(item)}" aria-hidden="true"></i>`;

    const content=document.createElement("div");
    content.className="secretary-notification-content";

    const title=document.createElement("h3");
    title.textContent=item.title;

    const message=document.createElement("p");
    message.textContent=item.message;

    const meta=document.createElement("div");
    meta.className="secretary-notification-meta";

    const type=document.createElement("span");
    type.className="secretary-notification-type";
    type.textContent=item.type;

    const audience=document.createElement("span");
    audience.textContent=
        mode==="inbox"
            ?`Por: ${item.author||"Sistema"}`
            :item.audience;

    meta.append(type,audience);
    content.append(title,message,meta);

    const side=document.createElement("div");
    side.className="secretary-notification-side";

    const time=document.createElement("time");
    time.textContent=
        window.PrimeWaySecretaria.formatDate(
            item.date,
            true
        );

    side.append(time);

    if(mode==="sent"){
        const recipients=document.createElement("strong");
        recipients.textContent=
            `${item.recipients} destinatário${item.recipients===1?"":"s"}`;

        const reads=document.createElement("span");
        reads.textContent=
            `${item.readCount} leitura${item.readCount===1?"":"s"}`;

        side.append(recipients,reads);
    }

    article.append(icon,content,side);

    if(mode==="inbox"){
        const open=async()=>{
            try{
                await markRead(item);
            }catch(error){
                window.PrimeWayFeedback?.error(
                    error?.message||
                    "Não foi possível atualizar a notificação."
                );
            }
        };

        article.addEventListener("click",open);

        article.addEventListener("keydown",event=>{
            if(event.key==="Enter"||event.key===" "){
                event.preventDefault();
                open();
            }
        });
    }

    return article;
}

function renderInbox(){
    const query=normalize(inboxSearch.value);
    const readFilter=inboxReadFilter.value;

    const items=state.inbox.filter(item=>{
        if(readFilter==="unread"&&item.read)return false;
        if(readFilter==="read"&&!item.read)return false;

        if(
            query
            &&
            !normalize(
                `${item.title} ${item.message} ${item.type} ${item.author}`
            ).includes(query)
        ){
            return false;
        }

        return true;
    });

    inboxList.replaceChildren();

    if(!items.length){
        inboxList.innerHTML=`
            <div class="secretary-notification-empty">
                <i class="fa-regular fa-bell-slash"></i>
                Nenhuma notificação recebida.
            </div>
        `;
        return;
    }

    for(const item of items){
        inboxList.append(
            buildItem(item,"inbox")
        );
    }
}

function renderSent(){
    const query=normalize(sentSearch.value);

    const items=state.sent.filter(
        item=>
            !query
            ||
            normalize(
                `${item.title} ${item.message} ${item.type} ${item.audience}`
            ).includes(query)
    );

    sentList.replaceChildren();

    if(!items.length){
        sentList.innerHTML=`
            <div class="secretary-notification-empty">
                <i class="fa-regular fa-paper-plane"></i>
                Nenhum comunicado publicado pela Secretaria.
            </div>
        `;
        return;
    }

    for(const item of items){
        sentList.append(
            buildItem(item,"sent")
        );
    }
}

function openNotice(){
    noticeForm.reset();
    updateAudienceFields();

    noticeDialog.showModal();

    requestAnimationFrame(
        ()=>noticeTitle.focus()
    );
}

function closeNotice(){
    if(noticeDialog.open){
        noticeDialog.close();
    }
}

async function publishNotice(event){
    event.preventDefault();

    if(!noticeForm.checkValidity()){
        noticeForm.reportValidity();
        return;
    }

    publishNoticeButton.disabled=true;

    try{
        const payload={
            audience:noticeAudience.value,
            classId:
                audienceNeedsClass()
                    ?noticeClass.value
                    :null,
            type:noticeType.value,
            title:noticeTitle.value.trim(),
            message:noticeMessage.value.trim()
        };

        const{response,data}=
            await window.PrimeWaySecretaria.requestJson(
                PUBLISH_URL,
                payload
            );

        if(!response.ok||!data?.success){
            throw new Error(
                data?.message||
                "Não foi possível publicar o comunicado."
            );
        }

        window.PrimeWayFeedback?.success(
            `${data.message||"Comunicado publicado."} ${data.recipients??0} destinatário(s).`
        );

        closeNotice();

        await load();
        setActiveTab("sent");

    }catch(error){
        window.PrimeWayFeedback?.error(
            error?.message||
            "Não foi possível publicar o comunicado."
        );

    }finally{
        publishNoticeButton.disabled=false;
    }
}

async function markAllRead(){
    if(!state.inbox.some(item=>!item.read)){
        window.PrimeWayFeedback?.info(
            "Não há notificações não lidas."
        );
        return;
    }

    markAllReadButton.disabled=true;

    try{
        const{response,data}=
            await window.PrimeWaySecretaria.requestJson(
                READ_ALL_URL,
                {}
            );

        if(!response.ok||!data?.success){
            throw new Error(
                data?.message||
                "Não foi possível atualizar as notificações."
            );
        }

        for(const item of state.inbox){
            item.read=true;
        }

        renderSummary();
        renderInbox();

        window.PrimeWayFeedback?.success(
            "Notificações marcadas como lidas."
        );

        await window.PrimeWaySecretaria.refreshNavigationBadges();

    }catch(error){
        window.PrimeWayFeedback?.error(
            error?.message||
            "Não foi possível atualizar as notificações."
        );

    }finally{
        markAllReadButton.disabled=false;
    }
}

async function load(){
    const{response,data}=
        await window.PrimeWaySecretaria.request(
            INDEX_URL
        );

    if(!response.ok||!data?.success){
        throw new Error(
            data?.message||
            "Não foi possível carregar as notificações."
        );
    }

    state={
        classes:Array.isArray(data.classes)
            ?data.classes
            :[],
        inbox:Array.isArray(data.inbox)
            ?data.inbox
            :[],
        sent:Array.isArray(data.sent)
            ?data.sent
            :[]
    };

    fillClasses();
    renderSummary();
    renderInbox();
    renderSent();
}

for(const tab of tabs){
    tab.addEventListener(
        "click",
        ()=>setActiveTab(
            tab.dataset.notificationTab
        )
    );
}

inboxSearch.addEventListener("input",renderInbox);
inboxReadFilter.addEventListener("change",renderInbox);
sentSearch.addEventListener("input",renderSent);

markAllReadButton.addEventListener(
    "click",
    markAllRead
);

newNoticeButton.addEventListener(
    "click",
    openNotice
);

closeNoticeDialog.addEventListener(
    "click",
    closeNotice
);

cancelNoticeButton.addEventListener(
    "click",
    closeNotice
);

noticeAudience.addEventListener(
    "change",
    updateAudienceFields
);

noticeForm.addEventListener(
    "submit",
    publishNotice
);

try{
    await load();

    await window.PrimeWaySecretaria
        .refreshNavigationBadges();

}catch(error){
    console.error(
        "Erro ao carregar notificações da Secretaria:",
        error
    );

    window.PrimeWayFeedback?.error(
        error?.message||
        "Não foi possível carregar as notificações."
    );
}

});
