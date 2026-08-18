console.log("ALUNOS JS CARREGADO");

document.addEventListener("DOMContentLoaded", function () {

    /*====================================================
                    STORAGE
    ====================================================*/

    const STORAGE_KEY =
        "primewayStudents";

    const CLASSES_STORAGE_KEY =
        "primewayClasses";


    /*====================================================
                    ELEMENTOS
    ====================================================*/

    const tableBody =
        document.querySelector("#studentsTableBody");

    const emptyState =
        document.querySelector("#studentsEmpty");

    const searchInput =
        document.querySelector("#studentSearch");

    const classFilter =
        document.querySelector("#classFilter");

    const statusFilter =
        document.querySelector("#statusFilter");


    const newStudentButton =
        document.querySelector("#newStudentButton");


    /* CARDS */

    const totalStudents =
        document.querySelector("#totalStudents");

    const activeStudents =
        document.querySelector("#activeStudents");

    const newStudents =
        document.querySelector("#newStudents");

    const pendingStudents =
        document.querySelector("#pendingStudents");


    /* FORM */

    const studentModal =
        document.querySelector("#studentModal");

    const studentModalOverlay =
        document.querySelector(".student-modal-overlay");

    const studentModalClose =
        document.querySelector("#studentModalClose");

    const studentCancelButton =
        document.querySelector("#studentCancelButton");

    const studentModalTitle =
        document.querySelector("#studentModalTitle");

    const studentForm =
        document.querySelector("#studentForm");


    const studentId =
        document.querySelector("#studentId");

    const studentName =
        document.querySelector("#studentName");

    const studentRegistration =
        document.querySelector("#studentRegistration");

    const studentClass =
        document.querySelector("#studentClass");

    const studentAverage =
        document.querySelector("#studentAverage");

    const studentAttendance =
        document.querySelector("#studentAttendance");

    const studentStatus =
        document.querySelector("#studentStatus");


    /* VISUALIZAR */

    const studentViewModal =
        document.querySelector("#studentViewModal");

    const studentViewOverlay =
        document.querySelector(".student-view-overlay");

    const studentViewClose =
        document.querySelector("#studentViewClose");

    const viewStudentName =
        document.querySelector("#viewStudentName");

    const viewStudentRegistration =
        document.querySelector("#viewStudentRegistration");

    const viewStudentClass =
        document.querySelector("#viewStudentClass");

    const viewStudentAverage =
        document.querySelector("#viewStudentAverage");

    const viewStudentAttendance =
        document.querySelector("#viewStudentAttendance");

    const viewStudentStatus =
        document.querySelector("#viewStudentStatus");


    /* EXCLUSÃO */

    const deleteStudentModal =
        document.querySelector("#deleteStudentModal");

    const deleteStudentOverlay =
        document.querySelector(".delete-student-overlay");

    const deleteStudentCancel =
        document.querySelector("#deleteStudentCancel");

    const deleteStudentConfirm =
        document.querySelector("#deleteStudentConfirm");

    const deleteStudentMessage =
        document.querySelector("#deleteStudentMessage");


    const logoutButton =
        document.querySelector("#logoutButton");


    /*====================================================
                    DADOS PADRÃO
    ====================================================*/

    const defaultStudents = [

        {
            id: 1,
            name: "Ana Carolina Martins",
            registration: "PW2026001",
            className: "1º Ano A",
            average: 9.1,
            attendance: 97,
            status: "Ativo",
            newStudent: true
        },

        {
            id: 2,
            name: "Bruno Henrique Souza",
            registration: "PW2026002",
            className: "1º Ano A",
            average: 8.4,
            attendance: 94,
            status: "Ativo",
            newStudent: false
        },

        {
            id: 3,
            name: "Camila Ferreira Lima",
            registration: "PW2026003",
            className: "2º Ano B",
            average: 7.7,
            attendance: 89,
            status: "Ativo",
            newStudent: false
        },

        {
            id: 4,
            name: "Daniel Oliveira Costa",
            registration: "PW2026004",
            className: "2º Ano B",
            average: 6.8,
            attendance: 82,
            status: "Pendente",
            newStudent: false
        },

        {
            id: 5,
            name: "Eduarda Ribeiro Alves",
            registration: "PW2026005",
            className: "3º Ano A",
            average: 9.4,
            attendance: 98,
            status: "Ativo",
            newStudent: true
        },

        {
            id: 6,
            name: "Felipe Gomes Santos",
            registration: "PW2026006",
            className: "3º Ano A",
            average: 7.9,
            attendance: 91,
            status: "Ativo",
            newStudent: false
        },

        {
            id: 7,
            name: "Gabriela Mendes Rocha",
            registration: "PW2026007",
            className: "4º Ano B",
            average: 8.8,
            attendance: 95,
            status: "Ativo",
            newStudent: true
        },

        {
            id: 8,
            name: "Henrique Barbosa Melo",
            registration: "PW2026008",
            className: "4º Ano B",
            average: 6.3,
            attendance: 78,
            status: "Pendente",
            newStudent: false
        }

    ];


    let students =
        carregarAlunos();

    let studentToDelete =
        null;


    /*====================================================
                    COMPATIBILIDADE
    ====================================================*/

    function obterTurmaAluno(
        aluno
    ) {

        return (
            aluno.className ||
            aluno.class ||
            aluno.turma ||
            ""
        );

    }


    function normalizarAluno(
        aluno
    ) {

        if (!aluno.className) {

            aluno.className =
                obterTurmaAluno(
                    aluno
                );

        }

        delete aluno.class;
        delete aluno.turma;

        return aluno;

    }


    /*====================================================
                    STORAGE
    ====================================================*/

    function carregarAlunos() {

        try {

            const saved =
                localStorage.getItem(
                    STORAGE_KEY
                );


            if (!saved) {

                return JSON.parse(
                    JSON.stringify(
                        defaultStudents
                    )
                );

            }


            const dados =
                JSON.parse(saved);


            if (!Array.isArray(dados)) {

                return JSON.parse(
                    JSON.stringify(
                        defaultStudents
                    )
                );

            }


            const normalizados =
                dados.map(
                    normalizarAluno
                );


            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(
                    normalizados
                )
            );


            return normalizados;

        } catch (erro) {

            console.warn(
                "Erro ao carregar alunos:",
                erro
            );


            return JSON.parse(
                JSON.stringify(
                    defaultStudents
                )
            );

        }

    }


    function salvarAlunos() {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(
                students
            )
        );

    }


    /*====================================================
                    TURMAS
    ====================================================*/

    function carregarTurmas() {

        try {

            const saved =
                localStorage.getItem(
                    CLASSES_STORAGE_KEY
                );


            if (!saved) {

                return [
                    {
                        name: "1º Ano A",
                        status: "Ativa"
                    },
                    {
                        name: "2º Ano B",
                        status: "Ativa"
                    },
                    {
                        name: "3º Ano A",
                        status: "Ativa"
                    },
                    {
                        name: "4º Ano B",
                        status: "Ativa"
                    }
                ];

            }


            const turmas =
                JSON.parse(saved);


            return Array.isArray(turmas)
                ? turmas
                : [];

        } catch (erro) {

            console.warn(
                "Erro ao carregar turmas:",
                erro
            );

            return [];

        }

    }


    function preencherSelectTurmas(
        turmaAtual = ""
    ) {

        if (!studentClass) {

            return;

        }


        const turmas =
            carregarTurmas()
                .filter(
                    turma =>
                        turma.status === "Ativa"
                );


        studentClass.innerHTML = `

            <option value="">
                Selecione uma turma
            </option>

        `;


        turmas.forEach(
            function (turma) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    turma.name;

                option.textContent =
                    turma.name;

                studentClass.appendChild(
                    option
                );

            }
        );


        /*
         * Se aluno estiver numa turma que foi
         * inativada, continua mostrando para edição.
         */

        if (
            turmaAtual &&
            !turmas.some(
                turma =>
                    turma.name ===
                    turmaAtual
            )
        ) {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                turmaAtual;

            option.textContent =
                `${turmaAtual} (inativa)`;

            studentClass.appendChild(
                option
            );

        }


        studentClass.value =
            turmaAtual;

    }


    function preencherFiltroTurmas() {

        if (!classFilter) {

            return;

        }


        const atual =
            classFilter.value;


        const turmas =
            carregarTurmas();


        classFilter.innerHTML = `

            <option value="">
                Todas as turmas
            </option>

        `;


        turmas.forEach(
            function (turma) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    turma.name;

                option.textContent =
                    turma.name;

                classFilter.appendChild(
                    option
                );

            }
        );


        if (
            turmas.some(
                turma =>
                    turma.name === atual
            )
        ) {

            classFilter.value =
                atual;

        }

    }


    /*====================================================
                    ESCAPE HTML
    ====================================================*/

    function escapeHtml(
        value
    ) {

        return String(value ?? "")
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

        totalStudents.textContent =
            students.length;


        activeStudents.textContent =
            students.filter(
                student =>
                    student.status ===
                    "Ativo"
            ).length;


        newStudents.textContent =
            students.filter(
                student =>
                    student.newStudent
            ).length;


        pendingStudents.textContent =
            students.filter(
                student =>
                    student.status ===
                    "Pendente"
            ).length;

    }


    /*====================================================
                    FILTROS
    ====================================================*/

    function pegarAlunosFiltrados() {

        const termo =
            searchInput.value
                .trim()
                .toLowerCase();

        const turma =
            classFilter.value;

        const status =
            statusFilter.value;


        return students.filter(
            function (student) {

                const texto =
                    [
                        student.name,
                        student.registration,
                        student.className
                    ]
                        .join(" ")
                        .toLowerCase();


                return (
                    texto.includes(termo) &&
                    (
                        !turma ||
                        student.className ===
                        turma
                    ) &&
                    (
                        !status ||
                        student.status ===
                        status
                    )
                );

            }
        );

    }


    /*====================================================
                    RENDER
    ====================================================*/

    function renderStudents() {

        tableBody.innerHTML =
            "";


        const filtrados =
            pegarAlunosFiltrados();


        emptyState.classList.toggle(
            "active",
            filtrados.length === 0
        );


        filtrados.forEach(
            function (student) {

                const statusClass =
                    student.status ===
                    "Ativo"
                        ? "active"
                        : "pending";


                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>

                        <div class="student-cell">

                            <div class="student-avatar">

                                <i class="fa-solid fa-user-graduate"></i>

                            </div>

                            <strong>
                                ${escapeHtml(student.name)}
                            </strong>

                        </div>

                    </td>

                    <td>
                        ${escapeHtml(student.registration)}
                    </td>

                    <td>
                        ${
                            student.className
                                ? escapeHtml(student.className)
                                : "Sem turma"
                        }
                    </td>

                    <td>
                        ${Number(student.average).toFixed(1)}
                    </td>

                    <td>
                        ${Number(student.attendance)}%
                    </td>

                    <td>

                        <span class="status-badge ${statusClass}">
                            ${escapeHtml(student.status)}
                        </span>

                    </td>

                    <td>

                        <div class="student-actions-buttons">

                            <button
                                type="button"
                                class="student-action-button"
                                data-action="view"
                                data-id="${student.id}"
                                title="Visualizar"
                            >
                                <i class="fa-solid fa-eye"></i>
                            </button>

                            <button
                                type="button"
                                class="student-action-button"
                                data-action="edit"
                                data-id="${student.id}"
                                title="Editar"
                            >
                                <i class="fa-solid fa-pen"></i>
                            </button>

                            <button
                                type="button"
                                class="student-action-button delete"
                                data-action="delete"
                                data-id="${student.id}"
                                title="Excluir"
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
                    MODAL
    ====================================================*/

    function abrirModalAluno(
        student = null
    ) {

        studentForm.reset();


        if (student) {

            studentModalTitle.textContent =
                "Editar aluno";

            studentId.value =
                student.id;

            studentName.value =
                student.name;

            studentRegistration.value =
                student.registration;

            preencherSelectTurmas(
                student.className
            );

            studentAverage.value =
                student.average;

            studentAttendance.value =
                student.attendance;

            studentStatus.value =
                student.status;

        } else {

            studentModalTitle.textContent =
                "Novo aluno";

            studentId.value =
                "";

            preencherSelectTurmas();

            studentAverage.value =
                0;

            studentAttendance.value =
                100;

            studentStatus.value =
                "Ativo";

        }


        abrirModal(
            studentModal
        );

        studentName.focus();

    }


    /*====================================================
                    SALVAR
    ====================================================*/

    studentForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const id =
                studentId.value
                    ? Number(
                        studentId.value
                    )
                    : Date.now();


            /*
             * Evita matrícula duplicada.
             */

            const matricula =
                studentRegistration.value
                    .trim();


            const duplicada =
                students.some(
                    function (student) {

                        return (
                            student.id !== id &&
                            student.registration
                                .trim()
                                .toLowerCase() ===
                            matricula.toLowerCase()
                        );

                    }
                );


            if (duplicada) {

                studentRegistration.setCustomValidity(
                    "Esta matrícula já está cadastrada."
                );

                studentRegistration.reportValidity();

                return;

            }


            studentRegistration.setCustomValidity(
                ""
            );


            const existente =
                students.find(
                    student =>
                        student.id === id
                );


            const dados = {

                id,

                name:
                    studentName.value.trim(),

                registration:
                    matricula,

                className:
                    studentClass.value,

                average:
                    Number(
                        studentAverage.value
                    ),

                attendance:
                    Number(
                        studentAttendance.value
                    ),

                status:
                    studentStatus.value,

                newStudent:
                    existente
                        ? Boolean(
                            existente.newStudent
                        )
                        : true

            };


            const index =
                students.findIndex(
                    student =>
                        student.id === id
                );


            if (index >= 0) {

                students[index] =
                    dados;

            } else {

                students.unshift(
                    dados
                );

            }


            salvarAlunos();

            preencherFiltroTurmas();

            renderStudents();

            fecharModal(
                studentModal
            );

        }
    );


    /*====================================================
                    VISUALIZAR
    ====================================================*/

    function abrirVisualizacao(
        student
    ) {

        viewStudentName.textContent =
            student.name;

        viewStudentRegistration.textContent =
            student.registration;

        viewStudentClass.textContent =
            student.className ||
            "Sem turma";

        viewStudentAverage.textContent =
            Number(student.average)
                .toFixed(1);

        viewStudentAttendance.textContent =
            `${student.attendance}%`;

        viewStudentStatus.textContent =
            student.status;


        abrirModal(
            studentViewModal
        );

    }


    /*====================================================
                    EXCLUIR
    ====================================================*/

    function abrirExclusao(
        student
    ) {

        studentToDelete =
            student.id;

        deleteStudentMessage.textContent =
            `Deseja realmente excluir "${student.name}"?`;

        abrirModal(
            deleteStudentModal
        );

    }


    deleteStudentConfirm.addEventListener(
        "click",
        function () {

            if (
                studentToDelete ===
                null
            ) {

                return;

            }


            students =
                students.filter(
                    student =>
                        student.id !==
                        studentToDelete
                );


            salvarAlunos();

            studentToDelete =
                null;

            renderStudents();

            fecharModal(
                deleteStudentModal
            );

        }
    );


    /*====================================================
                    AÇÕES TABELA
    ====================================================*/

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


            const student =
                students.find(
                    item =>
                        Number(item.id) ===
                        Number(button.dataset.id)
                );


            if (!student) {

                return;

            }


            switch (
                button.dataset.action
            ) {

                case "view":

                    abrirVisualizacao(
                        student
                    );

                    break;


                case "edit":

                    abrirModalAluno(
                        student
                    );

                    break;


                case "delete":

                    abrirExclusao(
                        student
                    );

                    break;

            }

        }
    );


    /*====================================================
                    MODAIS
    ====================================================*/

    function abrirModal(
        modal
    ) {

        modal.classList.add(
            "active"
        );

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );

    }


    function fecharModal(
        modal
    ) {

        modal.classList.remove(
            "active"
        );

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "modal-open"
        );

    }


    /*====================================================
                    EVENTOS
    ====================================================*/

    newStudentButton.addEventListener(
        "click",
        function () {

            abrirModalAluno();

        }
    );


    searchInput.addEventListener(
        "input",
        renderStudents
    );


    classFilter.addEventListener(
        "change",
        renderStudents
    );


    statusFilter.addEventListener(
        "change",
        renderStudents
    );


    studentModalClose.addEventListener(
        "click",
        () =>
            fecharModal(
                studentModal
            )
    );


    studentCancelButton.addEventListener(
        "click",
        () =>
            fecharModal(
                studentModal
            )
    );


    studentModalOverlay.addEventListener(
        "click",
        () =>
            fecharModal(
                studentModal
            )
    );


    studentViewClose.addEventListener(
        "click",
        () =>
            fecharModal(
                studentViewModal
            )
    );


    studentViewOverlay.addEventListener(
        "click",
        () =>
            fecharModal(
                studentViewModal
            )
    );


    deleteStudentCancel.addEventListener(
        "click",
        function () {

            studentToDelete =
                null;

            fecharModal(
                deleteStudentModal
            );

        }
    );


    deleteStudentOverlay.addEventListener(
        "click",
        function () {

            studentToDelete =
                null;

            fecharModal(
                deleteStudentModal
            );

        }
    );


    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key !== "Escape"
            ) {

                return;

            }


            [
                studentModal,
                studentViewModal,
                deleteStudentModal
            ].forEach(
                function (modal) {

                    if (
                        modal.classList.contains(
                            "active"
                        )
                    ) {

                        fecharModal(
                            modal
                        );

                    }

                }
            );

        }
    );


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

    salvarAlunos();

    preencherFiltroTurmas();

    renderStudents();

});