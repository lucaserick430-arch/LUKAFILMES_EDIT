const crypto = require("crypto");
const { getStore } = require("@netlify/blobs");

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

function resposta(statusCode, dados, cookies = []) {

    const headers = {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
    };

    if (cookies.length > 0) {
        headers["Set-Cookie"] = cookies.join(", ");
    }

    return {
        statusCode,
        headers,
        body: JSON.stringify(dados)
    };
}

/* ================================
   SESSÃO
================================ */

function criarToken(usuario, tipo) {

    const payload = Buffer.from(
        JSON.stringify({
            usuario,
            tipo,
            exp: Date.now() + 24 * 60 * 60 * 1000
        })
    ).toString("base64url");

    const segredo =
        process.env.SESSION_SECRET ||
        "LUKAFILMES_SEGREDO_2026";

    const assinatura = crypto
        .createHmac("sha256", segredo)
        .update(payload)
        .digest("base64url");

    return payload + "." + assinatura;
}

function lerCookies(event) {

    const cookies = {};

    const lista =
        event.headers?.cookie ||
        event.headers?.Cookie ||
        "";

    lista.split(";").forEach(parte => {

        const indice = parte.indexOf("=");

        if (indice === -1) return;

        const nome =
            parte.substring(0, indice).trim();

        const valor =
            parte.substring(indice + 1).trim();

        cookies[nome] = valor;
    });

    return cookies;
}

function verificarToken(token) {

    if (!token) {
        return null;
    }

    try {

        const partes = token.split(".");

        if (partes.length !== 2) {
            return null;
        }

        const payload = partes[0];
        const assinatura = partes[1];

        const segredo =
            process.env.SESSION_SECRET ||
            "LUKAFILMES_SEGREDO_2026";

        const assinaturaEsperada =
            crypto
                .createHmac("sha256", segredo)
                .update(payload)
                .digest("base64url");

        if (assinatura !== assinaturaEsperada) {
            return null;
        }

        const dados =
            JSON.parse(
                Buffer.from(
                    payload,
                    "base64url"
                ).toString("utf8")
            );

        if (
            !dados.exp ||
            Date.now() > dados.exp
        ) {
            return null;
        }

        return dados;

    } catch (erro) {

        console.error("[TOKEN]", erro);

        return null;
    }
}

function usuarioLogado(event) {

    const cookies = lerCookies(event);

    return verificarToken(
        cookies.luka_session
    );
}

/* ================================
   NETLIFY BLOBS
================================ */


function bancoUsuarios() {
    return getStore({
        name: "lukafilmes-usuarios",
        consistency: "strong",
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_AUTH_TOKEN
    });
}

async function pegarUsuarios() {

    const store = bancoUsuarios();

    const dados =
        await store.get("usuarios", {
            type: "json"
        });

    if (!Array.isArray(dados)) {
        return [];
    }

    return dados;
}

async function salvarUsuarios(usuarios) {

    const store = bancoUsuarios();

    await store.setJSON(
        "usuarios",
        usuarios
    );
}

/* ================================
   FILMES
================================ */

