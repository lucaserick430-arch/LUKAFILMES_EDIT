// ======================================================
// LUKAFILMES - SCRIPT PRINCIPAL
// ======================================================

let filmesCatalogo = [];
let buscaAtual = "";

// ======================================================
// INICIALIZAÇÃO
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

    carregarCatalogo();

    const campo = document.getElementById("campoBusca");

    if (campo) {

        campo.addEventListener("keydown", (event) => {

            if (event.key === "Enter") {

                event.preventDefault();

                pesquisarFilmes();

            }

        });

    }

});


// ======================================================
// CARREGAR CATÁLOGO
// ======================================================

async function carregarCatalogo() {

    try {

        console.log("[CATÁLOGO] Carregando...");

        const resposta =
            await fetch("/api/catalogo");

        if (!resposta.ok) {

            throw new Error(
                "Erro HTTP " + resposta.status
            );

        }

        const dados =
            await resposta.json();

        filmesCatalogo =
            Array.isArray(dados.filmes)
                ? dados.filmes
                : [];

        console.log(
            "[CATÁLOGO] Filmes:",
            filmesCatalogo.length
        );

        montarCategorias();

    } catch (erro) {

        console.error(
            "[ERRO CATÁLOGO]",
            erro
        );

    }

}


// ======================================================
// MONTAR CATEGORIAS
// ======================================================

function montarCategorias() {

    // -----------------------------------------------
    // EM ALTA
    // -----------------------------------------------

    renderizarCategoria(
        "alta",
        [...filmesCatalogo]
            .sort((a, b) =>
                Number(b.votos || 0) -
                Number(a.votos || 0)
            )
            .slice(0, 20)
    );


    // -----------------------------------------------
    // LANÇAMENTOS
    // -----------------------------------------------

    renderizarCategoria(
        "lancamentos",
        [...filmesCatalogo]
            .sort((a, b) =>
                Number(b.ano || 0) -
                Number(a.ano || 0)
            )
            .slice(0, 20)
    );


    // -----------------------------------------------
    // AÇÃO
    // -----------------------------------------------

    renderizarPorGenero(
        "acao",
        "Ação"
    );


    // -----------------------------------------------
    // COMÉDIA
    // -----------------------------------------------

    renderizarPorGenero(
        "comedia",
        "Comédia"
    );


    // -----------------------------------------------
    // TERROR
    // -----------------------------------------------

    renderizarPorGenero(
        "terror",
        "Terror"
    );


    // -----------------------------------------------
    // FICÇÃO
    // -----------------------------------------------

    renderizarPorGenero(
        "ficcao",
        "Ficção científica"
    );


    // -----------------------------------------------
    // ROMANCE
    // -----------------------------------------------

    renderizarPorGenero(
        "romance",
        "Romance"
    );


    // -----------------------------------------------
    // MAIS AVALIADOS
    // -----------------------------------------------

    renderizarCategoria(
        "avaliados",
        [...filmesCatalogo]
            .sort((a, b) =>
                Number(b.nota || 0) -
                Number(a.nota || 0)
            )
            .slice(0, 20)
    );

}


// ======================================================
// FILMES POR GÊNERO
// ======================================================

function renderizarPorGenero(
    categoria,
    genero
) {

    const filmes =
        filmesCatalogo
            .filter(filme => {

                return Array.isArray(filme.generos) &&
                    filme.generos.includes(genero);

            })
            .slice(0, 20);

    renderizarCategoria(
        categoria,
        filmes
    );

}


// ======================================================
// RENDERIZAR CATEGORIA
// ======================================================

function renderizarCategoria(
    categoria,
    filmes
) {

    const container =
        document.querySelector(
            `.filmes[data-categoria="${categoria}"]`
        );

    if (!container) {

        console.warn(
            "[CATEGORIA NÃO ENCONTRADA]",
            categoria
        );

        return;

    }

    container.innerHTML = "";

    filmes.forEach(filme => {

        container.appendChild(
            criarCardFilme(filme)
        );

    });

}


// ======================================================
// CRIAR CARD
// ======================================================

function criarCardFilme(filme) {

    const card =
        document.createElement("div");

    card.className = "filme";

    card.style.cursor = "pointer";

    card.innerHTML = `

        <div class="filme-capa">

            ${
                filme.capa
                    ? `
                        <img
                            src="${escaparHTML(filme.capa)}"
                            alt="${escaparHTML(filme.titulo)}"
                            loading="lazy"
                        >
                    `
                    : `
                        <div class="sem-capa">
                            🎬
                        </div>
                    `
            }

            <div class="filme-nota">

                ⭐
                ${Number(filme.nota || 0).toFixed(1)}

            </div>

        </div>

        <div class="filme-info">

            <h3>
                ${escaparHTML(filme.titulo)}
            </h3>

            <p>
                ${filme.ano || ""}
            </p>

        </div>

    `;

    card.addEventListener(
        "click",
        () => abrirDetalhes(filme)
    );

    return card;

}


// ======================================================
// PESQUISAR FILMES
// ======================================================

