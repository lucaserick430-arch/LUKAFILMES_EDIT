
const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");
const session = require("express-session");

const app = express();
const PORT = 3000;

// ==========================================
// BANCO
// ==========================================

const db = new Database(
    path.join(__dirname, "banco.db")
);

app.use(express.json());

// ==========================================
// SESSÃO
// ==========================================

app.use(
    session({
        secret: "LUKAFILMES-SEGREDO-TROCAR-DEPOIS",
        resave: false,
        saveUninitialized: false,

        cookie: {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24
        }
    })
);

// ==========================================
// LOGIN
// ==========================================

app.get("/login", (req, res) => {

    if (req.session.usuario) {
        return res.redirect("/");
    }

    res.sendFile(
        path.join(__dirname, "public", "login.html")
    );
});

// ==========================================
// ADMIN
// ==========================================

app.get("/admin.html", (req, res) => {

    if (!req.session.usuario) {
        return res.redirect("/login");
    }

    if (req.session.usuario.tipo !== "admin") {
        return res.status(403).send("Acesso negado.");
    }

    res.sendFile(
        path.join(__dirname, "public", "admin.html")
    );
});

// ==========================================
// LOGIN POST
// ==========================================

app.post("/login", async (req, res) => {

    try {

        const usuario =
            String(req.body.usuario || "").trim();

        const senha =
            String(req.body.senha || "");

        if (!usuario || !senha) {

            return res.json({
                sucesso: false,
                mensagem: "Digite usuário e senha."
            });
        }

        const pessoa = db
            .prepare(
                "SELECT * FROM usuarios WHERE usuario = ?"
            )
            .get(usuario);

        if (!pessoa) {

            return res.json({
                sucesso: false,
                mensagem: "Usuário ou senha incorretos."
            });
        }

        if (pessoa.status !== "ativo") {

            return res.json({
                sucesso: false,
                mensagem: "Este usuário está suspenso."
            });
        }

        if (
            pessoa.tipo !== "admin" &&
            pessoa.validade &&
            new Date(pessoa.validade) <= new Date()
        ) {

            return res.json({
                sucesso: false,
                mensagem:
                    "Seu acesso expirou. Entre em contato com o administrador."
            });
        }

        const senhaCorreta =
            await bcrypt.compare(
                senha,
                pessoa.senha
            );

        if (!senhaCorreta) {

            return res.json({
                sucesso: false,
                mensagem: "Usuário ou senha incorretos."
            });
        }

        req.session.usuario = {

            id: pessoa.id,

            usuario: pessoa.usuario,

            tipo: pessoa.tipo

        };

        return res.json({
            sucesso: true
        });

    } catch (erro) {

        console.error(
            "[ERRO LOGIN]",
            erro
        );

        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno no servidor."
        });
    }

});

// ==========================================
// USUÁRIO LOGADO
// ==========================================

app.get("/api/eu", (req, res) => {

    if (!req.session.usuario) {

        return res.status(401).json({
            logado: false
        });
    }

    res.json({
        logado: true,
        usuario: req.session.usuario
    });

});

// ==========================================
// LOGOUT
// ==========================================

app.post("/logout", (req, res) => {

    req.session.destroy(() => {

        res.json({
            sucesso: true
        });

    });

});

// ==========================================
// TMDB
// ==========================================

const TMDB_BASE =
    "https://api.themoviedb.org/3";

const TMDB_IMAGE =
    "https://image.tmdb.org/t/p/w500";

// ==========================================
// BUSCAR FILMES DO TMDB
// ==========================================

async function tmdb(endpoint) {

    const token =
        process.env.TMDB_TOKEN;

    if (!token) {

        throw new Error(
            "TMDB_TOKEN não configurado."
        );
    }

    const resposta =
        await fetch(
            TMDB_BASE + endpoint,
            {
                method: "GET",

                headers: {
                    Authorization:
                        "Bearer " + token,

                    accept:
                        "application/json"
                }
            }
        );

    const dados =
        await resposta.json();

    if (!resposta.ok) {

        console.error(
            "[TMDB ERRO]",
            dados
        );

        throw new Error(
            dados.status_message ||
            "Erro no TMDB."
        );
    }

    return dados;
}

// ==========================================
// GÊNEROS
// ==========================================

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

// ==========================================
// CONVERTER FILME
// ==========================================

