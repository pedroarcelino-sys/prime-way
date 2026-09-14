/*====================================================
            TURMAS - PRIMEWAY SCHOOL
====================================================*/

document.addEventListener("DOMContentLoaded", async function () {
    await window.PrimeWayStorage?.ready;

    /*====================================================
                    APIs / SESSÃO
    ====================================================*/

    const CLASSES_API_URL =
        "../api/turmas/index.php";

    const CLASS_SAVE_API_URL =
        "../api/turmas/salvar.php";

    const CLASS_DELETE_API_URL =
        "../api/turmas/excluir.php";

    const CLASS_STUDENTS_API_URL =
        "../api/turmas/alunos.php";

    const CLASS_ENROLLMENT_API_URL =
        "../api/turmas/matricula.php";

    const PROFESSORS_API_URL =
        "../api/professores/index.php";

    const CLASSES_STORAGE_KEY =
        "primewayClasses";

    const AUTH_SESSION_URL =
        "../api/auth/session.php";

    const AUTH_LOGOUT_URL =
        "../api/auth/logout.php";

    const SESSION_LOGADO_KEY =
        "primewayLogado";

    const SESSION_USUARIO_KEY =
        "primewayUsuario";

    const SESSION_PERFIL_KEY =
        "primewayPerfil";

    const PERFIS_PERMITIDOS =
        new Set([
            "admin"
        ]);

    const PAGINA_LOGIN =
        "login.html";

    const PAGINA_PROFESSOR =
        "professor.html";


    /*====================================================
            COMPATIBILIDADE COM FRONT ATUAL
    ====================================================*/

    function limparSessaoCompatibilidade() {

        sessionStorage.removeItem(
            SESSION_LOGADO_KEY
        );

        sessionStorage.removeItem(
            SESSION_USUARIO_KEY
        );

        sessionStorage.removeItem(
            SESSION_PERFIL_KEY
        );
    }


    function sincronizarSessaoCompatibilidade(
        usuario
    ) {

        sessionStorage.setItem(
            SESSION_LOGADO_KEY,
            "true"
        );

        sessionStorage.setItem(
            SESSION_USUARIO_KEY,
            String(
                usuario.email || ""
            )
        );

        sessionStorage.setItem(
            SESSION_PERFIL_KEY,
            String(
                usuario.perfil || ""
            )
        );
    }


    async function lerJsonSeguro(
        response
    ) {

        try {

            return await response.json();

        } catch {

            return null;
        }
    }


    async function obterSessaoServidor() {

        try {

            const response =
                await fetch(
                    AUTH_SESSION_URL,
                    {
                        method: "GET",
                        credentials: "same-origin",
                        cache: "no-store",
                        headers: {
                            "Accept": "application/json"
                        }
                    }
                );

            const data =
                await lerJsonSeguro(
                    response
                );

            if (
                !response.ok ||
                !data?.authenticated ||
                !data?.usuario
            ) {

                limparSessaoCompatibilidade();

                window.location.replace(
                    PAGINA_LOGIN
                );

                return null;
            }

            const usuario =
                data.usuario;

            const perfil =
                String(
                    usuario.perfil || ""
                )
                    .trim()
                    .toLowerCase();

            sincronizarSessaoCompatibilidade(
                usuario
            );

            if (
                !PERFIS_PERMITIDOS.has(
                    perfil
                )
            ) {

                if (
                    perfil ===
                    "professor"
                ) {

                    window.location.replace(
                        PAGINA_PROFESSOR
                    );

                } else {

                    window.location.replace(
                        PAGINA_LOGIN
                    );
                }

                return null;
            }

            return {
                ...usuario,
                perfil
            };

        } catch (error) {

            console.error(
                "Erro ao validar a sessão de Turmas:",
                error
            );

            limparSessaoCompatibilidade();

            window.location.replace(
                PAGINA_LOGIN
            );

            return null;
        }
    }


    const usuarioSessao =
        await obterSessaoServidor();

    if (
        !usuarioSessao
    ) {

        return;
    }


    /*====================================================
                    ELEMENTOS
    ====================================================*/

    const tableBody =
        document.querySelector(
            "#classesTableBody"
        );

    const emptyState =
        document.querySelector(
            "#classesEmpty"
        );

    const searchInput =
        document.querySelector(
            "#classSearch"
        );

    const shiftFilter =
        document.querySelector(
            "#shiftFilter"
        );

    const statusFilter =
        document.querySelector(
            "#statusFilter"
        );

    const totalClasses =
        document.querySelector(
            "#totalClasses"
        );

    const activeClasses =
        document.querySelector(
            "#activeClasses"
        );

    const enrolledStudents =
        document.querySelector(
            "#enrolledStudents"
        );

    const availableSeats =
        document.querySelector(
            "#availableSeats"
        );

    const newClassButton =
        document.querySelector(
            "#newClassButton"
        );

    const classModal =
        document.querySelector(
            "#classModal"
        );

    const classModalOverlay =
        document.querySelector(
            ".class-modal-overlay"
        );

    const classModalClose =
        document.querySelector(
            "#classModalClose"
        );

    const classCancelButton =
        document.querySelector(
            "#classCancelButton"
        );

    const classModalTitle =
        document.querySelector(
            "#classModalTitle"
        );

    const classForm =
        document.querySelector(
            "#classForm"
        );

    const classId =
        document.querySelector(
            "#classId"
        );

    const className =
        document.querySelector(
            "#className"
        );

    const classGrade =
        document.querySelector(
            "#classGrade"
        );

    const classShift =
        document.querySelector(
            "#classShift"
        );

    const classRoom =
        document.querySelector(
            "#classRoom"
        );

    const classTeacher =
        document.querySelector(
            "#classTeacher"
        );

    const classYear =
        document.querySelector(
            "#classYear"
        );

    const classCapacity =
        document.querySelector(
            "#classCapacity"
        );

    const classStudents =
        document.querySelector(
            "#classStudents"
        );

    const classStatus =
        document.querySelector(
            "#classStatus"
        );

    const capacityWarning =
        document.querySelector(
            "#capacityWarning"
        );

    const duplicateClassWarning =
        document.querySelector(
            "#duplicateClassWarning"
        );

    const classViewModal =
        document.querySelector(
            "#classViewModal"
        );

    const classViewOverlay =
        document.querySelector(
            ".class-view-overlay"
        );

    const classViewClose =
        document.querySelector(
            "#classViewClose"
        );

    const viewClassName =
        document.querySelector(
            "#viewClassName"
        );

    const viewClassGrade =
        document.querySelector(
            "#viewClassGrade"
        );

    const viewClassShift =
        document.querySelector(
            "#viewClassShift"
        );

    const viewClassTeacher =
        document.querySelector(
            "#viewClassTeacher"
        );

    const viewClassRoom =
        document.querySelector(
            "#viewClassRoom"
        );

    const viewClassStudents =
        document.querySelector(
            "#viewClassStudents"
        );

    const viewClassYear =
        document.querySelector(
            "#viewClassYear"
        );

    const viewClassStatus =
        document.querySelector(
            "#viewClassStatus"
        );

    const studentsManagerModal =
        document.querySelector(
            "#studentsManagerModal"
        );

    const studentsManagerOverlay =
        document.querySelector(
            ".students-manager-overlay"
        );

    const studentsManagerClose =
        document.querySelector(
            "#studentsManagerClose"
        );

    const managerClassName =
        document.querySelector(
            "#managerClassName"
        );

    const managerCapacityText =
        document.querySelector(
            "#managerCapacityText"
        );

    const managerCapacityBarContainer =
        document.querySelector(
            ".manager-capacity-bar"
        );

    const managerCapacityBar =
        document.querySelector(
            "#managerCapacityBar"
        );

    const linkedStudentsCounter =
        document.querySelector(
            "#linkedStudentsCounter"
        );

    const linkedStudentsList =
        document.querySelector(
            "#linkedStudentsList"
        );

    const availableStudentsList =
        document.querySelector(
            "#availableStudentsList"
        );

    const linkedStudentsEmpty =
        document.querySelector(
            "#linkedStudentsEmpty"
        );

    const availableStudentsEmpty =
        document.querySelector(
            "#availableStudentsEmpty"
        );

    const managerStudentSearch =
        document.querySelector(
            "#managerStudentSearch"
        );

    const deleteClassModal =
        document.querySelector(
            "#deleteClassModal"
        );

    const deleteClassOverlay =
        document.querySelector(
            ".delete-class-overlay"
        );

    const deleteClassCancel =
        document.querySelector(
            "#deleteClassCancel"
        );

    const deleteClassConfirm =
        document.querySelector(
            "#deleteClassConfirm"
        );

    const deleteClassMessage =
        document.querySelector(
            "#deleteClassMessage"
        );

    const logoutButton =
        document.querySelector(
            "#logoutButton"
        );


    const elementosObrigatorios = [
        tableBody,
        emptyState,
        searchInput,
        shiftFilter,
        statusFilter,
        totalClasses,
        activeClasses,
        enrolledStudents,
        availableSeats,
        newClassButton,
        classModal,
        classModalOverlay,
        classModalClose,
        classCancelButton,
        classModalTitle,
        classForm,
        classId,
        className,
        classGrade,
        classShift,
        classRoom,
        classTeacher,
        classYear,
        classCapacity,
        classStudents,
        classStatus,
        capacityWarning,
        duplicateClassWarning,
        classViewModal,
        classViewOverlay,
        classViewClose,
        viewClassName,
        viewClassGrade,
        viewClassShift,
        viewClassTeacher,
        viewClassRoom,
        viewClassStudents,
        viewClassYear,
        viewClassStatus,
        studentsManagerModal,
        studentsManagerOverlay,
        studentsManagerClose,
        managerClassName,
        managerCapacityText,
        managerCapacityBarContainer,
        managerCapacityBar,
        linkedStudentsCounter,
        linkedStudentsList,
        availableStudentsList,
        linkedStudentsEmpty,
        availableStudentsEmpty,
        managerStudentSearch,
        deleteClassModal,
        deleteClassOverlay,
        deleteClassCancel,
        deleteClassConfirm,
        deleteClassMessage
    ];


    if (
        elementosObrigatorios.some(
            elemento =>
                !elemento
        )
    ) {

        console.error(
            "Turmas: a estrutura esperada da página não foi encontrada."
        );

        return;
    }


    /*====================================================
                    ESTADO
    ====================================================*/

    let classes = [];
    let students = [];
    let professors = [];
    let activeSchoolYear = null;

    let classToDelete = null;
    let managerClassId = null;
    let selectedTeacherId = null;
    let recarregandoDados = false;
    let logoutEmAndamento = false;

    const focoAnteriorPorModal =
        new WeakMap();


    /*====================================================
                    UTILITÁRIOS
    ====================================================*/

    function normalizarTexto(
        valor
    ) {

        return String(
            valor ?? ""
        )
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .toLowerCase()
            .trim();
    }


    function escapeHtml(
        valor
    ) {

        return String(
            valor ?? ""
        )
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }


    function numeroSeguro(
        valor,
        padrao = 0
    ) {

        const numero =
            Number(
                valor
            );

        return Number.isFinite(
            numero
        )
            ? numero
            : padrao;
    }


    function ordenarPorNome(
        itens
    ) {

        return [
            ...itens
        ].sort(
            function (a, b) {

                return String(
                    a.name ?? ""
                ).localeCompare(
                    String(
                        b.name ?? ""
                    ),
                    "pt-BR",
                    {
                        numeric: true,
                        sensitivity: "base"
                    }
                );
            }
        );
    }


    function turmaEstaAtiva(
        turma
    ) {

        return normalizarTexto(
            turma?.status
        ) === "ativa";
    }


    function obterClasseStatus(
        status
    ) {

        return turmaEstaAtiva({
            status
        })
            ? "active"
            : "inactive";
    }


    function quantidadeAlunosTurma(
        turma
    ) {

        return Math.max(
            0,
            Math.trunc(
                numeroSeguro(
                    turma?.studentCount,
                    0
                )
            )
        );
    }


    function turmaPertenceAnoAtivo(
        turma
    ) {

        if (
            !activeSchoolYear
        ) {

            return false;
        }

        return Number(
            turma.schoolYear
        ) === Number(
            activeSchoolYear.year
        );
    }


    function encontrarTurma(
        id
    ) {

        return classes.find(
            turma =>
                Number(
                    turma.id
                ) === Number(
                    id
                )
        ) || null;
    }


    function encontrarAluno(
        id
    ) {

        return students.find(
            aluno =>
                Number(
                    aluno.id
                ) === Number(
                    id
                )
        ) || null;
    }


    /*====================================================
                    API
    ====================================================*/

    async function requisicaoJson(
        url,
        opcoes = {}
    ) {

        const {
            headers:
                cabecalhosExtras = {},
            ...opcoesFetch
        } =
            opcoes;

        const response =
            await fetch(
                url,
                {
                    ...opcoesFetch,
                    credentials: "same-origin",
                    cache: "no-store",
                    headers: {
                        "Accept": "application/json",
                        ...(opcoesFetch.body
                            ? {
                                "Content-Type":
                                    "application/json"
                            }
                            : {}),
                        ...cabecalhosExtras
                    }
                }
            );

        const data =
            await lerJsonSeguro(
                response
            );

        if (
            response.status ===
            401
        ) {

            limparSessaoCompatibilidade();

            window.location.replace(
                PAGINA_LOGIN
            );
        }

        return {
            response,
            data
        };
    }


    async function carregarTurmasServidor() {

        const {
            response,
            data
        } = await requisicaoJson(
            CLASSES_API_URL,
            {
                method: "GET"
            }
        );

        if (
            !response.ok ||
            !data?.success ||
            !Array.isArray(
                data.classes
            )
        ) {

            throw new Error(
                data?.message ||
                "Não foi possível carregar as turmas."
            );
        }

        classes =
            data.classes;

        localStorage.setItem(
            CLASSES_STORAGE_KEY,
            JSON.stringify(classes)
        );

        activeSchoolYear =
            data.activeSchoolYear ||
            null;
    }


    async function carregarProfessoresServidor() {

        const {
            response,
            data
        } = await requisicaoJson(
            PROFESSORS_API_URL,
            {
                method: "GET"
            }
        );

        if (
            !response.ok ||
            !data?.success ||
            !Array.isArray(
                data.professors
            )
        ) {

            throw new Error(
                data?.message ||
                "Não foi possível carregar os professores."
            );
        }

        professors =
            data.professors;
    }


    async function carregarAlunosServidor() {

        const {
            response,
            data
        } = await requisicaoJson(
            CLASS_STUDENTS_API_URL,
            {
                method: "GET"
            }
        );

        if (
            !response.ok ||
            !data?.success ||
            !Array.isArray(
                data.students
            )
        ) {

            throw new Error(
                data?.message ||
                "Não foi possível carregar os alunos."
            );
        }

        students =
            data.students;
    }


    async function carregarDadosServidor(
        mostrarErro = true
    ) {

        if (
            recarregandoDados
        ) {

            return false;
        }

        recarregandoDados =
            true;

        try {

            await Promise.all([
                carregarTurmasServidor(),
                carregarProfessoresServidor(),
                carregarAlunosServidor()
            ]);

            return true;

        } catch (error) {

            console.error(
                "Erro ao carregar dados de Turmas:",
                error
            );

            if (
                mostrarErro
            ) {

                alert(
                    error?.message ||
                    "Não foi possível carregar os dados de Turmas."
                );
            }

            return false;

        } finally {

            recarregandoDados =
                false;
        }
    }


    async function salvarTurmaServidor(
        dados
    ) {

        const {
            response,
            data
        } = await requisicaoJson(
            CLASS_SAVE_API_URL,
            {
                method: "POST",
                body: JSON.stringify(
                    dados
                )
            }
        );

        return {
            ok:
                response.ok &&
                data?.success === true,

            status:
                response.status,

            data
        };
    }


    async function excluirTurmaServidor(
        id
    ) {

        const {
            response,
            data
        } = await requisicaoJson(
            CLASS_DELETE_API_URL,
            {
                method: "POST",
                body: JSON.stringify({
                    id
                })
            }
        );

        return {
            ok:
                response.ok &&
                data?.success === true,

            status:
                response.status,

            data
        };
    }


    async function alterarMatriculaServidor(
        action,
        studentId,
        classId
    ) {

        const {
            response,
            data
        } = await requisicaoJson(
            CLASS_ENROLLMENT_API_URL,
            {
                method: "POST",
                body: JSON.stringify({
                    action,
                    studentId,
                    classId
                })
            }
        );

        return {
            ok:
                response.ok &&
                data?.success === true,

            status:
                response.status,

            data
        };
    }


    /*====================================================
                PROFESSORES / DATALIST
    ====================================================*/

    const professoresDatalist =
        document.createElement(
            "datalist"
        );

    professoresDatalist.id =
        "primewayTeachersList";

    document.body.appendChild(
        professoresDatalist
    );

    classTeacher.setAttribute(
        "list",
        professoresDatalist.id
    );


    /*
        professor_id é opcional no banco.

        Enquanto o módulo Professores ainda não possui
        cadastro conectado, uma turma também pode ser
        criada sem professor responsável.
    */

    classTeacher.required =
        false;


    function preencherDatalistProfessores() {

        professoresDatalist.replaceChildren();

        professors
            .filter(
                professor =>
                    professor.available === true
            )
            .forEach(
                function (professor) {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        professor.name;

                    const detalhes = [];

                    if (
                        professor.registration
                    ) {

                        detalhes.push(
                            professor.registration
                        );
                    }

                    option.label =
                        detalhes.join(" • ");

                    professoresDatalist.appendChild(
                        option
                    );
                }
            );
    }


    function definirProfessorAtual(
        turma = null
    ) {

        selectedTeacherId =
            turma?.teacherId ??
            null;

        classTeacher.value =
            turma?.teacher ||
            "";
    }


    function obterProfessorFormulario() {

        const nome =
            classTeacher.value
                .trim();

        if (
            !nome
        ) {

            return {
                ok: true,
                id: null,
                name: ""
            };
        }

        if (
            selectedTeacherId !==
            null
        ) {

            const selecionado =
                professors.find(
                    professor =>
                        Number(
                            professor.id
                        ) === Number(
                            selectedTeacherId
                        ) &&
                        professor.name ===
                            nome
                );

            if (
                selecionado
            ) {

                return {
                    ok: true,
                    id: selecionado.id,
                    name: selecionado.name
                };
            }
        }

        const encontrados =
            professors.filter(
                professor =>
                    professor.available === true &&
                    normalizarTexto(
                        professor.name
                    ) === normalizarTexto(
                        nome
                    )
            );

        if (
            encontrados.length !==
            1
        ) {

            return {
                ok: false,
                id: null,
                name: nome
            };
        }

        selectedTeacherId =
            encontrados[0].id;

        classTeacher.value =
            encontrados[0].name;

        return {
            ok: true,
            id: encontrados[0].id,
            name: encontrados[0].name
        };
    }


    /*====================================================
                    RESUMO
    ====================================================*/

    function atualizarResumo() {

        totalClasses.textContent =
            String(
                classes.length
            );

        activeClasses.textContent =
            String(
                classes.filter(
                    turmaEstaAtiva
                ).length
            );

        const matriculados =
            classes.reduce(
                (total, turma) =>
                    total +
                    quantidadeAlunosTurma(
                        turma
                    ),
                0
            );

        enrolledStudents.textContent =
            String(
                matriculados
            );

        const vagas =
            classes
                .filter(
                    turmaEstaAtiva
                )
                .reduce(
                    function (
                        total,
                        turma
                    ) {

                        return total +
                            Math.max(
                                numeroSeguro(
                                    turma.capacity,
                                    0
                                ) -
                                quantidadeAlunosTurma(
                                    turma
                                ),
                                0
                            );
                    },
                    0
                );

        availableSeats.textContent =
            String(
                vagas
            );
    }


    /*====================================================
                    FILTROS
    ====================================================*/

    function pegarTurmasFiltradas() {

        const termo =
            normalizarTexto(
                searchInput.value
            );

        const turno =
            shiftFilter.value;

        const status =
            statusFilter.value;

        return classes.filter(
            function (turma) {

                const texto =
                    normalizarTexto(
                        [
                            turma.name,
                            turma.grade,
                            turma.teacher,
                            turma.room,
                            turma.schoolYear
                        ].join(" ")
                    );

                return (
                    texto.includes(
                        termo
                    ) &&
                    (
                        !turno ||
                        turma.shift ===
                            turno
                    ) &&
                    (
                        !status ||
                        turma.status ===
                            status
                    )
                );
            }
        );
    }


    /*====================================================
                    RENDER TURMAS
    ====================================================*/

    function renderClasses() {

        tableBody.replaceChildren();

        const filtradas =
            pegarTurmasFiltradas();

        emptyState.classList.toggle(
            "active",
            filtradas.length === 0
        );

        filtradas.forEach(
            function (turma) {

                const quantidade =
                    quantidadeAlunosTurma(
                        turma
                    );

                const capacidade =
                    Math.max(
                        numeroSeguro(
                            turma.capacity,
                            1
                        ),
                        1
                    );

                const percentual =
                    Math.min(
                        quantidade /
                        capacidade *
                        100,
                        100
                    );

                const lotada =
                    quantidade >=
                    capacidade;

                const statusClass =
                    obterClasseStatus(
                        turma.status
                    );

                const gerenciavel =
                    turmaPertenceAnoAtivo(
                        turma
                    );

                const row =
                    document.createElement(
                        "tr"
                    );

                const nomeSeguro =
                    escapeHtml(
                        turma.name
                    );

                const idSeguro =
                    escapeHtml(
                        turma.id
                    );

                const professorExibido =
                    turma.teacher ||
                    "Sem professor";

                const salaExibida =
                    turma.room ||
                    "-";

                row.innerHTML = `
                    <td>

                        <div class="class-cell">

                            <div
                                class="class-avatar"
                                aria-hidden="true"
                            >
                                <i
                                    class="fa-solid fa-users"
                                    aria-hidden="true"
                                ></i>
                            </div>

                            <strong>
                                ${nomeSeguro}
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
                        ${escapeHtml(professorExibido)}
                    </td>

                    <td>
                        ${escapeHtml(salaExibida)}
                    </td>

                    <td>

                        <div class="capacity-cell">

                            <span class="capacity-text">
                                ${quantidade}/${capacidade}
                            </span>

                            <div class="capacity-bar ${lotada ? "full" : ""}">

                                <span
                                    style="width: ${percentual}%"
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
                                data-id="${idSeguro}"
                                title="Visualizar"
                                aria-label="Visualizar ${nomeSeguro}"
                            >
                                <i
                                    class="fa-solid fa-eye"
                                    aria-hidden="true"
                                ></i>
                            </button>

                            <button
                                type="button"
                                class="class-action-button manage"
                                data-action="students"
                                data-id="${idSeguro}"
                                title="${gerenciavel
                                    ? "Gerenciar alunos"
                                    : "Gerenciamento disponível apenas no ano letivo ativo"
                                }"
                                aria-label="Gerenciar alunos da turma ${nomeSeguro}"
                                ${gerenciavel ? "" : "disabled"}
                            >
                                <i
                                    class="fa-solid fa-user-group"
                                    aria-hidden="true"
                                ></i>
                            </button>

                            <button
                                type="button"
                                class="class-action-button"
                                data-action="edit"
                                data-id="${idSeguro}"
                                title="Editar"
                                aria-label="Editar ${nomeSeguro}"
                            >
                                <i
                                    class="fa-solid fa-pen"
                                    aria-hidden="true"
                                ></i>
                            </button>

                            <button
                                type="button"
                                class="class-action-button delete"
                                data-action="delete"
                                data-id="${idSeguro}"
                                title="Excluir"
                                aria-label="Excluir ${nomeSeguro}"
                            >
                                <i
                                    class="fa-solid fa-trash"
                                    aria-hidden="true"
                                ></i>
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
                    MODAIS
    ====================================================*/

    function existeModalAtivo() {

        return [
            classModal,
            classViewModal,
            studentsManagerModal,
            deleteClassModal
        ].some(
            modal =>
                modal.classList.contains(
                    "active"
                )
        );
    }


    function abrirModal(
        modal,
        focoInicial = null
    ) {

        const elementoAtivo =
            document.activeElement;

        if (
            elementoAtivo instanceof
            HTMLElement
        ) {

            focoAnteriorPorModal.set(
                modal,
                elementoAtivo
            );
        }

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

        if (
            focoInicial &&
            typeof focoInicial.focus ===
                "function"
        ) {

            requestAnimationFrame(
                function () {

                    focoInicial.focus();
                }
            );
        }
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

        if (
            !existeModalAtivo()
        ) {

            document.body.classList.remove(
                "modal-open"
            );
        }

        const focoAnterior =
            focoAnteriorPorModal.get(
                modal
            );

        focoAnteriorPorModal.delete(
            modal
        );

        const destinoFoco =
            focoAnterior &&
            focoAnterior.isConnected &&
            typeof focoAnterior.focus ===
                "function"
                ? focoAnterior
                : newClassButton;

        requestAnimationFrame(
            function () {

                destinoFoco?.focus();
            }
        );
    }


    /*====================================================
                CADASTRO / EDIÇÃO
    ====================================================*/

    function limparAvisosFormulario() {

        capacityWarning.classList.remove(
            "active"
        );

        duplicateClassWarning.classList.remove(
            "active"
        );

        classTeacher.setCustomValidity(
            ""
        );
    }


    function abrirModalTurma(
        turma = null
    ) {

        classForm.reset();

        limparAvisosFormulario();

        if (
            turma
        ) {

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
                turma.room ||
                "";

            definirProfessorAtual(
                turma
            );

            classYear.value =
                turma.schoolYear;

            classCapacity.value =
                turma.capacity;

            classStudents.value =
                quantidadeAlunosTurma(
                    turma
                );

            classStatus.value =
                turma.status;

        } else {

            classModalTitle.textContent =
                "Nova turma";

            classId.value =
                "";

            definirProfessorAtual();

            classYear.value =
                activeSchoolYear?.year ??
                "";

            classCapacity.value =
                30;

            classStudents.value =
                0;

            classStatus.value =
                "Ativa";
        }

        abrirModal(
            classModal,
            className
        );
    }


    function nomeTurmaDuplicado(
        nome,
        ano,
        idAtual
    ) {

        const nomeNormalizado =
            normalizarTexto(
                nome
            );

        return classes.some(
            turma =>
                Number(
                    turma.id
                ) !== Number(
                    idAtual
                ) &&
                Number(
                    turma.schoolYear
                ) === Number(
                    ano
                ) &&
                normalizarTexto(
                    turma.name
                ) === nomeNormalizado
        );
    }


    async function salvarTurma(
        event
    ) {

        event.preventDefault();

        limparAvisosFormulario();

        if (
            !classForm.checkValidity()
        ) {

            classForm.reportValidity();

            return;
        }

        const id =
            classId.value
                ? Number(
                    classId.value
                )
                : null;

        const existente =
            id !== null
                ? encontrarTurma(
                    id
                )
                : null;

        const nome =
            className.value
                .trim();

        const ano =
            Number(
                classYear.value
            );

        const capacidade =
            Number(
                classCapacity.value
            );

        if (
            nomeTurmaDuplicado(
                nome,
                ano,
                id
            )
        ) {

            duplicateClassWarning.textContent =
                "Já existe uma turma com esse nome nesse ano letivo.";

            duplicateClassWarning.classList.add(
                "active"
            );

            className.focus();

            return;
        }

        const quantidadeAtual =
            existente
                ? quantidadeAlunosTurma(
                    existente
                )
                : 0;

        if (
            !Number.isInteger(
                capacidade
            ) ||
            capacidade < 1 ||
            capacidade > 100
        ) {

            classCapacity.reportValidity();

            return;
        }

        if (
            capacidade <
            quantidadeAtual
        ) {

            capacityWarning.textContent =
                `A turma já possui ${quantidadeAtual} aluno(s).`;

            capacityWarning.classList.add(
                "active"
            );

            classCapacity.focus();

            return;
        }

        const professor =
            obterProfessorFormulario();

        if (
            !professor.ok
        ) {

            classTeacher.setCustomValidity(
                "Selecione um professor já cadastrado ou deixe o campo vazio."
            );

            classTeacher.reportValidity();

            return;
        }

        classTeacher.setCustomValidity(
            ""
        );

        const dados = {

            id,

            name:
                nome,

            grade:
                classGrade.value,

            shift:
                classShift.value,

            room:
                classRoom.value
                    .trim(),

            teacher:
                professor.name,

            teacherId:
                professor.id,

            capacity:
                capacidade,

            schoolYear:
                ano,

            status:
                classStatus.value
        };

        const botaoSubmit =
            classForm.querySelector(
                '[type="submit"]'
            );

        if (
            botaoSubmit
        ) {

            botaoSubmit.disabled =
                true;
        }

        try {

            const resultado =
                await salvarTurmaServidor(
                    dados
                );

            if (
                !resultado.ok
            ) {

                const mensagem =
                    resultado.data?.message ||
                    "Não foi possível salvar a turma.";

                if (
                    mensagem
                        .toLowerCase()
                        .includes(
                            "já existe"
                        )
                ) {

                    duplicateClassWarning.textContent =
                        mensagem;

                    duplicateClassWarning.classList.add(
                        "active"
                    );

                    return;
                }

                if (
                    mensagem
                        .toLowerCase()
                        .includes(
                            "capacidade"
                        )
                ) {

                    capacityWarning.textContent =
                        mensagem;

                    capacityWarning.classList.add(
                        "active"
                    );

                    return;
                }

                alert(
                    mensagem
                );

                return;
            }

            await Promise.all([
                carregarTurmasServidor(),
                carregarAlunosServidor()
            ]);

            preencherDatalistProfessores();

            renderClasses();

            fecharModal(
                classModal
            );

        } catch (error) {

            console.error(
                "Erro ao salvar turma:",
                error
            );

            alert(
                "Não foi possível salvar a turma. Tente novamente."
            );

        } finally {

            if (
                botaoSubmit
            ) {

                botaoSubmit.disabled =
                    false;
            }
        }
    }


    /*====================================================
                    VISUALIZAÇÃO
    ====================================================*/

    function abrirVisualizacao(
        turma
    ) {

        viewClassName.textContent =
            turma.name;

        viewClassGrade.textContent =
            turma.grade;

        viewClassShift.textContent =
            turma.shift;

        viewClassTeacher.textContent =
            turma.teacher ||
            "Sem professor";

        viewClassRoom.textContent =
            turma.room ||
            "-";

        viewClassStudents.textContent =
            String(
                quantidadeAlunosTurma(
                    turma
                )
            );

        viewClassYear.textContent =
            String(
                turma.schoolYear
            );

        viewClassStatus.textContent =
            turma.status;

        abrirModal(
            classViewModal,
            classViewClose
        );
    }


    /*====================================================
                GERENCIAMENTO DE ALUNOS
    ====================================================*/

    function abrirGerenciadorAlunos(
        turma
    ) {

        if (
            !turmaPertenceAnoAtivo(
                turma
            )
        ) {

            alert(
                "O gerenciamento de alunos está disponível apenas para turmas do ano letivo ativo."
            );

            return;
        }

        managerClassId =
            Number(
                turma.id
            );

        managerStudentSearch.value =
            "";

        renderGerenciadorAlunos();

        abrirModal(
            studentsManagerModal,
            managerStudentSearch
        );
    }


    function fecharGerenciadorAlunos() {

        managerClassId =
            null;

        managerStudentSearch.value =
            "";

        fecharModal(
            studentsManagerModal
        );
    }


    function criarCardAluno(
        aluno,
        configuracao
    ) {

        const card =
            document.createElement(
                "div"
            );

        card.className =
            "manager-student-card";

        const nomeSeguro =
            escapeHtml(
                aluno.name
            );

        const matriculaSegura =
            escapeHtml(
                aluno.registration ||
                ""
            );

        const subtituloSeguro =
            escapeHtml(
                configuracao.subtitulo ||
                ""
            );

        const idSeguro =
            escapeHtml(
                aluno.id
            );

        const textoBotao =
            escapeHtml(
                configuracao.textoBotao
            );

        const classeBotao =
            configuracao.remover
                ? "manager-student-button remove"
                : "manager-student-button";

        const acao =
            configuracao.remover
                ? "remove"
                : "add";

        const disabled =
            configuracao.disabled
                ? "disabled"
                : "";

        card.innerHTML = `
            <div
                class="manager-student-avatar"
                aria-hidden="true"
            >
                <i
                    class="fa-solid fa-user-graduate"
                    aria-hidden="true"
                ></i>
            </div>

            <div class="manager-student-info">

                <strong>
                    ${nomeSeguro}
                </strong>

                <span>
                    ${matriculaSegura}
                    ${
                        subtituloSeguro
                            ? ` • ${subtituloSeguro}`
                            : ""
                    }
                </span>

            </div>

            <button
                type="button"
                class="${classeBotao}"
                data-manager-action="${acao}"
                data-student-id="${idSeguro}"
                aria-label="${
                    configuracao.remover
                        ? `Remover ${nomeSeguro} da turma`
                        : `${textoBotao} ${nomeSeguro}`
                }"
                ${disabled}
            >
                ${textoBotao}
            </button>
        `;

        return card;
    }


    function renderGerenciadorAlunos() {

        const turma =
            encontrarTurma(
                managerClassId
            );

        if (
            !turma
        ) {

            if (
                studentsManagerModal.classList.contains(
                    "active"
                )
            ) {

                fecharGerenciadorAlunos();
            }

            return;
        }

        managerClassName.textContent =
            turma.name;

        const termo =
            normalizarTexto(
                managerStudentSearch.value
            );

        const vinculados =
            ordenarPorNome(
                students.filter(
                    aluno =>
                        Number(
                            aluno.classId
                        ) === Number(
                            turma.id
                        ) &&
                        normalizarTexto(
                            [
                                aluno.name,
                                aluno.registration
                            ].join(" ")
                        ).includes(
                            termo
                        )
                )
            );

        const disponiveis =
            ordenarPorNome(
                students.filter(
                    aluno =>
                        Number(
                            aluno.classId
                        ) !== Number(
                            turma.id
                        ) &&
                        normalizarTexto(
                            [
                                aluno.name,
                                aluno.registration,
                                aluno.className
                            ].join(" ")
                        ).includes(
                            termo
                        )
                )
            );

        const ocupacao =
            quantidadeAlunosTurma(
                turma
            );

        const capacidade =
            Math.max(
                numeroSeguro(
                    turma.capacity,
                    1
                ),
                1
            );

        const cheia =
            ocupacao >=
            capacidade;

        const percentual =
            Math.min(
                ocupacao /
                capacidade *
                100,
                100
            );

        managerCapacityText.textContent =
            `${ocupacao}/${capacidade}`;

        managerCapacityBar.style.width =
            `${percentual}%`;

        managerCapacityBarContainer.classList.toggle(
            "full",
            cheia
        );

        linkedStudentsCounter.textContent =
            String(
                ocupacao
            );

        linkedStudentsList.replaceChildren();

        availableStudentsList.replaceChildren();

        linkedStudentsEmpty.classList.toggle(
            "active",
            vinculados.length === 0
        );

        availableStudentsEmpty.classList.toggle(
            "active",
            disponiveis.length === 0
        );

        vinculados.forEach(
            function (aluno) {

                linkedStudentsList.appendChild(
                    criarCardAluno(
                        aluno,
                        {
                            remover:
                                true,

                            textoBotao:
                                "Remover",

                            subtitulo:
                                turma.name,

                            disabled:
                                false
                        }
                    )
                );
            }
        );

        disponiveis.forEach(
            function (aluno) {

                const possuiTurma =
                    Boolean(
                        aluno.classId
                    );

                const podeAlterar =
                    aluno.available ===
                        true &&
                    !cheia;

                availableStudentsList.appendChild(
                    criarCardAluno(
                        aluno,
                        {
                            remover:
                                false,

                            textoBotao:
                                possuiTurma
                                    ? "Transferir"
                                    : "Adicionar",

                            subtitulo:
                                aluno.className ||
                                (
                                    aluno.available ===
                                        false
                                        ? "Aluno indisponível"
                                        : "Sem turma"
                                ),

                            disabled:
                                !podeAlterar
                        }
                    )
                );
            }
        );
    }


    async function processarAcaoAluno(
        botao
    ) {

        const turma =
            encontrarTurma(
                managerClassId
            );

        if (
            !turma
        ) {

            return;
        }

        const alunoId =
            Number(
                botao.dataset.studentId
            );

        const aluno =
            encontrarAluno(
                alunoId
            );

        if (
            !aluno
        ) {

            return;
        }

        const acao =
            botao.dataset.managerAction ===
            "remove"
                ? "remove"
                : "assign";

        botao.disabled =
            true;

        try {

            const resultado =
                await alterarMatriculaServidor(
                    acao,
                    aluno.id,
                    turma.id
                );

            if (
                !resultado.ok
            ) {

                alert(
                    resultado.data?.message ||
                    "Não foi possível alterar a matrícula do aluno."
                );

                return;
            }

            await Promise.all([
                carregarTurmasServidor(),
                carregarAlunosServidor()
            ]);

            renderClasses();

            renderGerenciadorAlunos();

            if (
                classModal.classList.contains(
                    "active"
                ) &&
                classId.value
            ) {

                const turmaEditada =
                    encontrarTurma(
                        classId.value
                    );

                if (
                    turmaEditada
                ) {

                    classStudents.value =
                        quantidadeAlunosTurma(
                            turmaEditada
                        );
                }
            }

        } catch (error) {

            console.error(
                "Erro ao alterar matrícula:",
                error
            );

            alert(
                "Não foi possível alterar a matrícula do aluno. Tente novamente."
            );

        } finally {

            if (
                botao.isConnected
            ) {

                botao.disabled =
                    false;
            }
        }
    }


    /*====================================================
                    EXCLUSÃO
    ====================================================*/

    function abrirExclusao(
        turma
    ) {

        classToDelete =
            Number(
                turma.id
            );

        deleteClassMessage.textContent =
            `Deseja realmente excluir a turma "${turma.name}"? ` +
            "Se houver histórico vinculado, o sistema impedirá a exclusão e pedirá a inativação.";

        deleteClassConfirm.hidden =
            false;

        abrirModal(
            deleteClassModal,
            deleteClassCancel
        );
    }


    function fecharExclusao() {

        classToDelete =
            null;

        deleteClassConfirm.hidden =
            false;

        fecharModal(
            deleteClassModal
        );
    }


    async function confirmarExclusao() {

        if (
            classToDelete ===
            null
        ) {

            return;
        }

        const id =
            classToDelete;

        deleteClassConfirm.disabled =
            true;

        try {

            const resultado =
                await excluirTurmaServidor(
                    id
                );

            if (
                !resultado.ok
            ) {

                deleteClassMessage.textContent =
                    resultado.data?.message ||
                    "Não foi possível excluir a turma.";

                if (
                    resultado.status ===
                    409
                ) {

                    deleteClassConfirm.hidden =
                        true;
                }

                return;
            }

            classToDelete =
                null;

            await Promise.all([
                carregarTurmasServidor(),
                carregarAlunosServidor()
            ]);

            renderClasses();

            deleteClassConfirm.hidden =
                false;

            fecharModal(
                deleteClassModal
            );

        } catch (error) {

            console.error(
                "Erro ao excluir turma:",
                error
            );

            deleteClassMessage.textContent =
                "Não foi possível excluir a turma. Tente novamente.";

        } finally {

            deleteClassConfirm.disabled =
                false;
        }
    }


    /*====================================================
                AÇÕES DA TABELA
    ====================================================*/

    tableBody.addEventListener(
        "click",
        function (event) {

            if (
                !(
                    event.target instanceof
                    Element
                )
            ) {

                return;
            }

            const button =
                event.target.closest(
                    "[data-action]"
                );

            if (
                !button ||
                !tableBody.contains(
                    button
                ) ||
                button.disabled
            ) {

                return;
            }

            const turma =
                encontrarTurma(
                    button.dataset.id
                );

            if (
                !turma
            ) {

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


    function tratarCliqueGerenciador(
        event
    ) {

        if (
            !(
                event.target instanceof
                Element
            )
        ) {

            return;
        }

        const button =
            event.target.closest(
                "[data-manager-action]"
            );

        if (
            !button ||
            button.disabled
        ) {

            return;
        }

        processarAcaoAluno(
            button
        );
    }


    linkedStudentsList.addEventListener(
        "click",
        tratarCliqueGerenciador
    );

    availableStudentsList.addEventListener(
        "click",
        tratarCliqueGerenciador
    );


    /*====================================================
                    EVENTOS
    ====================================================*/

    newClassButton.addEventListener(
        "click",
        function () {

            if (
                !activeSchoolYear
            ) {

                alert(
                    "Nenhum ano letivo ativo foi encontrado."
                );

                return;
            }

            abrirModalTurma();
        }
    );


    classForm.addEventListener(
        "submit",
        salvarTurma
    );


    searchInput.addEventListener(
        "input",
        renderClasses
    );


    searchInput.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key !==
                    "Escape" ||
                searchInput.value ===
                    ""
            ) {

                return;
            }

            event.stopPropagation();

            searchInput.value =
                "";

            renderClasses();
        }
    );


    shiftFilter.addEventListener(
        "change",
        renderClasses
    );


    statusFilter.addEventListener(
        "change",
        renderClasses
    );


    managerStudentSearch.addEventListener(
        "input",
        renderGerenciadorAlunos
    );


    managerStudentSearch.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key !==
                    "Escape" ||
                managerStudentSearch.value ===
                    ""
            ) {

                return;
            }

            event.stopPropagation();

            managerStudentSearch.value =
                "";

            renderGerenciadorAlunos();
        }
    );


    className.addEventListener(
        "input",
        function () {

            duplicateClassWarning.classList.remove(
                "active"
            );
        }
    );


    classCapacity.addEventListener(
        "input",
        function () {

            capacityWarning.classList.remove(
                "active"
            );
        }
    );


    classTeacher.addEventListener(
        "input",
        function () {

            selectedTeacherId =
                null;

            classTeacher.setCustomValidity(
                ""
            );
        }
    );


    classTeacher.addEventListener(
        "change",
        function () {

            const professor =
                obterProfessorFormulario();

            classTeacher.setCustomValidity(
                professor.ok
                    ? ""
                    : "Selecione um professor já cadastrado ou deixe o campo vazio."
            );
        }
    );


    /*====================================================
                    FECHAR MODAIS
    ====================================================*/

    classModalClose.addEventListener(
        "click",
        function () {

            fecharModal(
                classModal
            );
        }
    );


    classCancelButton.addEventListener(
        "click",
        function () {

            fecharModal(
                classModal
            );
        }
    );


    classModalOverlay.addEventListener(
        "click",
        function () {

            fecharModal(
                classModal
            );
        }
    );


    classViewClose.addEventListener(
        "click",
        function () {

            fecharModal(
                classViewModal
            );
        }
    );


    classViewOverlay.addEventListener(
        "click",
        function () {

            fecharModal(
                classViewModal
            );
        }
    );


    studentsManagerClose.addEventListener(
        "click",
        fecharGerenciadorAlunos
    );


    studentsManagerOverlay.addEventListener(
        "click",
        fecharGerenciadorAlunos
    );


    deleteClassCancel.addEventListener(
        "click",
        fecharExclusao
    );


    deleteClassOverlay.addEventListener(
        "click",
        fecharExclusao
    );


    deleteClassConfirm.addEventListener(
        "click",
        confirmarExclusao
    );


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

            if (
                deleteClassModal.classList.contains(
                    "active"
                )
            ) {

                fecharExclusao();

                return;
            }

            if (
                studentsManagerModal.classList.contains(
                    "active"
                )
            ) {

                fecharGerenciadorAlunos();

                return;
            }

            if (
                classViewModal.classList.contains(
                    "active"
                )
            ) {

                fecharModal(
                    classViewModal
                );

                return;
            }

            if (
                classModal.classList.contains(
                    "active"
                )
            ) {

                fecharModal(
                    classModal
                );
            }
        }
    );


    /*====================================================
                    LOGOUT PHP
    ====================================================*/

    async function fazerLogout() {

        if (
            logoutEmAndamento
        ) {

            return;
        }

        logoutEmAndamento =
            true;

        if (
            logoutButton
        ) {

            logoutButton.setAttribute(
                "aria-busy",
                "true"
            );

            if (
                "disabled" in
                logoutButton
            ) {

                logoutButton.disabled =
                    true;
            }
        }

        try {

            const response =
                await fetch(
                    AUTH_LOGOUT_URL,
                    {
                        method: "POST",
                        credentials: "same-origin",
                        cache: "no-store",
                        headers: {
                            "Accept":
                                "application/json"
                        }
                    }
                );

            const data =
                await lerJsonSeguro(
                    response
                );

            if (
                !response.ok ||
                !data?.success
            ) {

                throw new Error(
                    data?.message ||
                    "O servidor não confirmou o logout."
                );
            }

            limparSessaoCompatibilidade();

            window.location.replace(
                PAGINA_LOGIN
            );

        } catch (error) {

            console.error(
                "Erro ao encerrar a sessão:",
                error
            );

            alert(
                "Não foi possível encerrar a sessão. Tente novamente."
            );

            logoutEmAndamento =
                false;

            if (
                logoutButton
            ) {

                logoutButton.setAttribute(
                    "aria-busy",
                    "false"
                );

                if (
                    "disabled" in
                    logoutButton
                ) {

                    logoutButton.disabled =
                        false;
                }
            }
        }
    }


    logoutButton?.addEventListener(
        "click",
        fazerLogout
    );


    /*====================================================
            ATUALIZAÇÃO ENTRE ABAS / RETORNO
    ====================================================*/

    async function atualizarAoRetomar() {

        if (
            document.visibilityState !==
                "visible" ||
            recarregandoDados ||
            existeModalAtivo()
        ) {

            return;
        }

        const carregou =
            await carregarDadosServidor(
                false
            );

        if (
            carregou
        ) {

            preencherDatalistProfessores();

            renderClasses();
        }
    }


    document.addEventListener(
        "visibilitychange",
        atualizarAoRetomar
    );


    /*====================================================
                    INICIALIZAÇÃO
    ====================================================*/

    /*
        O ano da nova turma passa a vir do
        ano letivo ativo cadastrado no banco.
    */

    classYear.readOnly =
        true;

    classYear.setAttribute(
        "aria-readonly",
        "true"
    );


    classStudents.readOnly =
        true;

    classStudents.setAttribute(
        "aria-readonly",
        "true"
    );


    const carregou =
        await carregarDadosServidor();


    if (
        !carregou
    ) {

        return;
    }


    preencherDatalistProfessores();

    renderClasses();

});
