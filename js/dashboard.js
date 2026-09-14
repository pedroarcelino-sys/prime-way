/*====================================================
        DASHBOARD - PRIMEWAY SCHOOL
====================================================*/

document.addEventListener("DOMContentLoaded", async function () {
    await window.PrimeWayStorage?.ready;

    /*====================================================
                AUTENTICAÇÃO / SESSÃO
    ====================================================*/

    const AUTH_SESSION_URL =
        "../api/auth/session.php";

    const AUTH_LOGOUT_URL =
        "../api/auth/logout.php";

    const DASHBOARD_URL =
        "../api/dashboard/index.php";


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


    /*
        A sessão PHP é a fonte de verdade.

        O sessionStorage continua sendo preenchido
        temporariamente apenas para compatibilidade
        com as páginas que ainda não foram migradas.

        O dashboard é uma área administrativa e,
        nesta etapa, somente o perfil Admin pode
        permanecer nesta página.
    */


    /*====================================================
            COMPATIBILIDADE COM O FRONT-END ATUAL
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
                VALIDAR SESSÃO PHP
    ====================================================*/

    async function validarSessaoServidor() {

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


                return false;
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

                /*
                    Uma sessão válida de Professor não é
                    encerrada apenas porque o usuário tentou
                    abrir o Dashboard administrativo.
                */

                if (
                    perfil ===
                    "professor"
                ) {

                    window.location.replace(
                        PAGINA_PROFESSOR
                    );


                    return false;
                }


                limparSessaoCompatibilidade();


                window.location.replace(
                    PAGINA_LOGIN
                );


                return false;
            }


            return usuario;

        } catch (
            error
        ) {

            console.error(
                "Erro ao validar a sessão do Dashboard:",
                error
            );


            limparSessaoCompatibilidade();


            window.location.replace(
                PAGINA_LOGIN
            );


            return false;
        }
    }


    const usuarioSessao =
        await validarSessaoServidor();


    if (
        !usuarioSessao
    ) {

        return;
    }


    /*====================================================
                    ELEMENTOS
    ====================================================*/

    const pesquisaInput =
        document.querySelector(
            ".pesquisa input"
        );


    const logoutButton =
        document.querySelector(
            "#logoutButton"
        );

    definirTexto(
        document.querySelector("#dashboardUserName"),
        usuarioSessao.nome || usuarioSessao.email || "Administrador"
    );

    definirTexto(
        document.querySelector("#dashboardUserRole"),
        "Administrador"
    );

    const dashboardElements = {
        students: document.querySelector("#dashboardStudents"),
        professors: document.querySelector("#dashboardProfessors"),
        classes: document.querySelector("#dashboardClasses"),
        average: document.querySelector("#dashboardAverage"),
        recentList: document.querySelector("#dashboardRecentList"),
        calendarList: document.querySelector("#dashboardCalendarList"),
        noticeList: document.querySelector("#dashboardNoticeList"),
        attendancePercentage: document.querySelector("#dashboardAttendancePercentage"),
        present: document.querySelector("#dashboardPresent"),
        absent: document.querySelector("#dashboardAbsent"),
        attendanceAverage: document.querySelector("#dashboardAttendanceAverage"),
        pendingActivities: document.querySelector("#dashboardPendingActivities"),
        studentsAttention: document.querySelector("#dashboardStudentsAttention"),
        lowAttendance: document.querySelector("#dashboardLowAttendance"),
        pendingGrades: document.querySelector("#dashboardPendingGrades")
    };


    /*====================================================
                    UTILITÁRIOS
    ====================================================*/

    function normalizarTexto(texto) {

        return String(
            texto ?? ""
        )
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .toLowerCase()
            .trim();
    }


    function navegarPara(pagina) {

        if (!pagina) {
            return;
        }


        window.location.href =
            pagina;
    }


    function definirTexto(elemento, valor) {

        if (elemento) {
            elemento.textContent = String(valor);
        }
    }


    function formatarNumero(valor) {

        return new Intl.NumberFormat("pt-BR").format(
            Number(valor) || 0
        );
    }


    function formatarDataHora(valor) {

        if (!valor) {
            return "";
        }

        const data = new Date(
            String(valor).replace(" ", "T")
        );

        if (Number.isNaN(data.getTime())) {
            return String(valor);
        }

        return new Intl.DateTimeFormat(
            "pt-BR",
            {
                dateStyle: "short",
                timeStyle: "short"
            }
        ).format(data);
    }


    function criarEstadoVazio(mensagem) {

        const elemento = document.createElement("p");
        elemento.className = "dashboard-empty-state";
        elemento.textContent = mensagem;

        return elemento;
    }


    function prepararPainelVazio() {

        dashboardElements.recentList?.setAttribute("data-ready", "true");
        dashboardElements.calendarList?.setAttribute("data-ready", "true");
        dashboardElements.noticeList?.setAttribute("data-ready", "true");

        dashboardElements.recentList?.replaceChildren(
            criarEstadoVazio("Nenhuma atividade registrada no sistema.")
        );

        dashboardElements.calendarList?.replaceChildren(
            criarEstadoVazio("Nenhum evento futuro cadastrado.")
        );

        dashboardElements.noticeList?.replaceChildren(
            criarEstadoVazio("Nenhum aviso publicado.")
        );

        document.querySelectorAll(".chart-bar").forEach(
            function (barra) {
                barra.style.height = "0%";
                barra.dataset.value = "—";
            }
        );

        const graficoFrequencia =
            document.querySelector(".donut-chart");

        if (graficoFrequencia) {
            graficoFrequencia.style.background =
                "conic-gradient(#e5e7eb 0 100%)";
            graficoFrequencia.setAttribute(
                "aria-label",
                "Ainda não há registros de frequência"
            );
        }
    }


    function renderizarAtividades(itens) {

        const lista = dashboardElements.recentList;

        if (!lista) {
            return;
        }

        lista.replaceChildren();

        if (!Array.isArray(itens) || itens.length === 0) {
            lista.append(
                criarEstadoVazio("Nenhuma atividade registrada no sistema.")
            );
            return;
        }

        for (const item of itens) {
            const linha = document.createElement("div");
            linha.className = "recent-item";

            const icone = document.createElement("div");
            icone.className = "recent-icon atividade";
            icone.innerHTML = '<i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i>';

            const info = document.createElement("div");
            info.className = "recent-info";

            const titulo = document.createElement("h3");
            titulo.textContent = item.action || "Atualização";

            const descricao = document.createElement("p");
            descricao.textContent =
                item.description ||
                (item.entity
                    ? `Registro atualizado em ${item.entity}.`
                    : "Registro atualizado no sistema.");

            const data = document.createElement("span");
            data.textContent = formatarDataHora(item.createdAt);

            info.append(titulo, descricao, data);
            linha.append(icone, info);
            lista.append(linha);
        }
    }


    function renderizarEventos(itens) {

        const lista = dashboardElements.calendarList;

        if (!lista) {
            return;
        }

        lista.replaceChildren();

        if (!Array.isArray(itens) || itens.length === 0) {
            lista.append(
                criarEstadoVazio("Nenhum evento futuro cadastrado.")
            );
            return;
        }

        for (const item of itens) {
            const dataEvento = new Date(`${item.date}T12:00:00`);
            const linha = document.createElement("div");
            linha.className = "calendar-item";

            const data = document.createElement("div");
            data.className = "calendar-date";

            const dia = document.createElement("span");
            dia.className = "calendar-day";
            dia.textContent = Number.isNaN(dataEvento.getTime())
                ? "—"
                : String(dataEvento.getDate()).padStart(2, "0");

            const mes = document.createElement("span");
            mes.className = "calendar-month";
            mes.textContent = Number.isNaN(dataEvento.getTime())
                ? ""
                : dataEvento.toLocaleDateString("pt-BR", { month: "short" })
                    .replace(".", "")
                    .toUpperCase();

            data.append(dia, mes);

            const info = document.createElement("div");
            info.className = "calendar-info";
            const titulo = document.createElement("h3");
            titulo.textContent = item.title || "Evento";
            const horario = document.createElement("p");
            horario.textContent = item.startTime
                ? `${String(item.startTime).slice(0, 5)}${item.endTime ? ` - ${String(item.endTime).slice(0, 5)}` : ""}`
                : "Horário não informado";
            const contexto = document.createElement("span");
            contexto.textContent =
                item.className || item.location || item.type || "Evento geral";
            info.append(titulo, horario, contexto);

            linha.append(data, info);
            lista.append(linha);
        }
    }


    function renderizarAvisos(itens) {

        const lista = dashboardElements.noticeList;

        if (!lista) {
            return;
        }

        lista.replaceChildren();

        if (!Array.isArray(itens) || itens.length === 0) {
            lista.append(
                criarEstadoVazio("Nenhum aviso publicado.")
            );
            return;
        }

        for (const item of itens) {
            const linha = document.createElement("div");
            linha.className = "notice-item";

            const icone = document.createElement("div");
            icone.className = "notice-icon informativo";
            icone.innerHTML = '<i class="fa-solid fa-info" aria-hidden="true"></i>';

            const info = document.createElement("div");
            info.className = "notice-info";
            const titulo = document.createElement("h3");
            titulo.textContent = item.title || "Aviso";
            const mensagem = document.createElement("p");
            mensagem.textContent = item.message || "";
            const data = document.createElement("span");
            data.className = "notice-time";
            data.textContent = formatarDataHora(item.date);
            info.append(titulo, mensagem, data);

            linha.append(icone, info);
            lista.append(linha);
        }
    }


    function renderizarDesempenho(itens, anoLetivo) {

        const barras = document.querySelector(".chart-bars");
        const grafico = document.querySelector(".performance-chart");
        const seletor = document.querySelector(".performance-select");

        if (seletor) {
            seletor.replaceChildren();
            const opcao = document.createElement("option");
            opcao.value = anoLetivo ? String(anoLetivo) : "";
            opcao.textContent = anoLetivo ? String(anoLetivo) : "Sem ano letivo";
            seletor.append(opcao);
            seletor.disabled = !anoLetivo;
        }

        if (!barras) {
            return;
        }

        barras.replaceChildren();

        if (!Array.isArray(itens) || itens.length === 0) {
            barras.append(
                criarEstadoVazio("Nenhum período letivo cadastrado.")
            );
            grafico?.setAttribute("aria-label", "Ainda não há dados de desempenho");
            return;
        }

        const descricoes = [];

        for (const item of itens) {
            const coluna = document.createElement("div");
            coluna.className = "chart-column";
            const barra = document.createElement("div");
            barra.className = "chart-bar";
            const media = item.average;
            const valor = media === null || media === undefined
                ? "—"
                : Number(media).toLocaleString("pt-BR", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1
                });
            barra.style.height = media === null || media === undefined
                ? "0%"
                : `${Math.max(0, Math.min(100, Number(media) * 10))}%`;
            barra.dataset.value = valor;
            const rotulo = document.createElement("span");
            rotulo.textContent = item.label || `Período ${item.order || ""}`;
            coluna.append(barra, rotulo);
            barras.append(coluna);
            descricoes.push(`${rotulo.textContent}: ${valor}`);
        }

        grafico?.setAttribute(
            "aria-label",
            descricoes.some((texto) => !texto.endsWith("—"))
                ? `Médias por período: ${descricoes.join(", ")}`
                : "Ainda não há notas lançadas"
        );
    }


    function renderizarDashboard(data) {

        const resumo = data.summary || {};
        const frequencia = data.attendance || {};
        const indicadores = data.indicators || {};
        const percentual = frequencia.percentage;

        definirTexto(dashboardElements.students, formatarNumero(resumo.students));
        definirTexto(dashboardElements.professors, formatarNumero(resumo.professors));
        definirTexto(dashboardElements.classes, formatarNumero(resumo.classes));
        definirTexto(
            dashboardElements.average,
            resumo.average === null || resumo.average === undefined
                ? "—"
                : Number(resumo.average).toLocaleString("pt-BR", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1
                })
        );

        definirTexto(dashboardElements.present, formatarNumero(frequencia.present));
        definirTexto(dashboardElements.absent, formatarNumero(frequencia.absent));
        definirTexto(
            dashboardElements.attendancePercentage,
            percentual === null || percentual === undefined
                ? "—"
                : `${Number(percentual).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
        );
        definirTexto(
            dashboardElements.attendanceAverage,
            percentual === null || percentual === undefined
                ? "—"
                : `${Number(percentual).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
        );

        definirTexto(dashboardElements.pendingActivities, formatarNumero(indicadores.pendingActivities));
        definirTexto(dashboardElements.studentsAttention, formatarNumero(indicadores.studentsAttention));
        definirTexto(dashboardElements.lowAttendance, formatarNumero(indicadores.lowAttendance));
        definirTexto(dashboardElements.pendingGrades, formatarNumero(indicadores.pendingGrades));

        renderizarAtividades(data.recentActivity);
        renderizarEventos(data.events);
        renderizarAvisos(data.notices);
        renderizarDesempenho(data.performance, data.academicYear);

        const graficoFrequencia = document.querySelector(".donut-chart");

        if (graficoFrequencia && percentual !== null && percentual !== undefined) {
            const limite = Math.max(0, Math.min(100, Number(percentual) || 0));
            graficoFrequencia.style.background =
                `conic-gradient(#57a76f 0 ${limite}%, #e5e7eb ${limite}% 100%)`;
            graficoFrequencia.setAttribute(
                "aria-label",
                `Frequência média de ${limite}%`
            );
        }
    }


    async function carregarDashboard() {

        prepararPainelVazio();

        try {
            const response = await fetch(
                DASHBOARD_URL,
                {
                    method: "GET",
                    credentials: "same-origin",
                    cache: "no-store",
                    headers: {
                        "Accept": "application/json"
                    }
                }
            );

            const data = await lerJsonSeguro(response);

            if (!response.ok || !data?.success) {
                throw new Error(data?.message || "Falha ao carregar o painel.");
            }

            renderizarDashboard(data);
        } catch (error) {
            console.error("Erro ao carregar os dados do Dashboard:", error);
        }
    }


    await carregarDashboard();


    /*====================================================
                PESQUISA DO DASHBOARD
    ====================================================*/

    const elementosPesquisaveis =
        document.querySelectorAll(
            [
                ".dashboard-card",
                ".recent-item",
                ".calendar-item",
                ".notice-item",
                ".indicator-card"
            ].join(", ")
        );


    function filtrarDashboard() {

        if (!pesquisaInput) {
            return;
        }


        const termo =
            normalizarTexto(
                pesquisaInput.value
            );


        elementosPesquisaveis.forEach(
            function (elemento) {

                const conteudo =
                    normalizarTexto(
                        elemento.textContent
                    );


                const corresponde =
                    termo === "" ||
                    conteudo.includes(
                        termo
                    );


                elemento.hidden =
                    !corresponde;
            }
        );
    }


    function limparPesquisaDashboard() {

        if (!pesquisaInput) {
            return;
        }


        pesquisaInput.value =
            "";


        filtrarDashboard();
    }


    if (pesquisaInput) {

        pesquisaInput.addEventListener(
            "input",
            filtrarDashboard
        );


        pesquisaInput.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key !== "Escape" ||
                    pesquisaInput.value === ""
                ) {

                    return;
                }


                limparPesquisaDashboard();


                pesquisaInput.focus();
            }
        );
    }


    /*====================================================
                NAVEGAÇÕES DO DASHBOARD
    ====================================================*/

    /*
        Estas navegações substituem os antigos
        atributos onclick existentes no HTML.
    */


    /* NOTIFICAÇÕES - TOPO */

    const botaoNotificacao =
        document.querySelector(
            ".btn-notificacao"
        );


    botaoNotificacao?.addEventListener(
        "click",
        function () {

            navegarPara(
                "notificacoes.html"
            );
        }
    );


    /*====================================================
                    CALENDÁRIO
    ====================================================*/

    const abrirCalendarioButton =
        document.querySelector(
            '.panel-action[title="Abrir calendário"]'
        );


    abrirCalendarioButton?.addEventListener(
        "click",
        function () {

            navegarPara(
                "calendario.html"
            );
        }
    );


    const calendarioCompletoButton =
        document.querySelector(
            ".calendar-button"
        );


    calendarioCompletoButton?.addEventListener(
        "click",
        function () {

            navegarPara(
                "calendario.html"
            );
        }
    );


    /*====================================================
                    NOTIFICAÇÕES
    ====================================================*/

    const abrirNotificacoesButton =
        document.querySelector(
            '.panel-action[title="Abrir notificações"]'
        );


    abrirNotificacoesButton?.addEventListener(
        "click",
        function () {

            navegarPara(
                "notificacoes.html"
            );
        }
    );


    const verAvisosButton =
        document.querySelector(
            ".notice-button"
        );


    verAvisosButton?.addEventListener(
        "click",
        function () {

            navegarPara(
                "notificacoes.html"
            );
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


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            fazerLogout
        );


        /*
            Compatibilidade temporária com versões
            antigas do dashboard.html onde logoutButton
            ainda era um <li>.

            Se já for <button>, este trecho não altera
            sua estrutura.
        */

        if (
            logoutButton.tagName !==
            "BUTTON"
        ) {

            logoutButton.setAttribute(
                "role",
                "button"
            );


            logoutButton.setAttribute(
                "tabindex",
                "0"
            );


            logoutButton.addEventListener(
                "keydown",
                function (event) {

                    if (
                        event.key !== "Enter" &&
                        event.key !== " "
                    ) {

                        return;
                    }


                    event.preventDefault();


                    fazerLogout();
                }
            );
        }
    }

});
