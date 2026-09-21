/*====================================================
        LOGIN - PRIMEWAY SCHOOL
====================================================*/
/*====================================================
                    CONSTANTES
====================================================*/

const AUTH_LOGIN_URL =
    "../api/auth/login.php";

const AUTH_SESSION_URL =
    "../api/auth/session.php";


const SESSION_LOGADO_KEY =
    "primewayLogado";

const SESSION_USUARIO_KEY =
    "primewayUsuario";

const SESSION_PERFIL_KEY =
    "primewayPerfil";

const SETTINGS_STORAGE_KEY =
    "primewaySettings";


const PAGINA_INICIAL_PADRAO =
    "dashboard.html";

const PAGINA_PROFESSOR =
    "professor.html";

const PAGINA_RESPONSAVEL =
    "responsavel.html";

const PAGINA_ALUNO =
    "aluno_portal.html";


const PAGINAS_INICIAIS_VALIDAS =
    new Set([
        "dashboard.html",
        "calendario.html",
        "notificacoes.html"
    ]);


const PERFIS_COM_AREA =
    new Set([
        "admin",
        "professor",
        "responsavel",
        "aluno"
    ]);


/*====================================================
                    ELEMENTOS
====================================================*/

const loginForm =
    document.querySelector(
        "#loginForm"
    );

const emailInput =
    document.querySelector(
        "#email"
    );

const senhaInput =
    document.querySelector(
        "#senha"
    );

const mostrarSenha =
    document.querySelector(
        "#mostrarSenha"
    );

const esqueciSenha =
    document.querySelector(
        "#esqueciSenha"
    );

const submitButton =
    loginForm?.querySelector(
        'button[type="submit"]'
    ) ||
    null;


/*====================================================
                PÁGINA INICIAL
====================================================*/

function obterPaginaInicialAdmin() {

    try {

        const salvo =
            localStorage.getItem(
                SETTINGS_STORAGE_KEY
            );


        if (!salvo) {

            return PAGINA_INICIAL_PADRAO;

        }


        const configuracoes =
            JSON.parse(
                salvo
            );


        const pagina =
            configuracoes
                ?.system
                ?.defaultPage;


        if (
            PAGINAS_INICIAIS_VALIDAS.has(
                pagina
            )
        ) {

            return pagina;

        }

    } catch {

        /*
            Se as configurações estiverem ausentes,
            inválidas ou corrompidas, o Admin usa
            a página inicial padrão do sistema.
        */

    }


    return PAGINA_INICIAL_PADRAO;

}


function obterPaginaInicial(
    perfil
) {

    if (
        perfil ===
        "professor"
    ) {

        return PAGINA_PROFESSOR;

    }


    if (
        perfil ===
        "responsavel"
    ) {

        return PAGINA_RESPONSAVEL;

    }


    if (
        perfil ===
        "aluno"
    ) {

        return PAGINA_ALUNO;

    }


    return obterPaginaInicialAdmin();

}
/*====================================================
            VISIBILIDADE DA SENHA
====================================================*/

function atualizarVisibilidadeSenha(
    mostrar
) {

    if (
        !senhaInput ||
        !mostrarSenha
    ) {

        return;

    }


    senhaInput.type =
        mostrar
            ? "text"
            : "password";


    mostrarSenha.setAttribute(
        "aria-label",
        mostrar
            ? "Ocultar senha"
            : "Mostrar senha"
    );


    mostrarSenha.setAttribute(
        "aria-pressed",
        mostrar
            ? "true"
            : "false"
    );


    const icon =
        mostrarSenha.querySelector(
            "i"
        );


    if (!icon) {

        return;

    }


    icon.classList.remove(
        "fa-eye",
        "fa-eye-slash"
    );


    icon.classList.add(
        mostrar
            ? "fa-eye-slash"
            : "fa-eye"
    );


    icon.setAttribute(
        "aria-hidden",
        "true"
    );

}


/*====================================================
        ESTADO INICIAL DO BOTÃO DE SENHA
====================================================*/

atualizarVisibilidadeSenha(
    false
);


/*====================================================
                MOSTRAR / OCULTAR
====================================================*/

if (
    mostrarSenha &&
    senhaInput
) {

    mostrarSenha.addEventListener(
        "click",
        function () {

            const senhaEstaOculta =
                senhaInput.type ===
                "password";


            atualizarVisibilidadeSenha(
                senhaEstaOculta
            );


            senhaInput.focus();

        }
    );

}


/*====================================================
                ESQUECI A SENHA
====================================================*/

if (
    esqueciSenha
) {

    esqueciSenha.addEventListener(
        "click",
        function (event) {

            event.preventDefault();


            PrimeWayFeedback.info(
                "A recuperação de senha ainda não está disponível nesta etapa."
            );

        }
    );

}


/*====================================================
            NORMALIZAR E-MAIL
====================================================*/

function normalizarEmail(
    email
) {

    return String(
        email || ""
    )
        .trim()
        .toLowerCase();

}


/*====================================================
                LIMPAR SENHA
====================================================*/

function limparSenha() {

    if (
        !senhaInput
    ) {

        return;

    }


    senhaInput.value =
        "";


    atualizarVisibilidadeSenha(
        false
    );


    senhaInput.focus();

}


/*====================================================
        COMPATIBILIDADE COM O FRONT-END ATUAL
====================================================*/

