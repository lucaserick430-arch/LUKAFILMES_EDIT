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


// ======================================================
// CORRIGIR CAPAS AO VOLTAR PARA A PÁGINA
// ======================================================

window.addEventListener("pageshow", function(event) {

    if (event.persisted) {

        console.log("[CATÁLOGO] Página restaurada. Recarregando capas...");

        carregarCatalogo();

    

    }

});

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



    function idFilme(filme) {
        return String(filme.id || filme.tmdb_id || filme.titulo || '').trim().toLowerCase();
    }

    function selecionar(lista) {
    const resultado = [];
    const vistos = new Set();

    for (const filme of lista) {
        const id = idFilme(filme);
        if (!id || vistos.has(id)) continue;
        vistos.add(id);
        resultado.push(filme);
        if (resultado.length >= 20) break;
    }

    return resultado;
}

function selecionarGenero(categoria, genero) {
        const lista = filmesCatalogo.filter(filme => Array.isArray(filme.generos) && filme.generos.includes(genero));
        renderizarCategoria(categoria, selecionar(lista));
    }

    renderizarCategoria('alta', selecionar([...filmesCatalogo].sort((a,b) => Number(b.votos || 0) - Number(a.votos || 0))));
    renderizarCategoria('lancamentos', selecionar([...filmesCatalogo].sort((a,b) => Number(b.ano || 0) - Number(a.ano || 0))));
    selecionarGenero('acao', 'Ação');
    selecionarGenero('comedia', 'Comédia');
    selecionarGenero('terror', 'Terror');
    selecionarGenero('ficcao', 'Ficção científica');
    selecionarGenero('romance', 'Romance');
    renderizarCategoria('avaliados', selecionar([...filmesCatalogo].sort((a,b) => Number(b.nota || 0) - Number(a.nota || 0))));

}

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