function converterFilme(filme) {

    const generos =
        Array.isArray(filme.genre_ids)
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
                ? Number(
                    filme.release_date.substring(0, 4)
                )
                : "",

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

async function tmdb(endpoint) {

    const token =
        process.env.TMDB_TOKEN;

    if (!token) {

        throw new Error(
            "TMDB_TOKEN não configurado no Netlify."
        );
    }

    const respostaTMDB =
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
        await respostaTMDB.json();

    if (!respostaTMDB.ok) {

        throw new Error(
            dados.status_message ||
            "Erro no TMDB."
        );
    }

    return dados;
}

/* ================================
   API
================================ */

exports.handler = async function(event) {

    try {

        const caminho =
            event.path || "";

        /* =========================
           STATUS
        ========================= */

        if (
            caminho === "/status" ||
            caminho === "/.netlify/functions/api"
        ) {

            return resposta(
                200,
                {
                    online: true,
                    servidor: "LUKAFILMES",
                    ambiente: "Netlify"
                }
            );
        }

        /* =========================
           LOGIN
        ========================= */

        if (
            caminho === "/api/login" ||
            caminho === "/login"
        ) {

            if (
                event.httpMethod !== "POST"
            ) {

                return resposta(
                    405,
                    {
                        sucesso: false,
                        mensagem:
                            "Método não permitido."
                    }
                );
            }

            let dadosLogin;

            try {

                dadosLogin =
                    JSON.parse(
                        event.body || "{}"
                    );

            } catch {

                return resposta(
                    400,
                    {
                        sucesso: false,
                        mensagem:
                            "Dados de login inválidos."
                    }
                );
            }

            const usuario =
                String(
                    dadosLogin.usuario || ""
                ).trim();

            const senha =
                String(
                    dadosLogin.senha || ""
                );

            /* ADMIN */

            const adminUser =
                process.env.ADMIN_USER ||
                "admin";

            const adminPassword =
                process.env.ADMIN_PASSWORD ||
                "LUKA123";

            if (
                usuario === adminUser &&
                senha === adminPassword
            ) {

                const token =
                    criarToken(
                        "admin",
                        "admin"
                    );

                return resposta(
                    200,
                    {
                        sucesso: true,
                        mensagem:
                            "Login realizado com sucesso.",
                        usuario: "admin",
                        tipo: "admin"
                    },
                    [
                        "luka_session=" +
                        token +
                        "; Path=/; Max-Age=86400; HttpOnly; Secure; SameSite=Lax"
                    ]
                );
            }

            /* USUÁRIOS */

            const usuarios =
                await pegarUsuarios();

            const encontrado =
                usuarios.find(
                    u =>
                        u.usuario === usuario
                );

            if (!encontrado) {

                return resposta(
                    401,
                    {
                        sucesso: false,
                        mensagem:
                            "Usuário ou senha incorretos."
                    }
                );
            }

            if (
                encontrado.status !== "ativo"
            ) {

                return resposta(
                    401,
                    {
                        sucesso: false,
                        mensagem:
                            "Usuário bloqueado."
                    }
                );
            }

            if (
                encontrado.validade &&
                Date.now() >
                new Date(
                    encontrado.validade
                ).getTime()
            ) {

                encontrado.status =
                    "expirado";

                await salvarUsuarios(
                    usuarios
                );

                return resposta(
                    401,
                    {
                        sucesso: false,
                        mensagem:
                            "O acesso deste usuário expirou."
                    }
                );
            }

            const senhaCorreta =
                crypto
                    .createHash("sha256")
                    .update(senha)
                    .digest("hex") ===
                encontrado.senha;

            if (!senhaCorreta) {

                return resposta(
                    401,
                    {
                        sucesso: false,
                        mensagem:
                            "Usuário ou senha incorretos."
                    }
                );
            }

            const token =
                criarToken(
                    encontrado.usuario,
                    "usuario"
                );

            return resposta(
                200,
                {
                    sucesso: true,
                    mensagem:
                        "Login realizado com sucesso.",
                    usuario:
                        encontrado.usuario,
                    tipo: "usuario",
                    validade:
                        encontrado.validade
                },
                [
                    "luka_session=" +
                    token +
                    "; Path=/; Max-Age=86400; HttpOnly; Secure; SameSite=Lax"
                ]
            );
        }

        /* =========================
           USUÁRIO LOGADO
        ========================= */

        if (
            caminho === "/api/eu"
        ) {

            const usuario =
                usuarioLogado(event);

            if (!usuario) {

                return resposta(
                    401,
                    {
                        logado: false,
                        mensagem:
                            "Usuário não autenticado."
                    }
                );
            }

            return resposta(
                200,
                {
                    logado: true,

                    usuario: {
                        usuario:
                            usuario.usuario,

                        tipo:
                            usuario.tipo
                    }
                }
            );
        }

        /* =========================
           LOGOUT
        ========================= */

        if (
            caminho === "/api/logout"
        ) {

            return resposta(
                200,
                {
                    sucesso: true,
                    mensagem:
                        "Logout realizado."
                },
                [
                    "luka_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax"
                ]
            );
        }

        /* =========================
           CRIAR USUÁRIO
        ========================= */

        if (
            caminho ===
            "/api/admin/criar-usuario"
        ) {

            const admin =
                usuarioLogado(event);

            if (
                !admin ||
                admin.tipo !== "admin"
            ) {

                return resposta(
                    403,
                    {
                        sucesso: false,
                        mensagem:
                            "Acesso negado."
                    }
                );
            }

            if (
                event.httpMethod !== "POST"
            ) {

                return resposta(
                    405,
                    {
                        sucesso: false,
                        mensagem:
                            "Método não permitido."
                    }
                );
            }

            let dados;

            try {

                dados =
                    JSON.parse(
                        event.body || "{}"
                    );

            } catch {

                return resposta(
                    400,
                    {
                        sucesso: false,
                        mensagem:
                            "Dados inválidos."
                    }
                );
            }

            const novoUsuario =
                String(
                    dados.usuario || ""
                ).trim();

            const novaSenha =
                String(
                    dados.senha || ""
                );

            const dias =
                Number(
                    dados.dias || 0
                );

            if (
                !novoUsuario ||
                !novaSenha ||
                !dias
            ) {

                return resposta(
                    400,
                    {
                        sucesso: false,
                        mensagem:
                            "Preencha usuário, senha e dias de acesso."
                    }
                );
            }

            if (dias < 1) {

                return resposta(
                    400,
                    {
                        sucesso: false,
                        mensagem:
                            "A validade deve ser maior que zero."
                    }
                );
            }

            const usuarios =
                await pegarUsuarios();

            const existente =
                usuarios.find(
                    u =>
                        u.usuario ===
                        novoUsuario
                );

            if (existente) {

                return resposta(
                    409,
                    {
                        sucesso: false,
                        mensagem:
                            "Esse usuário já existe."
                    }
                );
            }

            const validade =
                new Date(
                    Date.now() +
                    dias *
                    24 *
                    60 *
                    60 *
                    1000
                ).toISOString();

            const senhaHash =
                crypto
                    .createHash("sha256")
                    .update(novaSenha)
                    .digest("hex");

            usuarios.push({

                id:
                    Date.now(),

                usuario:
                    novoUsuario,

                senha:
                    senhaHash,

                status:
                    "ativo",

                tipo:
                    "usuario",

                validade,

                criado_em:
                    new Date().toISOString()
            });

            await salvarUsuarios(
                usuarios
            );

            return resposta(
                200,
                {
                    sucesso: true,
                    mensagem:
                        "Usuário criado com sucesso.",
                    usuario:
                        novoUsuario,
                    validade
                }
            );
        }

        /* =========================
           LISTAR USUÁRIOS
        ========================= */

        if (
            caminho ===
            "/api/admin/usuarios"
        ) {

            const admin =
                usuarioLogado(event);

            if (
                !admin ||
                admin.tipo !== "admin"
            ) {

                return resposta(
                    403,
                    {
                        sucesso: false,
                        mensagem:
                            "Acesso negado."
                    }
                );
            }

            if (
                event.httpMethod !== "GET"
            ) {

                return resposta(
                    405,
                    {
                        sucesso: false,
                        mensagem:
                            "Método não permitido."
                    }
                );
            }

            const usuarios =
                await pegarUsuarios();

            const lista =
                usuarios.map(
                    u => ({
                        id: u.id,
                        usuario: u.usuario,
                        status: u.status,
                        tipo: u.tipo,
                        validade: u.validade,
                        criado_em: u.criado_em
                    })
                );

            return resposta(
                200,
                {
                    sucesso: true,
                    usuarios: lista
                }
            );
        }

        /* =========================
           PESQUISA
        ========================= */

        if (
            caminho === "/api/pesquisar"
        ) {

            const busca =
                String(
                    event.queryStringParameters?.q ||
                    ""
                ).trim();

            if (!busca) {

                return resposta(
                    200,
                    {
                        resultados: []
                    }
                );
            }

            const dados =
                await tmdb(
                    "/search/movie" +
                    "?query=" +
                    encodeURIComponent(
                        busca
                    ) +
                    "&language=pt-BR" +
                    "&page=1" +
                    "&include_adult=false"
                );

            const resultados =
                (dados.results || [])
                    .map(
                        converterFilme
                    );

            return resposta(
                200,
                {
                    pagina:
                        dados.page || 1,

                    totalPaginas:
                        dados.total_pages || 0,

                    totalResultados:
                        dados.total_results || 0,

                    resultados
                }
            );
        }

        /* =========================
           CATÁLOGO
        ========================= */

        if (
            caminho === "/api/catalogo"
        ) {

            const paginas = [];

            for (
                let pagina = 1;
                pagina <= 5;
                pagina++
            ) {

                const dados =
                    await tmdb(
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
                paginas.map(
                    converterFilme
                );

            return resposta(
                200,
                {
                    sucesso: true,
                    total:
                        filmes.length,
                    filmes
                }
            );
        }

        /* =========================
           ROTA NÃO ENCONTRADA
        ========================= */

        return resposta(
            404,
            {
                sucesso: false,
                mensagem:
                    "Rota não encontrada."
            }
        );

    } catch (erro) {

        console.error(
            "[NETLIFY API]",
            erro
        );

        return resposta(
            500,
            {
                sucesso: false,
                mensagem:
                    erro.message ||
                    "Erro interno."
            }
        );
    }f
};