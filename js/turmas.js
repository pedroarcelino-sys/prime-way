console.log("TURMAS JS CARREGADO");

document.addEventListener("DOMContentLoaded", function () {

    /*====================================================
                    STORAGE
    ====================================================*/

    const CLASSES_STORAGE_KEY =
        "primewayClasses";

    const STUDENTS_STORAGE_KEY =
        "primewayStudents";

    const SUBJECTS_STORAGE_KEY =
        "primewaySubjects";


    /*====================================================
                    ELEMENTOS
    ====================================================*/

    const tableBody =
        document.querySelector("#classesTableBody");

    const emptyState =
        document.querySelector("#classesEmpty");

    const searchInput =
        document.querySelector("#classSearch");

    const shiftFilter =
        document.querySelector("#shiftFilter");

    const statusFilter =
        document.querySelector("#statusFilter");


    const totalClasses =
        document.querySelector("#totalClasses");

    const activeClasses =
        document.querySelector("#activeClasses");

    const enrolledStudents =
        document.querySelector("#enrolledStudents");

    const availableSeats =
        document.querySelector("#availableSeats");


    /* TURMA */

    const newClassButton =
        document.querySelector("#newClassButton");

    const classModal =
        document.querySelector("#classModal");

    const classModalOverlay =
        document.querySelector(".class-modal-overlay");

    const classModalClose =
        document.querySelector("#classModalClose");

    const classCancelButton =
        document.querySelector("#classCancelButton");

    const classModalTitle =
        document.querySelector("#classModalTitle");

    const classForm =
        document.querySelector("#classForm");

    const classId =
        document.querySelector("#classId");

    const className =
        document.querySelector("#className");

    const classGrade =
        document.querySelector("#classGrade");

    const classShift =
        document.querySelector("#classShift");

    const classRoom =
        document.querySelector("#classRoom");

    const classTeacher =
        document.querySelector("#classTeacher");

    const classYear =
        document.querySelector("#classYear");

    const classCapacity =
        document.querySelector("#classCapacity");

    const classStudents =
        document.querySelector("#classStudents");

    const classStatus =
        document.querySelector("#classStatus");

    const capacityWarning =
        document.querySelector("#capacityWarning");

    const duplicateClassWarning =
        document.querySelector("#duplicateClassWarning");


    /* VISUALIZAÇÃO */

    const classViewModal =
        document.querySelector("#classViewModal");

    const classViewOverlay =
        document.querySelector(".class-view-overlay");

    const classViewClose =
        document.querySelector("#classViewClose");

    const viewClassName =
        document.querySelector("#viewClassName");

    const viewClassGrade =
        document.querySelector("#viewClassGrade");

    const viewClassShift =
        document.querySelector("#viewClassShift");

    const viewClassTeacher =
        document.querySelector("#viewClassTeacher");

    const viewClassRoom =
        document.querySelector("#viewClassRoom");

    const viewClassStudents =
        document.querySelector("#viewClassStudents");

    const viewClassYear =
        document.querySelector("#viewClassYear");

    const viewClassStatus =
        document.querySelector("#viewClassStatus");


    /* GERENCIAMENTO DE ALUNOS */

    const studentsManagerModal =
        document.querySelector("#studentsManagerModal");

    const studentsManagerOverlay =
        document.querySelector(".students-manager-overlay");

    const studentsManagerClose =
        document.querySelector("#studentsManagerClose");

    const managerClassName =
        document.querySelector("#managerClassName");

    const managerCapacityText =
        document.querySelector("#managerCapacityText");

    const managerCapacityBar =
        document.querySelector("#managerCapacityBar");

    const linkedStudentsCounter =
        document.querySelector("#linkedStudentsCounter");

    const linkedStudentsList =
        document.querySelector("#linkedStudentsList");

    const availableStudentsList =
        document.querySelector("#availableStudentsList");

    const linkedStudentsEmpty =
        document.querySelector("#linkedStudentsEmpty");

    const availableStudentsEmpty =
        document.querySelector("#availableStudentsEmpty");

    const managerStudentSearch =
        document.querySelector("#managerStudentSearch");


    /* EXCLUSÃO */

    const deleteClassModal =
        document.querySelector("#deleteClassModal");

    const deleteClassOverlay =
        document.querySelector(".delete-class-overlay");

    const deleteClassCancel =
        document.querySelector("#deleteClassCancel");

    const deleteClassConfirm =
        document.querySelector("#deleteClassConfirm");

    const deleteClassMessage =
        document.querySelector("#deleteClassMessage");


    const logoutButton =
        document.querySelector("#logoutButton");


    /*====================================================
                    DADOS PADRÃO
    ====================================================*/

    const defaultClasses = [

        {
            id: 1,
            name: "1º Ano A",
            grade: "1º Ano",
            shift: "Manhã",
            room: "Sala 01",
            teacher: "Marcos Almeida",
            capacity: 30,
            schoolYear: 2026,
            status: "Ativa"
        },

        {
            id: 2,
            name: "2º Ano B",
            grade: "2º Ano",
            shift: "Manhã",
            room: "Sala 04",
            teacher: "Juliana Costa",
            capacity: 30,
            schoolYear: 2026,
            status: "Ativa"
        },

        {
            id: 3,
            name: "3º Ano A",
            grade: "3º Ano",
            shift: "Tarde",
            room: "Sala 07",
            teacher: "Ricardo Lima",
            capacity: 35,
            schoolYear: 2026,
            status: "Ativa"
        },

        {
            id: 4,
            name: "4º Ano B",
            grade: "4º Ano",
            shift: "Tarde",
            room: "Sala 09",
            teacher: "Fernanda Alves",
            capacity: 35,
            schoolYear: 2026,
            status: "Ativa"
        }

    ];


    let classes =
        carregarTurmas();

    let classToDelete =
        null;

    let managerClassId =
        null;


    /*====================================================
                    HELPERS
    ====================================================*/

    function escapeHtml(value) {

        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    }


    function obterTurmaAluno(aluno) {

        /*
         * Compatibilidade com versões antigas.
         */

        return (
            aluno.className ||
            aluno.class ||
            aluno.turma ||
            ""
        );

    }


    function definirTurmaAluno(
        aluno,
        nomeTurma
    ) {

        aluno.className =
            nomeTurma;

        /*
         * Remove propriedades antigas para evitar
         * divergência de dados.
         */

        if (
            Object.prototype.hasOwnProperty.call(
                aluno,
                "class"
            )
        ) {

            delete aluno.class;

        }

        if (
            Object.prototype.hasOwnProperty.call(
                aluno,
                "turma"
            )
        ) {

            delete aluno.turma;

        }

    }


    /*====================================================
                    STORAGE TURMAS
    ====================================================*/

    function carregarTurmas() {

        try {

            const saved =
                localStorage.getItem(
                    CLASSES_STORAGE_KEY
                );

            if (!saved) {

                return structuredClone
                    ? structuredClone(defaultClasses)
                    : JSON.parse(
                        JSON.stringify(defaultClasses)
                    );

            }

            const dados =
                JSON.parse(saved);

            if (!Array.isArray(dados)) {

                return JSON.parse(
                    JSON.stringify(defaultClasses)
                );

            }

            /*
             * Remove contagem manual antiga.
             */

            return dados.map(
                function (turma) {

                    const copia = {
                        ...turma
                    };

                    delete copia.students;

                    return copia;

                }
            );

        } catch (erro) {

            console.warn(
                "Erro ao carregar turmas:",
                erro
            );

            return JSON.parse(
                JSON.stringify(defaultClasses)
            );

        }

    }


    function salvarTurmas() {

        localStorage.setItem(
            CLASSES_STORAGE_KEY,
            JSON.stringify(classes)
        );

    }


    /*====================================================
                    STORAGE ALUNOS
    ====================================================*/

    function carregarAlunos() {

        try {

            const saved =
                localStorage.getItem(
                    STUDENTS_STORAGE_KEY
                );

            if (!saved) {

                return [];

            }

            const alunos =
                JSON.parse(saved);

            if (!Array.isArray(alunos)) {

                return [];

            }

            /*
             * Normaliza dados antigos.
             */

            let alterou =
                false;

            alunos.forEach(
                function (aluno) {

                    if (
                        !aluno.className &&
                        (
                            aluno.class ||
                            aluno.turma
                        )
                    ) {

                        definirTurmaAluno(
                            aluno,
                            obterTurmaAluno(aluno)
                        );

                        alterou =
                            true;

                    }

                }
            );

            if (alterou) {

                salvarAlunos(
                    alunos
                );

            }

            return alunos;

        } catch (erro) {

            console.warn(
                "Erro ao carregar alunos:",
                erro
            );

            return [];

        }

    }


    function salvarAlunos(alunos) {

        localStorage.setItem(
            STUDENTS_STORAGE_KEY,
            JSON.stringify(alunos)
        );

    }


    /*====================================================
                    DISCIPLINAS
    ====================================================*/

    function atualizarNomeTurmaNasDisciplinas(
        nomeAntigo,
        nomeNovo
    ) {

        try {

            const saved =
                localStorage.getItem(
                    SUBJECTS_STORAGE_KEY
                );

            if (!saved) {

                return;

            }

            const disciplinas =
                JSON.parse(saved);

            if (!Array.isArray(disciplinas)) {

                return;

            }

            let alterou =
                false;

            disciplinas.forEach(
                function (disciplina) {

                    if (
                        disciplina.className ===
                        nomeAntigo
                    ) {

                        disciplina.className =
                            nomeNovo;

                        alterou =
                            true;

                    }

                }
            );

            if (alterou) {

                localStorage.setItem(
                    SUBJECTS_STORAGE_KEY,
                    JSON.stringify(
                        disciplinas
                    )
                );

            }

        } catch (erro) {

            console.warn(
                "Erro ao atualizar disciplinas:",
                erro
            );

        }

    }


    /*====================================================
                ALUNOS POR TURMA
    ====================================================*/

    function contarAlunosDaTurma(
        nomeTurma
    ) {

        return carregarAlunos()
            .filter(
                function (aluno) {

                    return (
                        obterTurmaAluno(aluno) ===
                        nomeTurma
                    );

                }
            )
            .length;

    }


    function pegarAlunosDaTurma(
        nomeTurma
    ) {

        return carregarAlunos()
            .filter(
                function (aluno) {

                    return (
                        obterTurmaAluno(aluno) ===
                        nomeTurma
                    );

                }
            );

    }


    /*====================================================
                    RESUMO
    ====================================================*/

    function atualizarResumo() {

        const alunos =
            carregarAlunos();

        const total =
            classes.length;

        const ativas =
            classes.filter(
                turma =>
                    turma.status === "Ativa"
            ).length;

        const enturmados =
            alunos.filter(
                function (aluno) {

                    const turmaAluno =
                        obterTurmaAluno(
                            aluno
                        );

                    return classes.some(
                        turma =>
                            turma.name ===
                            turmaAluno
                    );

                }
            ).length;

        const vagas =
            classes.reduce(
                function (
                    acumulado,
                    turma
                ) {

                    const quantidade =
                        contarAlunosDaTurma(
                            turma.name
                        );

                    return (
                        acumulado +
                        Math.max(
                            Number(turma.capacity) -
                            quantidade,
                            0
                        )
                    );

                },
                0
            );


        totalClasses.textContent =
            total;

        activeClasses.textContent =
            ativas;

        enrolledStudents.textContent =
            enturmados;

        availableSeats.textContent =
            vagas;

    }


    /*====================================================
                    FILTROS
    ====================================================*/

    function pegarTurmasFiltradas() {

        const termo =
            searchInput.value
                .trim()
                .toLowerCase();

        const turno =
            shiftFilter.value;

        const status =
            statusFilter.value;


        return classes.filter(
            function (turma) {

                const texto =
                    [
                        turma.name,
                        turma.grade,
                        turma.teacher,
                        turma.room
                    ]
                        .join(" ")
                        .toLowerCase();

                return (
                    texto.includes(termo) &&
                    (
                        !turno ||
                        turma.shift === turno
                    ) &&
                    (
                        !status ||
                        turma.status === status
                    )
                );

            }
        );

    }


    /*====================================================
                    RENDER TURMAS
    ====================================================*/

    function renderClasses() {

        tableBody.innerHTML =
            "";

        const filtradas =
            pegarTurmasFiltradas();

        emptyState.classList.toggle(
            "active",
            filtradas.length === 0
        );


        filtradas.forEach(
            function (turma) {

                const quantidade =
                    contarAlunosDaTurma(
                        turma.name
                    );

                const capacidade =
                    Number(
                        turma.capacity
                    );

                const percentual =
                    capacidade > 0
                        ? Math.min(
                            quantidade /
                            capacidade *
                            100,
                            100
                        )
                        : 0;

                const lotada =
                    quantidade >= capacidade;

                const statusClass =
                    turma.status === "Ativa"
                        ? "active"
                        : "inactive";


                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>

                        <div class="class-cell">

                            <div class="class-avatar">

                                <i class="fa-solid fa-users"></i>

                            </div>

                            <strong>
                                ${escapeHtml(turma.name)}
                            </strong>

                        </div>

                    </td>

                    <td>
                        ${escapeHtml(turma.grade)}
                    </td>

                    <td>
                        ${escapeHtml(turma.shift)}
                    </td>

                    <td>
                        ${escapeHtml(turma.teacher)}
                    </td>

                    <td>
                        ${escapeHtml(turma.room)}
                    </td>

                    <td>

                        <div class="capacity-cell">

                            <span class="capacity-text">
                                ${quantidade}/${capacidade}
                            </span>

                            <div class="capacity-bar ${lotada ? "full" : ""}">

                                <span
                                    style="width:${percentual}%"
                                ></span>

                            </div>

                        </div>

                    </td>

                    <td>
                        ${escapeHtml(turma.schoolYear)}
                    </td>

                    <td>

                        <span class="status-badge ${statusClass}">
                            ${escapeHtml(turma.status)}
                        </span>

                    </td>

                    <td>

                        <div class="class-actions-buttons">

                            <button
                                type="button"
                                class="class-action-button"
                                data-action="view"
                                data-id="${turma.id}"
                                title="Visualizar"
                            >
                                <i class="fa-solid fa-eye"></i>
                            </button>

                            <button
                                type="button"
                                class="class-action-button manage"
                                data-action="students"
                                data-id="${turma.id}"
                                title="Gerenciar alunos"
                            >
                                <i class="fa-solid fa-user-group"></i>
                            </button>

                            <button
                                type="button"
                                class="class-action-button"
                                data-action="edit"
                                data-id="${turma.id}"
                                title="Editar"
                            >
                                <i class="fa-solid fa-pen"></i>
                            </button>

                            <button
                                type="button"
                                class="class-action-button delete"
                                data-action="delete"
                                data-id="${turma.id}"
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
                    MODAL TURMA
    ====================================================*/

    function abrirModalTurma(
        turma = null
    ) {

        classForm.reset();

        capacityWarning.classList.remove(
            "active"
        );

        duplicateClassWarning.classList.remove(
            "active"
        );


        if (turma) {

            classModalTitle.textContent =
                "Editar turma";

            classId.value =
                turma.id;

            className.value =
                turma.name;

            classGrade.value =
                turma.grade;

            classShift.value =
                turma.shift;

            classRoom.value =
                turma.room;

            classTeacher.value =
                turma.teacher;

            classYear.value =
                turma.schoolYear;

            classCapacity.value =
                turma.capacity;

            classStudents.value =
                contarAlunosDaTurma(
                    turma.name
                );

            classStatus.value =
                turma.status;

        } else {

            classModalTitle.textContent =
                "Nova turma";

            classId.value =
                "";

            classYear.value =
                new Date().getFullYear();

            classCapacity.value =
                30;

            classStudents.value =
                0;

            classStatus.value =
                "Ativa";

        }


        abrirModal(
            classModal
        );

        className.focus();

    }


    function salvarTurma(
        event
    ) {

        event.preventDefault();


        capacityWarning.classList.remove(
            "active"
        );

        duplicateClassWarning.classList.remove(
            "active"
        );


        const id =
            classId.value
                ? Number(classId.value)
                : Date.now();

        const novoNome =
            className.value.trim();

        const existente =
            classes.find(
                turma =>
                    turma.id === id
            );

        const nomeAntigo =
            existente
                ? existente.name
                : "";

        const duplicada =
            classes.some(
                function (turma) {

                    return (
                        turma.id !== id &&
                        turma.name
                            .trim()
                            .toLowerCase() ===
                        novoNome.toLowerCase()
                    );

                }
            );


        if (duplicada) {

            duplicateClassWarning.classList.add(
                "active"
            );

            className.focus();

            return;

        }


        const alunosVinculados =
            existente
                ? contarAlunosDaTurma(
                    nomeAntigo
                )
                : 0;

        const capacidade =
            Number(
                classCapacity.value
            );


        if (
            alunosVinculados >
            capacidade
        ) {

            capacityWarning.classList.add(
                "active"
            );

            classCapacity.focus();

            return;

        }


        const dados = {

            id,

            name:
                novoNome,

            grade:
                classGrade.value,

            shift:
                classShift.value,

            room:
                classRoom.value.trim(),

            teacher:
                classTeacher.value.trim(),

            capacity:
                capacidade,

            schoolYear:
                Number(
                    classYear.value
                ),

            status:
                classStatus.value

        };


        const index =
            classes.findIndex(
                turma =>
                    turma.id === id
            );


        if (index >= 0) {

            classes[index] =
                dados;

        } else {

            classes.unshift(
                dados
            );

        }


        /*
         * Se renomear a turma,
         * atualiza alunos e disciplinas.
         */

        if (
            nomeAntigo &&
            nomeAntigo !== novoNome
        ) {

            const alunos =
                carregarAlunos();

            alunos.forEach(
                function (aluno) {

                    if (
                        obterTurmaAluno(aluno) ===
                        nomeAntigo
                    ) {

                        definirTurmaAluno(
                            aluno,
                            novoNome
                        );

                    }

                }
            );

            salvarAlunos(
                alunos
            );

            atualizarNomeTurmaNasDisciplinas(
                nomeAntigo,
                novoNome
            );

        }


        salvarTurmas();

        renderClasses();

        fecharModal(
            classModal
        );

    }


    /*====================================================
                    VISUALIZAR
    ====================================================*/

    function abrirVisualizacao(
        turma
    ) {

        const quantidade =
            contarAlunosDaTurma(
                turma.name
            );

        viewClassName.textContent =
            turma.name;

        viewClassGrade.textContent =
            turma.grade;

        viewClassShift.textContent =
            turma.shift;

        viewClassTeacher.textContent =
            turma.teacher;

        viewClassRoom.textContent =
            turma.room;

        viewClassStudents.textContent =
            `${quantidade}/${turma.capacity}`;

        viewClassYear.textContent =
            turma.schoolYear;

        viewClassStatus.textContent =
            turma.status;


        abrirModal(
            classViewModal
        );

    }


    /*====================================================
                GERENCIAR ALUNOS
    ====================================================*/

    function abrirGerenciadorAlunos(
        turma
    ) {

        managerClassId =
            turma.id;

        managerStudentSearch.value =
            "";

        managerClassName.textContent =
            turma.name;

        renderGerenciadorAlunos();

        abrirModal(
            studentsManagerModal
        );

    }


    function renderGerenciadorAlunos() {

        const turma =
            classes.find(
                item =>
                    item.id ===
                    managerClassId
            );

        if (!turma) {

            return;

        }


        const alunos =
            carregarAlunos();

        const termo =
            managerStudentSearch.value
                .trim()
                .toLowerCase();


        const vinculados =
            alunos.filter(
                aluno =>
                    obterTurmaAluno(aluno) ===
                    turma.name
            );


        const disponiveis =
            alunos.filter(
                function (aluno) {

                    const turmaAtual =
                        obterTurmaAluno(
                            aluno
                        );

                    const texto =
                        (
                            aluno.name +
                            " " +
                            (
                                aluno.registration ||
                                ""
                            )
                        )
                            .toLowerCase();

                    return (
                        turmaAtual !== turma.name &&
                        texto.includes(termo)
                    );

                }
            );


        const ocupacao =
            vinculados.length;

        const capacidade =
            Number(
                turma.capacity
            );

        const cheia =
            ocupacao >= capacidade;

        const percentual =
            capacidade > 0
                ? Math.min(
                    ocupacao /
                    capacidade *
                    100,
                    100
                )
                : 0;


        managerCapacityText.textContent =
            `${ocupacao}/${capacidade}`;

        managerCapacityBar.style.width =
            `${percentual}%`;

        linkedStudentsCounter.textContent =
            ocupacao;


        /* ALUNOS VINCULADOS */

        linkedStudentsList.innerHTML =
            "";

        linkedStudentsEmpty.classList.toggle(
            "active",
            vinculados.length === 0
        );


        vinculados.forEach(
            function (aluno) {

                const card =
                    criarCardAluno(
                        aluno,
                        `
                            <button
                                type="button"
                                class="manager-student-button remove"
                                data-manager-action="remove"
                                data-student-id="${aluno.id}"
                            >
                                Remover
                            </button>
                        `,
                        turma.name
                    );

                linkedStudentsList.appendChild(
                    card
                );

            }
        );


        /* ALUNOS DISPONÍVEIS */

        availableStudentsList.innerHTML =
            "";

        availableStudentsEmpty.classList.toggle(
            "active",
            disponiveis.length === 0
        );


        disponiveis.forEach(
            function (aluno) {

                const turmaAtual =
                    obterTurmaAluno(
                        aluno
                    );

                const textoBotao =
                    turmaAtual
                        ? "Transferir"
                        : "Adicionar";


                const card =
                    criarCardAluno(
                        aluno,
                        `
                            <button
                                type="button"
                                class="manager-student-button"
                                data-manager-action="add"
                                data-student-id="${aluno.id}"
                                ${cheia ? "disabled" : ""}
                            >
                                ${textoBotao}
                            </button>
                        `,
                        turmaAtual ||
                        "Sem turma"
                    );

                availableStudentsList.appendChild(
                    card
                );

            }
        );

    }


    function criarCardAluno(
        aluno,
        botao,
        subtitulo
    ) {

        const card =
            document.createElement(
                "div"
            );

        card.className =
            "manager-student-card";

        card.innerHTML = `

            <div class="manager-student-avatar">

                <i class="fa-solid fa-user-graduate"></i>

            </div>

            <div class="manager-student-info">

                <strong>
                    ${escapeHtml(aluno.name)}
                </strong>

                <span>
                    ${escapeHtml(aluno.registration || "")}
                    ${subtitulo ? " • " + escapeHtml(subtitulo) : ""}
                </span>

            </div>

            ${botao}

        `;

        return card;

    }


    function adicionarAlunoNaTurma(
        alunoId
    ) {

        const turma =
            classes.find(
                item =>
                    item.id ===
                    managerClassId
            );

        if (!turma) {

            return;

        }


        const ocupacao =
            contarAlunosDaTurma(
                turma.name
            );


        if (
            ocupacao >=
            Number(turma.capacity)
        ) {

            return;

        }


        const alunos =
            carregarAlunos();

        const aluno =
            alunos.find(
                item =>
                    Number(item.id) ===
                    Number(alunoId)
            );


        if (!aluno) {

            return;

        }


        definirTurmaAluno(
            aluno,
            turma.name
        );


        salvarAlunos(
            alunos
        );

        renderGerenciadorAlunos();

        renderClasses();

    }


    function removerAlunoDaTurma(
        alunoId
    ) {

        const alunos =
            carregarAlunos();

        const aluno =
            alunos.find(
                item =>
                    Number(item.id) ===
                    Number(alunoId)
            );


        if (!aluno) {

            return;

        }


        definirTurmaAluno(
            aluno,
            ""
        );


        salvarAlunos(
            alunos
        );

        renderGerenciadorAlunos();

        renderClasses();

    }


    /*====================================================
                    EXCLUSÃO
    ====================================================*/

    function abrirExclusao(
        turma
    ) {

        const quantidade =
            contarAlunosDaTurma(
                turma.name
            );

        classToDelete =
            turma.id;


        if (quantidade > 0) {

            deleteClassMessage.textContent =
                `A turma "${turma.name}" possui ${quantidade} aluno(s) vinculado(s). Remova ou transfira os alunos antes de excluir.`;

            deleteClassConfirm.style.display =
                "none";

        } else {

            deleteClassMessage.textContent =
                `Deseja realmente excluir a turma "${turma.name}"?`;

            deleteClassConfirm.style.display =
                "";

        }


        abrirModal(
            deleteClassModal
        );

    }


    function confirmarExclusao() {

        if (
            classToDelete ===
            null
        ) {

            return;

        }


        const turma =
            classes.find(
                item =>
                    item.id ===
                    classToDelete
            );


        if (!turma) {

            return;

        }


        if (
            contarAlunosDaTurma(
                turma.name
            ) > 0
        ) {

            return;

        }


        classes =
            classes.filter(
                item =>
                    item.id !==
                    classToDelete
            );


        salvarTurmas();

        renderClasses();

        classToDelete =
            null;

        fecharModal(
            deleteClassModal
        );

    }


    /*====================================================
                    MODAIS GENÉRICOS
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


            const turma =
                classes.find(
                    item =>
                        Number(item.id) ===
                        Number(button.dataset.id)
                );


            if (!turma) {

                return;

            }


            switch (
                button.dataset.action
            ) {

                case "view":

                    abrirVisualizacao(
                        turma
                    );

                    break;


                case "students":

                    abrirGerenciadorAlunos(
                        turma
                    );

                    break;


                case "edit":

                    abrirModalTurma(
                        turma
                    );

                    break;


                case "delete":

                    abrirExclusao(
                        turma
                    );

                    break;

            }

        }
    );


    newClassButton.addEventListener(
        "click",
        function () {

            abrirModalTurma();

        }
    );


    classForm.addEventListener(
        "submit",
        salvarTurma
    );


    managerStudentSearch.addEventListener(
        "input",
        renderGerenciadorAlunos
    );


    studentsManagerModal.addEventListener(
        "click",
        function (event) {

            const button =
                event.target.closest(
                    "[data-manager-action]"
                );

            if (!button) {

                return;

            }


            const alunoId =
                Number(
                    button.dataset.studentId
                );


            if (
                button.dataset.managerAction ===
                "add"
            ) {

                adicionarAlunoNaTurma(
                    alunoId
                );

            }


            if (
                button.dataset.managerAction ===
                "remove"
            ) {

                removerAlunoDaTurma(
                    alunoId
                );

            }

        }
    );


    searchInput.addEventListener(
        "input",
        renderClasses
    );


    shiftFilter.addEventListener(
        "change",
        renderClasses
    );


    statusFilter.addEventListener(
        "change",
        renderClasses
    );


    classModalClose.addEventListener(
        "click",
        () =>
            fecharModal(
                classModal
            )
    );


    classCancelButton.addEventListener(
        "click",
        () =>
            fecharModal(
                classModal
            )
    );


    classModalOverlay.addEventListener(
        "click",
        () =>
            fecharModal(
                classModal
            )
    );


    classViewClose.addEventListener(
        "click",
        () =>
            fecharModal(
                classViewModal
            )
    );


    classViewOverlay.addEventListener(
        "click",
        () =>
            fecharModal(
                classViewModal
            )
    );


    studentsManagerClose.addEventListener(
        "click",
        () =>
            fecharModal(
                studentsManagerModal
            )
    );


    studentsManagerOverlay.addEventListener(
        "click",
        () =>
            fecharModal(
                studentsManagerModal
            )
    );


    deleteClassCancel.addEventListener(
        "click",
        function () {

            classToDelete =
                null;

            fecharModal(
                deleteClassModal
            );

        }
    );


    deleteClassOverlay.addEventListener(
        "click",
        function () {

            classToDelete =
                null;

            fecharModal(
                deleteClassModal
            );

        }
    );


    deleteClassConfirm.addEventListener(
        "click",
        confirmarExclusao
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
                classModal,
                classViewModal,
                studentsManagerModal,
                deleteClassModal
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

    salvarTurmas();

    renderClasses();

});