function converterFilme(filme) {

    const generos =
        Array.isArray(filme.genre_ids)

            ? filme.genre_ids
                .map(
                    id => generosTMDB[id]
                )
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
                ? TMDB_IMAGE +
                  filme.poster_path
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

// ==========================================
// CATÁLOGO COMPLETO
// ==========================================

app.get('/api/catalogo', async (req, res) => {
    try {
        const paginas = [];

        for (let pagina = 1; pagina <= 5; pagina++) {
            const d = await tmdb('/movie/popular?language=pt-BR&page=' + pagina);
            paginas.push(...(d.results || []));
        }

        for (const ano of [2025, 2026]) {
            for (let pagina = 1; pagina <= 5; pagina++) {
                const d = await tmdb('/discover/movie?language=pt-BR&sort_by=popularity.desc&primary_release_year=' + ano + '&page=' + pagina + '&include_adult=false');
                paginas.push(...d.results || []);
            }
        }

        for (const genero of [28, 35, 27, 878, 10749]) {
            for (let pagina = 1; pagina <= 3; pagina++) {
                const d = await tmdb('/discover/movie?language=pt-BR&with_genres=' + genero + '&sort_by=popularity.desc&page=' + pagina + '&include_adult=false');
                paginas.push(...d.results || []);
            }
        }

        const mapa = new Map();

        for (const filme of paginas) {
            if (filme && filme.id && !mapa.has(filme.id)) {
                mapa.set(filme.id, filme);
            }
        }

        const filmes = Array.from(mapa.values()).map(converterFilme);

        return res.json({
            sucesso: true,
            total: filmes.length,
            filmes
        });


    } catch (erro) {
        console.error('[ERRO CATALOGO]', error);


        return res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível carregar o catálogo.'
        });
    }
});
// ADMIN — CRIAR USUÁRIO
// ==========================================

app.post(
    "/api/admin/usuarios",
    async (req, res) => {

        try {

            if (
                !req.session.usuario ||
                req.session.usuario.tipo !== "admin"
            ) {

                return res.status(403).json({

                    sucesso: false,

                    mensagem:
                        "Acesso negado."

                });

            }

            const usuario =
                String(
                    req.body.usuario || ""
                ).trim();

            const senha =
                String(
                    req.body.senha || ""
                );

            const dias =
                Number(
                    req.body.dias
                );

            if (
                !usuario ||
                !senha ||
                !Number.isInteger(dias) ||
                dias < 1
            ) {

                return res.json({

                    sucesso: false,

                    mensagem:
                        "Preencha usuário, senha e dias corretamente."

                });

            }

            const existente =
                db
                    .prepare(
                        "SELECT id FROM usuarios WHERE usuario = ?"
                    )
                    .get(usuario);

            if (existente) {

                return res.json({

                    sucesso: false,

                    mensagem:
                        "Esse usuário já existe."

                });

            }

            const senhaHash =
                await bcrypt.hash(
                    senha,
                    12
                );

            const validade =
                new Date(
                    Date.now() +
                    dias *
                    24 *
                    60 *
                    60 *
                    1000
                );

            db.prepare(`
                INSERT INTO usuarios
                (
                    usuario,
                    senha,
                    status,
                    tipo,
                    validade
                )
                VALUES
                (
                    ?,
                    ?,
                    'ativo',
                    'usuario',
                    ?
                )
            `).run(

                usuario,

                senhaHash,

                validade.toISOString()

            );

            return res.json({

                sucesso: true,

                mensagem:
                    "Usuário criado com sucesso."

            });

        } catch (erro) {

            console.error(
                "[ERRO CRIAR USUARIO]",
                erro
            );

            return res.status(500).json({

                sucesso: false,

                mensagem:
                    "Erro interno ao criar usuário."

            });

        }

    }
);

// ==========================================
// ADMIN — LISTAR USUÁRIOS
// ==========================================

app.get(
    "/api/admin/usuarios",
    (req, res) => {

        try {

            if (
                !req.session.usuario ||
                req.session.usuario.tipo !== "admin"
            ) {

                return res.status(403).json({

                    sucesso: false,

                    mensagem:
                        "Acesso negado."

                });

            }

            const usuarios =
                db.prepare(`
                    SELECT
                        id,
                        usuario,
                        status,
                        tipo,
                        criado_em,
                        validade
                    FROM usuarios
                    ORDER BY id DESC
                `).all();

            return res.json({

                sucesso: true,

                usuarios

            });

        } catch (erro) {

            console.error(
                "[ERRO LISTAR USUARIOS]",
                erro
            );

            return res.status(500).json({

                sucesso: false,

                mensagem:
                    "Erro ao carregar usuários."

            });

        }

    }
);

// ==========================================
// STATUS
// ==========================================

app.get(
    "/status",
    (req, res) => {

        res.json({

            online: true,

            servidor:
                "LUKAFILMES",

            porta:
                PORT

        });

    }
);

// ==========================================
// PROTEÇÃO DAS PÁGINAS
// ==========================================

app.use(
    (req, res, next) => {

        if (

            req.path === "/login" ||

            req.path === "/admin.html" ||

            req.path === "/status" ||

            req.path === "/api/eu" ||

            req.path === "/api/pesquisar" ||

            req.path === '/api/catalogo' || req.path === '/paginas/filmes.html' || req.path === '/paginas/filme.html' || req.path === '/paginas/filme'

        ) {

            return next();

        }

        if (!req.session.usuario) {

            return res.redirect(
                "/login"
            );

        }

        next();

    }
);

// ==========================================
// ARQUIVOS DO SITE
// ==========================================

app.use(
    express.static(__dirname)
);

// ==========================================
// SERVIDOR
// ==========================================

app.listen(
    PORT,
    () => {

        console.log("");

        console.log(
            "================================="
        );

        console.log(
            "       LUKAFILMES ONLINE"
        );

        console.log(
            "================================="
        );

        console.log("");

        console.log(
            "Local: http://localhost:" +
            PORT
        );

        console.log("");

    }
);



