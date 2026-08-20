
// ==========================================
// CONVERTER FILME
// ==========================================

function converterFilme(filme) {

    const generos =
        Array.isArray(filme.genre_ids)

            ? filme.genre_ids
                .map(id => generosTMDB[id])
                .filter(Boolean)

            : [];

    const titulo =
        filme.title ||
        filme.original_title ||
        "Sem título";

    const ano =
        filme.release_date
            ? Number(
                filme.release_date.substring(0, 4)
            )
            : "";

    return {

        id: filme.id,

        titulo,

        tituloOriginal:
            filme.original_title || "",

        ano,

        generos,

        // CORRIGIDO:
        // agora o filme pode pertencer a vários gêneros
        categoria:
            generos.join(", "),

        nota:
            Number(
                filme.vote_average || 0
            ),

        votos:
            Number(
                filme.vote_count || 0
            ),

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


// ==========================================
// API DE PESQUISA
// ==========================================

app.get(
    "/api/pesquisar",
    async (req, res) => {

        const busca =
            String(
                req.query.q || ""
            ).trim();

        console.log(
            "[PESQUISA]",
            busca
        );

        if (!busca) {

            return res.json({
                resultados: []
            });

        }

        try {

            const dados =
                await tmdb(
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

            return res.json({

                pagina:
                    dados.page || 1,

                totalPaginas:
                    dados.total_pages || 0,

                totalResultados:
                    dados.total_results || 0,

                resultados

            });

        } catch (erro) {

            console.error(
                "[ERRO PESQUISA]",
                erro
            );

            return res.status(500).json({

                erro:
                    "Não foi possível consultar o TMDB."

            });

        }

    }
);
```
