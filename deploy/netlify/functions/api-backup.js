
const crypto = require("crypto");
const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");

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

        if (indice === -1) {
            return;
        }

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

        const assinaturaEsperada = crypto
            .createHmac("sha256", segredo)
            .update(payload)
            .digest("base64url");

        if (assinatura !== assinaturaEsperada) {
            return null;
        }

        const dados = JSON.parse(
            Buffer.from(
                payload,
                "base64url"
            ).toString("utf8")
        );

        if (!dados.exp || Date.now() > dados.exp) {
            return null;
        }

        return dados;

    } catch (erro) {
        console.error("[TOKEN]", erro);
        return null;
    }
}

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

function abrirBanco() {
    return new Database("banco.db");
}

exports.handler = async function(event) {

    try {

        const caminho =
            event.path || "";

        /*
         * LOGIN
         */
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

            /*
             * LOGIN DO ADMINISTRADOR
             */
            if (
                usuario === "admin" &&
                senha === "LUKA123"
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

            /*
             * LOGIN DOS USUÁRIOS CADASTRADOS
             */
            const db = abrirBanco();

            try {

                const encontrado =
                    db.prepare(`
                        SELECT
                            id,
                            usuario,
                            senha,
                            status,
                            tipo,
                            validade
                        FROM usuarios
                        WHERE usuario = ?
                    `).get(usuario);

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
                    encontrado.status !==
                    "ativo"
                ) {

                    return resposta(
                        403,
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

                    db.prepare(`
                        UPDATE usuarios
                        SET status = 'expirado'
                        WHERE id = ?
                    `).run(encontrado.id);

                    return resposta(
                        403,
                        {
                            sucesso: false,
                            mensagem:
                                "Seu acesso expirou."
                        }
                    );
                }

                const senhaCorreta =
                    bcrypt.compareSync(
                        senha,
                        encontrado.senha
                    );

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
                        encontrado.tipo
                    );

                return resposta(
                    200,
                    {
                        sucesso: true,
                        mensagem:
                            "Login realizado com sucesso.",
                        usuario:
                            encontrado.usuario,
                        tipo:
                            encontrado.tipo
                    },
                    [
                        "luka_session=" +
                        token +
                        "; Path=/; Max-Age=86400; HttpOnly; Secure; SameSite=Lax"
                    ]
                );

            } finally {
                db.close();
            }
        }

        /*
         * USUÁRIO LOGADO
         */
        if (
            caminho === "/api/eu"
        ) {

            const cookies =
                lerCookies(event);

            const usuario =
                verificarToken(
                    cookies.luka_session
                );

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

        /*
         * LOGOUT
         */
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

        /*
         * CRIAR USUÁRIO
         */
        if (
            caminho ===
            "/api/admin/criar-usuario"
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

            const cookies =
                lerCookies(event);

            const administrador =
                verificarToken(
                    cookies.luka_session
                );

            if (
                !administrador ||
                administrador.tipo !== "admin"
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

            if (
                dias < 1 ||
                !Number.isInteger(dias)
            ) {

                return resposta(
                    400,
                    {
                        sucesso: false,
                        mensagem:
                            "A validade deve ser um número inteiro maior que zero."
                    }
                );
            }

            const db =
                abrirBanco();

            try {

                const existente =
                    db.prepare(`
                        SELECT id
                        FROM usuarios
                        WHERE usuario = ?
                    `).get(novoUsuario);

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
                    bcrypt.hashSync(
                        novaSenha,
                        12
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
                    novoUsuario,
                    senhaHash,
                    validade
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

            } finally {
                db.close();
            }
        }

        /*
         * LISTAR USUÁRIOS
         */
        if (
            caminho ===
            "/api/admin/usuarios"
        ) {

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

            const cookies =
                lerCookies(event);

            const administrador =
                verificarToken(
                    cookies.luka_session
                );

            if (
                !administrador ||
                administrador.tipo !== "admin"
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

            const db =
                abrirBanco();

            try {

                const usuarios =
                    db.prepare(`
                        SELECT
                            id,
                            usuario,
                            status,
                            tipo,
                            validade,
                            criado_em
                        FROM usuarios
                        ORDER BY id DESC
                    `).all();

                return resposta(
                    200,
                    {
                        sucesso: true,
                        usuarios
                    }
                );

            } finally {
                db.close();
            }
        }

        /*
         * STATUS
         */
        if (
            caminho === "/status" ||
            caminho ===
            "/.netlify/functions/api"
        ) {

            return resposta(
                200,
                {
                    online: true,
                    servidor:
                        "LUKAFILMES",
                    ambiente:
                        "Netlify"
                }
            );
        }

        /*
         * PESQUISA
         */
        if (
            caminho ===
            "/api/pesquisar"
        ) {

            const busca =
                String(
                    event
                        .queryStringParameters
                        ?.q || ""
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

        /*
         * CATÁLOGO
         */
        if (
            caminho ===
            "/api/catalogo"
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

        /*
         * ROTA NÃO ENCONTRADA
         */
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
    }
};

