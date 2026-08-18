console.log("DISCIPLINAS JS CARREGADO");

document.addEventListener("DOMContentLoaded", function () {

    /*====================================================
                    ELEMENTOS
    ====================================================*/

    const tableBody =
        document.querySelector("#subjectsTableBody");

    const emptyState =
        document.querySelector("#subjectsEmpty");

    const searchInput =
        document.querySelector("#subjectSearch");

    const areaFilter =
        document.querySelector("#areaFilter");

    const statusFilter =
        document.querySelector("#statusFilter");

    const newSubjectButton =
        document.querySelector("#newSubjectButton");


    /* CARDS */

    const totalSubjects =
        document.querySelector("#totalSubjects");

    const activeSubjects =
        document.querySelector("#activeSubjects");

    const totalHours =
        document.querySelector("#totalHours");

    const linkedClasses =
        document.querySelector("#linkedClasses");


    /* MODAL */

    const subjectModal =
        document.querySelector("#subjectModal");

    const subjectModalOverlay =
        document.querySelector(".subject-modal-overlay");

    const subjectModalClose =
        document.querySelector("#subjectModalClose");

    const subjectCancelButton =
        document.querySelector("#subjectCancelButton");

    const subjectModalTitle =
        document.querySelector("#subjectModalTitle");

    const subjectForm =
        document.querySelector("#subjectForm");


    /* CAMPOS */

    const subjectId =
        document.querySelector("#subjectId");

    const subjectName =
        document.querySelector("#subjectName");

    const subjectCode =
        document.querySelector("#subjectCode");

    const subjectArea =
        document.querySelector("#subjectArea");

    const subjectHours =
        document.querySelector("#subjectHours");

    const subjectTeacher =
        document.querySelector("#subjectTeacher");

    const subjectClass =
        document.querySelector("#subjectClass");

    const subjectStatus =
        document.querySelector("#subjectStatus");


    /* VISUALIZAÇÃO */

    const subjectViewModal =
        document.querySelector("#subjectViewModal");

    const subjectViewOverlay =
        document.querySelector(".subject-view-overlay");

    const subjectViewClose =
        document.querySelector("#subjectViewClose");

    const viewSubjectName =
        document.querySelector("#viewSubjectName");

    const viewSubjectCode =
        document.querySelector("#viewSubjectCode");

    const viewSubjectArea =
        document.querySelector("#viewSubjectArea");

    const viewSubjectTeacher =
        document.querySelector("#viewSubjectTeacher");

    const viewSubjectClass =
        document.querySelector("#viewSubjectClass");

    const viewSubjectHours =
        document.querySelector("#viewSubjectHours");

    const viewSubjectStatus =
        document.querySelector("#viewSubjectStatus");


    /* EXCLUSÃO */

    const deleteSubjectModal =
        document.querySelector("#deleteSubjectModal");

    const deleteSubjectOverlay =
        document.querySelector(".delete-subject-overlay");

    const deleteSubjectCancel =
        document.querySelector("#deleteSubjectCancel");

    const deleteSubjectConfirm =
        document.querySelector("#deleteSubjectConfirm");

    const deleteSubjectMessage =
        document.querySelector("#deleteSubjectMessage");


    const logoutButton =
        document.querySelector("#logoutButton");


    /*====================================================
                    STORAGE
    ====================================================*/

    const SUBJECTS_STORAGE_KEY =
        "primewaySubjects";

    const CLASSES_STORAGE_KEY =
        "primewayClasses";


    /*====================================================
                DADOS INICIAIS
    ====================================================*/

    const defaultSubjects = [

        {
            id: 1,
            name: "Matemática",
            code: "MAT01",
            area: "Matemática",
            teacher: "Marcos Almeida",
            className: "1º Ano A",
            hours: 160,
            status: "Ativa"
        },

        {
            id: 2,
            name: "Língua Portuguesa",
            code: "POR01",
            area: "Linguagens",
            teacher: "Juliana Costa",
            className: "2º Ano B",
            hours: 160,
            status: "Ativa"
        },

        {
            id: 3,
            name: "Ciências",
            code: "CIE01",
            area: "Ciências da Natureza",
            teacher: "Ricardo Lima",
            className: "3º Ano A",
            hours: 120,
            status: "Ativa"
        },

        {
            id: 4,
            name: "História",
            code: "HIS01",
            area: "Ciências Humanas",
            teacher: "Fernanda Alves",
            className: "4º Ano B",
            hours: 100,
            status: "Ativa"
        },

        {
            id: 5,
            name: "Arte",
            code: "ART01",
            area: "Artes",
            teacher: "Patrícia Souza",
            className: "1º Ano A",
            hours: 80,
            status: "Ativa"
        }

    ];


    let subjects =
        carregarDisciplinas();


    let subjectToDelete =
        null;


    /*====================================================
                    STORAGE
    ====================================================*/

    function salvarDisciplinas() {

        try {

            localStorage.setItem(
                SUBJECTS_STORAGE_KEY,
                JSON.stringify(subjects)
            );

        } catch (erro) {

            console.warn(
                "Erro ao salvar disciplinas:",
                erro
            );

        }

    }


    function carregarDisciplinas() {

        try {

            const saved =
                localStorage.getItem(
                    SUBJECTS_STORAGE_KEY
                );


            if (!saved) {

                return JSON.parse(
                    JSON.stringify(defaultSubjects)
                );

            }


            return JSON.parse(saved);

        } catch (erro) {

            console.warn(
                "Erro ao carregar disciplinas:",
                erro
            );


            return JSON.parse(
                JSON.stringify(defaultSubjects)
            );

        }

    }


    /*====================================================
                    CARREGAR TURMAS
    ====================================================*/

    function carregarTurmas() {

        const saved =
            localStorage.getItem(
                CLASSES_STORAGE_KEY
            );


        if (!saved) {

            return [
                "1º Ano A",
                "2º Ano B",
                "3º Ano A",
                "4º Ano B"
            ];

        }


        try {

            const classes =
                JSON.parse(saved);


            return classes.map(
                function (item) {

                    return item.name;

                }
            );

        } catch (erro) {

            console.warn(
                "Erro ao carregar turmas:",
                erro
            );

            return [];

        }

    }


    function preencherSelectTurmas() {

        if (!subjectClass) {

            return;

        }


        const turmas =
            carregarTurmas();


        subjectClass.innerHTML =
            `
                <option value="">
                    Selecione uma turma
                </option>
            `;


        turmas.forEach(
            function (nome) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    nome;


                option.textContent =
                    nome;


                subjectClass.appendChild(
                    option
                );

            }
        );

    }


    /*====================================================
                    SEGURANÇA HTML
    ====================================================*/

    function escapeHtml(value) {

        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    }


    /*====================================================
                    RESUMO
    ====================================================*/

    function atualizarResumo() {

        const total =
            subjects.length;


        const ativas =
            subjects.filter(
                item =>
                    item.status ===
                    "Ativa"
            ).length;


        const horas =
            subjects.reduce(
                function (
                    totalAtual,
                    item
                ) {

                    return (
                        totalAtual +
                        Number(item.hours)
                    );

                },
                0
            );


        const turmasVinculadas =
            new Set(
                subjects
                    .filter(
                        item =>
                            item.className
                    )
                    .map(
                        item =>
                            item.className
                    )
            ).size;


        if (totalSubjects) {

            totalSubjects.textContent =
                total;

        }


        if (activeSubjects) {

            activeSubjects.textContent =
                ativas;

        }


        if (totalHours) {

            totalHours.textContent =
                `${horas}h`;

        }


        if (linkedClasses) {

            linkedClasses.textContent =
                turmasVinculadas;

        }

    }


    /*====================================================
                    FILTROS
    ====================================================*/

    function pegarDisciplinasFiltradas() {

        const termo =
            searchInput
                ? searchInput
                    .value
                    .toLowerCase()
                    .trim()
                : "";


        const area =
            areaFilter
                ? areaFilter.value
                : "";


        const status =
            statusFilter
                ? statusFilter.value
                : "";


        return subjects.filter(
            function (item) {

                const texto =
                    (
                        item.name +
                        " " +
                        item.code +
                        " " +
                        item.teacher +
                        " " +
                        item.className
                    )
                        .toLowerCase();


                const matchSearch =
                    texto.includes(
                        termo
                    );


                const matchArea =
                    area === "" ||
                    item.area === area;


                const matchStatus =
                    status === "" ||
                    item.status === status;


                return (
                    matchSearch &&
                    matchArea &&
                    matchStatus
                );

            }
        );

    }


    /*====================================================
                    RENDERIZAR
    ====================================================*/

    function renderSubjects() {

        if (!tableBody) {

            return;

        }


        const filtered =
            pegarDisciplinasFiltradas();


        tableBody.innerHTML =
            "";


        if (emptyState) {

            emptyState.classList.toggle(
                "active",
                filtered.length === 0
            );

        }


        filtered.forEach(
            function (item) {

                const row =
                    document.createElement(
                        "tr"
                    );


                const statusClass =
                    item.status ===
                    "Ativa"
                        ? "active"
                        : "inactive";


                row.innerHTML = `

                    <td>

                        <div class="subject-cell">

                            <div class="subject-avatar">

                                <i class="fa-solid fa-book-open"></i>

                            </div>

                            <strong>
                                ${escapeHtml(item.name)}
                            </strong>

                        </div>

                    </td>


                    <td>
                        ${escapeHtml(item.code)}
                    </td>


                    <td>
                        ${escapeHtml(item.area)}
                    </td>


                    <td>
                        ${escapeHtml(item.teacher)}
                    </td>


                    <td>
                        ${escapeHtml(item.className)}
                    </td>


                    <td>
                        ${Number(item.hours)}h
                    </td>


                    <td>

                        <span class="status-badge ${statusClass}">
                            ${escapeHtml(item.status)}
                        </span>

                    </td>


                    <td>

                        <div class="subject-actions-buttons">


                            <button
                                type="button"
                                class="subject-action-button"
                                data-action="view"
                                data-id="${item.id}"
                                aria-label="Visualizar disciplina"
                            >

                                <i class="fa-solid fa-eye"></i>

                            </button>


                            <button
                                type="button"
                                class="subject-action-button"
                                data-action="edit"
                                data-id="${item.id}"
                                aria-label="Editar disciplina"
                            >

                                <i class="fa-solid fa-pen"></i>

                            </button>


                            <button
                                type="button"
                                class="subject-action-button delete"
                                data-action="delete"
                                data-id="${item.id}"
                                aria-label="Excluir disciplina"
                            >

                                <i class="fa-solid fa-trash"></i>

                            </button>


                        </div>

                    </td>

                `;


                tableBody.appendChild(
                    row
                );

            }
        );


        atualizarResumo();

    }


    /*====================================================
                    ABRIR MODAL
    ====================================================*/

    function abrirModalDisciplina(
        item = null
    ) {

        if (!subjectModal) {

            return;

        }


        subjectForm.reset();


        preencherSelectTurmas();


        if (item) {

            subjectModalTitle.textContent =
                "Editar disciplina";


            subjectId.value =
                item.id;


            subjectName.value =
                item.name;


            subjectCode.value =
                item.code;


            subjectArea.value =
                item.area;


            subjectHours.value =
                item.hours;


            subjectTeacher.value =
                item.teacher;


            subjectClass.value =
                item.className;


            subjectStatus.value =
                item.status;

        } else {

            subjectModalTitle.textContent =
                "Nova disciplina";


            subjectId.value =
                "";


            subjectStatus.value =
                "Ativa";

        }


        subjectModal.classList.add(
            "active"
        );


        subjectModal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.classList.add(
            "modal-open"
        );


        subjectName.focus();

    }


    function fecharModalDisciplina() {

        if (!subjectModal) {

            return;

        }


        subjectModal.classList.remove(
            "active"
        );


        subjectModal.setAttribute(
            "aria-hidden",
            "true"
        );


        document.body.classList.remove(
            "modal-open"
        );

    }


    /*====================================================
                    SALVAR
    ====================================================*/

    if (subjectForm) {

        subjectForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();


                const id =
                    subjectId.value
                        ? Number(
                            subjectId.value
                        )
                        : Date.now();


                const data = {

                    id:
                        id,

                    name:
                        subjectName
                            .value
                            .trim(),

                    code:
                        subjectCode
                            .value
                            .trim(),

                    area:
                        subjectArea.value,

                    teacher:
                        subjectTeacher
                            .value
                            .trim(),

                    className:
                        subjectClass.value,

                    hours:
                        Number(
                            subjectHours.value
                        ),

                    status:
                        subjectStatus.value

                };


                const index =
                    subjects.findIndex(
                        item =>
                            item.id === id
                    );


                if (index >= 0) {

                    subjects[index] =
                        data;

                } else {

                    subjects.unshift(
                        data
                    );

                }


                salvarDisciplinas();


                renderSubjects();


                fecharModalDisciplina();

            }
        );

    }


    /*====================================================
                    VISUALIZAÇÃO
    ====================================================*/

    function abrirVisualizacao(
        item
    ) {

        if (!subjectViewModal) {

            return;

        }


        viewSubjectName.textContent =
            item.name;


        viewSubjectCode.textContent =
            item.code;


        viewSubjectArea.textContent =
            item.area;


        viewSubjectTeacher.textContent =
            item.teacher;


        viewSubjectClass.textContent =
            item.className;


        viewSubjectHours.textContent =
            `${item.hours}h`;


        viewSubjectStatus.textContent =
            item.status;


        subjectViewModal.classList.add(
            "active"
        );


        subjectViewModal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.classList.add(
            "modal-open"
        );

    }


    function fecharVisualizacao() {

        if (!subjectViewModal) {

            return;

        }


        subjectViewModal.classList.remove(
            "active"
        );


        subjectViewModal.setAttribute(
            "aria-hidden",
            "true"
        );


        document.body.classList.remove(
            "modal-open"
        );

    }


    /*====================================================
                    EXCLUSÃO
    ====================================================*/

    function abrirModalExclusao(
        item
    ) {

        if (!deleteSubjectModal) {

            return;

        }


        subjectToDelete =
            item.id;


        deleteSubjectMessage.textContent =
            `Deseja realmente excluir a disciplina "${item.name}"?`;


        deleteSubjectModal.classList.add(
            "active"
        );


        deleteSubjectModal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.classList.add(
            "modal-open"
        );

    }


    function fecharModalExclusao() {

        if (!deleteSubjectModal) {

            return;

        }


        deleteSubjectModal.classList.remove(
            "active"
        );


        deleteSubjectModal.setAttribute(
            "aria-hidden",
            "true"
        );


        document.body.classList.remove(
            "modal-open"
        );


        subjectToDelete =
            null;

    }


    /*====================================================
                    AÇÕES DA TABELA
    ====================================================*/

    if (tableBody) {

        tableBody.addEventListener(
            "click",
            function (event) {

                const button =
                    event.target.closest(
                        "[data-action]"
                    );


                if (!button) {

                    return;

                }


                const id =
                    Number(
                        button.dataset.id
                    );


                const item =
                    subjects.find(
                        subject =>
                            subject.id === id
                    );


                if (!item) {

                    return;

                }


                const action =
                    button.dataset.action;


                if (action === "view") {

                    abrirVisualizacao(
                        item
                    );

                }


                if (action === "edit") {

                    abrirModalDisciplina(
                        item
                    );

                }


                if (action === "delete") {

                    abrirModalExclusao(
                        item
                    );

                }

            }
        );

    }


    /*====================================================
                    BOTÕES
    ====================================================*/

    if (newSubjectButton) {

        newSubjectButton.addEventListener(
            "click",
            function () {

                abrirModalDisciplina();

            }
        );

    }


    if (subjectModalClose) {

        subjectModalClose.addEventListener(
            "click",
            fecharModalDisciplina
        );

    }


    if (subjectCancelButton) {

        subjectCancelButton.addEventListener(
            "click",
            fecharModalDisciplina
        );

    }


    if (subjectModalOverlay) {

        subjectModalOverlay.addEventListener(
            "click",
            fecharModalDisciplina
        );

    }


    if (subjectViewClose) {

        subjectViewClose.addEventListener(
            "click",
            fecharVisualizacao
        );

    }


    if (subjectViewOverlay) {

        subjectViewOverlay.addEventListener(
            "click",
            fecharVisualizacao
        );

    }


    if (deleteSubjectCancel) {

        deleteSubjectCancel.addEventListener(
            "click",
            fecharModalExclusao
        );

    }


    if (deleteSubjectOverlay) {

        deleteSubjectOverlay.addEventListener(
            "click",
            fecharModalExclusao
        );

    }


    if (deleteSubjectConfirm) {

        deleteSubjectConfirm.addEventListener(
            "click",
            function () {

                if (
                    subjectToDelete ===
                    null
                ) {

                    return;

                }


                subjects =
                    subjects.filter(
                        item =>
                            item.id !==
                            subjectToDelete
                    );


                salvarDisciplinas();


                renderSubjects();


                fecharModalExclusao();

            }
        );

    }


    /*====================================================
                    FILTROS
    ====================================================*/

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            renderSubjects
        );

    }


    if (areaFilter) {

        areaFilter.addEventListener(
            "change",
            renderSubjects
        );

    }


    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            renderSubjects
        );

    }


    /*====================================================
                    ESC
    ====================================================*/

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key !==
                "Escape"
            ) {

                return;

            }


            fecharModalDisciplina();

            fecharVisualizacao();

            fecharModalExclusao();

        }
    );


    /*====================================================
                    LOGOUT
    ====================================================*/

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            function () {

                sessionStorage.removeItem(
                    "primewayLogado"
                );


                sessionStorage.removeItem(
                    "primewayUsuario"
                );


                window.location.href =
                    "login.html";

            }
        );

    }


    /*====================================================
                    INICIALIZAÇÃO
    ====================================================*/

    preencherSelectTurmas();

    renderSubjects();

});