(function () {

    function atualizarHero() {

        if (
            typeof filmesCatalogo === "undefined" ||
            !Array.isArray(filmesCatalogo) ||
            filmesCatalogo.length === 0
        ) {
            return false;
        }

        const hero = document.querySelector(".hero");
        const conteudo = document.querySelector(".hero-conteudo");

        if (!hero || !conteudo) {
            return false;
        }

        const candidatos = filmesCatalogo.filter(filme => {
            return filme && (
                filme.fundo ||
                filme.backdrop ||
                filme.capa
            );
        });

        if (!candidatos.length) {
            return false;
        }

        const ultimoId =
            localStorage.getItem("lukafilmes_hero_id");

        let opcoes = candidatos.filter(filme => {

            const id = String(
                filme.id ||
                filme.tmdb_id ||
                filme.titulo ||
                ""
            );

            return id !== String(ultimoId || "");
        });

        if (!opcoes.length) {
            opcoes = candidatos;
        }

        const filme =
            opcoes[
                Math.floor(
                    Math.random() * opcoes.length
                )
            ];

        const idFilme = String(
            filme.id ||
            filme.tmdb_id ||
            filme.titulo ||
            ""
        );

        localStorage.setItem(
            "lukafilmes_hero_id",
            idFilme
        );

        const fundo =
            filme.fundo ||
            filme.backdrop ||
            filme.capa ||
            "";

        if (!fundo) {
            return false;
        }

        /*
         * FUNDO
         */
        hero.style.setProperty(
            "--hero-fundo",
            "url('" +
            fundo.replace(/'/g, "\\'") +
            "')"
        );

        /*
         * LUKANET FIXO
         */
        const label = conteudo.querySelector(".hero-label");

        if (label) {
            label.textContent = "LUKANET"; label.style.cursor = "pointer"; label.onclick = function () { window.location.href = "https://lukanetmovelilimitada.netlify.app/"; };
        }

        /*
         * TÍTULO DO FILME
         */
        let titulo = conteudo.querySelector(".hero-titulo-filme");

        if (!titulo) {
            titulo = document.createElement("h1");
            titulo.className = "hero-titulo-filme";

            const pesquisa =
                conteudo.querySelector(".pesquisa");

            if (pesquisa) {
                conteudo.insertBefore(titulo, pesquisa);
            } else {
                conteudo.appendChild(titulo);
            }
        }

        titulo.textContent =
            filme.titulo || "Filme";

        /*
         * REMOVE O H1 ORIGINAL LUKAFILMES
         */
        const h1Original =
            conteudo.querySelector(
                "h1:not(.hero-titulo-filme)"
            );

        if (h1Original) {
            h1Original.style.display = "none";
        }

        /*
         * SINOPSE
         */
        let sinopse =
            conteudo.querySelector(".hero-sinopse");

        if (!sinopse) {
            sinopse = document.createElement("p");
            sinopse.className = "hero-sinopse";

            const pesquisa =
                conteudo.querySelector(".pesquisa");

            if (pesquisa) {
                conteudo.insertBefore(sinopse, pesquisa);
            } else {
                conteudo.appendChild(sinopse);
            }
        }

        sinopse.textContent =
            filme.sinopse ||
            "Confira este filme no LUKAFILMES.";

        /*
         * BOTÃO ASSISTIR
         */
        let botao =
            conteudo.querySelector(".hero-assistir");

        if (!botao) {
            botao = document.createElement("button");
            botao.className = "hero-assistir";
            botao.type = "button";
            botao.textContent = "▶ Assistir";

            const pesquisa =
                conteudo.querySelector(".pesquisa");

            if (pesquisa) {
                conteudo.insertBefore(botao, pesquisa);
            } else {
                conteudo.appendChild(botao);
            }
        }

        /*
         * O BOTÃO USA EXATAMENTE O MESMO FILME
         */
        botao.onclick = function () {

            localStorage.setItem(
                "filmeSelecionado",
                JSON.stringify(filme)
            );

            window.location.href =
                "paginas/filme.html";
        };

        return true;
    }

    let tentativas = 0;

    const intervalo = setInterval(
        function () {

            tentativas++;

            if (
                atualizarHero() ||
                tentativas >= 30
            ) {
                clearInterval(intervalo);
            }

        },
        500
    );

})();

