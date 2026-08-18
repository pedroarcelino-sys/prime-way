/*====================================================
            LOGIN - PRIMEWAY SCHOOL
====================================================*/


/*====================================================
            ELEMENTOS DO LOGIN
====================================================*/

const loginForm = document.getElementById("loginForm");

const emailInput = document.getElementById("email");

const senhaInput = document.getElementById("senha");

const mostrarSenha = document.getElementById("mostrarSenha");


/*====================================================
            MOSTRAR / OCULTAR SENHA
====================================================*/

if (mostrarSenha && senhaInput) {

    mostrarSenha.addEventListener("click", function () {

        if (senhaInput.type === "password") {

            senhaInput.type = "text";

            mostrarSenha.innerHTML =
                '<i class="fa-solid fa-eye-slash"></i>';

            mostrarSenha.setAttribute(
                "aria-label",
                "Ocultar senha"
            );

        } else {

            senhaInput.type = "password";

            mostrarSenha.innerHTML =
                '<i class="fa-solid fa-eye"></i>';

            mostrarSenha.setAttribute(
                "aria-label",
                "Mostrar senha"
            );

        }

    });

}


/*====================================================
                LOGIN DE TESTE
====================================================*/

if (loginForm) {

    loginForm.addEventListener("submit", function (event) {

        event.preventDefault();


        const email = emailInput.value.trim();

        const senha = senhaInput.value;


        /*============================================
                CONTA PROVISÓRIA
        ============================================*/

        const emailTeste = "admin@primeway.com";

        const senhaTeste = "123456";


        /*============================================
                    VERIFICA LOGIN
        ============================================*/

        if (
            email === emailTeste &&
            senha === senhaTeste
        ) {

            /*
                Guarda temporariamente que o usuário
                está logado.
            */

            sessionStorage.setItem(
                "primewayLogado",
                "true"
            );


            sessionStorage.setItem(
                "primewayUsuario",
                email
            );


            /*
                ENTRA NO DASHBOARD
            */

            window.location.href = "dashboard.html";

        } else {

            alert(
                "E-mail ou senha incorretos."
            );

        }

    });

}