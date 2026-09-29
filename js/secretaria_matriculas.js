document.addEventListener(
"DOMContentLoaded",
async function(){

const INDEX_URL="../api/secretaria/matriculas/index.php";
const SAVE_URL="../api/secretaria/matriculas/salvar.php";

const session=await window.PrimeWaySecretaria.ensureSecretary();
if(!session)return;

window.PrimeWaySecretaria.bindLogout();

const search=document.querySelector("#enrollmentSearch");
const classFilter=document.querySelector("#classFilter");
const statusFilter=document.querySelector("#statusFilter");
const tbody=document.querySelector("#enrollmentTableBody");

const dialog=document.querySelector("#enrollmentDialog");
const dialogClose=document.querySelector("#enrollmentDialogClose");
const cancelButton=document.querySelector("#cancelEnrollmentButton");
const form=document.querySelector("#enrollmentForm");
const studentName=document.querySelector("#enrollmentStudentName");
const currentClass=document.querySelector("#enrollmentCurrentClass");
const classSelect=document.querySelector("#enrollmentClass");
const saveButton=document.querySelector("#saveEnrollmentButton");
const removeButton=document.querySelector("#removeEnrollmentButton");

let students=[];
let classes=[];
let selectedStudent=null;

function normalize(value){
    return String(value??"")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g,"")
        .toLowerCase()
        .trim();
}

function currentClassName(student){
    return student.currentEnrollment?.className||"Sem turma";
}

function setSummary(id,value){
    const el=document.querySelector(id);
    if(el)el.textContent=String(value??0);
}

function fillClassFilters(){
    classFilter.querySelectorAll("option:not(:first-child)")
        .forEach(option=>option.remove());

    classSelect.querySelectorAll("option:not(:first-child)")
        .forEach(option=>option.remove());

    for(const item of classes){
        const label=
            `${item.name} • ${item.series} • ${item.shift} (${item.occupancy}/${item.capacity})`;

        const optionFilter=document.createElement("option");
        optionFilter.value=String(item.id);
        optionFilter.textContent=label;
        classFilter.append(optionFilter);

        if(item.status==="Ativa"){
            const optionSelect=document.createElement("option");
            optionSelect.value=String(item.id);
            optionSelect.textContent=label;
            classSelect.append(optionSelect);
        }
    }
}

function visibleStudents(){
    const query=normalize(search.value);
    const classId=Number(classFilter.value||0);
    const status=statusFilter.value;

    return students.filter(student=>{
        const enrollment=student.currentEnrollment;

        const text=normalize([
            student.name,
            student.registration,
            student.email,
            enrollment?.className,
            enrollment?.series,
            enrollment?.shift
        ].join(" "));

        if(query&&!text.includes(query))return false;

        if(
            classId
            &&
            Number(enrollment?.classId||0)!==classId
        ){
            return false;
        }

        if(status==="enrolled"&&!enrollment)return false;
        if(status==="without"&&enrollment)return false;

        return true;
    });
}

function render(){
    const list=visibleStudents();

    tbody.replaceChildren();

    if(!list.length){
        const row=document.createElement("tr");
        row.innerHTML=`
            <td colspan="7" class="enrollment-empty-cell">
                Nenhum aluno encontrado.
            </td>
        `;
        tbody.append(row);
        return;
    }

    for(const student of list){
        const enrollment=student.currentEnrollment;
        const row=document.createElement("tr");

        row.innerHTML=`
            <td>
                <div class="enrollment-student">
                    <div class="enrollment-avatar">
                        ${String(student.name||"A").charAt(0).toUpperCase()}
                    </div>

                    <div>
                        <strong>${student.name}</strong>
                        <span>${student.email||"Sem e-mail"}</span>
                    </div>
                </div>
            </td>

            <td>
                <strong>${student.registration||"—"}</strong>
            </td>

            <td>
                ${
                    enrollment
                    ?`
                        <strong>${enrollment.className}</strong>
                        <span class="enrollment-subline">
                            ${enrollment.series} • ${enrollment.shift}
                        </span>
                    `
                    :'<span class="enrollment-no-class">Sem turma</span>'
                }
            </td>

            <td>
                ${
                    enrollment
                    ?window.PrimeWaySecretaria.formatDate(
                        enrollment.enrollmentDate
                    )
                    :"—"
                }
            </td>

            <td>
                ${
                    enrollment?.callNumber
                    ?? "—"
                }
            </td>

            <td>
                <span class="secretary-status ${enrollment?"success":"warning"}">
                    ${enrollment?"Ativa":"Sem matrícula ativa"}
                </span>
            </td>

            <td>
                <button
                    type="button"
                    class="enrollment-manage-button"
                    data-student-id="${student.id}"
                >
                    <i class="fa-solid fa-pen-to-square"></i>
                    Gerenciar
                </button>
            </td>
        `;

        tbody.append(row);
    }

    document.querySelectorAll("[data-student-id]")
        .forEach(button=>{
            button.addEventListener("click",()=>{
                const id=Number(button.dataset.studentId);

                const student=students.find(
                    item=>Number(item.id)===id
                );

                if(student){
                    openDialog(student);
                }
            });
        });
}

function openDialog(student){
    selectedStudent=student;

    studentName.textContent=
        student.name;

    currentClass.textContent=
        currentClassName(student);

    classSelect.value=
        student.currentEnrollment?.classId
            ?String(student.currentEnrollment.classId)
            :"";

    saveButton.textContent=
        student.currentEnrollment
            ?"Transferir / manter matrícula"
            :"Matricular aluno";

    removeButton.hidden=
        !student.currentEnrollment;

    dialog.showModal();
}

function closeDialog(){
    selectedStudent=null;

    if(dialog.open){
        dialog.close();
    }
}

async function saveEnrollment(event){
    event.preventDefault();

    const student=selectedStudent;

    if(!student)return;

    const classId=Number(classSelect.value||0);

    if(!classId){
        window.PrimeWayFeedback?.warning(
            "Selecione uma turma."
        );
        return;
    }

    const target=classes.find(
        item=>Number(item.id)===classId
    );

    const current=
        student.currentEnrollment;

    if(
        current
        &&
        Number(current.classId)===classId
    ){
        window.PrimeWayFeedback?.info(
            "O aluno já está matriculado nesta turma."
        );
        return;
    }

    const confirmed=
        await window.PrimeWayConfirm?.warning?.(
            current
                ?`Transferir ${student.name} de ${current.className} para ${target?.name||"a turma selecionada"}?`
                :`Matricular ${student.name} em ${target?.name||"a turma selecionada"}?`,
            {
                title:
                    current
                        ?"Confirmar transferência"
                        :"Confirmar matrícula",
                confirmText:
                    current
                        ?"Transferir"
                        :"Matricular"
            }
        );

    if(confirmed!==true)return;

    saveButton.disabled=true;

    try{
        const{response,data}=
            await window.PrimeWaySecretaria.requestJson(
                SAVE_URL,
                {
                    action:"assign",
                    studentId:student.id,
                    classId
                }
            );

        if(!response.ok||!data?.success){
            throw new Error(
                data?.message||
                "Não foi possível atualizar a matrícula."
            );
        }

        window.PrimeWayFeedback?.success(
            data.message||
            "Matrícula atualizada."
        );

        closeDialog();
        await load();

    }catch(error){
        console.error(
            "Erro ao atualizar matrícula:",
            error
        );

        window.PrimeWayFeedback?.error(
            error?.message||
            "Não foi possível atualizar a matrícula."
        );

    }finally{
        saveButton.disabled=false;
    }
}

async function removeEnrollment(){
    const student=selectedStudent;

    if(
        !student
        ||
        !student.currentEnrollment
    ){
        return;
    }

    const current=
        student.currentEnrollment;

    const confirmed=
        await window.PrimeWayConfirm?.danger?.(
            `Remover ${student.name} da turma ${current.className}? O histórico da matrícula será preservado.`,
            {
                title:"Remover matrícula ativa",
                confirmText:"Remover"
            }
        );

    if(confirmed!==true)return;

    removeButton.disabled=true;

    try{
        const{response,data}=
            await window.PrimeWaySecretaria.requestJson(
                SAVE_URL,
                {
                    action:"remove",
                    studentId:student.id,
                    classId:current.classId
                }
            );

        if(!response.ok||!data?.success){
            throw new Error(
                data?.message||
                "Não foi possível remover a matrícula."
            );
        }

        window.PrimeWayFeedback?.success(
            data.message||
            "Matrícula removida."
        );

        closeDialog();
        await load();

    }catch(error){
        window.PrimeWayFeedback?.error(
            error?.message||
            "Não foi possível remover a matrícula."
        );

    }finally{
        removeButton.disabled=false;
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
            "Não foi possível carregar as matrículas."
        );
    }

    students=Array.isArray(data.students)
        ?data.students
        :[];

    classes=Array.isArray(data.classes)
        ?data.classes
        :[];

    setSummary("#summaryStudents",data.summary?.students);
    setSummary("#summaryEnrolled",data.summary?.enrolled);
    setSummary("#summaryWithout",data.summary?.withoutClass);
    setSummary("#summaryClasses",data.summary?.activeClasses);

    document.querySelector("#schoolYearLabel").textContent=
        String(data.schoolYear?.year??"—");

    fillClassFilters();
    render();
}

search.addEventListener("input",render);
classFilter.addEventListener("change",render);
statusFilter.addEventListener("change",render);

dialogClose.addEventListener("click",closeDialog);
cancelButton.addEventListener("click",closeDialog);
form.addEventListener("submit",saveEnrollment);
removeButton.addEventListener("click",removeEnrollment);

try{
    await load();
}catch(error){
    console.error(error);

    window.PrimeWayFeedback?.error(
        error?.message||
        "Não foi possível carregar as matrículas."
    );
}

});
