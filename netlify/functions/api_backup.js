const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";

const generosTMDB = {
    28: "Ação",
    12: "Aventura",
    16: "Animação",
    35: "Comédia",
    80: "Crime",
    99: "Documentário",
    18: "Drama",
    10751: "Família",
    14: "Fantasia",
    36: "História",
    27: "Terror",
    10402: "Música",
    9648: "Mistério",
    10749: "Romance",
    878: "Ficção científica",
    10770: "Cinema TV",
    53: "Thriller",
    10752: "Guerra",
    37: "Faroeste"
};

function converterFilme(filme) {
    const generos = Array.isArray(filme.genre_ids)
        ? filme.genre_ids
            .map(id => generosTMDB[id])
            .filter(Boolean)
        : [];

    return {
        id: filme.id,

        titulo:
            filme.title ||
            filme.original_title ||
            "Sem título",

        tituloOriginal:
            filme.original_title || "",

        ano:
            filme.release_date
                ? Number(filme.release_date.substring(0, 4))
                : "",

        generos,

        categoria:
            generos.join(", "),

        nota:
            Number(filme.vote_average || 0),

        votos:
            Number(filme.vote_count || 0),

        capa:
            filme.poster_path
                ? TMDB_IMAGE + filme.poster_path
                : "",

        fundo:
            filme.backdrop_path
                ? "https://image.tmdb.org/t/p/w1280" +
                  filme.backdrop_path
                : "",

        sinopse:
            filme.overview ||
            "Sinopse não disponível."
    };
}

async function tmdb(endpoint) {
    const token = process.env.TMDB_TOKEN;

    if (!token) {
        throw new Error(
            "TMDB_TOKEN não configurado no Netlify."
        );
    }

    const resposta = await fetch(
        TMDB_BASE + endpoint,
        {
            method: "GET",
            headers: {
                Authorization: "Bearer " + token,
                accept: "application/json"
            }
        }
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
        throw new Error(
            dados.status_message ||
            "Erro no TMDB."
        );
    }

    return dados;
}

exports.handler = async function (event) {
    try {
        const caminho = event.path || "";

        // ==========================================
        // STATUS
        // ==========================================

        if (
            caminho === "/status" ||
            caminho === "/.netlify/functions/api"
        ) {
            return {
                statusCode: 200,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    online: true,
                    servidor: "LUKAFILMES",
                    ambiente: "Netlify"
                })
            };
        }

        // ==========================================
        // LOGIN
        // ==========================================

        if (
            caminho === "/api/login" &&
            event.httpMethod === "POST"
        ) {
            let dadosLogin;

            try {
                dadosLogin = JSON.parse(
                    event.body || "{}"
                );
            } catch (erro) {
                return {
                    statusCode: 400,
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        sucesso: false,
                        mensagem:
                            "Dados de login inválidos."
                    })
                };
            }

            const usuario = String(
                dadosLogin.usuario || ""
            ).trim();

            const senha = String(
                dadosLogin.senha || ""
            );

            const usuarioAdmin =
                process.env.ADMIN_USER || "";

            const senhaAdmin =
                process.env.ADMIN_PASSWORD || "";

            if (
                usuario === usuarioAdmin &&
                senha === senhaAdmin
            ) {
                return {
                    statusCode: 200,
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        sucesso: true,
                        usuario: "admin",
                        tipo: "admin",
                        mensagem:
                            "Login realizado com sucesso."
                    })
                };
            }

            return {
                statusCode: 401,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    sucesso: false,
                    mensagem:
                        "Usuário ou senha incorretos."
                })
            };
        }

        // ==========================================
        // PESQUISA
        // ==========================================

        if (caminho === "/api/pesquisar") {
            const busca = String(
                event.queryStringParameters?.q || ""
            ).trim();

            if (!busca) {
                return {
                    statusCode: 200,
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        resultados: []
                    })
                };
            }

            const dados = await tmdb(
                "/search/movie" +
                "?query=" +
                encodeURIComponent(busca) +
                "&language=pt-BR" +
                "&page=1" +
                "&include_adult=false"
            );

            const resultados =
                (dados.results || [])
                    .map(converterFilme);

            return {
                statusCode: 200,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    pagina: dados.page || 1,
                    totalPaginas:
                        dados.total_pages || 0,
                    totalResultados:
                        dados.total_results || 0,
                    resultados
                })
            };
        }

        // ==========================================
        // CATÁLOGO
        // ==========================================

        if (caminho === "/api/catalogo") {
            const paginas = [];

            for (
                let pagina = 1;
                pagina <= 5;
                pagina++
            ) {
                const dados = await tmdb(
                    "/movie/popular" +
                    "?language=pt-BR" +
                    "&page=" +
                    pagina
                );

                paginas.push(
                    ...(dados.results || [])
                );
            }

            const filmes =
                paginas.map(converterFilme);

            return {
                statusCode: 200,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    sucesso: true,
                    total: filmes.length,
                    filmes
                })
            };
        }

        // ==========================================
        // ROTA NÃO ENCONTRADA
        // ==========================================

        return {
            statusCode: 404,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                sucesso: false,
                mensagem:
                    "Rota não encontrada."
            })
        };

    } catch (erro) {
        console.error(
            "[NETLIFY API]",
            erro
        );

        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                sucesso: false,
                mensagem:
                    erro.message ||
                    "Erro interno."
            })
        };
    }
};