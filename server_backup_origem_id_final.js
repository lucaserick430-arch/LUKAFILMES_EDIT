
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
// CACHE DE PESQUISAS
// ==========================================

const pesquisaCache = new Map();

// LINKS DE FILMES DO SITE DE ORIGEM
const fs = require("fs");
const caminhoLinksFilmes = require("path").join(__dirname, "links_filmes.json");

let linksFilmes = {};

try {
    linksFilmes = JSON.parse(
        fs.readFileSync(caminhoLinksFilmes, "utf8")
    );

    console.log(
        "[LINKS FILMES] Carregados:",
        Object.keys(linksFilmes).length
    );

} catch (erro) {

    console.error(
        "[LINKS FILMES] Erro ao carregar links_filmes.json:",
        erro.message
    );

    linksFilmes = {};
}

const PESQUISA_CACHE_MS =
    5 * 60 * 1000;

const PESQUISA_CACHE_MAX =
    100;
// ==========================================
// API DE PESQUISA
// ==========================================

app.get(
    "/api/pesquisar",
    async (req, res) => {

        const busca =
            String(req.query.q || "").trim();

        if (!busca) {
            return res.json({
                resultados: []
            });
        }

        const chavePesquisa =
            busca.toLowerCase();

        const cachePesquisa =
            pesquisaCache.get(chavePesquisa);

        if (
            cachePesquisa &&
            (Date.now() - cachePesquisa.tempo) < PESQUISA_CACHE_MS
        ) {

            console.log(
                "[PESQUISA] Cache:",
                busca
            );

            return res.json(cachePesquisa.dados);
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

            const resposta = {
                pagina: dados.page || 1,
                totalPaginas: dados.total_pages || 0,
                totalResultados: dados.total_results || 0,
                resultados
            };

            pesquisaCache.set(
                chavePesquisa,
                {
                    tempo: Date.now(),
                    dados: resposta
                }
            );

            if (pesquisaCache.size > PESQUISA_CACHE_MAX) {

                const primeira =
                    pesquisaCache.keys().next().value;

                pesquisaCache.delete(primeira);
            }

            console.log(
                "[PESQUISA] TMDB:",
                busca
            );

            return res.json(resposta);

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
// CATÁLOGO COMPLETO
// ==========================================

// ==========================================
// CATÁLOGO COMPLETO — CACHE + PARALELISMO
// ==========================================

let catalogoCache = null;
let catalogoAtualizando = false;
let catalogoUltimaAtualizacao = 0;
const CATALOGO_CACHE_MS = 10 * 60 * 1000;

async function atualizarCatalogo() {
    if (catalogoAtualizando) return catalogoCache;
    catalogoAtualizando = true;

    try {
        console.log('[CATÁLOGO] Atualizando cache...');

        const requisicoes = [];

        for (let pagina = 1; pagina <= 5; pagina++) {
            requisicoes.push(
                tmdb('/movie/popular?language=pt-BR&page=' + pagina)
            );
        }

        for (const ano of [2025, 2026]) {
            for (let pagina = 1; pagina <= 5; pagina++) {
                requisicoes.push(
                    tmdb(
                        '/discover/movie?language=pt-BR' +
                        '&sort_by=popularity.desc' +
                        '&primary_release_year=' + ano +
                        '&page=' + pagina +
                        '&include_adult=false'
                    )
                );
            }
        }

        for (const genero of [28, 35, 27, 878, 10749]) {
            for (let pagina = 1; pagina <= 3; pagina++) {
                requisicoes.push(
                    tmdb(
                        '/discover/movie?language=pt-BR' +
                        '&with_genres=' + genero +
                        '&sort_by=popularity.desc' +
                        '&page=' + pagina +
                        '&include_adult=false'
                    )
                );
            }
        }

        const respostas = await Promise.all(requisicoes);
        const mapa = new Map();

        for (const resposta of respostas) {
            for (const filme of (resposta.results || [])) {
                if (filme && filme.id && !mapa.has(filme.id)) {
                    mapa.set(filme.id, filme);
                }
            }
        }

        const filmes = Array.from(mapa.values()).map(converterFilme);

        catalogoCache = filmes;
        catalogoUltimaAtualizacao = Date.now();

        console.log('[CATÁLOGO] Cache atualizado:', filmes.length, 'filmes');

        return filmes;

    } catch (erro) {
        console.error('[ERRO ATUALIZAR CATALOGO]', erro);
        return catalogoCache;

    } finally {
        catalogoAtualizando = false;
    }
}

app.get('/api/catalogo', async (req, res) => {
    try {
        const agora = Date.now();

        if (
            catalogoCache &&
            (agora - catalogoUltimaAtualizacao) < CATALOGO_CACHE_MS
        ) {
            return res.json({
                sucesso: true,
                total: catalogoCache.length,
                filmes: catalogoCache,
                cache: true
            });
        }

        if (catalogoCache) {
            res.json({
                sucesso: true,
                total: catalogoCache.length,
                filmes: catalogoCache,
                cache: true
            });

            atualizarCatalogo();
            return;
        }

        const filmes = await atualizarCatalogo();

        if (!filmes) {
            return res.status(500).json({
                sucesso: false,
                mensagem: 'Não foi possível carregar o catálogo.'
            });
        }

        return res.json({
            sucesso: true,
            total: filmes.length,
            filmes,
            cache: false
        });

    } catch (erro) {
        console.error('[ERRO CATALOGO]', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível carregar o catálogo.'
        });
    }
});

// ==========================================
// TRAILER DO FILME — TMDB
// ==========================================

app.get('/api/filme/:id/videos', async (req, res) => {
    try {
        const id = req.params.id;

        if (!id || !/^\d+$/.test(id)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'ID do filme inválido.'
            });
        }

        const resposta = await tmdb(
            '/movie/' + id + '/videos?language=pt-BR'
        );

        const videos = Array.isArray(resposta.results)
            ? resposta.results
            : [];

        const youtube = videos.filter(video =>
            video &&
            video.site === 'YouTube' &&
            video.key
        );

        const trailers = youtube.filter(video =>
            String(video.type || '').toLowerCase() === 'trailer'
        );

        const oficiais = trailers.filter(video =>
            video.official === true
        );

        const pt = oficiais.filter(video =>
            String(video.iso_639_1 || '').toLowerCase() === 'pt'
        );

        const en = oficiais.filter(video =>
            String(video.iso_639_1 || '').toLowerCase() === 'en'
        );

        const escolhido =
            pt[0] ||
            en[0] ||
            oficiais[0] ||
            trailers[0] ||
            youtube[0] ||
            null;

        if (!escolhido) {
            return res.json({
                sucesso: true,
                encontrado: false,
                trailer: null
            });
        }

        return res.json({
            sucesso: true,
            encontrado: true,
            trailer: {
                id: escolhido.id,
                nome: escolhido.name,
                chave: escolhido.key,
                site: escolhido.site,
                tipo: escolhido.type,
                oficial: escolhido.official === true,
                idioma: escolhido.iso_639_1 || null,
                url: 'https://www.youtube.com/watch?v=' + escolhido.key,
                embed: 'https://www.youtube.com/embed/' + escolhido.key
            }
        });

    } catch (erro) {
        console.error('[ERRO TRAILER TMDB]', erro);

        return res.status(500).json({
            sucesso: false,
            encontrado: false,
            trailer: null,
            mensagem: 'Não foi possível buscar o trailer.'
        });
    }
});

