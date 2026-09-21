/*====================================================
        CONFIGURAÇÕES - PRIMEWAY SCHOOL
====================================================*/

document.addEventListener("DOMContentLoaded", async function () {
    await window.PrimeWayStorage?.ready;

    /*====================================================
                API / AUTENTICAÇÃO
    ====================================================*/

    const SETTINGS_API_URL =
        "../api/configuracoes/index.php";

    const SETTINGS_SAVE_URL =
        "../api/configuracoes/salvar.php";


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
        O gerenciamento das Configurações do sistema
        fica reservado ao perfil Admin nesta etapa.

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
                "Erro ao validar a sessão de Configurações:",
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
                CONFIGURAÇÕES PADRÃO
    ====================================================*/

    const DEFAULT_SETTINGS = {

        school: {

            name:
                "PrimeWay School",

            legalName:
                "PrimeWay School Educação Ltda.",

            document:
                "",

            director:
                "",

            email:
                "contato@primewayschool.com",

            phone:
                "",

            address:
                "",

            city:
                "",

            state:
                "",

            zip:
                ""

        },


        academic: {

            year:
                2026,

            period:
                "Bimestral",

            passingAverage:
                6,

            minAttendance:
                75,

            classDuration:
                50,

            schoolDays:
                200,

            defaultShift:
                "Manhã"

        },


        notifications: {

            calendar:
                true,

            announcements:
                true,

            grades:
                true,

            attendance:
                true,

            guardians:
                true

        },


        system: {

            dateFormat:
                "DD/MM/YYYY",

            defaultPage:
                "dashboard.html",

            timezone:
                "America/Sao_Paulo"

        }

    };


    /*====================================================
                OPÇÕES PERMITIDAS
    ====================================================*/

    const PERIODOS_VALIDOS =
        new Set([
            "Bimestral",
            "Trimestral",
            "Semestral"
        ]);


    const TURNOS_VALIDOS =
        new Set([
            "Manhã",
            "Tarde",
            "Integral"
        ]);


    const FORMATOS_DATA_VALIDOS =
        new Set([
            "DD/MM/YYYY",
            "YYYY-MM-DD"
        ]);


    const PAGINAS_INICIAIS_VALIDAS =
        new Set([
            "dashboard.html",
            "calendario.html",
            "notificacoes.html"
        ]);


    const FUSOS_VALIDOS =
        new Set([
            "America/Sao_Paulo",
            "America/Manaus",
            "America/Rio_Branco"
        ]);


    /*====================================================
                    ELEMENTOS
    ====================================================*/

    const settingsForm =
        document.querySelector(
            "#settingsForm"
        );


    const saveSettingsButton =
        document.querySelector(
            "#saveSettingsButton"
        );


    /* DADOS DA ESCOLA */

    const schoolName =
        document.querySelector(
            "#schoolName"
        );


    const schoolLegalName =
        document.querySelector(
            "#schoolLegalName"
        );


    const schoolDocument =
        document.querySelector(
            "#schoolDocument"
        );


    const schoolDirector =
        document.querySelector(
            "#schoolDirector"
        );


    const schoolEmail =
        document.querySelector(
            "#schoolEmail"
        );


    const schoolPhone =
        document.querySelector(
            "#schoolPhone"
        );


    const schoolAddress =
        document.querySelector(
            "#schoolAddress"
        );


    const schoolCity =
        document.querySelector(
            "#schoolCity"
        );


    const schoolState =
        document.querySelector(
            "#schoolState"
        );


    const schoolZip =
        document.querySelector(
            "#schoolZip"
        );


    /* ACADÊMICO */

    const academicYear =
        document.querySelector(
            "#academicYear"
        );


    const academicPeriod =
        document.querySelector(
            "#academicPeriod"
        );


    const passingAverage =
        document.querySelector(
            "#passingAverage"
        );


    const minAttendance =
        document.querySelector(
            "#minAttendance"
        );


    const classDuration =
        document.querySelector(
            "#classDuration"
        );


    const schoolDays =
        document.querySelector(
            "#schoolDays"
        );


    const defaultShift =
        document.querySelector(
            "#defaultShift"
        );


    /* NOTIFICAÇÕES */

    const notifyCalendar =
        document.querySelector(
            "#notifyCalendar"
        );


    const notifyAnnouncements =
        document.querySelector(
            "#notifyAnnouncements"
        );


    const notifyGrades =
        document.querySelector(
            "#notifyGrades"
        );


    const notifyAttendance =
        document.querySelector(
            "#notifyAttendance"
        );


    const notifyGuardians =
        document.querySelector(
            "#notifyGuardians"
        );


    /* SISTEMA */

    const dateFormat =
        document.querySelector(
            "#dateFormat"
        );


    const defaultPage =
        document.querySelector(
            "#defaultPage"
        );


    const schoolTimezone =
        document.querySelector(
            "#schoolTimezone"
        );


    /* RESUMO */

    const currentAcademicYear =
        document.querySelector(
            "#currentAcademicYear"
        );


    const currentPassingAverage =
        document.querySelector(
            "#currentPassingAverage"
        );


    const currentMinAttendance =
        document.querySelector(
            "#currentMinAttendance"
        );


    const currentNotificationsStatus =
        document.querySelector(
            "#currentNotificationsStatus"
        );


    /* RESTAURAR */

    const resetSettingsButton =
        document.querySelector(
            "#resetSettingsButton"
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

        settingsForm,
        saveSettingsButton,

        schoolName,
        schoolLegalName,
        schoolDocument,
        schoolDirector,
        schoolEmail,
        schoolPhone,
        schoolAddress,
        schoolCity,
        schoolState,
        schoolZip,

        academicYear,
        academicPeriod,
        passingAverage,
        minAttendance,
        classDuration,
        schoolDays,
        defaultShift,

        notifyCalendar,
        notifyAnnouncements,
        notifyGrades,
        notifyAttendance,
        notifyGuardians,

        dateFormat,
        defaultPage,
        schoolTimezone,

        currentAcademicYear,
        currentPassingAverage,
        currentMinAttendance,
        currentNotificationsStatus,

        resetSettingsButton,
    ];


    if (
        elementosObrigatorios.some(
            elemento =>
                !elemento
        )
    ) {

        console.error(
            "Configurações: a estrutura esperada da página não foi encontrada."
        );


        return;

    }


    /*====================================================
                    UTILITÁRIOS
    ====================================================*/

    function copiarPadrao() {

        return JSON.parse(
            JSON.stringify(
                DEFAULT_SETTINGS
            )
        );

    }


    function objetoSeguro(
        valor
    ) {

        return (
            valor &&
            typeof valor ===
                "object" &&
            !Array.isArray(
                valor
            )
        )
            ? valor
            : {};

    }


    function textoSeguro(
        valor,
        fallback = ""
    ) {

        return typeof valor ===
            "string"
                ? valor
                : fallback;

    }


    function numeroNoIntervalo(
        valor,
        minimo,
        maximo,
        fallback
    ) {

        if (
            valor === null ||
            valor === undefined ||
            valor === ""
        ) {

            return fallback;

        }


        const numero =
            Number(
                valor
            );


        return (
            Number.isFinite(
                numero
            ) &&
            numero >=
                minimo &&
            numero <=
                maximo
        )
            ? numero
            : fallback;

    }


    function opcaoValida(
        valor,
        opcoes,
        fallback
    ) {

        return opcoes.has(
            valor
        )
            ? valor
            : fallback;

    }


    function booleanoSeguro(
        valor,
        fallback
    ) {

        if (
            typeof valor ===
            "boolean"
        ) {

            return valor;

        }


        if (
            valor ===
            "true"
        ) {

            return true;

        }


        if (
            valor ===
            "false"
        ) {

            return false;

        }


        return fallback;

    }


    function formatarMedia(
        valor
    ) {

        const numero =
            Number(
                valor
            );


        if (
            !Number.isFinite(
                numero
            )
        ) {

            return "-";

        }


        return numero
            .toFixed(
                1
            )
            .replace(
                ".",
                ","
            );

    }


    function statusNotificacoes(
        notificacoes
    ) {

        const valores =
            Object.values(
                notificacoes
            ).map(
                Boolean
            );


        const ativas =
            valores.filter(
                Boolean
            ).length;


        if (
            ativas ===
            0
        ) {

            return "Desativadas";

        }


        if (
            ativas ===
            valores.length
        ) {

            return "Ativas";

        }


        return `${ativas}/${valores.length}`;

    }


    /*====================================================
            NORMALIZAR CONFIGURAÇÕES
    ====================================================*/

    function normalizarConfiguracoes(
        dados
    ) {

        const raiz =
            objetoSeguro(
                dados
            );


        const school =
            objetoSeguro(
                raiz.school
            );


        const academic =
            objetoSeguro(
                raiz.academic
            );


        const notifications =
            objetoSeguro(
                raiz.notifications
            );


        const system =
            objetoSeguro(
                raiz.system
            );


        return {

            school: {

                name:
                    textoSeguro(
                        school.name,
                        DEFAULT_SETTINGS
                            .school
                            .name
                    ),

                legalName:
                    textoSeguro(
                        school.legalName,
                        DEFAULT_SETTINGS
                            .school
                            .legalName
                    ),

                document:
                    textoSeguro(
                        school.document,
                        DEFAULT_SETTINGS
                            .school
                            .document
                    ),

                director:
                    textoSeguro(
                        school.director,
                        DEFAULT_SETTINGS
                            .school
                            .director
                    ),

                email:
                    textoSeguro(
                        school.email,
                        DEFAULT_SETTINGS
                            .school
                            .email
                    ),

                phone:
                    textoSeguro(
                        school.phone,
                        DEFAULT_SETTINGS
                            .school
                            .phone
                    ),

                address:
                    textoSeguro(
                        school.address,
                        DEFAULT_SETTINGS
                            .school
                            .address
                    ),

                city:
                    textoSeguro(
                        school.city,
                        DEFAULT_SETTINGS
                            .school
                            .city
                    ),

                state:
                    textoSeguro(
                        school.state,
                        DEFAULT_SETTINGS
                            .school
                            .state
                    )
                        .trim()
                        .toUpperCase()
                        .slice(
                            0,
                            2
                        ),

                zip:
                    textoSeguro(
                        school.zip,
                        DEFAULT_SETTINGS
                            .school
                            .zip
                    )

            },


            academic: {

                year:
                    numeroNoIntervalo(
                        academic.year,
                        2020,
                        2100,
                        DEFAULT_SETTINGS
                            .academic
                            .year
                    ),

                period:
                    opcaoValida(
                        academic.period,
                        PERIODOS_VALIDOS,
                        DEFAULT_SETTINGS
                            .academic
                            .period
                    ),

                passingAverage:
                    numeroNoIntervalo(
                        academic
                            .passingAverage,
                        0,
                        10,
                        DEFAULT_SETTINGS
                            .academic
                            .passingAverage
                    ),

                minAttendance:
                    numeroNoIntervalo(
                        academic
                            .minAttendance,
                        0,
                        100,
                        DEFAULT_SETTINGS
                            .academic
                            .minAttendance
                    ),

                classDuration:
                    numeroNoIntervalo(
                        academic
                            .classDuration,
                        20,
                        180,
                        DEFAULT_SETTINGS
                            .academic
                            .classDuration
                    ),

                schoolDays:
                    numeroNoIntervalo(
                        academic
                            .schoolDays,
                        1,
                        365,
                        DEFAULT_SETTINGS
                            .academic
                            .schoolDays
                    ),

                defaultShift:
                    opcaoValida(
                        academic
                            .defaultShift,
                        TURNOS_VALIDOS,
                        DEFAULT_SETTINGS
                            .academic
                            .defaultShift
                    )

            },


            notifications: {

                calendar:
                    booleanoSeguro(
                        notifications
                            .calendar,
                        DEFAULT_SETTINGS
                            .notifications
                            .calendar
                    ),

                announcements:
                    booleanoSeguro(
                        notifications
                            .announcements,
                        DEFAULT_SETTINGS
                            .notifications
                            .announcements
                    ),

                grades:
                    booleanoSeguro(
                        notifications
                            .grades,
                        DEFAULT_SETTINGS
                            .notifications
                            .grades
                    ),

                attendance:
                    booleanoSeguro(
                        notifications
                            .attendance,
                        DEFAULT_SETTINGS
                            .notifications
                            .attendance
                    ),

                guardians:
                    booleanoSeguro(
                        notifications
                            .guardians,
                        DEFAULT_SETTINGS
                            .notifications
                            .guardians
                    )

            },


            system: {

                dateFormat:
                    opcaoValida(
                        system
                            .dateFormat,
                        FORMATOS_DATA_VALIDOS,
                        DEFAULT_SETTINGS
                            .system
                            .dateFormat
                    ),

                defaultPage:
                    opcaoValida(
                        system
                            .defaultPage,
                        PAGINAS_INICIAIS_VALIDAS,
                        DEFAULT_SETTINGS
                            .system
                            .defaultPage
                    ),

                timezone:
                    opcaoValida(
                        system
                            .timezone,
                        FUSOS_VALIDOS,
                        DEFAULT_SETTINGS
                            .system
                            .timezone
                    )

            }

        };

    }


    /*====================================================
                API - CONFIGURAÇÕES
    ====================================================*/

    async function carregarConfiguracoes() {

        try {

            const response =
                await fetch(
                    SETTINGS_API_URL,
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
                !data?.success ||
                !data?.settings
            ) {

                throw new Error(
                    data?.message ||
                    "O servidor não retornou as configurações."
                );

            }


            return normalizarConfiguracoes(
                data.settings
            );

        } catch (
            erro
        ) {

            console.error(
                "Erro ao carregar configurações do servidor:",
                erro
            );


            PrimeWayFeedback.error(
                erro?.message ||
                "Não foi possível carregar as configurações do servidor."
            );


            return null;

        }

    }


    async function salvarConfiguracoes(
        dados
    ) {

        try {

            const response =
                await fetch(
                    SETTINGS_SAVE_URL,
                    {
                        method:
                            "POST",

                        credentials:
                            "same-origin",

                        cache:
                            "no-store",

                        headers: {
                            "Accept":
                                "application/json",

                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                dados
                            )
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

                return {
                    success:
                        false,

                    message:
                        data?.message ||
                        "Não foi possível salvar as configurações."
                };

            }


            return {
                success:
                    true,

                message:
                    data.message ||
                    "Configurações salvas com sucesso."
            };

        } catch (
            erro
        ) {

            console.error(
                "Erro ao salvar configurações no servidor:",
                erro
            );


            return {
                success:
                    false,

                message:
                    "Não foi possível comunicar com o servidor."
            };

        }

    }


    /*====================================================
                    ESTADO
    ====================================================*/

    let settings =
        await carregarConfiguracoes();


    if (
        !settings
    ) {

        return;

    }






    /*====================================================
            PREENCHER FORMULÁRIO
    ====================================================*/

    function preencherFormulario() {

        /* ESCOLA */

        schoolName.value =
            settings.school.name;


        schoolLegalName.value =
            settings.school.legalName;


        schoolDocument.value =
            settings.school.document;


        schoolDirector.value =
            settings.school.director;


        schoolEmail.value =
            settings.school.email;


        schoolPhone.value =
            settings.school.phone;


        schoolAddress.value =
            settings.school.address;


        schoolCity.value =
            settings.school.city;


        schoolState.value =
            settings.school.state;


        schoolZip.value =
            settings.school.zip;


        /* ACADÊMICO */

        academicYear.value =
            settings.academic.year;


        academicPeriod.value =
            settings.academic.period;


        passingAverage.value =
            settings.academic
                .passingAverage;


        minAttendance.value =
            settings.academic
                .minAttendance;


        classDuration.value =
            settings.academic
                .classDuration;


        schoolDays.value =
            settings.academic
                .schoolDays;


        defaultShift.value =
            settings.academic
                .defaultShift;


        /* NOTIFICAÇÕES */

        notifyCalendar.checked =
            settings.notifications
                .calendar;


        notifyAnnouncements.checked =
            settings.notifications
                .announcements;


        notifyGrades.checked =
            settings.notifications
                .grades;


        notifyAttendance.checked =
            settings.notifications
                .attendance;


        notifyGuardians.checked =
            settings.notifications
                .guardians;


        /* SISTEMA */

        dateFormat.value =
            settings.system
                .dateFormat;


        defaultPage.value =
            settings.system
                .defaultPage;


        schoolTimezone.value =
            settings.system
                .timezone;


        atualizarResumo(
            settings
        );

    }


    /*====================================================
                LER FORMULÁRIO
    ====================================================*/

    function lerFormulario() {

        return {

            school: {

                name:
                    schoolName.value
                        .trim(),

                legalName:
                    schoolLegalName.value
                        .trim(),

                document:
                    schoolDocument.value
                        .trim(),

                director:
                    schoolDirector.value
                        .trim(),

                email:
                    schoolEmail.value
                        .trim(),

                phone:
                    schoolPhone.value
                        .trim(),

                address:
                    schoolAddress.value
                        .trim(),

                city:
                    schoolCity.value
                        .trim(),

                state:
                    schoolState.value
                        .trim()
                        .toUpperCase(),

                zip:
                    schoolZip.value
                        .trim()

            },


            academic: {

                year:
                    Number(
                        academicYear.value
                    ),

                period:
                    academicPeriod.value,

                passingAverage:
                    Number(
                        passingAverage.value
                    ),

                minAttendance:
                    Number(
                        minAttendance.value
                    ),

                classDuration:
                    Number(
                        classDuration.value
                    ),

                schoolDays:
                    Number(
                        schoolDays.value
                    ),

                defaultShift:
                    defaultShift.value

            },


            notifications: {

                calendar:
                    notifyCalendar.checked,

                announcements:
                    notifyAnnouncements.checked,

                grades:
                    notifyGrades.checked,

                attendance:
                    notifyAttendance.checked,

                guardians:
                    notifyGuardians.checked

            },


            system: {

                dateFormat:
                    dateFormat.value,

                defaultPage:
                    defaultPage.value,

                timezone:
                    schoolTimezone.value

            }

        };

    }


    /*====================================================
                    VALIDAÇÃO
    ====================================================*/

    function limparValidacoesPersonalizadas() {

        schoolName.setCustomValidity(
            ""
        );


        academicYear.setCustomValidity(
            ""
        );


        academicPeriod.setCustomValidity(
            ""
        );


        passingAverage.setCustomValidity(
            ""
        );


        minAttendance.setCustomValidity(
            ""
        );


        classDuration.setCustomValidity(
            ""
        );


        schoolDays.setCustomValidity(
            ""
        );


        defaultShift.setCustomValidity(
            ""
        );


        dateFormat.setCustomValidity(
            ""
        );


        defaultPage.setCustomValidity(
            ""
        );


        schoolTimezone.setCustomValidity(
            ""
        );

    }


    function validarFormulario() {

        limparValidacoesPersonalizadas();


        /* NOME DA ESCOLA */

        if (
            !schoolName.value
                .trim()
        ) {

            schoolName.setCustomValidity(
                "Informe o nome da escola."
            );

        }


        /* ANO LETIVO */

        if (
            academicYear.value !==
                "" &&
            (
                Number(
                    academicYear.value
                ) < 2020 ||
                Number(
                    academicYear.value
                ) > 2100
            )
        ) {

            academicYear.setCustomValidity(
                "Informe um ano letivo entre 2020 e 2100."
            );

        }


        /* ORGANIZAÇÃO */

        if (
            academicPeriod.value &&
            !PERIODOS_VALIDOS.has(
                academicPeriod.value
            )
        ) {

            academicPeriod.setCustomValidity(
                "Selecione uma organização de período válida."
            );

        }


        /* MÉDIA */

        if (
            passingAverage.value !==
                "" &&
            (
                Number(
                    passingAverage.value
                ) < 0 ||
                Number(
                    passingAverage.value
                ) > 10
            )
        ) {

            passingAverage.setCustomValidity(
                "Informe uma média entre 0 e 10."
            );

        }


        /* FREQUÊNCIA */

        if (
            minAttendance.value !==
                "" &&
            (
                Number(
                    minAttendance.value
                ) < 0 ||
                Number(
                    minAttendance.value
                ) > 100
            )
        ) {

            minAttendance.setCustomValidity(
                "Informe uma frequência entre 0% e 100%."
            );

        }


        /* DURAÇÃO DA AULA */

        if (
            classDuration.value !==
                "" &&
            (
                Number(
                    classDuration.value
                ) < 20 ||
                Number(
                    classDuration.value
                ) > 180
            )
        ) {

            classDuration.setCustomValidity(
                "Informe uma duração entre 20 e 180 minutos."
            );

        }


        /* DIAS LETIVOS */

        if (
            schoolDays.value !==
                "" &&
            (
                Number(
                    schoolDays.value
                ) < 1 ||
                Number(
                    schoolDays.value
                ) > 365
            )
        ) {

            schoolDays.setCustomValidity(
                "Informe uma quantidade entre 1 e 365 dias."
            );

        }


        /* TURNO */

        if (
            defaultShift.value &&
            !TURNOS_VALIDOS.has(
                defaultShift.value
            )
        ) {

            defaultShift.setCustomValidity(
                "Selecione um turno válido."
            );

        }


        /* FORMATO DA DATA */

        if (
            dateFormat.value &&
            !FORMATOS_DATA_VALIDOS.has(
                dateFormat.value
            )
        ) {

            dateFormat.setCustomValidity(
                "Selecione um formato de data válido."
            );

        }


        /* PÁGINA INICIAL */

        if (
            defaultPage.value &&
            !PAGINAS_INICIAIS_VALIDAS.has(
                defaultPage.value
            )
        ) {

            defaultPage.setCustomValidity(
                "Selecione uma página inicial válida."
            );

        }


        /* FUSO HORÁRIO */

        if (
            schoolTimezone.value &&
            !FUSOS_VALIDOS.has(
                schoolTimezone.value
            )
        ) {

            schoolTimezone.setCustomValidity(
                "Selecione um fuso horário válido."
            );

        }


        /*
            checkValidity também aplica as regras
            nativas do HTML:

            required
            type="email"
            min
            max
            step
            maxlength
        */

        if (
            !settingsForm.checkValidity()
        ) {

            settingsForm.reportValidity();


            return false;

        }


        return true;

    }


    /*====================================================
                    RESUMO
    ====================================================*/

    function atualizarResumo(
        dados
    ) {

        currentAcademicYear.textContent =
            String(
                dados.academic.year
            );


        currentPassingAverage.textContent =
            formatarMedia(
                dados.academic
                    .passingAverage
            );


        currentMinAttendance.textContent =
            `${dados.academic.minAttendance}%`;


        currentNotificationsStatus.textContent =
            statusNotificacoes(
                dados.notifications
            );

    }


    function atualizarResumoTemporario() {

        /* ANO */

        const ano =
            academicYear.value
                .trim();


        currentAcademicYear.textContent =
            ano ||
            "-";


        /* MÉDIA */

        const media =
            Number(
                passingAverage.value
            );


        currentPassingAverage.textContent =
            (
                passingAverage.value ===
                    "" ||
                !Number.isFinite(
                    media
                )
            )
                ? "-"
                : formatarMedia(
                    media
                );


        /* FREQUÊNCIA */

        currentMinAttendance.textContent =
            minAttendance.value ===
                ""
                ? "-"
                : `${minAttendance.value}%`;


        /* NOTIFICAÇÕES */

        currentNotificationsStatus.textContent =
            statusNotificacoes({

                calendar:
                    notifyCalendar.checked,

                announcements:
                    notifyAnnouncements.checked,

                grades:
                    notifyGrades.checked,

                attendance:
                    notifyAttendance.checked,

                guardians:
                    notifyGuardians.checked

            });

    }


    /*====================================================
                SALVAR FORMULÁRIO
    ====================================================*/

    async function salvarFormulario(
        event
    ) {

        if (
            event
        ) {

            event.preventDefault();

        }


        if (
            !validarFormulario()
        ) {

            return;

        }


        const novosDados =
            normalizarConfiguracoes(
                lerFormulario()
            );


        /*
            O MySQL é a fonte de verdade.

            O estado em memória só é substituído depois
            que a API confirmar a gravação.
        */

        const resultado =
            await salvarConfiguracoes(
                novosDados
            );


        if (
            !resultado.success
        ) {

            PrimeWayFeedback.error(
                resultado.message ||
                "Não foi possível salvar as configurações. Tente novamente."
            );


            return;

        }


        settings =
            novosDados;


        preencherFormulario();


        PrimeWayFeedback.success(
            "Configurações salvas com sucesso."
        );

    }


    /*====================================================
                    SUBMIT
    ====================================================*/

    settingsForm.addEventListener(
        "submit",
        salvarFormulario
    );


    /*====================================================
            BOTÃO SUPERIOR SALVAR
    ====================================================*/

    saveSettingsButton.addEventListener(
        "click",
        function () {

            settingsForm.requestSubmit();

        }
    );


    /*====================================================
            RESTAURAR CONFIGURAÇÕES
    ====================================================*/

    resetSettingsButton.addEventListener(
        "click",
        async function () {

            const confirmado =
                await PrimeWayConfirm.warning(
                    "As configurações gerais serão restauradas para os valores padrão. O ano letivo atual será mantido.",
                    {
                        title:
                            "Restaurar configurações?",
                        confirmText:
                            "Restaurar",
                        cancelText:
                            "Cancelar"
                    }
                );


            if (
                !confirmado
            ) {

                return;
            }


            const padrao =
                copiarPadrao();


            /*
                O ano letivo pertence à estrutura
                acadêmica, não às configurações gerais.
            */

            padrao.academic.year =
                settings.academic.year;


            const resultado =
                await salvarConfiguracoes(
                    padrao
                );


            if (
                !resultado.success
            ) {

                PrimeWayFeedback.error(
                    resultado.message ||
                    "Não foi possível restaurar as configurações. Tente novamente."
                );


                return;
            }


            settings =
                padrao;


            preencherFormulario();


            PrimeWayFeedback.success(
                "Configurações padrão restauradas."
            );
        }
    );


    /*====================================================
            RESUMO EM TEMPO REAL
    ====================================================*/

    const camposResumo = [

        academicYear,
        passingAverage,
        minAttendance,

        notifyCalendar,
        notifyAnnouncements,
        notifyGrades,
        notifyAttendance,
        notifyGuardians

    ];


    camposResumo.forEach(
        function (
            campo
        ) {

            campo.addEventListener(
                "input",
                atualizarResumoTemporario
            );

        }
    );


    /*====================================================
            LIMPAR VALIDAÇÕES AO EDITAR
    ====================================================*/

    schoolName.addEventListener(
        "input",
        function () {

            schoolName.setCustomValidity(
                ""
            );

        }
    );


    academicYear.addEventListener(
        "input",
        function () {

            academicYear.setCustomValidity(
                ""
            );

        }
    );


    academicPeriod.addEventListener(
        "change",
        function () {

            academicPeriod.setCustomValidity(
                ""
            );

        }
    );


    passingAverage.addEventListener(
        "input",
        function () {

            passingAverage.setCustomValidity(
                ""
            );

        }
    );


    minAttendance.addEventListener(
        "input",
        function () {

            minAttendance.setCustomValidity(
                ""
            );

        }
    );


    classDuration.addEventListener(
        "input",
        function () {

            classDuration.setCustomValidity(
                ""
            );

        }
    );


    schoolDays.addEventListener(
        "input",
        function () {

            schoolDays.setCustomValidity(
                ""
            );

        }
    );


    defaultShift.addEventListener(
        "change",
        function () {

            defaultShift.setCustomValidity(
                ""
            );

        }
    );


    dateFormat.addEventListener(
        "change",
        function () {

            dateFormat.setCustomValidity(
                ""
            );

        }
    );


    defaultPage.addEventListener(
        "change",
        function () {

            defaultPage.setCustomValidity(
                ""
            );

        }
    );


    schoolTimezone.addEventListener(
        "change",
        function () {

            schoolTimezone.setCustomValidity(
                ""
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


            PrimeWayFeedback.error(
                error?.message ||
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
                    INICIALIZAÇÃO
    ====================================================*/




    /*
        O ano letivo ativo vem de anos_letivos.
        Nesta tela ele é apenas informativo.
    */
    academicYear.readOnly =
        true;

    academicYear.setAttribute(
        "aria-readonly",
        "true"
    );


    preencherFormulario();

});
