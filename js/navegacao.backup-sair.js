(function () {

    "use strict";

    const HOME = "/index.html";


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

    function criarBotaoHome() {

        if (document.querySelector(".lukafilmes-home")) {
            return;
        }

        const botao = document.createElement("a");

        botao.href = HOME;

        botao.className = "lukafilmes-home";

        botao.setAttribute(
            "data-lukafilmes-home",
            "true"
        );

        botao.innerHTML = "🎬 <span>LUKAFILMES</span>";

        document.body.appendChild(botao);

    }


    // ======================================================
    // ESTILO DO BOTÃO
    // ======================================================

    function adicionarEstilo() {

        if (document.getElementById("estilo-navegacao-lukafilmes")) {
            return;
        }

        const style = document.createElement("style");

        style.id = "estilo-navegacao-lukafilmes";

        style.textContent = `

            .lukafilmes-home {

    position: fixed;

    top: 95px;

    right: 20px; left: auto;

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

    box-shadow: 0 8px 30px rgba(0,0,0,.45);

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

    box-shadow: 0 10px 35px rgba(229,9,14,.35);

}

.lukafilmes-home:active {

    transform: scale(.96);

}


/* ESPAÇO ENTRE ADMIN E SAIR */

.admin,
.admin-btn,
.admin-button,
.sair,
.sair-btn,
.sair-button {

    margin-left: 12px !important;

}


/* CASO ADMIN E SAIR ESTEJAM JUNTOS */

.admin-area,
.admin-buttons,
.admin-acoes {

    display: flex !important;

    align-items: center;

    gap: 14px !important;

}


@media (max-width: 700px) {

    .lukafilmes-home {

        top: 62px;

        right: 20px; left: auto;

        padding: 9px 13px;

        font-size: 13px;

    }

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


        // PLAYER DE FILME

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


        // PLAYER DE SÉRIE

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
            document.querySelectorAll(
                ".voltar"
            );


        botoes.forEach(function (botao) {

            botao.addEventListener(
                "click",
                function (evento) {

                    evento.preventDefault();


                    /*
                     * PRIMEIRO CLIQUE:
                     * se existe player aberto,
                     * fecha somente o player.
                     */

                    if (fecharPlayer()) {

                        window.scrollTo({
                            top: 0,
                            behavior: "smooth"
                        });

                        return;

                    }


                    /*
                     * SEGUNDO CLIQUE:
                     * vai direto para o início.
                     */

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
    // VOLTAR PELO HISTÓRICO
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