async function pesquisarFilmes(buscaForcada = null, restaurando = false) {

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

    // Pesquisa normal:
    // pega o texto digitado na barra.
    //
    // Restauração:
    // usa a pesquisa salva SOMENTE para recriar
    // os quadrinhos, sem colocar o texto na barra.
    const busca =
        buscaForcada !== null
            ? String(buscaForcada).trim()
            : campo.value.trim();

    if (!busca) {

        if (!restaurando) {
            campo.focus();
        }

        return;

    }

    buscaAtual = busca;

    // Guarda a última pesquisa para podermos
    // reconstruir os resultados ao voltar.
    sessionStorage.setItem(
        "lukafilmes_busca",
        busca
    );

    // IMPORTANTE:
    // Quando estiver restaurando, a barra permanece vazia.
    if (restaurando) {
        campo.value = "";
    }

    console.log(
        "[PESQUISA]",
        busca,
        restaurando
            ? "(restaurando resultados)"
            : "(nova pesquisa)"
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

        mostrarResultados([]);

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

    console.log('[FILME]', filme);

    localStorage.setItem('filmeSelecionado', JSON.stringify(filme));

    window.location.href = 'paginas/filme.html';
}
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




// ======================================================
// RESTAURAR SUGESTOES AO VOLTAR
// ======================================================

async function restaurarPesquisa() {

    const campo = document.getElementById("campoBusca");

    if (!campo) {
        return;
    }

    const buscaSalva =
        sessionStorage.getItem("lukafilmes_busca");

    if (!buscaSalva) {
        return;
    }

    /*
     * IMPORTANTE:
     * O texto NÃO volta para a barra.
     * Apenas usamos a pesquisa salva para
     * reconstruir os quadrinhos de sugestões.
     */

    campo.value = "";

    console.log(
        "[PESQUISA] Restaurando somente sugestões:",
        buscaSalva
    );

    try {

        const resposta =
            await fetch(
                "/api/pesquisar?q=" +
                encodeURIComponent(buscaSalva)
            );

        if (!resposta.ok) {
            return;
        }

        const dados =
            await resposta.json();

        const filmes =
            Array.isArray(dados.resultados)
                ? dados.resultados.slice(0, 6)
                : [];

        let area =
            document.getElementById("sugestoesBusca");

        if (!area) {

            area =
                document.createElement("div");

            area.id =
                "sugestoesBusca";

            campo.parentElement.appendChild(area);
        }

        area.innerHTML = "";

        if (!filmes.length) {
            area.style.display = "none";
            return;
        }

        filmes.forEach(filme => {

            const item =
                document.createElement("div");

            item.className =
                "sugestao-filme";

            const capa =
                filme.capa
                    ? '<img src="' +
                      escaparHTML(filme.capa) +
                      '" alt="' +
                      escaparHTML(
                          filme.titulo || "Filme"
                      ) +
                      '">'
                    : "🎬";

            item.innerHTML =
                '<div class="sugestao-capa">' +
                capa +
                '</div>' +
                '<div class="sugestao-info">' +
                '<strong>' +
                escaparHTML(
                    filme.titulo || "Filme"
                ) +
                '</strong>' +
                '<span>' +
                (filme.ano || "") +
                ' • ⭐ ' +
                Number(
                    filme.nota || 0
                ).toFixed(1) +
                '</span>' +
                '</div>';

            item.addEventListener(
                "click",
                function () {

                    area.innerHTML = "";
                    area.style.display = "none";

                    abrirDetalhes(filme);

                }
            );

            area.appendChild(item);

        });

        area.style.display = "block";

    } catch (erro) {

        console.error(
            "[PESQUISA] Erro ao restaurar sugestões:",
            erro
        );

    }
}


// Restaurar sugestões quando voltar pelo histórico
window.addEventListener(
    "pageshow",
    function (event) {

        if (!event.persisted) {
            return;
        }

        setTimeout(
            function () {
                restaurarPesquisa();
            },
            100
        );

    }
);


// Clicar fora da pesquisa fecha as sugestões
document.addEventListener(
    "click",
    function (evento) {

        const campo =
            document.getElementById("campoBusca");

        const area =
            document.getElementById("sugestoesBusca");

        if (!area || !campo) {
            return;
        }

        if (
            evento.target !== campo &&
            !campo.contains(evento.target) &&
            !area.contains(evento.target)
        ) {

            area.innerHTML = "";
            area.style.display = "none";

        }

    }
);



// SUGESTOES EM TEMPO REAL
let timerSugestoes = null;

async function pesquisarSugestoes(termo) {
    const campo = document.getElementById('campoBusca');
    if (!campo) return;

    let area = document.getElementById('sugestoesBusca');

    if (!area) {
        area = document.createElement('div');
        area.id = 'sugestoesBusca';
        campo.parentElement.appendChild(area);
    }

    termo = String(termo || '').trim();

    if (termo.length < 2) {
        area.innerHTML = '';
        area.style.display = 'none';
        return;
    }

    clearTimeout(timerSugestoes);

    timerSugestoes = setTimeout(async () => {
        try {
            const resposta = await fetch('/api/pesquisar?q=' + encodeURIComponent(termo));
            const dados = await resposta.json();
            const filmes = Array.isArray(dados.resultados) ? dados.resultados.slice(0, 6) : [];

            area.innerHTML = '';

            if (!filmes.length) {
                area.style.display = 'none';
                return;
            }

            area.style.display = 'block';

            filmes.forEach(filme => {
                const item = document.createElement('div');
                item.className = 'sugestao-filme';                const capa = filme.capa ? '<img src="' + escaparHTML(filme.capa) + '" alt="' + escaparHTML(filme.titulo || 'Filme') + '">' : '🎬';                item.innerHTML = '<div class="sugestao-capa">' + capa + '</div><div class="sugestao-info"><strong>' + escaparHTML(filme.titulo || 'Filme') + '</strong><span>' + (filme.ano || '') + ' • ⭐ ' + Number(filme.nota || 0).toFixed(1) + '</span></div>';

 item.addEventListener('click', () => {
 campo.value = filme.titulo || '';
 area.innerHTML = '';
 area.style.display = 'none';
 abrirDetalhes(filme);
 });

 area.appendChild(item);
 });

 } catch (erro) {
 console.error('[SUGESTOES] Erro:', erro);
 }
 }, 350);
}



document.addEventListener("DOMContentLoaded", function () {
    const campoSugestao = document.getElementById("campoBusca");
    if (campoSugestao) {
        campoSugestao.addEventListener("input", function () {
            pesquisarSugestoes(campoSugestao.value);
        });
    }
});
















