console.log("RESPONSÁVEIS JS CARREGADO");

document.addEventListener("DOMContentLoaded", function () {

    /*====================================================
                    ELEMENTOS
    ====================================================*/

    const tableBody =
        document.querySelector("#guardiansTableBody");

    const emptyState =
        document.querySelector("#guardiansEmpty");

    const searchInput =
        document.querySelector("#guardianSearch");

    const relationshipFilter =
        document.querySelector("#relationshipFilter");

    const statusFilter =
        document.querySelector("#statusFilter");

    const newGuardianButton =
        document.querySelector("#newGuardianButton");


    /* CARDS */

    const totalGuardians =
        document.querySelector("#totalGuardians");

    const activeLinks =
        document.querySelector("#activeLinks");

    const activeContacts =
        document.querySelector("#activeContacts");

    const pendingGuardians =
        document.querySelector("#pendingGuardians");


    /* MODAL CADASTRO */

    const guardianModal =
        document.querySelector("#guardianModal");

    const guardianModalOverlay =
        document.querySelector(".guardian-modal-overlay");

    const guardianModalClose =
        document.querySelector("#guardianModalClose");

    const guardianCancelButton =
        document.querySelector("#guardianCancelButton");

    const guardianModalTitle =
        document.querySelector("#guardianModalTitle");

    const guardianForm =
        document.querySelector("#guardianForm");


    /* CAMPOS */

    const guardianId =
        document.querySelector("#guardianId");

    const guardianName =
        document.querySelector("#guardianName");

    const guardianStudent =
        document.querySelector("#guardianStudent");

    const guardianRelationship =
        document.querySelector("#guardianRelationship");

    const guardianPhone =
        document.querySelector("#guardianPhone");

    const guardianEmail =
        document.querySelector("#guardianEmail");

    const guardianDocument =
        document.querySelector("#guardianDocument");

    const guardianStatus =
        document.querySelector("#guardianStatus");

    const guardianAuthorizedPickup =
        document.querySelector("#guardianAuthorizedPickup");


    /* VISUALIZAÇÃO */

    const guardianViewModal =
        document.querySelector("#guardianViewModal");

    const guardianViewOverlay =
        document.querySelector(".guardian-view-overlay");

    const guardianViewClose =
        document.querySelector("#guardianViewClose");

    const viewGuardianName =
        document.querySelector("#viewGuardianName");

    const viewGuardianStudent =
        document.querySelector("#viewGuardianStudent");

    const viewGuardianRelationship =
        document.querySelector("#viewGuardianRelationship");

    const viewGuardianPhone =
        document.querySelector("#viewGuardianPhone");

    const viewGuardianEmail =
        document.querySelector("#viewGuardianEmail");

    const viewGuardianDocument =
        document.querySelector("#viewGuardianDocument");

    const viewGuardianStatus =
        document.querySelector("#viewGuardianStatus");

    const viewGuardianPickup =
        document.querySelector("#viewGuardianPickup");


    /* EXCLUSÃO */

    const deleteGuardianModal =
        document.querySelector("#deleteGuardianModal");

    const deleteGuardianOverlay =
        document.querySelector(".delete-guardian-overlay");

    const deleteGuardianCancel =
        document.querySelector("#deleteGuardianCancel");

    const deleteGuardianConfirm =
        document.querySelector("#deleteGuardianConfirm");

    const deleteGuardianMessage =
        document.querySelector("#deleteGuardianMessage");


    /* LOGOUT */

    const logoutButton =
        document.querySelector("#logoutButton");


    /*====================================================
                    STORAGE
    ====================================================*/

    const GUARDIANS_STORAGE_KEY =
        "primewayGuardians";

    const STUDENTS_STORAGE_KEY =
        "primewayStudents";


    /*====================================================
                RESPONSÁVEIS INICIAIS
    ====================================================*/

    const defaultGuardians = [

        {
            id: 1,
            name: "Mariana Martins",
            student: "Ana Carolina Martins",
            relationship: "Mãe",
            phone: "(11) 99876-1201",
            email: "mariana.martins@email.com",
            document: "123.456.789-01",
            status: "Ativo",
            authorizedPickup: true
        },

        {
            id: 2,
            name: "Carlos Henrique Souza",
            student: "Bruno Henrique Souza",
            relationship: "Pai",
            phone: "(11) 99750-8842",
            email: "carlos.souza@email.com",
            document: "234.567.890-12",
            status: "Ativo",
            authorizedPickup: true
        },

        {
            id: 3,
            name: "Patrícia Ferreira",
            student: "Camila Ferreira Lima",
            relationship: "Mãe",
            phone: "(11) 99541-2233",
            email: "patricia.ferreira@email.com",
            document: "345.678.901-23",
            status: "Ativo",
            authorizedPickup: true
        },

        {
            id: 4,
            name: "Roberto Oliveira",
            student: "Daniel Oliveira Costa",
            relationship: "Pai",
            phone: "(11) 99120-7734",
            email: "roberto.oliveira@email.com",
            document: "456.789.012-34",
            status: "Pendente",
            authorizedPickup: false
        },

        {
            id: 5,
            name: "Luciana Ribeiro",
            student: "Eduarda Ribeiro Alves",
            relationship: "Mãe",
            phone: "(11) 99982-3344",
            email: "luciana.ribeiro@email.com",
            document: "567.890.123-45",
            status: "Ativo",
            authorizedPickup: true
        }

    ];


    let guardians =
        carregarResponsaveis();


    let guardianToDelete =
        null;


    /*====================================================
                    STORAGE
    ====================================================*/

    function salvarResponsaveis() {

        try {

            localStorage.setItem(
                GUARDIANS_STORAGE_KEY,
                JSON.stringify(
                    guardians
                )
            );

        } catch (erro) {

            console.warn(
                "Erro ao salvar responsáveis:",
                erro
            );

        }

    }


    function carregarResponsaveis() {

        try {

            const saved =
                localStorage.getItem(
                    GUARDIANS_STORAGE_KEY
                );


            if (!saved) {

                return JSON.parse(
                    JSON.stringify(
                        defaultGuardians
                    )
                );

            }


            return JSON.parse(
                saved
            );

        } catch (erro) {

            console.warn(
                "Erro ao carregar responsáveis:",
                erro
            );


            return JSON.parse(
                JSON.stringify(
                    defaultGuardians
                )
            );

        }

    }


    /*====================================================
                CARREGAR ALUNOS
    ====================================================*/

    function carregarAlunos() {

        const saved =
            localStorage.getItem(
                STUDENTS_STORAGE_KEY
            );


        if (!saved) {

            return [
                "Ana Carolina Martins",
                "Bruno Henrique Souza",
                "Camila Ferreira Lima",
                "Daniel Oliveira Costa",
                "Eduarda Ribeiro Alves",
                "Felipe Gomes Santos",
                "Gabriela Mendes Rocha",
                "Henrique Barbosa Melo"
            ];

        }


        try {

            const students =
                JSON.parse(
                    saved
                );


            return students.map(
                function (student) {

                    return student.name;

                }
            );

        } catch (erro) {

            console.warn(
                "Erro ao carregar alunos:",
                erro
            );


            return [];

        }

    }


    function preencherSelectAlunos() {

        if (!guardianStudent) {

            return;

        }


        const alunos =
            carregarAlunos();


        guardianStudent.innerHTML =
            `
                <option value="">
                    Selecione o aluno
                </option>
            `;


        alunos.forEach(
            function (nome) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    nome;


                option.textContent =
                    nome;


                guardianStudent.appendChild(
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
            guardians.length;


        const ativos =
            guardians.filter(
                guardian =>
                    guardian.status === "Ativo"
            ).length;


        const contatos =
            guardians.filter(
                guardian =>
                    guardian.phone &&
                    guardian.email
            ).length;


        const pendentes =
            guardians.filter(
                guardian =>
                    guardian.status === "Pendente"
            ).length;


        if (totalGuardians) {

            totalGuardians.textContent =
                total;

        }


        if (activeLinks) {

            activeLinks.textContent =
                ativos;

        }


        if (activeContacts) {

            activeContacts.textContent =
                contatos;

        }


        if (pendingGuardians) {

            pendingGuardians.textContent =
                pendentes;

        }

    }


    /*====================================================
                    FILTROS
    ====================================================*/

    function pegarResponsaveisFiltrados() {

        const termo =
            searchInput
                ? searchInput
                    .value
                    .toLowerCase()
                    .trim()
                : "";


        const relationship =
            relationshipFilter
                ? relationshipFilter.value
                : "";


        const status =
            statusFilter
                ? statusFilter.value
                : "";


        return guardians.filter(
            function (guardian) {

                const texto =
                    (
                        guardian.name +
                        " " +
                        guardian.student +
                        " " +
                        guardian.email +
                        " " +
                        guardian.phone
                    )
                        .toLowerCase();


                const matchSearch =
                    texto.includes(
                        termo
                    );


                const matchRelationship =
                    relationship === "" ||
                    guardian.relationship ===
                    relationship;


                const matchStatus =
                    status === "" ||
                    guardian.status ===
                    status;


                return (
                    matchSearch &&
                    matchRelationship &&
                    matchStatus
                );

            }
        );

    }


    /*====================================================
                    TABELA
    ====================================================*/

    function renderGuardians() {

        if (!tableBody) {

            return;

        }


        const filtered =
            pegarResponsaveisFiltrados();


        tableBody.innerHTML =
            "";


        if (emptyState) {

            emptyState.classList.toggle(
                "active",
                filtered.length === 0
            );

        }


        filtered.forEach(
            function (guardian) {

                const row =
                    document.createElement(
                        "tr"
                    );


                const statusClass =
                    guardian.status ===
                    "Ativo"
                        ? "active"
                        : "pending";


                row.innerHTML = `

                    <td>

                        <div class="guardian-cell">

                            <div class="guardian-avatar">

                                <i class="fa-solid fa-user-shield"></i>

                            </div>

                            <strong>
                                ${escapeHtml(guardian.name)}
                            </strong>

                        </div>

                    </td>


                    <td>
                        ${escapeHtml(guardian.student)}
                    </td>


                    <td>
                        ${escapeHtml(guardian.relationship)}
                    </td>


                    <td>
                        ${escapeHtml(guardian.phone)}
                    </td>


                    <td>
                        ${escapeHtml(guardian.email)}
                    </td>


                    <td>

                        <span class="status-badge ${statusClass}">
                            ${escapeHtml(guardian.status)}
                        </span>

                    </td>


                    <td>

                        <div class="guardian-actions-buttons">

                            <button
                                type="button"
                                class="guardian-action-button"
                                data-action="view"
                                data-id="${guardian.id}"
                                aria-label="Visualizar"
                            >

                                <i class="fa-solid fa-eye"></i>

                            </button>


                            <button
                                type="button"
                                class="guardian-action-button"
                                data-action="edit"
                                data-id="${guardian.id}"
                                aria-label="Editar"
                            >

                                <i class="fa-solid fa-pen"></i>

                            </button>


                            <button
                                type="button"
                                class="guardian-action-button delete"
                                data-action="delete"
                                data-id="${guardian.id}"
                                aria-label="Excluir"
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
                    MODAL CADASTRO
    ====================================================*/

    function abrirModalResponsavel(
        guardian = null
    ) {

        if (!guardianModal) {

            return;

        }


        guardianForm.reset();


        preencherSelectAlunos();


        if (guardian) {

            guardianModalTitle.textContent =
                "Editar responsável";


            guardianId.value =
                guardian.id;


            guardianName.value =
                guardian.name;


            guardianStudent.value =
                guardian.student;


            guardianRelationship.value =
                guardian.relationship;


            guardianPhone.value =
                guardian.phone;


            guardianEmail.value =
                guardian.email;


            guardianDocument.value =
                guardian.document;


            guardianStatus.value =
                guardian.status;


            guardianAuthorizedPickup.checked =
                guardian.authorizedPickup;

        } else {

            guardianModalTitle.textContent =
                "Novo responsável";


            guardianId.value =
                "";


            guardianStatus.value =
                "Ativo";


            guardianAuthorizedPickup.checked =
                false;

        }


        guardianModal.classList.add(
            "active"
        );


        guardianModal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.classList.add(
            "modal-open"
        );


        guardianName.focus();

    }


    function fecharModalResponsavel() {

        if (!guardianModal) {

            return;

        }


        guardianModal.classList.remove(
            "active"
        );


        guardianModal.setAttribute(
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

    if (guardianForm) {

        guardianForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();


                const id =
                    guardianId.value
                        ? Number(
                            guardianId.value
                        )
                        : Date.now();


                const data = {

                    id:
                        id,

                    name:
                        guardianName
                            .value
                            .trim(),

                    student:
                        guardianStudent.value,

                    relationship:
                        guardianRelationship.value,

                    phone:
                        guardianPhone
                            .value
                            .trim(),

                    email:
                        guardianEmail
                            .value
                            .trim(),

                    document:
                        guardianDocument
                            .value
                            .trim(),

                    status:
                        guardianStatus.value,

                    authorizedPickup:
                        guardianAuthorizedPickup.checked

                };


                const index =
                    guardians.findIndex(
                        guardian =>
                            guardian.id ===
                            id
                    );


                if (index >= 0) {

                    guardians[index] =
                        data;

                } else {

                    guardians.unshift(
                        data
                    );

                }


                salvarResponsaveis();


                renderGuardians();


                fecharModalResponsavel();

            }
        );

    }


    /*====================================================
                    VISUALIZAÇÃO
    ====================================================*/

    function abrirVisualizacao(
        guardian
    ) {

        if (!guardianViewModal) {

            return;

        }


        viewGuardianName.textContent =
            guardian.name;


        viewGuardianStudent.textContent =
            guardian.student;


        viewGuardianRelationship.textContent =
            guardian.relationship;


        viewGuardianPhone.textContent =
            guardian.phone;


        viewGuardianEmail.textContent =
            guardian.email;


        viewGuardianDocument.textContent =
            guardian.document;


        viewGuardianStatus.textContent =
            guardian.status;


        viewGuardianPickup.textContent =
            guardian.authorizedPickup
                ? "Autorizado"
                : "Não autorizado";


        guardianViewModal.classList.add(
            "active"
        );


        guardianViewModal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.classList.add(
            "modal-open"
        );

    }


    function fecharVisualizacao() {

        if (!guardianViewModal) {

            return;

        }


        guardianViewModal.classList.remove(
            "active"
        );


        guardianViewModal.setAttribute(
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
        guardian
    ) {

        if (!deleteGuardianModal) {

            return;

        }


        guardianToDelete =
            guardian.id;


        deleteGuardianMessage.textContent =
            `Deseja realmente excluir "${guardian.name}"?`;


        deleteGuardianModal.classList.add(
            "active"
        );


        deleteGuardianModal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.classList.add(
            "modal-open"
        );

    }


    function fecharModalExclusao() {

        if (!deleteGuardianModal) {

            return;

        }


        deleteGuardianModal.classList.remove(
            "active"
        );


        deleteGuardianModal.setAttribute(
            "aria-hidden",
            "true"
        );


        document.body.classList.remove(
            "modal-open"
        );


        guardianToDelete =
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


                const guardian =
                    guardians.find(
                        item =>
                            item.id === id
                    );


                if (!guardian) {

                    return;

                }


                const action =
                    button.dataset.action;


                if (action === "view") {

                    abrirVisualizacao(
                        guardian
                    );

                }


                if (action === "edit") {

                    abrirModalResponsavel(
                        guardian
                    );

                }


                if (action === "delete") {

                    abrirModalExclusao(
                        guardian
                    );

                }

            }
        );

    }


    /*====================================================
                    BOTÕES
    ====================================================*/

    if (newGuardianButton) {

        newGuardianButton.addEventListener(
            "click",
            function () {

                abrirModalResponsavel();

            }
        );

    }


    if (guardianModalClose) {

        guardianModalClose.addEventListener(
            "click",
            fecharModalResponsavel
        );

    }


    if (guardianCancelButton) {

        guardianCancelButton.addEventListener(
            "click",
            fecharModalResponsavel
        );

    }


    if (guardianModalOverlay) {

        guardianModalOverlay.addEventListener(
            "click",
            fecharModalResponsavel
        );

    }


    if (guardianViewClose) {

        guardianViewClose.addEventListener(
            "click",
            fecharVisualizacao
        );

    }


    if (guardianViewOverlay) {

        guardianViewOverlay.addEventListener(
            "click",
            fecharVisualizacao
        );

    }


    if (deleteGuardianCancel) {

        deleteGuardianCancel.addEventListener(
            "click",
            fecharModalExclusao
        );

    }


    if (deleteGuardianOverlay) {

        deleteGuardianOverlay.addEventListener(
            "click",
            fecharModalExclusao
        );

    }


    if (deleteGuardianConfirm) {

        deleteGuardianConfirm.addEventListener(
            "click",
            function () {

                if (
                    guardianToDelete ===
                    null
                ) {

                    return;

                }


                guardians =
                    guardians.filter(
                        guardian =>
                            guardian.id !==
                            guardianToDelete
                    );


                salvarResponsaveis();


                renderGuardians();


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
            renderGuardians
        );

    }


    if (relationshipFilter) {

        relationshipFilter.addEventListener(
            "change",
            renderGuardians
        );

    }


    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            renderGuardians
        );

    }


    /*====================================================
                    ESC
    ====================================================*/

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key !== "Escape"
            ) {

                return;

            }


            fecharModalResponsavel();

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

    preencherSelectAlunos();

    renderGuardians();

});