/*
    A autenticação real passa a ser controlada pela
    sessão PHP.

    Enquanto as demais páginas ainda são migradas,
    estes três valores continuam sendo espelhados no
    sessionStorage apenas para compatibilidade visual
    com o front-end existente.

    Eles NÃO são considerados uma autorização segura.
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
        usuario.email
    );


    sessionStorage.setItem(
        SESSION_PERFIL_KEY,
        usuario.perfil
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
            ESTADO DO FORMULÁRIO
====================================================*/

function definirLoginEmAndamento(
    emAndamento
) {

    if (
        submitButton
    ) {

        submitButton.disabled =
            emAndamento;


        submitButton.setAttribute(
            "aria-busy",
            emAndamento
                ? "true"
                : "false"
        );

    }


    if (
        emailInput
    ) {

        emailInput.readOnly =
            emAndamento;

    }


    if (
        senhaInput
    ) {

        senhaInput.readOnly =
            emAndamento;

    }

}


/*====================================================
                VALIDAR USUÁRIO
====================================================*/

function usuarioRecebidoValido(
    usuario
) {

    if (
        !usuario ||
        typeof usuario !==
            "object"
    ) {

        return false;

    }


    const email =
        normalizarEmail(
            usuario.email
        );


    const perfil =
        String(
            usuario.perfil ||
            ""
        ).trim();


    return (
        Boolean(
            email
        ) &&
        PERFIS_COM_AREA.has(
            perfil
        )
    );

}


/*====================================================
                LOGIN PHP
====================================================*/

let loginEmAndamento =
    false;


if (
    loginForm &&
    emailInput &&
    senhaInput
) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            if (
                loginEmAndamento
            ) {

                return;

            }


            if (
                !loginForm.checkValidity()
            ) {

                loginForm.reportValidity();

                return;

            }


            const email =
                normalizarEmail(
                    emailInput.value
                );


            const senha =
                senhaInput.value;


            loginEmAndamento =
                true;


            definirLoginEmAndamento(
                true
            );


            try {

                const response =
                    await fetch(
                        AUTH_LOGIN_URL,
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
                                JSON.stringify({
                                    email,
                                    senha
                                })
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

                    if (
                        response.status ===
                        401
                    ) {

                        PrimeWayFeedback.error(
                            "E-mail ou senha incorretos."
                        );

                    } else {

                        PrimeWayFeedback.error(
                            data?.message ||
                            "Não foi possível realizar o login. Tente novamente."
                        );

                    }


                    limparSessaoCompatibilidade();


                    limparSenha();


                    return;

                }


                const usuario =
                    data.usuario;


                if (
                    !usuarioRecebidoValido(
                        usuario
                    )
                ) {

                    limparSessaoCompatibilidade();


                    PrimeWayFeedback.error(
                        "A sessão retornada pelo servidor é inválida para esta área."
                    );


                    limparSenha();


                    return;

                }


                /*
                    A sessão PHP já foi criada pelo servidor.

                    O sessionStorage abaixo existe somente
                    para manter as páginas atuais funcionando
                    durante a migração gradual para o backend.
                */

                sincronizarSessaoCompatibilidade(
                    {
                        email:
                            normalizarEmail(
                                usuario.email
                            ),

                        perfil:
                            String(
                                usuario.perfil
                            ).trim()
                    }
                );


                window.location.replace(
                    obterPaginaInicial(
                        usuario.perfil
                    )
                );

            } catch (
                error
            ) {

                console.error(
                    "Erro ao conectar ao servidor de autenticação:",
                    error
                );


                limparSessaoCompatibilidade();


                PrimeWayFeedback.error(
                    "Não foi possível conectar ao servidor. Verifique se o PHP está em execução e tente novamente."
                );


                limparSenha();

            } finally {

                loginEmAndamento =
                    false;


                definirLoginEmAndamento(
                    false
                );

            }

        }
    );

}


/*====================================================
        USUÁRIO JÁ ESTÁ AUTENTICADO
====================================================*/

/*
    A sessão do servidor é a fonte de verdade.

    Ao abrir login.html, consultamos session.php.
    Se a sessão PHP estiver válida, espelhamos seus
    dados no sessionStorage temporário e redirecionamos.

    Se não houver sessão PHP válida, quaisquer dados
    antigos do sessionStorage são descartados.
*/

async function verificarSessaoExistente() {

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
            !usuarioRecebidoValido(
                data.usuario
            )
        ) {

            limparSessaoCompatibilidade();

            return;

        }


        const usuario =
            data.usuario;


        sincronizarSessaoCompatibilidade(
            {
                email:
                    normalizarEmail(
                        usuario.email
                    ),

                perfil:
                    String(
                        usuario.perfil
                    ).trim()
            }
        );


        window.location.replace(
            obterPaginaInicial(
                usuario.perfil
            )
        );

    } catch (
        error
    ) {

        /*
            O login continua disponível mesmo se a
            consulta inicial ao backend falhar.

            Como a sessão PHP é a fonte de verdade,
            não mantemos uma sessão antiga somente
            com base no sessionStorage.
        */

        console.warn(
            "Não foi possível verificar a sessão atual:",
            error
        );


        limparSessaoCompatibilidade();

    }

}


verificarSessaoExistente();
