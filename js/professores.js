document.addEventListener("DOMContentLoaded", async function () {
    await window.PrimeWayStorage?.ready;

    const SESSION_URL = "../api/auth/session.php";
    const LOGOUT_URL = "../api/auth/logout.php";
    const PROFESSORS_URL = "../api/professores/index.php";
    const SAVE_PROFESSOR_URL = "../api/professores/salvar.php";
    const LOGIN_PAGE = "login.html";
    const PROFESSOR_PAGE = "professor.html";

    const tableBody = document.querySelector("#professorsTableBody");
    const searchInput = document.querySelector("#professorSearch");
    const logoutButton = document.querySelector("#logoutButton");
    const dialog = document.querySelector("#professorDialog");
    const form = document.querySelector("#professorForm");
    const saveButton = document.querySelector("#saveProfessorButton");

    let professors = [];


    async function readJson(response) {
        try {
            return await response.json();
        } catch (error) {
            return null;
        }
    }


    async function getFreshSecurityToken() {
        const response = await fetch(
            SESSION_URL,
            {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store",
                headers: {
                    "Accept": "application/json"
                }
            }
        );

        const data = await readJson(response);


        if (
            !response.ok ||
            !data?.authenticated ||
            typeof data.csrfToken !== "string" ||
            data.csrfToken.length !== 64
        ) {
            throw new Error(
                "Sua sessão expirou. Entre novamente para continuar."
            );
        }


        return data.csrfToken;
    }


    function clearCompatibilitySession() {
        sessionStorage.removeItem(
            "primewayLogado"
        );

        sessionStorage.removeItem(
            "primewayUsuario"
        );

        sessionStorage.removeItem(
            "primewayPerfil"
        );
    }


    function syncCompatibilitySession(user) {
        sessionStorage.setItem(
            "primewayLogado",
            "true"
        );

        sessionStorage.setItem(
            "primewayUsuario",
            String(
                user.email || ""
            )
        );

        sessionStorage.setItem(
            "primewayPerfil",
            String(
                user.perfil || ""
            )
        );
    }


    async function validateSession() {
        try {
            const response = await fetch(
                SESSION_URL,
                {
                    method: "GET",
                    credentials: "same-origin",
                    cache: "no-store",
                    headers: {
                        "Accept": "application/json"
                    }
                }
            );

            const data = await readJson(response);


            if (
                !response.ok ||
                !data?.authenticated ||
                !data?.usuario
            ) {
                clearCompatibilitySession();

                window.location.replace(
                    LOGIN_PAGE
                );

                return false;
            }


            const user =
                data.usuario;


            syncCompatibilitySession(
                user
            );


            if (
                user.perfil ===
                "professor"
            ) {
                window.location.replace(
                    PROFESSOR_PAGE
                );

                return false;
            }


            if (
                user.perfil !==
                "admin"
            ) {
                clearCompatibilitySession();

                window.location.replace(
                    LOGIN_PAGE
                );

                return false;
            }


            return true;

        } catch (error) {
            console.error(
                "Erro ao validar a sessão da gestão de professores:",
                error
            );

            clearCompatibilitySession();

            window.location.replace(
                LOGIN_PAGE
            );

            return false;
        }
    }


    function normalize(value) {
        return String(
            value || ""
        )
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .toLowerCase()
            .trim();
    }


    function setCount(id, value) {
        const element =
            document.querySelector(id);

        if (element) {
            element.textContent =
                new Intl.NumberFormat(
                    "pt-BR"
                ).format(
                    value
                );
        }
    }


    function renderSummary() {
        setCount(
            "#totalProfessors",
            professors.length
        );

        setCount(
            "#activeProfessors",
            professors.filter(
                item =>
                    item.status ===
                    "ativo"
            ).length
        );

        setCount(
            "#inactiveProfessors",
            professors.filter(
                item =>
                    item.status !==
                    "ativo"
            ).length
        );

        setCount(
            "#availableProfessors",
            professors.filter(
                item =>
                    item.available
            ).length
        );
    }


    function createCell(text) {
        const cell =
            document.createElement(
                "td"
            );

        cell.textContent =
            text;

        return cell;
    }


    function renderTable() {
        if (!tableBody) {
            return;
        }


        const term =
            normalize(
                searchInput?.value
            );


        const filtered =
            professors.filter(
                item =>
                    normalize(
                        [
                            item.name,
                            item.email,
                            item.phone,
                            item.registration
                        ].join(
                            " "
                        )
                    ).includes(
                        term
                    )
            );


        tableBody.replaceChildren();


        if (
            filtered.length ===
            0
        ) {
            const row =
                document.createElement(
                    "tr"
                );


            const cell =
                createCell(
                    professors.length === 0
                        ? "Nenhum professor cadastrado."
                        : "Nenhum professor encontrado para esta busca."
                );


            cell.colSpan =
                5;

            cell.className =
                "empty-cell";


            row.append(
                cell
            );


            tableBody.append(
                row
            );


            return;
        }


        for (
            const professor
            of filtered
        ) {
            const row =
                document.createElement(
                    "tr"
                );


            const identity =
                document.createElement(
                    "td"
                );


            const name =
                document.createElement(
                    "span"
                );


            name.className =
                "professor-name";

            name.textContent =
                professor.name ||
                "Nome não informado";


            const email =
                document.createElement(
                    "span"
                );


            email.className =
                "professor-email";

            email.textContent =
                professor.email ||
                "Sem e-mail de contato";


            identity.append(
                name,
                email
            );


            const status =
                document.createElement(
                    "td"
                );


            const pill =
                document.createElement(
                    "span"
                );


            pill.className =
                `status-pill${
                    professor.status ===
                    "ativo"
                        ? ""
                        : " inactive"
                }`;


            pill.textContent =
                professor.status ===
                "ativo"
                    ? "Ativo"
                    : "Inativo";


            status.append(
                pill
            );


            row.append(
                identity,

                createCell(
                    professor.registration ||
                    "—"
                ),

                createCell(
                    professor.phone ||
                    "—"
                ),

                status,

                createCell(
                    `${professor.classCount ?? 0} ${
                        Number(
                            professor.classCount
                        ) === 1
                            ? "turma"
                            : "turmas"
                    }`
                )
            );


            tableBody.append(
                row
            );
        }
    }


    async function loadProfessors() {
        try {
            const response = await fetch(
                PROFESSORS_URL,
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
                await readJson(
                    response
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
                    "Falha ao carregar professores."
                );
            }


            professors =
                data.professors;


            renderSummary();


            renderTable();

        } catch (error) {
            console.error(
                "Erro ao carregar professores:",
                error
            );


            professors =
                [];


            renderSummary();


            renderTable();


            PrimeWayFeedback.error(
                error?.message ||
                "Não foi possível carregar os professores."
            );
        }
    }


    function closeDialog() {
        dialog?.close();

        form?.reset();
    }


    function openDialog() {
        if (!dialog) {
            return;
        }


        dialog.showModal();


        form?.elements
            ?.name
            ?.focus();
    }


    async function saveProfessor(event) {
        event.preventDefault();


        if (
            !form?.reportValidity()
        ) {
            return;
        }


        const formData =
            new FormData(
                form
            );


        const payload =
            Object.fromEntries(
                formData.entries()
            );


        if (saveButton) {
            saveButton.disabled =
                true;

            saveButton.textContent =
                "Cadastrando…";
        }


        try {
            const csrfToken =
                await getFreshSecurityToken();


            const response = await fetch(
                SAVE_PROFESSOR_URL,
                {
                    method: "POST",
                    credentials: "same-origin",
                    cache: "no-store",

                    headers: {
                        "Accept":
                            "application/json",

                        "Content-Type":
                            "application/json",

                        "X-CSRF-Token":
                            csrfToken
                    },

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );


            const data =
                await readJson(
                    response
                );


            if (
                !response.ok ||
                !data?.success
            ) {
                throw new Error(
                    data?.message ||
                    "Falha ao cadastrar professor."
                );
            }


            form.reset();


            await loadProfessors();


            closeDialog();


            PrimeWayFeedback.success(
                data.message ||
                "Professor cadastrado com sucesso."
            );


        } catch (error) {
            console.error(
                "Erro ao cadastrar professor:",
                error
            );


            PrimeWayFeedback.error(
                error?.message ||
                "Não foi possível cadastrar o professor."
            );


        } finally {
            if (saveButton) {
                saveButton.disabled =
                    false;

                saveButton.textContent =
                    "Cadastrar professor";
            }
        }
    }


    async function logout() {
        if (logoutButton) {
            logoutButton.disabled =
                true;
        }


        try {
            const response = await fetch(
                LOGOUT_URL,
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
                await readJson(
                    response
                );


            if (
                !response.ok ||
                !data?.success
            ) {
                throw new Error(
                    data?.message ||
                    "Falha ao sair."
                );
            }


            clearCompatibilitySession();


            window.location.replace(
                LOGIN_PAGE
            );


        } catch (error) {
            console.error(
                "Erro ao encerrar a sessão:",
                error
            );


            PrimeWayFeedback.error(
                error?.message ||
                "Não foi possível encerrar a sessão. Tente novamente."
            );


            if (logoutButton) {
                logoutButton.disabled =
                    false;
            }
        }
    }


    if (
        !await validateSession()
    ) {
        return;
    }


    searchInput?.addEventListener(
        "input",
        renderTable
    );


    logoutButton?.addEventListener(
        "click",
        logout
    );


    document
        .querySelector(
            "#newProfessorButton"
        )
        ?.addEventListener(
            "click",
            openDialog
        );


    document
        .querySelector(
            "#closeProfessorDialog"
        )
        ?.addEventListener(
            "click",
            closeDialog
        );


    document
        .querySelector(
            "#cancelProfessorButton"
        )
        ?.addEventListener(
            "click",
            closeDialog
        );


    form?.addEventListener(
        "submit",
        saveProfessor
    );


    dialog?.addEventListener(
        "click",
        function (event) {
            if (
                event.target ===
                dialog
            ) {
                closeDialog();
            }
        }
    );


    await loadProfessors();
});