async function pesquisarFilmes() {

    const campo =
        document.getElementById(
            "campoBusca"
        );

    if (!campo) {

        console.error(
            "Campo de pesquisa não encontrado."
        );

        return;

    }

    const busca =
        campo.value.trim();

    if (!busca) {

        campo.focus();

        return;

    }

    buscaAtual = busca;

    console.log(
        "[PESQUISA]",
        busca
    );

    try {

        const resposta =
            await fetch(
                "/api/pesquisar?q=" +
                encodeURIComponent(busca)
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
            "[RESULTADOS]",
            dados
        );

        mostrarResultados(
            dados.resultados || []
        );

    } catch (erro) {

        console.error(
            "[ERRO PESQUISA]",
            erro
        );

        alert(
            "Não foi possível pesquisar o filme."
        );

    }

}


// ======================================================
// MOSTRAR RESULTADOS
// ======================================================

function mostrarResultados(
    filmes
) {

    const secao =
        document.getElementById(
            "resultadosPesquisa"
        );

    const lista =
        document.getElementById(
            "listaResultados"
        );

    if (!secao || !lista) {

        return;

    }

    lista.innerHTML = "";

    secao.style.display = "block";

    if (!filmes.length) {

        lista.innerHTML = `

            <div class="nenhum-resultado">

                <h3>
                    😕 Filme não encontrado
                </h3>

                <p>
                    Tente pesquisar pelo nome original
                    ou por outro título.
                </p>

            </div>

        `;

        secao.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        return;

    }

    filmes.forEach(filme => {

        lista.appendChild(
            criarCardFilme(filme)
        );

    });

    secao.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


// ======================================================
// ABRIR DETALHES DO FILME
// ======================================================

function abrirDetalhes(filme) {

    console.log(
        "[FILME]",
        filme
    );

    // Remove modal anterior

    const antigo =
        document.getElementById(
            "modalFilme"
        );

    if (antigo) {

        antigo.remove();

    }


    // Cria modal

    const modal =
        document.createElement("div");

    modal.id =
        "modalFilme";

    modal.className =
        "modal-filme";


    const generos =
        Array.isArray(filme.generos)
            ? filme.generos.join(" • ")
            : "";


    modal.innerHTML = `

        <div class="modal-overlay"></div>

        <div class="modal-conteudo">

            <button
                class="modal-fechar"
                aria-label="Fechar"
            >
                ✕
            </button>


            ${
                filme.fundo
                    ? `
                        <div
                            class="modal-fundo"
                            style="
                                background-image:
                                linear-gradient(
                                    to bottom,
                                    rgba(0,0,0,.15),
                                    rgba(0,0,0,.98)
                                ),
                                url('${escaparHTML(filme.fundo)}');
                            "
                        ></div>
                    `
                    : ""
            }


            <div class="modal-corpo">

                <div class="modal-poster">

                    ${
                        filme.capa
                            ? `
                                <img
                                    src="${escaparHTML(filme.capa)}"
                                    alt="${escaparHTML(filme.titulo)}"
                                >
                            `
                            : ""
                    }

                </div>


                <div class="modal-informacoes">

                    <span class="modal-tag">
                        🎬 FILME
                    </span>

                    <h1>
                        ${escaparHTML(filme.titulo)}
                    </h1>

                    <div class="modal-meta">

                        ${
                            filme.ano
                                ? `<span>📅 ${filme.ano}</span>`
                                : ""
                        }

                        <span>
                            ⭐ ${Number(
                                filme.nota || 0
                            ).toFixed(1)}
                        </span>

                        ${
                            generos
                                ? `<span>${escaparHTML(generos)}</span>`
                                : ""
                        }

                    </div>


                    <h2>
                        Sinopse
                    </h2>

                    <p class="modal-sinopse">

                        ${escaparHTML(
                            filme.sinopse ||
                            "Sinopse não disponível."
                        )}

                    </p>


                    ${
                        filme.tituloOriginal
                            ? `
                                <p class="titulo-original">

                                    <strong>
                                        Título original:
                                    </strong>

                                    ${escaparHTML(
                                        filme.tituloOriginal
                                    )}

                                </p>
                            `
                            : ""
                    }

                </div>

            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    // Fechar pelo X

    const botaoFechar =
        modal.querySelector(
            ".modal-fechar"
        );

    botaoFechar.addEventListener(
        "click",
        fecharModalFilme
    );


    // Fechar clicando fora

    const overlay =
        modal.querySelector(
            ".modal-overlay"
        );

    overlay.addEventListener(
        "click",
        fecharModalFilme
    );


    // Fechar com ESC

    document.addEventListener(
        "keydown",
        fecharComEsc
    );


    document.body.style.overflow =
        "hidden";

}


// ======================================================
// FECHAR MODAL
// ======================================================

function fecharModalFilme() {

    const modal =
        document.getElementById(
            "modalFilme"
        );

    if (!modal) {

        return;

    }

    modal.remove();

    document.body.style.overflow =
        "";

    document.removeEventListener(
        "keydown",
        fecharComEsc
    );

}


// ======================================================
// ESC FECHA MODAL
// ======================================================

function fecharComEsc(event) {

    if (event.key === "Escape") {

        fecharModalFilme();

    }

}


// ======================================================
// ROLAR CATEGORIAS
// ======================================================

function rolar(botao, direcao) {

    const categoria =
        botao.closest(".categoria");

    if (!categoria) {

        return;

    }

    const filmes =
        categoria.querySelector(
            ".filmes"
        );

    if (!filmes) {

        return;

    }

    filmes.scrollBy({

        left:
            direcao * 500,

        behavior:
            "smooth"

    });

}


// ======================================================
// ESCAPAR HTML
// ======================================================

function escaparHTML(valor) {

    return String(
        valor ?? ""
    )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}



