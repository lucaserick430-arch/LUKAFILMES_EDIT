

(function () {

    "use strict";


    console.log("[LUKAFILMES] Iniciando carregamento da série...");


    /* ==========================================
       RECUPERAR SÉRIE
       ========================================== */

    const salvo = localStorage.getItem("serieSelecionada");


    if (!salvo) {

        document.getElementById("tituloSerie").textContent =
            "Série não encontrada";

        document.getElementById("sinopseSerie").textContent =
            "Nenhuma série foi selecionada.";

        return;
    }


    let serie;


    try {

        serie = JSON.parse(salvo);

        

    } catch (erro) {

        console.error(
            "[SERIES] Erro ao ler série:",
            erro
        );

        document.getElementById("tituloSerie").textContent =
            "Erro ao carregar série";

        return;
    }


    console.log(
        "[SERIES] Série selecionada:",
        serie
    );


    /* ==========================================
       ELEMENTOS
       ========================================== */

    const tituloElemento =
        document.getElementById("tituloSerie");

    const posterElemento =
        document.getElementById("posterSerie");

    const sinopseElemento =
        document.getElementById("sinopseSerie");

    const dadosElemento =
        document.getElementById("dadosSerie");

    const select =
        document.getElementById("selectTemporada");

    const listaEpisodios =
        document.getElementById("episodios");

    const player =
        document.getElementById("playerSerie");

    const frame =
        document.getElementById("serieFrame");

    const tituloPlayer =
        document.getElementById("tituloPlayer");


    /* ==========================================
       DADOS BÁSICOS
       ========================================== */

    const titulo =
        serie.titulo ||
        serie.name ||
        serie.original_name ||
        "Sem título";


    document.title =
        "LUKAFILMES - " + titulo;


    tituloElemento.textContent =
        titulo;


    /* ==========================================
       CAPA
       ========================================== */

    let poster = "";


    if (serie.capa) {

        poster = serie.capa;

    } else if (serie.poster_path) {

        poster =
            "https://image.tmdb.org/t/p/w500" +
            serie.poster_path;

    }


    if (poster) {

        posterElemento.src = poster;

    } else {

        posterElemento.style.display = "none";

    }


    /* ==========================================
       SINOPSE
       ========================================== */

    sinopseElemento.textContent =
        serie.sinopse ||
        serie.overview ||
        "Sinopse não disponível.";


    /* ==========================================
       ANO
       ========================================== */

    const ano =
        serie.ano ||
        (
            serie.first_air_date
                ? serie.first_air_date.substring(0, 4)
                : ""
        );


    /* ==========================================
       NOTA
       ========================================== */

    const valorNota =
        serie.nota ??
        serie.vote_average ??
        0;


    const nota =
        Number(valorNota || 0).toFixed(1);


    dadosElemento.textContent =
        "⭐ " +
        nota +
        (
            ano
                ? " • " + ano
                : ""
        );


    /* ==========================================
       FUNDO
       ========================================== */

    let fundo = "";


    if (serie.fundo) {

        fundo = serie.fundo;

    } else if (serie.backdrop_path) {

        fundo =
            "https://image.tmdb.org/t/p/w1280" +
            serie.backdrop_path;

    }


    if (fundo) {

        document.documentElement.style.setProperty(
            "--fundo-serie",
            'url("' + fundo + '")'
        );

    }


    /* ==========================================
       VARIÁVEIS
       ========================================== */

    let temporadas = [];


    /* ==========================================
       CARREGAR DETALHES DA SÉRIE
       ========================================== */

    async function carregarDetalhes() {

    console.log(
        "[SERIES] ID da série:",
        serie.id
    );


    if (!serie.id) {

        console.error(
            "[SERIES] ID da série não encontrado."
        );

        listaEpisodios.innerHTML = `
            <div class="episodio">
                ❌ ID da série não encontrado.
            </div>
        `;

        return;
    }


    try {

        const url =
            "/api/serie/" +
            encodeURIComponent(serie.id);


        console.log(
            "[SERIES] Buscando detalhes:",
            url
        );


        const resposta =
            await fetch(url, {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store"
            });


        console.log(
            "[SERIES] Status detalhes:",
            resposta.status
        );


        if (!resposta.ok) {

            throw new Error(
                "Erro HTTP " +
                resposta.status
            );
        }


        const dados =
            await resposta.json();


        console.log(
            "[SERIES] Detalhes recebidos:",
            dados
        );


        if (
            dados &&
            dados.sucesso &&
            dados.serie
        ) {

            const serieDetalhes =
                dados.serie;


            const listaTemporadas =
                Array.isArray(serieDetalhes.temporadas)
                    ? serieDetalhes.temporadas
                    : (
                        Array.isArray(serieDetalhes.seasons)
                            ? serieDetalhes.seasons
                            : []
                    );


            console.log(
                "[SERIES] Lista de temporadas:",
                listaTemporadas
            );


            if (listaTemporadas.length > 0) {

                console.log(
                    "[SERIES] Temporadas encontradas:",
                    listaTemporadas.length
                );


                preencherTemporadas(
                    listaTemporadas
                );


                return;
            }


            console.warn(
                "[SERIES] Temporadas não encontradas. Usando fallback."
            );


            criarTemporadaFallback();

            return;
        }


        console.warn(
            "[SERIES] Resposta sem dados da série. Usando fallback."
        );


        criarTemporadaFallback();


    } catch (erro) {

        console.error(
            "[ERRO DETALHES SÉRIE]",
            erro
        );


        criarTemporadaFallback();

    }

}

function criarTemporadaFallback() {

        temporadas = [
            {
                season_number: 1,
                name: "Temporada 1"
            }
        ];


        select.innerHTML = "";


        const option =
            document.createElement("option");


        option.value = "1";

        option.textContent =
            "Temporada 1";


        select.appendChild(option);


        mostrarEpisodios(1);

    }


    /* ==========================================
       PREENCHER TEMPORADAS
       ========================================== */

    function preencherTemporadas(lista) {

        temporadas =
            Array.isArray(lista)
                ? lista.filter(function (temporada) {

                    return Number(
                        temporada.season_number
                    ) > 0;

                })
                : [];


        select.innerHTML = "";


        if (!temporadas.length) {

            criarTemporadaFallback();

            return;
        }


        temporadas.forEach(function (temporada) {

            const option =
                document.createElement("option");


            option.value =
                String(
                    temporada.season_number
                );


            option.textContent =
                temporada.name ||
                (
                    "Temporada " +
                    temporada.season_number
                );


            select.appendChild(option);

        });


        mostrarEpisodios(
            Number(
                temporadas[0].season_number
            )
        );

    }


    /* ==========================================
       CARREGAR EPISÓDIOS
       ========================================== */

    async function mostrarEpisodios(temporada) {

        if (
            !listaEpisodios ||
            !serie ||
            !serie.id
        ) {

            console.error(
                "[SERIES] Dados da série não encontrados."
            );

            return;
        }


        listaEpisodios.innerHTML = `

            <div style="
                padding: 25px;
                text-align: center;
                color: #aaa;
                width: 100%;
                grid-column: 1 / -1;
            ">

                🔄 Carregando episódios...

            </div>

        `;


        const url =
            "/api/serie/" +
            encodeURIComponent(serie.id) +
            "/temporada/" +
            encodeURIComponent(temporada);


        console.log(
            "[SERIES] Buscando episódios:",
            url
        );


        try {

            const resposta =
                await fetch(url, {
                    method: "GET",
                    credentials: "same-origin",
                    cache: "no-store"
                });


            console.log(
                "[SERIES] Status episódios:",
                resposta.status
            );


            if (!resposta.ok) {

                throw new Error(
                    "Erro HTTP " +
                    resposta.status
                );
            }


            const dados =
                await resposta.json();


            console.log(
                "[SERIES] Episódios recebidos:",
                dados
            );


            if (
                !dados ||
                !dados.sucesso ||
                !Array.isArray(dados.episodios)
            ) {

                throw new Error(
                    "A API não retornou episódios."
                );
            }


            if (!dados.episodios.length) {

                listaEpisodios.innerHTML = `

                    <div style="
                        padding: 25px;
                        text-align: center;
                        color: #aaa;
                        width: 100%;
                        grid-column: 1 / -1;
                    ">

                        Nenhum episódio encontrado.

                    </div>

                `;

                return;
            }


            listaEpisodios.innerHTML = "";


            dados.episodios.forEach(function (ep) {

                const numero =
                    ep.episode_number;


                const nome =
                    ep.name ||
                    "Sem título";


                const item =
                    document.createElement("button");


                item.type = "button";

                item.className =
                    "episodio";


                item.innerHTML = `

                    <span style="
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 42px;
                        height: 42px;
                        margin: 0 auto 10px;
                        border-radius: 50%;
                        background: #e50914;
                        color: white;
                        font-size: 18px;
                    ">
                        ▶
                    </span>


                    <strong style="
                        display: block;
                        color: white;
                        font-size: 16px;
                    ">
                        Episódio ${numero}
                    </strong>


                    <small style="
                        display: block;
                        margin-top: 6px;
                        color: #aaa;
                    ">
                        ${nome}
                    </small>

                `;


                item.addEventListener(
                    "click",
                    function () {

                        assistirEpisodio(
                            temporada,
                            numero,
                            nome
                        );

                    }
                );


                listaEpisodios.appendChild(item);

            });


        } catch (erro) {

            console.error(
                "[ERRO EPISODIOS]",
                erro
            );


            listaEpisodios.innerHTML = `

                <div style="
                    padding: 25px;
                    text-align: center;
                    color: #ff7777;
                    width: 100%;
                    grid-column: 1 / -1;
                ">

                    ❌ Não foi possível carregar os episódios.

                    <br>

                    <small style="
                        color: #888;
                    ">
                        Verifique o console do navegador.
                    </small>

                </div>

            `;

        }

    }


    /* ==========================================
       TROCAR TEMPORADA
       ========================================== */

    select.addEventListener(
        "change",
        function () {

            const temporada =
                Number(
                    select.value
                );


            if (!temporada) {

                return;
            }


            mostrarEpisodios(
                temporada
            );

        }
    );


    /* ==========================================
       PLAYER
       ========================================== */

    function assistirEpisodio(
        temporada,
        episodio,
        nome
    ) {

        if (!serie || !serie.id) {

            console.error(
                "[SERIES] ID da série não encontrado."
            );

            return;
        }


        console.log(
            "[SERIES] Abrindo episódio:",
            {
                serie: serie.id,
                temporada: temporada,
                episodio: episodio
            }
        );


        const urlPlayer =
            "https://myembed.biz/serie/" +
            encodeURIComponent(serie.id) +
            "/" +
            encodeURIComponent(temporada) +
            "/" +
            encodeURIComponent(episodio);


        console.log(
            "[SERIES] Player:",
            urlPlayer
        );


        frame.src =
            urlPlayer;


        tituloPlayer.textContent =
            "🎬 " +
            (
                nome ||
                "Episódio " + episodio
            );


        player.style.display =
            "block";


        player.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

    }


    /* ==========================================
       INICIAR
       ========================================== */

    carregarDetalhes();


})();


/* ==========================================
   DOM CARREGADO
   ========================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "[LUKAFILMES] Página de série carregada."
        );

    }
);



