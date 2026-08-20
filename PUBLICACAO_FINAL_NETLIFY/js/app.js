let filmes = [];

// ==========================================
// CATEGORIAS
// ==========================================

const categorias = [
    {
        id: "em-alta",
        nome: "🔥 Em alta",
        filtro: () => true
    },
    {
        id: "melhores",
        nome: "⭐ Mais bem avaliados",
        filtro: filme => Number(filme.nota || 0) >= 8
    },
    {
        id: "lancamentos",
        nome: "🆕 Lançamentos",
        filtro: filme => Number(filme.ano || 0) >= 2020
    },
    {
        id: "acao",
        nome: "🎬 Ação",
        filtro: filme =>
            String(filme.generos || "").includes("Ação")
    },
    {
        id: "comedia",
        nome: "😂 Comédia",
        filtro: filme =>
            String(filme.generos || "").includes("Comédia")
    },
    {
        id: "terror",
        nome: "👻 Terror",
        filtro: filme =>
            String(filme.generos || "").includes("Terror")
    },
    {
        id: "romance",
        nome: "❤️ Romance",
        filtro: filme =>
            String(filme.generos || "").includes("Romance")
    },
    {
        id: "ficcao",
        nome: "🚀 Ficção científica",
        filtro: filme =>
            String(filme.generos || "").includes("Ficção científica")
    },
    {
        id: "fantasia",
        nome: "🧙 Fantasia",
        filtro: filme =>
            String(filme.generos || "").includes("Fantasia")
    },
    {
        id: "super-herois",
        nome: "🦸 Super-heróis",
        filtro: filme =>
            String(filme.generos || "").includes("Super-heróis")
    },
    {
        id: "animacao",
        nome: "🎞️ Animação",
        filtro: filme =>
            String(filme.generos || "").includes("Animação")
    }
];

// ==========================================
// CARREGAR FILMES
// ==========================================

async function carregarFilmes() {
    try {
        const resposta = await fetch("/filmes.json");

        if (!resposta.ok) {
            throw new Error(
                "Não foi possível carregar filmes.json"
            );
        }

        filmes = await resposta.json();

        console.log(
            "[LUKAFILMES] Filmes carregados:",
            filmes.length
        );

        criarCategorias();
        mostrarFilmes();
        configurarSetas();
        configurarBusca();

    } catch (erro) {
        console.error(
            "[LUKAFILMES] Erro ao carregar filmes:",
            erro
        );
    }
}

// ==========================================
// CRIAR CATEGORIAS
// ==========================================

function criarCategorias() {
    const catalogo =
        document.getElementById("catalogo");

    if (!catalogo) {
        console.warn(
            "Elemento #catalogo não encontrado."
        );
        return;
    }

    catalogo.innerHTML = "";

    categorias.forEach(categoria => {
        const secao =
            document.createElement("section");

        secao.className = "categoria";

        secao.innerHTML = `
            <div class="categoria-header">

                <h2>${categoria.nome}</h2>

                <div class="controles">

                    <button
                        class="seta"
                        data-direcao="esquerda">
                        ◀
                    </button>

                    <button
                        class="seta"
                        data-direcao="direita">
                        ▶
                    </button>

                </div>

            </div>

            <div
                class="filmes"
                id="${categoria.id}">
            </div>
        `;

        catalogo.appendChild(secao);
    });
}

// ==========================================
// PEGAR URL DA CAPA
// ==========================================

function obterCapa(filme) {
    let capa =
        filme.capa ||
        filme.poster ||
        filme.poster_path ||
        "";

    capa = String(capa).trim();

    // Corrigir URL em formato Markdown
    const markdown =
        capa.match(/\]\((https?:\/\/[^)]+)\)/);

    if (markdown) {
        capa = markdown[1];
    }

    if (
        capa.startsWith("[") &&
        capa.includes("](")
    ) {
        const inicio =
            capa.indexOf("[") + 1;

        const fim =
            capa.indexOf("]");

        capa =
            capa.substring(inicio, fim);
    }

    // Se vier somente o caminho do TMDB
    if (capa.startsWith("/")) {
        capa =
            "https://image.tmdb.org/t/p/w500" +
            capa;
    }

    return capa;
}

