(function () {
    "use strict";

    var ua = String(navigator.userAgent || "").toLowerCase();
    var largura = window.innerWidth || 0;
    var altura = window.innerHeight || 0;

    var tv =
        ua.indexOf("smarttv") !== -1 ||
        ua.indexOf("tizen") !== -1 ||
        ua.indexOf("webos") !== -1 ||
        ua.indexOf("netcast") !== -1 ||
        ua.indexOf("googletv") !== -1 ||
        ua.indexOf("android tv") !== -1 ||
        ua.indexOf("firetv") !== -1 ||
        ua.indexOf("aft") !== -1 ||
        (largura >= 1600 && altura >= 800);

    window.LUKAFILMES_TV = {
        ativo: tv,
        largura: largura,
        altura: altura
    };

    if (!tv) return;

    document.documentElement.classList.add("lukafilmes-tv");

    function visivel(el) {
        if (!el) return false;

        var r = el.getBoundingClientRect();
        var cs = window.getComputedStyle(el);

        return (
            r.width > 0 &&
            r.height > 0 &&
            cs.display !== "none" &&
            cs.visibility !== "hidden"
        );
    }

    function elementos() {
        var seletores = [
            "a[href]",
            "button",
            "select",
            "input",
            ".episodio",
            ".serie-player-btn",
            ".player-btn",
            ".play-central-filme"
        ];

        var lista = [];

        document.querySelectorAll(
            seletores.join(",")
        ).forEach(function (el) {
            if (
                visivel(el) &&
                !el.disabled &&
                lista.indexOf(el) === -1
            ) {
                lista.push(el);
            }
        });

        return lista;
    }

    var foco = null;

    function limpar() {
        document.querySelectorAll(
            ".lukafilmes-tv-focus"
        ).forEach(function (el) {
            el.classList.remove(
                "lukafilmes-tv-focus"
            );
        });
    }

    function focar(el) {
        if (!el || !visivel(el)) return;

        limpar();

        foco = el;

        el.classList.add(
            "lukafilmes-tv-focus"
        );

        try {
            el.scrollIntoView({
                behavior: "auto",
                block: "center",
                inline: "center"
            });
        } catch (e) {}
    }

    function primeiro() {
        var lista = elementos();

        if (lista.length) {
            focar(lista[0]);
        }
    }

    function centro(el) {
        var r = el.getBoundingClientRect();

        return {
            x: r.left + r.width / 2,
            y: r.top + r.height / 2
        };
    }

    function navegar(direcao) {
        var lista = elementos();

        if (!lista.length) return;

        if (!foco || !visivel(foco)) {
            primeiro();
            return;
        }

        var a = centro(foco);
        var melhor = null;
        var melhorDist = Infinity;

        lista.forEach(function (el) {
            if (el === foco) return;

            var b = centro(el);
            var dx = b.x - a.x;
            var dy = b.y - a.y;

            var valido = false;

            if (
                direcao === "left" &&
                dx < -10
            ) valido = true;

            if (
                direcao === "right" &&
                dx > 10
            ) valido = true;

            if (
                direcao === "up" &&
                dy < -10
            ) valido = true;

            if (
                direcao === "down" &&
                dy > 10
            ) valido = true;

            if (!valido) return;

            var distancia =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );

            if (distancia < melhorDist) {
                melhorDist = distancia;
                melhor = el;
            }
        });

        if (melhor) {
            focar(melhor);
        }
    }

    function ativar() {
        if (!foco || !visivel(foco)) {
            primeiro();
        }

        if (!foco) return;

        try {
            foco.click();
        } catch (e) {}
    }

    function sairFullscreen() {
        if (
            document.fullscreenElement ||
            document.webkitFullscreenElement
        ) {
            var fn =
                document.exitFullscreen ||
                document.webkitExitFullscreen;

            if (fn) {
                try {
                    fn.call(document);
                } catch (e) {}
            }

            return true;
        }

        return false;
    }

    function voltar() {
        if (sairFullscreen()) return;

        var playerSerie =
            document.getElementById(
                "playerSerie"
            );

        var playerFilme =
            document.getElementById(
                "playerFilme"
            );

        /*
         * Não recarrega a página.
         * Mantém episódio/filme e iframe.
         */
        if (
            (playerSerie && visivel(playerSerie)) ||
            (playerFilme && visivel(playerFilme))
        ) {
            var alvo =
                document.getElementById(
                    "episodios"
                ) ||
                document.querySelector(
                    ".temporadas"
                );

            if (alvo) {
                try {
                    alvo.scrollIntoView({
                        behavior: "auto",
                        block: "start"
                    });
                } catch (e) {}
            }

            return;
        }

        try {
            if (history.length > 1) {
                history.back();
            }
        } catch (e) {}
    }

    document.addEventListener(
        "keydown",
        function (e) {

            var key = String(
                e.key || ""
            ).toLowerCase();

            var code =
                e.keyCode ||
                e.which ||
                0;

            if (
                key === "arrowleft" ||
                code === 37
            ) {
                e.preventDefault();
                navegar("left");
                return;
            }

            if (
                key === "arrowright" ||
                code === 39
            ) {
                e.preventDefault();
                navegar("right");
                return;
            }

            if (
                key === "arrowup" ||
                code === 38
            ) {
                e.preventDefault();
                navegar("up");
                return;
            }

            if (
                key === "arrowdown" ||
                code === 40
            ) {
                e.preventDefault();
                navegar("down");
                return;
            }

            if (
                key === "enter" ||
                key === "ok" ||
                code === 13 ||
                code === 23
            ) {
                e.preventDefault();
                ativar();
                return;
            }

            if (
                key === "escape" ||
                key === "back" ||
                key === "browserback" ||
                code === 27 ||
                code === 461 ||
                code === 8
            ) {
                e.preventDefault();
                voltar();
            }
        },
        true
    );

    var style = document.createElement(
        "style"
    );

    style.textContent = `
        html.lukafilmes-tv {
            scroll-behavior: auto !important;
        }

        .lukafilmes-tv-focus {
            outline: 4px solid currentColor !important;
            outline-offset: 5px !important;
            transform: scale(1.03);
            position: relative;
            z-index: 9999;
        }

        .serie-player-btn.lukafilmes-tv-focus,
        .player-btn.lukafilmes-tv-focus {
            transform: scale(1.06);
        }

        .episodio.lukafilmes-tv-focus {
            transform: scale(1.025);
        }

        @media (min-width: 1600px) and (min-height: 800px) {
            .serie-player-btn,
            .player-btn,
            .play-central-filme {
                min-height: 55px;
            }

            .episodio {
                cursor: pointer;
            }
        }
    `;

    document.head.appendChild(style);

    window.LUKAFILMES_TV_API = {
        focarPrimeiro: primeiro,
        navegar: navegar,
        ativar: ativar,
        voltar: voltar
    };

    setTimeout(function () {
        primeiro();
    }, 1000);

    console.log(
        "[LUKAFILMES TV] Camada carregada",
        window.LUKAFILMES_TV
    );

})();
