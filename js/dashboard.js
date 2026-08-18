/*====================================================
                DASHBOARD.JS
              PrimeWay School
====================================================*/


/*====================================================
            ELEMENTOS DA PÁGINA
====================================================*/

const sidebar = document.querySelector(".sidebar");
const menu = document.querySelectorAll(".sidebar li");
const botaoNotificacao = document.querySelector(".btn-notificacao");
const pesquisa = document.querySelector(".pesquisa input");


/*====================================================
            MENU ATIVO
====================================================*/

menu.forEach(item => {

    item.addEventListener("click", () => {

        menu.forEach(menuItem => {

            menuItem.classList.remove("ativo");

        });

        item.classList.add("ativo");

    });

});


/*====================================================
            BOTÃO DE NOTIFICAÇÃO
====================================================*/

botaoNotificacao.addEventListener("click", () => {

    alert("Você ainda não possui notificações.");

});


/*====================================================
            PESQUISA
====================================================*/

pesquisa.addEventListener("keyup", () => {

    console.log("Pesquisando:", pesquisa.value);

});


/*====================================================
        ANIMAÇÃO DA SIDEBAR
====================================================*/

menu.forEach(item => {

    item.addEventListener("mouseenter", () => {

        item.style.transform = "translateX(8px)";

    });

    item.addEventListener("mouseleave", () => {

        item.style.transform = "translateX(0px)";

    });

});


/*====================================================
            BOAS-VINDAS
====================================================*/

window.addEventListener("load", () => {

    console.log("PrimeWay School carregado com sucesso.");

});