// ==========================================
// FILME PARA ASSISTIR — YOUTUBE
// ==========================================

app.get('/api/filme/:id/assistir', async (req, res) => {

    try {

        const id = req.params.id;

        if (!id || !/^\d+$/.test(id)) {

            return res.status(400).json({
                sucesso: false,
                encontrado: false,
                mensagem: 'ID do filme inválido.'
            });

        }

        /*
         * Busca os dados do filme no TMDB.
         * A partir deles poderemos procurar uma fonte
         * autorizada para reprodução/incorporação.
         */

        const filme = await tmdb(
            '/movie/' + id + '?language=pt-BR'
        );

        if (!filme || !filme.id) {

            return res.json({
                sucesso: true,
                encontrado: false,
                filme: null
            });

        }

        return res.json({

            sucesso: true,

            encontrado: false,

            mensagem:
                'Nenhum filme completo autorizado foi encontrado automaticamente.',

            filme: {
                id: filme.id,
                titulo: filme.title || '',
                ano:
                    filme.release_date
                        ? filme.release_date.substring(0, 4)
                        : '',
                sinopse: filme.overview || ''
            }

        });

    } catch (erro) {

        console.error(
            '[ERRO FILME ASSISTIR]',
            erro
        );

        return res.status(500).json({

            sucesso: false,

            encontrado: false,

            mensagem:
                'Não foi possível buscar o filme.'

        });

    }

});

// ==========================================
const linksPorIdTMDB = {

    "27205": "https://www.megaseriehd.site/series/a-origem-2010/temporada-01/episodio-01",

    "11238": "https://www.megaseriehd.site/series/aladdin-e-os-40-ladroes-1996/temporada-01/episodio-01",

    "812": "https://www.megaseriehd.site/series/aladdin-1992/temporada-01/episodio-01",

    "713704": "https://www.megaseriehd.site/series/a-morte-do-demonio-a-ascensao-2023/temporada-01/episodio-01",

    "83533": "https://www.megaseriehd.site/series/avatar-fogo-e-cinzas-2025/temporada-01/episodio-01"

};
// LINK DE ORIGEM DO FILME
// ==========================================

app.get('/api/filme/:id/origem', async (req, res) => {

    try {

        const id = req.params.id;

        if (!id || !/^\d+$/.test(id)) {
            return res.json({
                sucesso: false,
                encontrado: false
            });
        }

        const dados = await tmdb(
            '/movie/' + id + '?language=pt-BR'
        );

        const titulo = String(
            dados.title || ''
        ).toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        let link = null;

        for (const chave of Object.keys(linksFilmes)) {

            const chaveNormalizada = String(chave)
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');

            if (
                titulo === chaveNormalizada ||
                titulo.includes(chaveNormalizada) ||
                chaveNormalizada.includes(titulo)
            ) {
                link =
                linksPorIdTMDB[id] ||
                linksFilmes[chave];
                break;
            }
        }

        if (!link) {

            return res.json({
                sucesso: true,
                encontrado: false
            });

        }

        return res.json({
            sucesso: true,
            encontrado: true,
            titulo: dados.title,
            link
        });

    } catch (erro) {

        console.error(
            '[ERRO LINK ORIGEM]',
            erro
        );

        return res.status(500).json({
            sucesso: false,
            encontrado: false
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




app.get("/paginas/filme",(req,res)=>{res.sendFile(require("path").join(__dirname,"paginas","filme.html"));});