// ==========================================
// CRIAR CARD
// ==========================================

function criarCard(filme) {
    const card =
        document.createElement("div");

    card.className = "filme";

    const titulo =
        filme.titulo ||
        filme.title ||
        "Filme";

    const capa =
        obterCapa(filme);

    const nota =
        Number(
            filme.nota ||
            filme.vote_average ||
            0
        );

    let ano =
        filme.ano ||
        "";

    if (!ano && filme.release_date) {
        ano =
            String(
                filme.release_date
            ).substring(0, 4);
    }

    if (!ano) {
        ano = "----";
    }

    card.innerHTML = `
        <div class="capa">

            ${
                capa
                    ? `
                        <img
                            src="${escaparHTML(capa)}"
                            alt="${escaparHTML(titulo)}"
                            loading="lazy"
                            onerror="this.style.display='none';"
                        >
                    `
                    : `
                        <span>🎬</span>
                    `
            }

        </div>

        <h3>
            ${escaparHTML(titulo)}
        </h3>

        <p>
            ⭐ ${nota.toFixed(1)}
            •
            ${escaparHTML(ano)}
        </p>
    `;

    card.addEventListener(
        "click",
        function () {
            abrirFilme(filme);
        }
    );

    return card;
}

// ==========================================
// MOSTRAR FILMES
// ==========================================

function mostrarFilmes() {
    categorias.forEach(categoria => {
        const area =
            document.getElementById(
                categoria.id
            );

        if (!area) return;

        area.innerHTML = "";

        const lista =
            filmes.filter(
                categoria.filtro
            );

        const secao =
            area.parentElement;

        if (!lista.length) {
            secao.style.display = "none";
            return;
        }

        secao.style.display = "";

        lista.forEach(filme => {
            area.appendChild(
                criarCard(filme)
            );
        });
    });
}

// ==========================================
// ABRIR FILME
// ==========================================

function abrirFilme(filme) {
    console.log(
        "[FILME SELECIONADO]",
        filme
    );

    localStorage.setItem(
        "filmeSelecionado",
        JSON.stringify(filme)
    );

    window.location.href =
        "/paginas/filme.html";
}

// ==========================================
// CONFIGURAR PESQUISA
// ==========================================

function configurarBusca() {
    const campo =
        document.getElementById(
            "campoBusca"
        );

    if (!campo) {
        console.warn(
            "[PESQUISA] #campoBusca não encontrado."
        );

        return;
    }

    let timer = null;

    campo.addEventListener(
        "input",
        function () {
            clearTimeout(timer);

            const termo =
                campo.value.trim();

            if (!termo) {
                esconderResultadosBusca();
                return;
            }

            timer = setTimeout(
                function () {
                    pesquisarFilmes(termo);
                },
                400
            );
        }
    );

    campo.addEventListener(
        "keydown",
        function (event) {
            if (event.key === "Enter") {
                event.preventDefault();

                const termo =
                    campo.value.trim();

                if (termo) {
                    clearTimeout(timer);

                    pesquisarFilmes(termo);
                }
            }
        }
    );
}

// ==========================================
// PESQUISAR FILMES NO SERVIDOR
// ==========================================

