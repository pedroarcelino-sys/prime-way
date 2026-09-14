/*====================================================
        DISCIPLINAS - PRIMEWAY SCHOOL
====================================================*/

document.addEventListener("DOMContentLoaded", async function () {
    await window.PrimeWayStorage?.ready;

    /*====================================================
                STORAGE / AUTENTICAÇÃO
    ====================================================*/

    const SUBJECTS_STORAGE_KEY =
        "primewaySubjects";

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

    /*
        O gerenciamento estrutural de Disciplinas fica
        reservado ao perfil Admin nesta etapa.

        A sessão é validada no servidor. Caso um
        Professor autenticado tente abrir esta página,
        ele é redirecionado para sua área sem encerrar
        a sessão PHP.
    */

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
                "Erro ao validar a sessão de Disciplinas:",
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
            "#subjectsTableBody"
        );

    const emptyState =
        document.querySelector(
            "#subjectsEmpty"
        );

    const searchInput =
        document.querySelector(
            "#subjectSearch"
        );

    const areaFilter =
        document.querySelector(
            "#areaFilter"
        );

    const statusFilter =
        document.querySelector(
            "#statusFilter"
        );

    const newSubjectButton =
        document.querySelector(
            "#newSubjectButton"
        );


    /* CARDS */

    const totalSubjects =
        document.querySelector(
            "#totalSubjects"
        );

    const activeSubjects =
        document.querySelector(
            "#activeSubjects"
        );

    const totalHours =
        document.querySelector(
            "#totalHours"
        );

    const linkedClasses =
        document.querySelector(
            "#linkedClasses"
        );


    /* MODAL CADASTRO / EDIÇÃO */

    const subjectModal =
        document.querySelector(
            "#subjectModal"
        );

    const subjectModalOverlay =
        document.querySelector(
            ".subject-modal-overlay"
        );

    const subjectModalClose =
        document.querySelector(
            "#subjectModalClose"
        );

    const subjectCancelButton =
        document.querySelector(
            "#subjectCancelButton"
        );

    const subjectModalTitle =
        document.querySelector(
            "#subjectModalTitle"
        );

    const subjectForm =
        document.querySelector(
            "#subjectForm"
        );


    /* CAMPOS */

    const subjectId =
        document.querySelector(
            "#subjectId"
        );

    const subjectName =
        document.querySelector(
            "#subjectName"
        );

    const subjectCode =
        document.querySelector(
            "#subjectCode"
        );

    const subjectArea =
        document.querySelector(
            "#subjectArea"
        );

    const subjectHours =
        document.querySelector(
            "#subjectHours"
        );

    const subjectTeacher =
        document.querySelector(
            "#subjectTeacher"
        );

    const subjectClass =
        document.querySelector(
            "#subjectClass"
        );

    const subjectStatus =
        document.querySelector(
            "#subjectStatus"
        );


    /* VISUALIZAÇÃO */

    const subjectViewModal =
        document.querySelector(
            "#subjectViewModal"
        );

    const subjectViewOverlay =
        document.querySelector(
            ".subject-view-overlay"
        );

    const subjectViewClose =
        document.querySelector(
            "#subjectViewClose"
        );

    const viewSubjectName =
        document.querySelector(
            "#viewSubjectName"
        );

    const viewSubjectCode =
        document.querySelector(
            "#viewSubjectCode"
        );

    const viewSubjectArea =
        document.querySelector(
            "#viewSubjectArea"
        );

    const viewSubjectTeacher =
        document.querySelector(
            "#viewSubjectTeacher"
        );

    const viewSubjectClass =
        document.querySelector(
            "#viewSubjectClass"
        );

    const viewSubjectHours =
        document.querySelector(
            "#viewSubjectHours"
        );

    const viewSubjectStatus =
        document.querySelector(
            "#viewSubjectStatus"
        );


    /* EXCLUSÃO */

    const deleteSubjectModal =
        document.querySelector(
            "#deleteSubjectModal"
        );

    const deleteSubjectOverlay =
        document.querySelector(
            ".delete-subject-overlay"
        );

    const deleteSubjectCancel =
        document.querySelector(
            "#deleteSubjectCancel"
        );

    const deleteSubjectConfirm =
        document.querySelector(
            "#deleteSubjectConfirm"
        );

    const deleteSubjectMessage =
        document.querySelector(
            "#deleteSubjectMessage"
        );


    /* LOGOUT */

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
        areaFilter,
        statusFilter,

        newSubjectButton,

        totalSubjects,
        activeSubjects,
        totalHours,
        linkedClasses,

        subjectModal,
        subjectModalOverlay,
        subjectModalClose,
        subjectCancelButton,
        subjectModalTitle,
        subjectForm,

        subjectId,
        subjectName,
        subjectCode,
        subjectArea,
        subjectHours,
        subjectTeacher,
        subjectClass,
        subjectStatus,

        subjectViewModal,
        subjectViewOverlay,
        subjectViewClose,

        viewSubjectName,
        viewSubjectCode,
        viewSubjectArea,
        viewSubjectTeacher,
        viewSubjectClass,
        viewSubjectHours,
        viewSubjectStatus,

        deleteSubjectModal,
        deleteSubjectOverlay,
        deleteSubjectCancel,
        deleteSubjectConfirm,
        deleteSubjectMessage

    ];


    if (
        elementosObrigatorios.some(
            elemento =>
                !elemento
        )
    ) {

        console.error(
            "Disciplinas: a estrutura esperada da página não foi encontrada."
        );


        return;

    }


    /*====================================================
                TURMAS PADRÃO
    ====================================================*/

    const defaultClasses = [

        {
            id: 1,
            name: "1º Ano A",
            status: "Ativa"
        },

        {
            id: 2,
            name: "2º Ano B",
            status: "Ativa"
        },

        {
            id: 3,
            name: "3º Ano A",
            status: "Ativa"
        },

        {
            id: 4,
            name: "4º Ano B",
            status: "Ativa"
        }

    ];


    /*====================================================
                DISCIPLINAS PADRÃO
                    ====================================================*/

    const defaultSubjects = [

        {
            id: 1,
            name: "Matemática",
            code: "MAT01",
            area: "Matemática",
            teacher: "Marcos Almeida",
            classId: 1,
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
            classId: 2,
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
            classId: 3,
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
            classId: 4,
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
            classId: 1,
            className: "1º Ano A",
            hours: 80,
            status: "Ativa"
        }

    ];


    /*====================================================
                    UTILITÁRIOS
    ====================================================*/

    function normalizarTexto(
        value
    ) {

        return String(
            value ?? ""
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


    function normalizarCodigo(
        value
    ) {

        return normalizarTexto(
            value
        )
            .replace(
                /\s+/g,
                ""
            );

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
        value,
        fallback = 0
    ) {

        const numero =
            Number(
                value
            );


        return Number.isFinite(
            numero
        )
            ? numero
            : fallback;

    }


    function normalizarIdOpcional(
        value
    ) {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {

            return null;

        }


        const id =
            Number(
                value
            );


        return (
            Number.isFinite(
                id
            ) &&
            id > 0
        )
            ? id
            : null;

    }


    function clonarTurmasPadrao() {

        return [];

    }


    function clonarDisciplinasPadrao() {

        return [];

    }


    function normalizarStatusDisciplina(
        status
    ) {

        const normalizado =
            normalizarTexto(
                status
            );


        if (
            normalizado === "inativa" ||
            normalizado === "inativo"
        ) {

            return "Inativa";

        }


        return "Ativa";

    }


    function turmaEstaAtiva(
        turma
    ) {

        const status =
            normalizarTexto(
                turma?.status
            );


        /*
            Dados antigos que não possuíam status
            continuam disponíveis.
        */

        return (
            !status ||
            status === "ativa" ||
            status === "ativo"
        );

    }


    function obterClasseStatus(
        status
    ) {

        return normalizarStatusDisciplina(
            status
        ) === "Ativa"
            ? "active"
            : "inactive";

    }


    function ordenarTurmas(
        turmas
    ) {

        return [
            ...turmas
        ].sort(
            function (
                a,
                b
            ) {

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


    /*====================================================
                STORAGE - TURMAS
    ====================================================*/

    function normalizarTurma(
        turma,
        index = 0
    ) {

        if (
            !turma ||
            typeof turma !==
                "object"
        ) {

            return null;

        }


        const nome =
            String(
                turma.name ??
                ""
            ).trim();


        if (!nome) {

            return null;

        }


        const id =
            normalizarIdOpcional(
                turma.id
            );


        return {

            ...turma,

            /*
                Disciplinas não deve inventar um ID para
                uma turma antiga que ainda não possua ID.

                O módulo Turmas é o responsável por gerar
                e persistir o identificador estável.
            */

            id,

            name:
                nome,

            status:
                String(
                    turma.status ??
                    ""
                ).trim()

        };

    }


    function carregarTurmas() {

        try {

            const saved =
                localStorage.getItem(
                    CLASSES_STORAGE_KEY
                );


            /*
                Disciplinas apenas consulta Turmas.

                Se o módulo Turmas ainda não tiver
                sido inicializado, usamos a lista
                padrão sem criar primewayClasses.
            */

            if (!saved) {

                return clonarTurmasPadrao();

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

                return clonarTurmasPadrao();

            }


            return dados
                .map(
                    normalizarTurma
                )
                .filter(
                    Boolean
                );

        } catch (erro) {

            console.warn(
                "Erro ao carregar turmas:",
                erro
            );


            return clonarTurmasPadrao();

        }

    }


    function localizarTurmaDaDisciplina(
        disciplina,
        turmas = carregarTurmas()
    ) {

        const classId =
            normalizarIdOpcional(
                disciplina?.classId
            );


        if (
            classId !==
            null
        ) {

            const porId =
                turmas.find(
                    turma =>
                        Number(
                            turma.id
                        ) ===
                        classId
                );


            if (porId) {

                return porId;

            }

        }


        const nome =
            normalizarTexto(
                disciplina?.className ||
                disciplina?.class ||
                disciplina?.turma
            );


        if (!nome) {

            return null;

        }


        return (
            turmas.find(
                turma =>
                    normalizarTexto(
                        turma.name
                    ) ===
                    nome
            ) ||
            null
        );

    }


    /*====================================================
            NORMALIZAÇÃO DE DISCIPLINAS
    ====================================================*/

    function normalizarDisciplina(
        disciplina,
        index = 0,
        turmas = carregarTurmas()
    ) {

        if (
            !disciplina ||
            typeof disciplina !==
                "object"
        ) {

            return null;

        }


        const id =
            Number(
                disciplina.id
            );


        const turmaVinculada =
            localizarTurmaDaDisciplina(
                disciplina,
                turmas
            );


        const classIdOriginal =
            normalizarIdOpcional(
                disciplina.classId
            );


        const classNameOriginal =
            String(
                disciplina.className ||
                disciplina.class ||
                disciplina.turma ||
                ""
            ).trim();


        const normalizada = {

            ...disciplina,

            id:
                Number.isFinite(
                    id
                )
                    ? id
                    : Date.now() + index,

            name:
                String(
                    disciplina.name ??
                    ""
                ).trim(),

            code:
                String(
                    disciplina.code ??
                    ""
                ).trim(),

            area:
                String(
                    disciplina.area ??
                    ""
                ).trim(),

            teacher:
                String(
                    disciplina.teacher ??
                    ""
                ).trim(),

            classId:
                turmaVinculada
                    ? normalizarIdOpcional(
                        turmaVinculada.id
                    )
                    : classIdOriginal,

            className:
                turmaVinculada
                    ? turmaVinculada.name
                    : classNameOriginal,

            hours:
                Math.min(
                    1000,
                    Math.max(
                        1,
                        numeroSeguro(
                            disciplina.hours,
                            1
                        )
                    )
                ),

            status:
                normalizarStatusDisciplina(
                    disciplina.status
                )

        };


        /*
            Consolida propriedades antigas.
        */

        delete normalizada.class;

        delete normalizada.turma;


        return normalizada;

    }


    /*====================================================
            STORAGE - DISCIPLINAS
    ====================================================*/

    function carregarDisciplinas() {

        try {

            const saved =
                localStorage.getItem(
                    SUBJECTS_STORAGE_KEY
                );


            if (!saved) {

                return clonarDisciplinasPadrao();

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

                return clonarDisciplinasPadrao();

            }


            const turmas =
                carregarTurmas();


            return dados
                .map(
                    function (
                        disciplina,
                        index
                    ) {

                        return normalizarDisciplina(
                            disciplina,
                            index,
                            turmas
                        );

                    }
                )
                .filter(
                    Boolean
                );

        } catch (erro) {

            console.warn(
                "Erro ao carregar disciplinas:",
                erro
            );


            return clonarDisciplinasPadrao();

        }

    }


    function salvarDisciplinas(
        lista = subjects
    ) {

        try {

            localStorage.setItem(
                SUBJECTS_STORAGE_KEY,
                JSON.stringify(
                    lista
                )
            );


            return true;

        } catch (erro) {

            console.error(
                "Erro ao salvar disciplinas:",
                erro
            );


            return false;

        }

    }


    /*====================================================
                    ESTADO
    ====================================================*/

    let subjects =
        carregarDisciplinas();


    let subjectToDelete =
        null;


    const focoAnteriorPorModal =
        new WeakMap();


    function gerarNovoId() {

        const maiorId =
            subjects.reduce(
                function (
                    maior,
                    disciplina
                ) {

                    const idAtual =
                        Number(
                            disciplina.id
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
                SELECT DE TURMAS
    ====================================================*/

    function obterValorOpcaoTurma(
        turma
    ) {

        const id =
            normalizarIdOpcional(
                turma?.id
            );


        if (
            id !== null
        ) {

            return `class:${id}`;

        }


        return `name:${normalizarTexto(
            turma?.name
        )}`;

    }


    function preencherSelectTurmas(
        disciplinaAtual = null
    ) {

        const turmas =
            ordenarTurmas(
                carregarTurmas()
            );


        const turmasAtivas =
            turmas.filter(
                turmaEstaAtiva
            );


        subjectClass.replaceChildren();


        const placeholder =
            document.createElement(
                "option"
            );


        placeholder.value =
            "";


        placeholder.textContent =
            "Selecione uma turma";


        subjectClass.appendChild(
            placeholder
        );


        turmasAtivas.forEach(
            function (turma) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    obterValorOpcaoTurma(
                        turma
                    );


                option.textContent =
                    turma.name;


                const idTurma =
                    normalizarIdOpcional(
                        turma.id
                    );


                if (
                    idTurma !== null
                ) {

                    option.dataset.classId =
                        String(
                            idTurma
                        );

                }


                option.dataset.className =
                    turma.name;


                subjectClass.appendChild(
                    option
                );

            }
        );


        if (!disciplinaAtual) {

            subjectClass.value =
                "";


            return;

        }


        const turmaAtual =
            localizarTurmaDaDisciplina(
                disciplinaAtual,
                turmas
            );


        if (
            turmaAtual &&
            turmaEstaAtiva(
                turmaAtual
            )
        ) {

            subjectClass.value =
                obterValorOpcaoTurma(
                    turmaAtual
                );


            return;

        }


        /*
            Se a turma estiver inativa ou não estiver
            mais disponível, a edição não pode apagar
            silenciosamente o vínculo existente.
        */

        const nomeAtual =
            turmaAtual
                ? turmaAtual.name
                : disciplinaAtual.className;


        if (nomeAtual) {

            const option =
                document.createElement(
                    "option"
                );


            const idAtual =
                turmaAtual
                    ? normalizarIdOpcional(
                        turmaAtual.id
                    )
                    : normalizarIdOpcional(
                        disciplinaAtual.classId
                    );


            option.value =
                `legacy:${disciplinaAtual.id}`;


            option.textContent =
                `${nomeAtual} (indisponível)`;


            option.dataset.className =
                nomeAtual;


            if (
                idAtual !==
                null
            ) {

                option.dataset.classId =
                    String(
                        idAtual
                    );

            }


            subjectClass.appendChild(
                option
            );


            subjectClass.value =
                option.value;

        }

    }


    function obterTurmaSelecionada() {

        const option =
            subjectClass.options[
                subjectClass.selectedIndex
            ];


        if (
            !option ||
            !subjectClass.value
        ) {

            return null;

        }


        const id =
            normalizarIdOpcional(
                option.dataset.classId
            );


        const name =
            String(
                option.dataset.className ||
                option.textContent ||
                ""
            )
                .replace(
                    /\s+\(indisponível\)$/,
                    ""
                )
                .trim();


        if (!name) {

            return null;

        }


        return {

            id,

            name

        };

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
                    normalizarStatusDisciplina(
                        item.status
                    ) ===
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
                        numeroSeguro(
                            item.hours
                        )
                    );

                },
                0
            );


        /*
            Usa ID da turma quando disponível.

            Para registros antigos sem classId,
            utiliza o nome como fallback.
        */

        const turmasVinculadas =
            new Set(
                subjects
                    .filter(
                        function (item) {

                            return (
                                normalizarIdOpcional(
                                    item.classId
                                ) !==
                                    null ||
                                Boolean(
                                    item.className
                                )
                            );

                        }
                    )
                    .map(
                        function (item) {

                            const classId =
                                normalizarIdOpcional(
                                    item.classId
                                );


                            return classId !==
                                null
                                ? `id:${classId}`
                                : `name:${normalizarTexto(
                                    item.className
                                )}`;

                        }
                    )
            ).size;


        totalSubjects.textContent =
            String(
                total
            );


        activeSubjects.textContent =
            String(
                ativas
            );


        totalHours.textContent =
            `${horas}h`;


        linkedClasses.textContent =
            String(
                turmasVinculadas
            );

    }


    /*====================================================
                    FILTROS
    ====================================================*/

    function pegarDisciplinasFiltradas() {

        const termo =
            normalizarTexto(
                searchInput.value
            );


        const area =
            areaFilter.value;


        const status =
            statusFilter.value;


        return subjects.filter(
            function (item) {

                const texto =
                    normalizarTexto(
                        [
                            item.name,
                            item.code,
                            item.area,
                            item.teacher,
                            item.className,
                            item.hours
                        ].join(
                            " "
                        )
                    );


                return (
                    texto.includes(
                        termo
                    ) &&
                    (
                        !area ||
                        item.area ===
                            area
                    ) &&
                    (
                        !status ||
                        item.status ===
                            status
                    )
                );

            }
        );

    }


    /*====================================================
                    RENDERIZAÇÃO
    ====================================================*/

    function renderSubjects() {

        tableBody.replaceChildren();


        const filtered =
            pegarDisciplinasFiltradas();


        emptyState.classList.toggle(
            "active",
            filtered.length === 0
        );


        filtered.forEach(
            function (item) {

                const row =
                    document.createElement(
                        "tr"
                    );


                const statusClass =
                    obterClasseStatus(
                        item.status
                    );


                const nomeSeguro =
                    escapeHtml(
                        item.name
                    );


                const idSeguro =
                    escapeHtml(
                        item.id
                    );


                row.innerHTML = `

                    <td>

                        <div class="subject-cell">

                            <div
                                class="subject-avatar"
                                aria-hidden="true"
                            >

                                <i
                                    class="fa-solid fa-book-open"
                                    aria-hidden="true"
                                ></i>

                            </div>

                            <strong>
                                ${nomeSeguro}
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
                        ${
                            item.className
                                ? escapeHtml(
                                    item.className
                                )
                                : "Sem turma"
                        }
                    </td>


                    <td>
                        ${numeroSeguro(item.hours)}h
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
                                class="subject-action-button"
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
                                class="subject-action-button delete"
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
            subjectModal,
            subjectViewModal,
            deleteSubjectModal
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
            (
                focoAnterior &&
                focoAnterior.isConnected &&
                typeof focoAnterior.focus ===
                    "function"
            )
                ? focoAnterior
                : newSubjectButton;


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
                LIMPAR VALIDAÇÕES
    ====================================================*/

    function limparValidacoesFormulario() {

        subjectName.setCustomValidity(
            ""
        );


        subjectCode.setCustomValidity(
            ""
        );


        subjectClass.setCustomValidity(
            ""
        );


        subjectHours.setCustomValidity(
            ""
        );

    }


    /*====================================================
                ABRIR CADASTRO / EDIÇÃO
    ====================================================*/

    function abrirModalDisciplina(
        item = null
    ) {

        subjectForm.reset();


        limparValidacoesFormulario();


        preencherSelectTurmas(
            item
        );


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


        abrirModal(
            subjectModal,
            subjectName
        );

    }


    function fecharModalDisciplina() {

        fecharModal(
            subjectModal
        );

    }


    /*====================================================
                    VALIDAÇÃO
    ====================================================*/

    function codigoJaExisteNaTurma(
        codigo,
        turma,
        idAtual
    ) {

        const codigoNormalizado =
            normalizarCodigo(
                codigo
            );


        return subjects.some(
            function (item) {

                const mesmaDisciplina =
                    Number(
                        item.id
                    ) ===
                    Number(
                        idAtual
                    );


                if (mesmaDisciplina) {

                    return false;

                }


                const mesmoCodigo =
                    normalizarCodigo(
                        item.code
                    ) ===
                    codigoNormalizado;


                const turmaId =
                    normalizarIdOpcional(
                        turma.id
                    );


                const itemTurmaId =
                    normalizarIdOpcional(
                        item.classId
                    );


                /*
                    Se os dois registros possuem ID de turma,
                    o ID é a referência principal.

                    O nome só é usado como fallback quando
                    pelo menos um dos lados ainda é legado.
                */

                const mesmaTurma =
                    turmaId !==
                        null &&
                    itemTurmaId !==
                        null
                        ? turmaId ===
                            itemTurmaId
                        : normalizarTexto(
                            item.className
                        ) ===
                            normalizarTexto(
                                turma.name
                            );


                return (
                    mesmoCodigo &&
                    mesmaTurma
                );

            }
        );

    }


    function validarFormularioDisciplina() {

        const nome =
            subjectName.value
                .trim();


        const codigo =
            subjectCode.value
                .trim();


        const professor =
            subjectTeacher.value
                .trim();


        const horas =
            Number(
                subjectHours.value
            );


        const turma =
            obterTurmaSelecionada();


        subjectName.setCustomValidity(
            nome
                ? ""
                : "Informe o nome da disciplina."
        );


        if (!nome) {

            subjectName.reportValidity();


            return null;

        }


        subjectCode.setCustomValidity(
            codigo
                ? ""
                : "Informe o código da disciplina."
        );


        if (!codigo) {

            subjectCode.reportValidity();


            return null;

        }


        if (!turma) {

            subjectClass.setCustomValidity(
                "Selecione uma turma."
            );


            subjectClass.reportValidity();


            return null;

        }


        subjectClass.setCustomValidity(
            ""
        );


        if (
            !Number.isFinite(
                horas
            ) ||
            horas < 1 ||
            horas > 1000
        ) {

            subjectHours.setCustomValidity(
                "Informe uma carga horária entre 1 e 1000 horas."
            );


            subjectHours.reportValidity();


            return null;

        }


        subjectHours.setCustomValidity(
            ""
        );


        if (!professor) {

            subjectTeacher.reportValidity();


            return null;

        }


        return {

            nome,
            codigo,
            professor,
            horas,
            turma

        };

    }
        /*====================================================
                    SALVAR
    ====================================================*/

    subjectForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const validacao =
                validarFormularioDisciplina();


            if (!validacao) {

                return;

            }


            const id =
                subjectId.value
                    ? Number(
                        subjectId.value
                    )
                    : gerarNovoId();


            if (
                codigoJaExisteNaTurma(
                    validacao.codigo,
                    validacao.turma,
                    id
                )
            ) {

                subjectCode.setCustomValidity(
                    "Já existe uma disciplina com este código nesta turma."
                );


                subjectCode.reportValidity();


                return;

            }


            subjectCode.setCustomValidity(
                ""
            );


            const data = {

                id,

                name:
                    validacao.nome,

                code:
                    validacao.codigo,

                area:
                    subjectArea.value,

                teacher:
                    validacao.professor,

                classId:
                    validacao.turma.id,

                className:
                    validacao.turma.name,

                hours:
                    validacao.horas,

                status:
                    subjectStatus.value

            };


            const novaLista =
                subjects.map(
                    item => ({
                        ...item
                    })
                );


            const index =
                novaLista.findIndex(
                    item =>
                        Number(
                            item.id
                        ) ===
                        id
                );


            if (
                index >= 0
            ) {

                novaLista[index] =
                    data;

            } else {

                novaLista.unshift(
                    data
                );

            }


            if (
                !salvarDisciplinas(
                    novaLista
                )
            ) {

                alert(
                    "Não foi possível salvar a disciplina. Tente novamente."
                );


                return;

            }


            subjects =
                novaLista;


            fecharModalDisciplina();


            renderSubjects();

        }
    );


    /*====================================================
                    VISUALIZAÇÃO
    ====================================================*/

    function abrirVisualizacao(
        item
    ) {

        viewSubjectName.textContent =
            item.name;


        viewSubjectCode.textContent =
            item.code;


        viewSubjectArea.textContent =
            item.area;


        viewSubjectTeacher.textContent =
            item.teacher;


        viewSubjectClass.textContent =
            item.className ||
            "Turma indisponível";


        viewSubjectHours.textContent =
            `${numeroSeguro(item.hours)}h`;


        viewSubjectStatus.textContent =
            item.status;


        abrirModal(
            subjectViewModal,
            subjectViewClose
        );

    }


    function fecharVisualizacao() {

        fecharModal(
            subjectViewModal
        );

    }


    /*====================================================
                    EXCLUSÃO
    ====================================================*/

    function abrirModalExclusao(
        item
    ) {

        subjectToDelete =
            Number(
                item.id
            );


        deleteSubjectMessage.textContent =
            `Deseja realmente excluir a disciplina "${item.name}"?`;


        abrirModal(
            deleteSubjectModal,
            deleteSubjectCancel
        );

    }


    function fecharModalExclusao() {

        subjectToDelete =
            null;


        fecharModal(
            deleteSubjectModal
        );

    }


    function confirmarExclusao() {

        if (
            subjectToDelete ===
            null
        ) {

            return;

        }


        const novaLista =
            subjects.filter(
                item =>
                    Number(
                        item.id
                    ) !==
                    Number(
                        subjectToDelete
                    )
            );


        if (
            !salvarDisciplinas(
                novaLista
            )
        ) {

            alert(
                "Não foi possível excluir a disciplina. Tente novamente."
            );


            return;

        }


        subjects =
            novaLista;


        subjectToDelete =
            null;


        fecharModal(
            deleteSubjectModal
        );


        renderSubjects();

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
                )
            ) {

                return;

            }


            const id =
                Number(
                    button.dataset.id
                );


            const item =
                subjects.find(
                    subject =>
                        Number(
                            subject.id
                        ) ===
                        id
                );


            if (!item) {

                return;

            }


            switch (
                button.dataset.action
            ) {

                case "view":

                    abrirVisualizacao(
                        item
                    );

                    break;


                case "edit":

                    abrirModalDisciplina(
                        item
                    );

                    break;


                case "delete":

                    abrirModalExclusao(
                        item
                    );

                    break;

            }

        }
    );


    /*====================================================
                    EVENTOS
    ====================================================*/

    newSubjectButton.addEventListener(
        "click",
        function () {

            abrirModalDisciplina();

        }
    );


    searchInput.addEventListener(
        "input",
        renderSubjects
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


            searchInput.value =
                "";


            renderSubjects();

        }
    );


    areaFilter.addEventListener(
        "change",
        renderSubjects
    );


    statusFilter.addEventListener(
        "change",
        renderSubjects
    );


    /*====================================================
            LIMPAR VALIDAÇÕES AO EDITAR
    ====================================================*/

    subjectName.addEventListener(
        "input",
        function () {

            subjectName.setCustomValidity(
                ""
            );

        }
    );


    subjectCode.addEventListener(
        "input",
        function () {

            /*
                Remove a mensagem de código duplicado
                assim que o usuário começa a corrigi-lo.
            */

            subjectCode.setCustomValidity(
                ""
            );

        }
    );


    subjectClass.addEventListener(
        "change",
        function () {

            subjectClass.setCustomValidity(
                ""
            );


            /*
                A duplicidade depende também da turma.
                Portanto, uma mudança de turma invalida
                qualquer aviso anterior no código.
            */

            subjectCode.setCustomValidity(
                ""
            );

        }
    );


    subjectHours.addEventListener(
        "input",
        function () {

            subjectHours.setCustomValidity(
                ""
            );

        }
    );


    /*====================================================
                FECHAR MODAL CADASTRO
    ====================================================*/

    subjectModalClose.addEventListener(
        "click",
        fecharModalDisciplina
    );


    subjectCancelButton.addEventListener(
        "click",
        fecharModalDisciplina
    );


    subjectModalOverlay.addEventListener(
        "click",
        fecharModalDisciplina
    );


    /*====================================================
                FECHAR VISUALIZAÇÃO
    ====================================================*/

    subjectViewClose.addEventListener(
        "click",
        fecharVisualizacao
    );


    subjectViewOverlay.addEventListener(
        "click",
        fecharVisualizacao
    );


    /*====================================================
                FECHAR EXCLUSÃO
    ====================================================*/

    deleteSubjectCancel.addEventListener(
        "click",
        fecharModalExclusao
    );


    deleteSubjectOverlay.addEventListener(
        "click",
        fecharModalExclusao
    );


    deleteSubjectConfirm.addEventListener(
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


            /*
                Fecha somente o modal de maior
                prioridade que estiver aberto.
            */

            if (
                deleteSubjectModal.classList.contains(
                    "active"
                )
            ) {

                fecharModalExclusao();


                return;

            }


            if (
                subjectViewModal.classList.contains(
                    "active"
                )
            ) {

                fecharVisualizacao();


                return;

            }


            if (
                subjectModal.classList.contains(
                    "active"
                )
            ) {

                fecharModalDisciplina();

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
            SINCRONIZAR VÍNCULOS COM TURMAS
    ====================================================*/

    function sincronizarVinculosComTurmas() {

        const turmas =
            carregarTurmas();


        const normalizadas =
            subjects
                .map(
                    function (
                        disciplina,
                        index
                    ) {

                        return normalizarDisciplina(
                            disciplina,
                            index,
                            turmas
                        );

                    }
                )
                .filter(
                    Boolean
                );


        const houveMudanca =
            JSON.stringify(
                normalizadas
            ) !==
            JSON.stringify(
                subjects
            );


        subjects =
            normalizadas;


        if (houveMudanca) {

            salvarDisciplinas();

        }

    }


    /*====================================================
            SINCRONIZAÇÃO ENTRE ABAS
    ====================================================*/

    window.addEventListener(
        "storage",
        function (event) {

            /*================================================
                    DISCIPLINAS ALTERADAS
            ================================================*/

            if (
                event.key ===
                SUBJECTS_STORAGE_KEY
            ) {

                subjects =
                    carregarDisciplinas();


                renderSubjects();


                return;

            }


            /*================================================
                        TURMAS ALTERADAS
            ================================================*/

            if (
                event.key ===
                CLASSES_STORAGE_KEY
            ) {

                /*
                    Atualiza nomes pelo classId quando
                    possível e mantém registros antigos
                    compatíveis pelo className.
                */

                sincronizarVinculosComTurmas();


                renderSubjects();


                /*
                    Se o formulário estiver aberto,
                    reconstrói o select preservando a
                    disciplina atualmente editada.
                */

                if (
                    subjectModal.classList.contains(
                        "active"
                    )
                ) {

                    const idAtual =
                        subjectId.value
                            ? Number(
                                subjectId.value
                            )
                            : null;


                    const itemAtual =
                        idAtual !==
                            null
                            ? subjects.find(
                                item =>
                                    Number(
                                        item.id
                                    ) ===
                                    idAtual
                            ) ||
                            null
                            : null;


                    const selecaoAtual =
                        obterTurmaSelecionada();


                    preencherSelectTurmas(
                        itemAtual ||
                        (
                            selecaoAtual
                                ? {
                                    id:
                                        "temp",
                                    classId:
                                        selecaoAtual.id,
                                    className:
                                        selecaoAtual.name
                                }
                                : null
                        )
                    );

                }

            }

        }
    );
        /*====================================================
                    INICIALIZAÇÃO
    ====================================================*/

    /*
        Migra dados antigos que utilizavam apenas:

        className
        class
        turma

        mantendo className para compatibilidade e
        acrescentando classId quando a turma puder
        ser identificada.
    */

    sincronizarVinculosComTurmas();


    /*
        Persiste os dados padrão na primeira abertura
        e eventuais migrações realizadas acima.
    */

    salvarDisciplinas();


    renderSubjects();

});
