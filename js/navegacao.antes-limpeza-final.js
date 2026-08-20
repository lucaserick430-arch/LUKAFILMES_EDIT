(function () {

"use strict";

const HOME = "/index.html";
const LOGIN = "/login";


// ======================================================
// IR PARA O INÍCIO
// ======================================================

function irInicio() {

    window.location.href = HOME;

}

window.LUKAFILMES_IR_INICIO = irInicio;


// ======================================================
// CRIAR BOTÃO LUKAFILMES
// ======================================================

function criarBotaoAdmin() {

    if (document.querySelector(".lukafilmes-admin")) {
        return;
    }

    const admin = document.createElement("a");

    admin.href = "/admin.html";
    admin.className = "lukafilmes-admin";
    admin.textContent = "ADMIN";
    admin.title = "Painel administrativo";

    document.body.appendChild(admin);
}

function criarBotaoHome() {

    if (document.querySelector(".lukafilmes-home")) {
        return;
    }

    const botao = document.createElement("a");

    botao.href = HOME;
    botao.className = "lukafilmes-home";
    botao.setAttribute("data-lukafilmes-home", "true");

    botao.innerHTML = "🎬 <span>LUKAFILMES</span>";

    document.body.appendChild(botao);

}


// ======================================================
// CRIAR BOTÃO SAIR
// ======================================================

function criarBotaoSair() {

    if (document.querySelector(".lukafilmes-sair")) {
        return;
    }

    const botao = document.createElement("button");

    botao.type = "button";
    botao.className = "lukafilmes-sair";
    botao.setAttribute("data-lukafilmes-sair", "true");

    botao.innerHTML = "⎋ SAIR";

    botao.addEventListener("click", async function () {

        botao.disabled = true;
        botao.innerHTML = "Saindo...";

        try {

            const resposta = await fetch(
                "/logout",
                {
                    method: "POST",
                    credentials: "same-origin"
                }
            );

            if (!resposta.ok) {
                throw new Error("Erro ao sair");
            }

            window.location.replace(LOGIN);

        } catch (erro) {

            console.error(
                "[LUKAFILMES] Erro ao sair:",
                erro
            );

            botao.disabled = false;
            botao.innerHTML = "⎋ SAIR";

            alert("Não foi possível sair. Tente novamente.");

        }

    });

    document.body.appendChild(botao);

}


// ======================================================
// ESTILOS
// ======================================================

function adicionarEstiloAdmin() {

    if (document.getElementById("estilo-admin-lukafilmes")) {
        return;
    }

    const style = document.createElement("style");

    style.id = "estilo-admin-lukafilmes";

    style.textContent = `

        .lukafilmes-admin {

            position: fixed;

            top: 18px;

            left: 190px;

            z-index: 99999;

            color: rgba(255,255,255,.82);

            text-decoration: none;

            font-family: Arial, Helvetica, sans-serif;

            font-size: 14px;

            font-weight: 800;

            letter-spacing: .4px;

            padding: 9px 13px;

            border-radius: 20px;

            transition:
                color .2s ease,
                background .2s ease,
                transform .2s ease;

        }

        .lukafilmes-admin:hover {

            color: #fff;

            background: rgba(255,255,255,.10);

            transform: translateY(-1px);

        }

        @media (max-width: 700px) {

            .lukafilmes-admin {

                top: 12px;

                left: 145px;

                font-size: 12px;

                padding: 7px 9px;

            }

        }

    `;

    document.head.appendChild(style);
}

function adicionarEstilo() {

    if (
        document.getElementById(
            "estilo-navegacao-lukafilmes"
        )
    ) {
        return;
    }

    const style = document.createElement("style");

    style.id = "estilo-navegacao-lukafilmes";

    style.textContent = `

        /* ==========================================
           BOTÃO SAIR
           ========================================== */

        .lukafilmes-sair {

            position: fixed;

            top: 18px;

            right: 20px;

            z-index: 100000;

            display: inline-flex;

            align-items: center;

            justify-content: center;

            padding: 10px 17px;

            color: #fff;

            background: rgba(8,8,8,.82);

            border: 1px solid rgba(255,255,255,.16);

            border-radius: 30px;

            font-family: Arial, Helvetica, sans-serif;

            font-size: 14px;

            font-weight: 900;

            letter-spacing: .3px;

            cursor: pointer;

            backdrop-filter: blur(14px);

            -webkit-backdrop-filter: blur(14px);

            box-shadow:
                0 8px 30px rgba(0,0,0,.45);

            transition:
                transform .25s ease,
                background .25s ease,
                border-color .25s ease,
                box-shadow .25s ease;

        }


        .lukafilmes-sair:hover {

            background: #e50914;

            border-color: #e50914;

            transform: translateY(-2px) scale(1.03);

            box-shadow:
                0 10px 35px rgba(229,9,20,.35);

        }


        .lukafilmes-sair:active {

            transform: scale(.96);

        }


        .lukafilmes-sair:disabled {

            opacity: .65;

            cursor: wait;

        }


        /* ==========================================
           BOTÃO LUKAFILMES
           ========================================== */

        .lukafilmes-home {

            position: fixed;

            top: 70px;

            right: 20px;

            left: auto;

            z-index: 99999;

            display: inline-flex;

            align-items: center;

            gap: 7px;

            padding: 11px 17px;

            color: #fff;

            text-decoration: none;

            font-family: Arial, Helvetica, sans-serif;

            font-size: 15px;

            font-weight: 900;

            letter-spacing: .3px;

            background: rgba(8,8,8,.78);

            border: 1px solid rgba(255,255,255,.16);

            border-radius: 30px;

            backdrop-filter: blur(14px);

            -webkit-backdrop-filter: blur(14px);

            box-shadow:
                0 8px 30px rgba(0,0,0,.45);

            transition:
                transform .25s ease,
                background .25s ease,
                border-color .25s ease,
                box-shadow .25s ease;

        }


        .lukafilmes-home:hover {

            background: #e50914;

            border-color: #e50914;

            transform: translateY(-2px) scale(1.02);

            box-shadow:
                0 10px 35px rgba(229,9,20,.35);

        }


        .lukafilmes-home:active {

            transform: scale(.96);

        }


        /* ==========================================
           CELULAR
           ========================================== */

        @media (max-width: 700px) {

            .lukafilmes-sair {

                top: 12px;

                right: 12px;

                padding: 9px 13px;

                font-size: 13px;

            }


            .lukafilmes-home {

                top: 58px;

                right: 12px;

                left: auto;

                padding: 9px 13px;

                font-size: 13px;

            }

        }

    `;

    document.head.appendChild(style);

}


// ======================================================
// FECHAR PLAYER
// ======================================================

function fecharPlayer() {

    let fechou = false;


    const playerFilme =
        document.getElementById("playerFilme");

    const filmeFrame =
        document.getElementById("filmeFrame");


    if (
        playerFilme &&
        playerFilme.style.display !== "none"
    ) {

        playerFilme.style.display = "none";

        if (filmeFrame) {
            filmeFrame.src = "";
        }

        fechou = true;

    }


    const playerSerie =
        document.getElementById("playerSerie");

    const serieFrame =
        document.getElementById("serieFrame");


    if (
        playerSerie &&
        playerSerie.style.display !== "none"
    ) {

        playerSerie.style.display = "none";

        if (serieFrame) {
            serieFrame.src = "";
        }

        fechou = true;

    }


    return fechou;

}


// ======================================================
// BOTÃO VOLTAR
// ======================================================

function configurarVoltar() {

    const botoes =
        document.querySelectorAll(".voltar");


    botoes.forEach(function (botao) {

        botao.addEventListener(
            "click",
            function (evento) {

                evento.preventDefault();


                if (fecharPlayer()) {

                    window.scrollTo({
                        top: 0,
                        behavior: "smooth"
                    });

                    return;

                }


                irInicio();

            }
        );

    });

}


// ======================================================
// INICIALIZAÇÃO
// ======================================================

function iniciarNavegacao() {

    adicionarEstilo();
    adicionarEstiloAdmin();
    criarBotaoAdmin();

    criarBotaoSair();

    criarBotaoHome();

    configurarVoltar();

}


if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        iniciarNavegacao
    );

} else {

    iniciarNavegacao();

}


// ======================================================
// PÁGINA RESTAURADA
// ======================================================

window.addEventListener(
    "pageshow",
    function () {

        document.documentElement.classList.remove(
            "navegacao-saindo"
        );

    }
);

})();