async function pesquisarFilmes(termo) {
    termo =
        String(
            termo || ""
        ).trim();

    if (!termo) {
        esconderResultadosBusca();
        return;
    }

    const resultados =
        obterAreaResultados();

    if (!resultados) return;

    resultados.style.display = "block";

    resultados.innerHTML = `
        <div class="busca-status">
            🔎 Pesquisando
            "<strong>${escaparHTML(termo)}</strong>"...
        </div>
    `;

    console.log(
        "[PESQUISA] Procurando:",
        termo
    );

    try {
        const resposta =
            await fetch(
                API_BASE + "/api/pesquisar?q=" +
                encodeURIComponent(termo),
                {
                    method: "GET",
                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );

        console.log(
            "[PESQUISA] Status:",
            resposta.status
        );

        const dados =
            await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro ||
                "Erro ao pesquisar."
            );
        }

        const lista =
            Array.isArray(
                dados.resultados
            )
                ? dados.resultados
                : [];

        console.log(
            "[PESQUISA] Resultados:",
            lista.length
        );

        mostrarResultadosBusca(
            lista,
            termo
        );

    } catch (erro) {
        console.error(
            "[PESQUISA] Erro:",
            erro
        );

        resultados.innerHTML = `
            <div class="busca-status">

                ❌ Não foi possível pesquisar.

                <br><br>

                <small>
                    ${escaparHTML(
                        erro.message
                    )}
                </small>

            </div>
        `;
    }
}

// ==========================================
// MOSTRAR RESULTADOS DA PESQUISA
// ==========================================

function mostrarResultadosBusca(
    lista,
    termo
) {
    const resultados =
        obterAreaResultados();

    if (!resultados) return;

    resultados.style.display = "block";

    if (
        !Array.isArray(lista) ||
        lista.length === 0
    ) {
        resultados.innerHTML = `
            <div class="busca-status">

                😕 Nenhum filme encontrado para

                "<strong>
                    ${escaparHTML(termo)}
                </strong>".

            </div>
        `;

        return;
    }

    resultados.innerHTML = "";

    const titulo =
        document.createElement("h2");

    titulo.className =
        "titulo-resultados";

    titulo.textContent =
        `🔎 Resultados para "${termo}"`;

    resultados.appendChild(titulo);

    const grade =
        document.createElement("div");

    grade.className =
        "resultados-filmes";

    lista.forEach(
        function (filme) {
            grade.appendChild(
                criarCard(filme)
            );
        }
    );

    resultados.appendChild(grade);
}

// ==========================================
// ÁREA DE RESULTADOS
// ==========================================

function obterAreaResultados() {
    let area =
        document.getElementById(
            "resultadosBusca"
        );

    if (area) {
        return area;
    }

    area =
        document.createElement("div");

    area.id =
        "resultadosBusca";

    const campo =
        document.getElementById(
            "campoBusca"
        );

    if (
        campo &&
        campo.parentElement
    ) {
        campo.parentElement.insertAdjacentElement(
            "afterend",
            area
        );
    } else {
        document.body.appendChild(
            area
        );
    }

    return area;
}

// ==========================================
// ESCONDER RESULTADOS
// ==========================================

function esconderResultadosBusca() {
    const area =
        document.getElementById(
            "resultadosBusca"
        );

    if (!area) return;

    area.innerHTML = "";

    area.style.display = "none";
}

// ==========================================
// ESCAPAR HTML
// ==========================================

function escaparHTML(texto) {
    return String(
        texto || ""
    )
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ==========================================
// SETAS DAS CATEGORIAS
// ==========================================

function configurarSetas() {
    document.addEventListener(
        "click",
        function (event) {
            const botao =
                event.target.closest(
                    ".seta"
                );

            if (!botao) return;

            const secao =
                botao.closest(
                    ".categoria"
                );

            if (!secao) return;

            const filmesArea =
                secao.querySelector(
                    ".filmes"
                );

            if (!filmesArea) return;

            const direcao =
                botao.dataset.direcao;

            if (
                direcao === "direita"
            ) {
                filmesArea.scrollBy({
                    left: 700,
                    behavior: "smooth"
                });
            } else {
                filmesArea.scrollBy({
                    left: -700,
                    behavior: "smooth"
                });
            }
        }
    );
}

// ==========================================
// INICIAR
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {
        console.log(
            "[LUKAFILMES] Iniciando..."
        );

        carregarFilmes();
    }
);