/*====================================================
                ALUNOS - PRIMEWAY SCHOOL
====================================================*/


document.addEventListener("DOMContentLoaded", async function () {
    await window.PrimeWayStorage?.ready;

    /*====================================================
                STORAGE / AUTENTICAÇÃO
    ====================================================*/

    const STORAGE_KEY =
        "primewayStudents";

    const CLASSES_STORAGE_KEY =
        "primewayClasses";

    const STUDENTS_API_URL =
        "../api/alunos/index.php";

    const STUDENT_SAVE_API_URL =
        "../api/alunos/salvar.php";

    const STUDENT_DELETE_API_URL =
        "../api/alunos/excluir.php";

    const CLASSES_API_URL =
        "../api/turmas/index.php";


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
            COMPATIBILIDADE COM O FRONT-END ATUAL
    ====================================================*/

    /*
        A sessão PHP é a fonte de verdade.

        O sessionStorage continua sendo mantido
        temporariamente apenas para compatibilidade
        com páginas que ainda não foram migradas.
    */

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


    /*====================================================
                RESPOSTA JSON SEGURA
    ====================================================*/

    async function lerJsonSeguro(
        response
    ) {

        try {

            return await response.json();

        } catch {

            return null;
        }
    }


    /*====================================================
                VERIFICAÇÃO DE SESSÃO PHP
    ====================================================*/

    async function obterSessaoServidor() {

        try {

            const response =
                await fetch(
                    AUTH_SESSION_URL,
                    {
                        method:
                            "GET",

                        credentials:
                            "same-origin",

                        cache:
                            "no-store",

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
                ).trim();


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

        } catch (
            error
        ) {

            console.error(
                "Erro ao validar a sessão de Alunos:",
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
            "#studentsTableBody"
        );

    const emptyState =
        document.querySelector(
            "#studentsEmpty"
        );

    const searchInput =
        document.querySelector(
            "#studentSearch"
        );

    const classFilter =
        document.querySelector(
            "#classFilter"
        );

    const statusFilter =
        document.querySelector(
            "#statusFilter"
        );

    const newStudentButton =
        document.querySelector(
            "#newStudentButton"
        );


    /* CARDS */

    const totalStudents =
        document.querySelector(
            "#totalStudents"
        );

    const activeStudents =
        document.querySelector(
            "#activeStudents"
        );

    const newStudents =
        document.querySelector(
            "#newStudents"
        );

    const pendingStudents =
        document.querySelector(
            "#pendingStudents"
        );


    /* FORMULÁRIO */

    const studentModal =
        document.querySelector(
            "#studentModal"
        );

    const studentModalOverlay =
        document.querySelector(
            ".student-modal-overlay"
        );

    const studentModalClose =
        document.querySelector(
            "#studentModalClose"
        );

    const studentCancelButton =
        document.querySelector(
            "#studentCancelButton"
        );

    const studentModalTitle =
        document.querySelector(
            "#studentModalTitle"
        );

    const studentForm =
        document.querySelector(
            "#studentForm"
        );

    const studentId =
        document.querySelector(
            "#studentId"
        );

    const studentName =
        document.querySelector(
            "#studentName"
        );

    const studentRegistration =
        document.querySelector(
            "#studentRegistration"
        );

    const studentEmail =
        document.querySelector(
            "#studentEmail"
        );

    const studentPassword =
        document.querySelector(
            "#studentPassword"
        );

    const studentPasswordHint =
        document.querySelector(
            "#studentPasswordHint"
        );

    const studentPhone =
        document.querySelector(
            "#studentPhone"
        );

    const studentDocument =
        document.querySelector(
            "#studentDocument"
        );

    const studentBirthDate =
        document.querySelector(
            "#studentBirthDate"
        );

    const studentClass =
        document.querySelector(
            "#studentClass"
        );

    const studentAverage =
        document.querySelector(
            "#studentAverage"
        );

    const studentAttendance =
        document.querySelector(
            "#studentAttendance"
        );

    const studentStatus =
        document.querySelector(
            "#studentStatus"
        );


    /* VISUALIZAÇÃO */

    const studentViewModal =
        document.querySelector(
            "#studentViewModal"
        );

    const studentViewOverlay =
        document.querySelector(
            ".student-view-overlay"
        );

    const studentViewClose =
        document.querySelector(
            "#studentViewClose"
        );

    const viewStudentName =
        document.querySelector(
            "#viewStudentName"
        );

    const viewStudentRegistration =
        document.querySelector(
            "#viewStudentRegistration"
        );

    const viewStudentClass =
        document.querySelector(
            "#viewStudentClass"
        );

    const viewStudentAverage =
        document.querySelector(
            "#viewStudentAverage"
        );

    const viewStudentAttendance =
        document.querySelector(
            "#viewStudentAttendance"
        );

    const viewStudentStatus =
        document.querySelector(
            "#viewStudentStatus"
        );


    /* SESSÃO */

    const logoutButton =
        document.querySelector(
            "#logoutButton"
        );


    /*====================================================
                VALIDAÇÃO DA ESTRUTURA
    ====================================================*/

    const elementosObrigatorios = [

        tableBody,
        emptyState,

        searchInput,
        classFilter,
        statusFilter,

        newStudentButton,

        totalStudents,
        activeStudents,
        newStudents,
        pendingStudents,

        studentModal,
        studentModalOverlay,
        studentModalClose,
        studentCancelButton,
        studentModalTitle,
        studentForm,

        studentId,
        studentName,
        studentRegistration,
        studentEmail,
        studentPassword,
        studentPasswordHint,
        studentPhone,
        studentDocument,
        studentBirthDate,
        studentClass,
        studentAverage,
        studentAttendance,
        studentStatus,

        studentViewModal,
        studentViewOverlay,
        studentViewClose,

        viewStudentName,
        viewStudentRegistration,
        viewStudentClass,
        viewStudentAverage,
        viewStudentAttendance,
        viewStudentStatus

    ];


    if (
        elementosObrigatorios.some(
            elemento =>
                !elemento
        )
    ) {

        console.error(
            "Alunos: a estrutura esperada da página não foi encontrada."
        );

        return;
    }


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


    const defaultClasses = [

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


    /*====================================================
                    ESTADO DA PÁGINA
    ====================================================*/

    let students =
        carregarAlunos();


    const focoAnteriorPorModal =
        new WeakMap();


    /*====================================================
                    UTILITÁRIOS
    ====================================================*/

    async function requisicaoJson(
        url,
        opcoes = {}
    ) {

        const {
            headers: cabecalhosExtras = {},
            ...opcoesFetch
        } = opcoes;


        const response =
            await fetch(
                url,
                {
                    ...opcoesFetch,

                    credentials:
                        "same-origin",

                    cache:
                        "no-store",

                    headers: {

                        "Accept":
                            "application/json",

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


    async function carregarAlunosServidor() {

        const {
            response,
            data
        } =
            await requisicaoJson(
                STUDENTS_API_URL,
                {
                    method:
                        "GET"
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


        return data.students
            .map(
                normalizarAluno
            )
            .filter(
                Boolean
            );
    }


    async function carregarTurmasServidor() {

        const {
            response,
            data
        } =
            await requisicaoJson(
                CLASSES_API_URL,
                {
                    method:
                        "GET"
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


        localStorage.setItem(
            CLASSES_STORAGE_KEY,
            JSON.stringify(
                data.classes
            )
        );


        return data.classes;
    }


    async function salvarAlunoServidor(
        dados
    ) {

        const {
            response,
            data
        } =
            await requisicaoJson(
                STUDENT_SAVE_API_URL,
                {
                    method:
                        "POST",

                    body:
                        JSON.stringify(
                            dados
                        )
                }
            );


        if (
            !response.ok ||
            !data?.success
        ) {

            throw new Error(
                data?.message ||
                "Não foi possível salvar o aluno."
            );
        }


        return data.student;
    }


    async function excluirAlunoServidor(
        id
    ) {

        const {
            response,
            data
        } =
            await requisicaoJson(
                STUDENT_DELETE_API_URL,
                {
                    method:
                        "POST",

                    body:
                        JSON.stringify(
                            {
                                id
                            }
                        )
                }
            );


        if (
            !response.ok ||
            !data?.success
        ) {

            throw new Error(
                data?.message ||
                "Não foi possível excluir o aluno."
            );
        }
    }


    async function atualizarAlunosServidor() {

        students =
            await carregarAlunosServidor();


        salvarAlunos(
            students
        );
    }


    function clonarAlunosPadrao() {

        return [];
    }


    function clonarTurmasPadrao() {

        return [];
    }


    function normalizarTexto(
        valor
    ) {

        return String(
            valor ?? ""
        )
            .normalize(
                "NFD"
            )
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .toLowerCase()
            .trim();
    }


    function escapeHtml(
        value
    ) {

        return String(
            value ?? ""
        )
            .replaceAll(
                "&",
                "&amp;"
            )
            .replaceAll(
                "<",
                "&lt;"
            )
            .replaceAll(
                ">",
                "&gt;"
            )
            .replaceAll(
                '"',
                "&quot;"
            )
            .replaceAll(
                "'",
                "&#039;"
            );
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


    function formatarMedia(
        valor
    ) {

        return numeroSeguro(
            valor
        ).toFixed(
            1
        );
    }


    function formatarFrequencia(
        valor
    ) {

        return `${
            numeroSeguro(
                valor
            )
        }%`;
    }


    function obterClasseStatus(
        status
    ) {

        const statusNormalizado =
            normalizarTexto(
                status
            );


        if (
            statusNormalizado ===
            "ativo"
        ) {

            return "active";
        }


        if (
            statusNormalizado ===
            "inativo"
        ) {

            return "inactive";
        }


        return "pending";
    }


    function gerarNovoId() {

        const maiorId =
            students.reduce(
                function (
                    maior,
                    student
                ) {

                    const idAtual =
                        Number(
                            student.id
                        );


                    return Number.isFinite(
                        idAtual
                    )
                        ? Math.max(
                            maior,
                            idAtual
                        )
                        : maior;
                },
                0
            );


        return Math.max(
            Date.now(),
            maiorId + 1
        );
    }


    /*====================================================
                    COMPATIBILIDADE
    ====================================================*/

    function obterTurmaAluno(
        aluno
    ) {

        return (
            aluno?.className ||
            aluno?.class ||
            aluno?.turma ||
            ""
        );
    }


    function normalizarAluno(
        aluno,
        indice = 0
    ) {

        if (
            !aluno ||
            typeof aluno !==
                "object"
        ) {

            return null;
        }


        const idConvertido =
            Number(
                aluno.id
            );


        const normalizado = {

            ...aluno,

            id:
                Number.isFinite(
                    idConvertido
                )
                    ? idConvertido
                    : Date.now() + indice,

            name:
                String(
                    aluno.name ??
                    ""
                ).trim(),

            registration:
                String(
                    aluno.registration ??
                    ""
                ).trim(),

            className:
                String(
                    obterTurmaAluno(
                        aluno
                    )
                ).trim(),

            average:
                numeroSeguro(
                    aluno.average
                ),

            attendance:
                numeroSeguro(
                    aluno.attendance
                ),

            status:
                String(
                    aluno.status ||
                    "Pendente"
                ),

            newStudent:
                aluno.newStudent ===
                    true ||
                aluno.newStudent ===
                    "true"
        };


        delete normalizado.class;

        delete normalizado.turma;


        return normalizado;
    }


    /*====================================================
                    STORAGE - ALUNOS
    ====================================================*/

    function carregarAlunos() {

        try {

            const saved =
                localStorage.getItem(
                    STORAGE_KEY
                );


            if (!saved) {

                return clonarAlunosPadrao();
            }


            const dados =
                JSON.parse(
                    saved
                );


            if (
                !Array.isArray(
                    dados
                )
            ) {

                return clonarAlunosPadrao();
            }


            return dados
                .map(
                    normalizarAluno
                )
                .filter(
                    Boolean
                );


        } catch (
            erro
        ) {

            console.warn(
                "Erro ao carregar alunos:",
                erro
            );


            return clonarAlunosPadrao();
        }
    }


    function salvarAlunos(
        lista = students
    ) {

        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(
                    lista
                )
            );


            return true;


        } catch (
            erro
        ) {

            console.error(
                "Erro ao salvar alunos:",
                erro
            );


            return false;
        }
    }


    /*====================================================
                    STORAGE - TURMAS
    ====================================================*/

    function carregarTurmas() {

        try {

            const saved =
                localStorage.getItem(
                    CLASSES_STORAGE_KEY
                );


            if (!saved) {

                return clonarTurmasPadrao();
            }


            const turmas =
                JSON.parse(
                    saved
                );


            if (
                !Array.isArray(
                    turmas
                )
            ) {

                return clonarTurmasPadrao();
            }


            return turmas.filter(
                function (
                    turma
                ) {

                    return (
                        turma &&
                        typeof turma ===
                            "object" &&
                        String(
                            turma.name ??
                            ""
                        ).trim()
                    );
                }
            );


        } catch (
            erro
        ) {

            console.warn(
                "Erro ao carregar turmas:",
                erro
            );


            return clonarTurmasPadrao();
        }
    }


    function turmaEstaAtiva(
        turma
    ) {

        const status =
            normalizarTexto(
                turma.status
            );


        return (
            !status ||
            status ===
                "ativa" ||
            status ===
                "ativo"
        );
    }


    function ordenarNomesTurmas(
        nomes
    ) {

        return [
            ...nomes
        ].sort(
            function (
                a,
                b
            ) {

                return a.localeCompare(
                    b,
                    "pt-BR",
                    {
                        numeric:
                            true,

                        sensitivity:
                            "base"
                    }
                );
            }
        );
    }


    /*====================================================
                SELECT DE TURMAS DO FORM
    ====================================================*/

    function preencherSelectTurmas(
        turmaAtual = ""
    ) {

        const turmas =
            carregarTurmas();


        const turmasAtivas =
            turmas
                .filter(
                    turmaEstaAtiva
                )
                .map(
                    turma =>
                        String(
                            turma.name
                        ).trim()
                )
                .filter(
                    Boolean
                );


        const nomesAtivos =
            ordenarNomesTurmas(
                new Set(
                    turmasAtivas
                )
            );


        studentClass.replaceChildren();


        const placeholder =
            document.createElement(
                "option"
            );


        placeholder.value =
            "";


        placeholder.textContent =
            "Sem turma (vincular depois)";


        studentClass.appendChild(
            placeholder
        );


        nomesAtivos.forEach(
            function (
                nomeTurma
            ) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    nomeTurma;


                option.textContent =
                    nomeTurma;


                studentClass.appendChild(
                    option
                );
            }
        );


        if (
            turmaAtual &&
            !nomesAtivos.includes(
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
                `${turmaAtual} (indisponível)`;


            studentClass.appendChild(
                option
            );
        }


        studentClass.value =
            turmaAtual;
    }


    /*====================================================
                FILTRO DE TURMAS
    ====================================================*/

    function obterNomesTurmasParaFiltro() {

        const nomes =
            new Set();


        carregarTurmas().forEach(
            function (
                turma
            ) {

                const nome =
                    String(
                        turma.name ??
                        ""
                    ).trim();


                if (nome) {

                    nomes.add(
                        nome
                    );
                }
            }
        );


        students.forEach(
            function (
                student
            ) {

                if (
                    student.className
                ) {

                    nomes.add(
                        student.className
                    );
                }
            }
        );


        return ordenarNomesTurmas(
            nomes
        );
    }


    function preencherFiltroTurmas() {

        const atual =
            classFilter.value;


        const nomesTurmas =
            obterNomesTurmasParaFiltro();


        classFilter.replaceChildren();


        const todas =
            document.createElement(
                "option"
            );


        todas.value =
            "";


        todas.textContent =
            "Todas as turmas";


        classFilter.appendChild(
            todas
        );


        nomesTurmas.forEach(
            function (
                nomeTurma
            ) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    nomeTurma;


                option.textContent =
                    nomeTurma;


                classFilter.appendChild(
                    option
                );
            }
        );


        if (
            atual &&
            nomesTurmas.includes(
                atual
            )
        ) {

            classFilter.value =
                atual;
        }
    }


    /*====================================================
                    RESUMO
    ====================================================*/

    function atualizarResumo() {

        totalStudents.textContent =
            String(
                students.length
            );


        activeStudents.textContent =
            String(
                students.filter(
                    student =>
                        normalizarTexto(
                            student.status
                        ) ===
                            "ativo"
                ).length
            );


        newStudents.textContent =
            String(
                students.filter(
                    student =>
                        student.newStudent
                ).length
            );


        pendingStudents.textContent =
            String(
                students.filter(
                    student =>
                        normalizarTexto(
                            student.status
                        ) ===
                            "pendente"
                ).length
            );
    }


    /*====================================================
                    FILTROS
    ====================================================*/

    function pegarAlunosFiltrados() {

        const termo =
            normalizarTexto(
                searchInput.value
            );


        const turma =
            classFilter.value;


        const status =
            statusFilter.value;


        return students.filter(
            function (
                student
            ) {

                const texto =
                    normalizarTexto(
                        [
                            student.name,
                            student.registration,
                            student.className
                        ].join(
                            " "
                        )
                    );


                return (
                    texto.includes(
                        termo
                    ) &&
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

        tableBody.replaceChildren();


        const filtrados =
            pegarAlunosFiltrados();


        emptyState.classList.toggle(
            "active",
            filtrados.length === 0
        );


        filtrados.forEach(
            function (
                student
            ) {

                const statusClass =
                    obterClasseStatus(
                        student.status
                    );


                const row =
                    document.createElement(
                        "tr"
                    );


                const nomeSeguro =
                    escapeHtml(
                        student.name
                    );


                const idSeguro =
                    escapeHtml(
                        student.id
                    );


                row.innerHTML = `

                    <td>

                        <div class="student-cell">

                            <div
                                class="student-avatar"
                                aria-hidden="true"
                            >

                                <i
                                    class="fa-solid fa-user-graduate"
                                    aria-hidden="true"
                                ></i>

                            </div>

                            <strong>
                                ${nomeSeguro}
                            </strong>

                        </div>

                    </td>

                    <td>
                        ${escapeHtml(student.registration)}
                    </td>

                    <td>
                        ${
                            student.className
                                ? escapeHtml(
                                    student.className
                                )
                                : "Sem turma"
                        }
                    </td>

                    <td>
                        ${formatarMedia(student.average)}
                    </td>

                    <td>
                        ${formatarFrequencia(student.attendance)}
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
                                class="student-action-button"
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
                                class="student-action-button delete"
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
            studentModal,
            studentViewModal
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

        if (!modal) {

            return;
        }


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

        if (!modal) {

            return;
        }


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
            (
                focoAnterior &&
                focoAnterior.isConnected &&
                typeof focoAnterior.focus ===
                    "function"
            )
                ? focoAnterior
                : newStudentButton;


        if (
            destinoFoco &&
            typeof destinoFoco.focus ===
                "function"
        ) {

            requestAnimationFrame(
                function () {

                    destinoFoco.focus();
                }
            );
        }
    }


    /*====================================================
                ABRIR FORMULÁRIO
    ====================================================*/

    function limparValidacoesFormulario() {

        studentName.setCustomValidity(
            ""
        );


        studentRegistration.setCustomValidity(
            ""
        );


        studentEmail.setCustomValidity(
            ""
        );


        studentPassword.setCustomValidity(
            ""
        );
    }


    function abrirModalAluno(
        student = null
    ) {

        studentForm.reset();


        limparValidacoesFormulario();


        if (student) {

            studentModalTitle.textContent =
                "Editar aluno";


            studentId.value =
                student.id;


            studentName.value =
                student.name;


            studentRegistration.value =
                student.registration;


            studentEmail.value =
                student.email ||
                "";


            studentPhone.value =
                student.phone ||
                "";


            studentDocument.value =
                student.document ||
                "";


            studentBirthDate.value =
                student.birthDate ||
                "";


            studentPassword.required =
                !student.hasAccess;


            studentPasswordHint.textContent =
                student.hasAccess
                    ? "Deixe em branco para manter a senha atual."
                    : "Defina uma senha para criar a conta de acesso.";


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


            studentPassword.required =
                true;


            studentPasswordHint.textContent =
                "Obrigatória para criar a conta de acesso.";


            preencherSelectTurmas();


            studentAverage.value =
                0;


            studentAttendance.value =
                100;


            studentStatus.value =
                "Ativo";
        }


        abrirModal(
            studentModal,
            studentName
        );
    }


    /*====================================================
                VALIDAR FORMULÁRIO
    ====================================================*/

    function validarCamposTexto() {

        const nome =
            studentName.value
                .trim();


        const matricula =
            studentRegistration.value
                .trim();


        const email =
            studentEmail.value
                .trim()
                .toLowerCase();


        const senha =
            studentPassword.value;


        studentName.setCustomValidity(
            nome
                ? ""
                : "Informe o nome do aluno."
        );


        if (!nome) {

            studentName.reportValidity();

            return null;
        }


        studentRegistration.setCustomValidity(
            matricula
                ? ""
                : "Informe a matrícula."
        );


        if (!matricula) {

            studentRegistration.reportValidity();

            return null;
        }


        studentEmail.setCustomValidity(
            email &&
            studentEmail.validity.valid
                ? ""
                : "Informe um e-mail de acesso válido."
        );


        if (
            !email ||
            !studentEmail.validity.valid
        ) {

            studentEmail.reportValidity();

            return null;
        }


        studentPassword.setCustomValidity(
            studentPassword.required &&
            senha.length < 8
                ? "A senha deve ter pelo menos 8 caracteres."
                : ""
        );


        if (
            studentPassword.required &&
            senha.length < 8
        ) {

            studentPassword.reportValidity();

            return null;
        }


        return {
            nome,
            matricula,
            email,
            senha
        };
    }


    function matriculaJaExiste(
        matricula,
        idAtual
    ) {

        const matriculaNormalizada =
            normalizarTexto(
                matricula
            );


        return students.some(
            function (
                student
            ) {

                return (
                    Number(
                        student.id
                    ) !==
                        Number(
                            idAtual
                        ) &&
                    normalizarTexto(
                        student.registration
                    ) ===
                        matriculaNormalizada
                );
            }
        );
    }


    /*====================================================
                    SALVAR
    ====================================================*/

    studentForm.addEventListener(
        "submit",
        async function (
            event
        ) {

            event.preventDefault();


            const textos =
                validarCamposTexto();


            if (!textos) {

                return;
            }


            const id =
                studentId.value
                    ? Number(
                        studentId.value
                    )
                    : null;


            if (
                matriculaJaExiste(
                    textos.matricula,
                    id
                )
            ) {

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
                        Number(
                            student.id
                        ) ===
                            Number(
                                id
                            )
                );


            const nomeTurmaSelecionada =
                studentClass.value.trim();


            const turmaSelecionada =
                nomeTurmaSelecionada
                    ? carregarTurmas().find(
                        turma =>
                            normalizarTexto(
                                turma.name
                            ) ===
                                normalizarTexto(
                                    nomeTurmaSelecionada
                                )
                    )
                    : null;


            if (
                nomeTurmaSelecionada &&
                (
                    !turmaSelecionada ||
                    !Number.isInteger(
                        Number(
                            turmaSelecionada.id
                        )
                    ) ||
                    Number(
                        turmaSelecionada.id
                    ) < 1
                )
            ) {

                PrimeWayFeedback.warning(
                    "A turma selecionada ainda não está sincronizada com o servidor. Atualize o cadastro de turmas e tente novamente."
                );


                return;
            }


            const dados = {

                ...(id !== null
                    ? {
                        id
                    }
                    : {}),

                name:
                    textos.nome,

                registration:
                    textos.matricula,

                email:
                    textos.email,

                password:
                    textos.senha,

                phone:
                    studentPhone.value.trim(),

                document:
                    studentDocument.value.trim(),

                birthDate:
                    studentBirthDate.value,

                classId:
                    turmaSelecionada
                        ? Number(
                            turmaSelecionada.id
                        )
                        : null,

                status:
                    studentStatus.value,

                newStudent:
                    existente
                        ? Boolean(
                            existente.newStudent
                        )
                        : true
            };


            try {

                await salvarAlunoServidor(
                    dados
                );


                await atualizarAlunosServidor();


            } catch (
                error
            ) {

                console.error(
                    "Erro ao salvar aluno:",
                    error
                );


                PrimeWayFeedback.error(
                    error?.message ||
                    "Não foi possível salvar o aluno. Tente novamente."
                );


                return;
            }


            fecharModal(
                studentModal
            );


            preencherFiltroTurmas();


            renderStudents();


            PrimeWayFeedback.success(
                id !== null
                    ? "Aluno atualizado com sucesso."
                    : "Aluno cadastrado com sucesso."
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
            formatarMedia(
                student.average
            );


        viewStudentAttendance.textContent =
            formatarFrequencia(
                student.attendance
            );


        viewStudentStatus.textContent =
            student.status;


        abrirModal(
            studentViewModal,
            studentViewClose
        );
    }


    /*====================================================
                    EXCLUIR
    ====================================================*/

    async function excluirAluno(
        student
    ) {

        const confirmado =
            await PrimeWayConfirm.danger(
                `Deseja realmente excluir "${student.name}"?`,
                {
                    title:
                        "Excluir aluno?",

                    confirmText:
                        "Excluir aluno",

                    cancelText:
                        "Cancelar"
                }
            );


        if (!confirmado) {

            return;
        }


        try {

            await excluirAlunoServidor(
                student.id
            );


            await atualizarAlunosServidor();


            preencherFiltroTurmas();


            renderStudents();


            PrimeWayFeedback.success(
                "Aluno excluído com sucesso."
            );


        } catch (
            error
        ) {

            console.error(
                "Erro ao excluir aluno:",
                error
            );


            PrimeWayFeedback.error(
                error?.message ||
                "Não foi possível excluir o aluno. Tente novamente."
            );
        }
    }


    /*====================================================
                AÇÕES DA TABELA
    ====================================================*/

    tableBody.addEventListener(
        "click",
        function (
            event
        ) {

            const button =
                event.target.closest(
                    "[data-action]"
                );


            if (
                !button ||
                !tableBody.contains(
                    button
                )
            ) {

                return;
            }


            const student =
                students.find(
                    item =>
                        Number(
                            item.id
                        ) ===
                            Number(
                                button.dataset.id
                            )
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

                    excluirAluno(
                        student
                    );

                    break;
            }
        }
    );


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


    searchInput.addEventListener(
        "keydown",
        function (
            event
        ) {

            if (
                event.key !==
                    "Escape" ||
                searchInput.value ===
                    ""
            ) {

                return;
            }


            searchInput.value =
                "";


            renderStudents();
        }
    );


    classFilter.addEventListener(
        "change",
        renderStudents
    );


    statusFilter.addEventListener(
        "change",
        renderStudents
    );


    studentName.addEventListener(
        "input",
        function () {

            studentName.setCustomValidity(
                ""
            );
        }
    );


    studentRegistration.addEventListener(
        "input",
        function () {

            studentRegistration.setCustomValidity(
                ""
            );
        }
    );


    /*====================================================
                FECHAR MODAL DO FORM
    ====================================================*/

    studentModalClose.addEventListener(
        "click",
        function () {

            fecharModal(
                studentModal
            );
        }
    );


    studentCancelButton.addEventListener(
        "click",
        function () {

            fecharModal(
                studentModal
            );
        }
    );


    studentModalOverlay.addEventListener(
        "click",
        function () {

            fecharModal(
                studentModal
            );
        }
    );


    /*====================================================
            FECHAR MODAL DE VISUALIZAÇÃO
    ====================================================*/

    studentViewClose.addEventListener(
        "click",
        function () {

            fecharModal(
                studentViewModal
            );
        }
    );


    studentViewOverlay.addEventListener(
        "click",
        function () {

            fecharModal(
                studentViewModal
            );
        }
    );


    /*====================================================
                        ESC
    ====================================================*/

    document.addEventListener(
        "keydown",
        function (
            event
        ) {

            if (
                event.key !==
                "Escape"
            ) {

                return;
            }


            if (
                document.querySelector(
                    ".primeway-confirm.show"
                )
            ) {

                return;
            }


            if (
                studentViewModal.classList.contains(
                    "active"
                )
            ) {

                fecharModal(
                    studentViewModal
                );


                return;
            }


            if (
                studentModal.classList.contains(
                    "active"
                )
            ) {

                fecharModal(
                    studentModal
                );
            }
        }
    );


    /*====================================================
                    LOGOUT PHP
    ====================================================*/

    let logoutEmAndamento =
        false;


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
                        method:
                            "POST",

                        credentials:
                            "same-origin",

                        cache:
                            "no-store",

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


        } catch (
            error
        ) {

            console.error(
                "Erro ao encerrar a sessão:",
                error
            );


            PrimeWayFeedback.error(
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
            SINCRONIZAÇÃO ENTRE ABAS
    ====================================================*/

    window.addEventListener(
        "storage",
        function (
            event
        ) {

            if (
                event.key ===
                STORAGE_KEY
            ) {

                students =
                    carregarAlunos();


                preencherFiltroTurmas();


                renderStudents();


                return;
            }


            if (
                event.key ===
                CLASSES_STORAGE_KEY
            ) {

                preencherFiltroTurmas();


                if (
                    studentModal.classList.contains(
                        "active"
                    )
                ) {

                    preencherSelectTurmas(
                        studentClass.value
                    );
                }
            }
        }
    );


    /*====================================================
                    INICIALIZAÇÃO
    ====================================================*/

    try {

        const [
            alunosServidor
        ] =
            await Promise.all([
                carregarAlunosServidor(),
                carregarTurmasServidor()
            ]);


        students =
            alunosServidor;


        salvarAlunos(
            students
        );


    } catch (
        error
    ) {

        console.error(
            "Erro ao carregar Alunos do servidor:",
            error
        );


        PrimeWayFeedback.warning(
            "Não foi possível atualizar os alunos pelo servidor. A última cópia local disponível será exibida."
        );
    }


    preencherFiltroTurmas();


    renderStudents();
});