const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const raiz = __dirname;
const serverPath = path.join(raiz, "server_netlify.js");
const adminPath = path.join(raiz, "public", "admin.html");
const resellerPath = path.join(raiz, "public", "revendedor.html");
const dbPath = path.join(raiz, "banco.db");

console.log("=== PREPARANDO SISTEMA DE REVENDEDORES ===");

// ======================================================
// 1. BANCO
// ======================================================

const db = new Database(dbPath);

const colunas = db
    .prepare("PRAGMA table_info(usuarios)")
    .all()
    .map(c => c.name);

if (!colunas.includes("revendedor_id")) {
    db.exec(`
        ALTER TABLE usuarios
        ADD COLUMN revendedor_id INTEGER DEFAULT NULL
    `);

    console.log("Coluna revendedor_id adicionada.");
} else {
    console.log("Coluna revendedor_id já existe.");
}

db.close();


// ======================================================
// 2. SERVER NETLIFY
// ======================================================

let server = fs.readFileSync(serverPath, "utf8");


// salvarUsuarios — incluir revendedor_id
const antigoInsert = `
            INSERT INTO usuarios
            (id, usuario, senha, status, tipo, validade, criado_em, limite_conexoes, conexoes_utilizadas)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const novoInsert = `
            INSERT INTO usuarios
            (id, usuario, senha, status, tipo, validade, criado_em, limite_conexoes, conexoes_utilizadas, revendedor_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

if (!server.includes(antigoInsert)) {
    throw new Error("Não encontrei o bloco INSERT original dos usuários.");
}

if (server.includes(antigoInsert)) {

    server = server.replace(
        antigoInsert,
        novoInsert
    );

    const antigoRun = `
                    u.criado_em || new Date().toISOString(),
                    Number(u.limite_conexoes) || 0,
                    Number(u.conexoes_utilizadas) || 0
`;

    const novoRun = `
                    u.criado_em || new Date().toISOString(),
                    Number(u.limite_conexoes) || 0,
                    Number(u.conexoes_utilizadas) || 0,
                    u.revendedor_id || null
`;

    if (!server.includes(antigoRun)) {
        throw new Error("Não encontrei o bloco de gravação dos usuários.");
    }

    server = server.replace(
        antigoRun,
        novoRun
    );

    console.log("salvarUsuarios atualizado.");
}


// ======================================================
// 3. LISTAGEM ADMIN — DEVOLVER DADOS DO REVENDEDOR
// ======================================================

const antigoMapa = `
                        validade: u.validade
`;

const novoMapa = `
                        validade: u.validade,
                        limite_conexoes: Number(u.limite_conexoes) || 0,
                        conexoes_utilizadas: Number(u.conexoes_utilizadas) || 0,
                        revendedor_id: u.revendedor_id || null
`;

if (server.includes(antigoMapa) && !server.includes("revendedor_id: u.revendedor_id")) {
    server = server.replace(
        antigoMapa,
        novoMapa
    );

    console.log("Listagem administrativa atualizada.");
}


// ======================================================
// 4. NOVA ROTA — CRIAR REVENDEDOR
// ======================================================

const marcadorRevendedor = `
// ==========================================
// REVENDEDORES — CRIAR
// ==========================================
`;

if (!server.includes("REVENDEDORES — CRIAR")) {

    const rotaRevendedor = `

// ==========================================
// REVENDEDORES — CRIAR
// ==========================================

app.post("/api/admin/revendedores", async (req, res) => {

    try {

        if (
            !req.session.usuario ||
            req.session.usuario.tipo !== "admin"
        ) {
            return res.status(403).json({
                sucesso: false,
                mensagem: "Acesso negado."
            });
        }

        const usuario =
            String(req.body.usuario || "").trim();

        const senha =
            String(req.body.senha || "");

        const dias =
            Number(req.body.dias);

        const limite =
            Number(req.body.limite_conexoes);

        if (
            !usuario ||
            !senha ||
            !Number.isInteger(dias) ||
            dias < 1 ||
            !Number.isInteger(limite) ||
            limite < 1
        ) {
            return res.json({
                sucesso: false,
                mensagem:
                    "Preencha usuário, senha, dias e limite corretamente."
            });
        }

        const usuarios =
            await carregarUsuarios();

        const existente =
            usuarios.find(
                u =>
                    String(u.usuario || "").toLowerCase() ===
                    usuario.toLowerCase()
            );

        if (existente) {
            return res.json({
                sucesso: false,
                mensagem: "Esse usuário já existe."
            });
        }

        const senhaHash =
            await bcrypt.hash(senha, 12);

        const validade =
            new Date(
                Date.now() +
                dias *
                24 *
                60 *
                60 *
                1000
            );

        const novoRevendedor = {

            id: proximoId(usuarios),

            usuario,

            senha: senhaHash,

            status: "ativo",

            tipo: "revendedor",

            validade:
                validade.toISOString(),

            criado_em:
                new Date().toISOString(),

            limite_conexoes:
                limite,

            conexoes_utilizadas:
                0,

            revendedor_id:
                null
        };

        usuarios.push(novoRevendedor);

        await salvarUsuarios(usuarios);

        console.log(
            "[ADMIN] Revendedor criado:",
            usuario,
            "limite:",
            limite
        );

        return res.json({
            sucesso: true,
            mensagem: "Revendedor criado com sucesso.",
            usuario: {
                id: novoRevendedor.id,
                usuario: novoRevendedor.usuario,
                tipo: novoRevendedor.tipo,
                limite_conexoes: novoRevendedor.limite_conexoes
            }
        });

    } catch (erro) {

        console.error(
            "[ERRO CRIAR REVENDEDOR]",
            erro
        );

        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno ao criar revendedor."
        });
    }
});


// ==========================================
// REVENDEDOR — CRIAR CLIENTE
// ==========================================

app.post("/api/revendedor/clientes", async (req, res) => {

    try {

        if (
            !req.session.usuario ||
            req.session.usuario.tipo !== "revendedor"
        ) {
            return res.status(403).json({
                sucesso: false,
                mensagem: "Acesso permitido somente para revendedores."
            });
        }

        const revendedorId =
            Number(req.session.usuario.id);

        const usuario =
            String(req.body.usuario || "").trim();

        const senha =
            String(req.body.senha || "");

        const dias =
            Number(req.body.dias);

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

        const usuarios =
            await carregarUsuarios();

        const revendedor =
            usuarios.find(
                u =>
                    Number(u.id) === revendedorId &&
                    u.tipo === "revendedor"
            );

        if (!revendedor) {
            return res.status(403).json({
                sucesso: false,
                mensagem: "Revendedor não encontrado."
            });
        }

        const limite =
            Number(revendedor.limite_conexoes) || 0;

        const clientes =
            usuarios.filter(
                u =>
                    Number(u.revendedor_id) === revendedorId
            );

        if (limite > 0 && clientes.length >= limite) {
            return res.json({
                sucesso: false,
                mensagem:
                    "Você atingiu o limite de clientes da sua conta."
            });
        }

        const existente =
            usuarios.find(
                u =>
                    String(u.usuario || "").toLowerCase() ===
                    usuario.toLowerCase()
            );

        if (existente) {
            return res.json({
                sucesso: false,
                mensagem: "Esse usuário já existe."
            });
        }

        const senhaHash =
            await bcrypt.hash(senha, 12);

        const validade =
            new Date(
                Date.now() +
                dias *
                24 *
                60 *
                60 *
                1000
            );

        const novoCliente = {

            id: proximoId(usuarios),

            usuario,

            senha: senhaHash,

            status: "ativo",

            tipo: "usuario",

            validade:
                validade.toISOString(),

            criado_em:
                new Date().toISOString(),

            limite_conexoes:
                0,

            conexoes_utilizadas:
                0,

            revendedor_id:
                revendedorId
        };

        usuarios.push(novoCliente);

        await salvarUsuarios(usuarios);

        return res.json({
            sucesso: true,
            mensagem: "Cliente criado com sucesso."
        });

    } catch (erro) {

        console.error(
            "[ERRO REVENDEDOR CRIAR CLIENTE]",
            erro
        );

        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno ao criar cliente."
        });
    }
});


// ==========================================
// REVENDEDOR — LISTAR CLIENTES
// ==========================================

app.get("/api/revendedor/clientes", async (req, res) => {

    try {

        if (
            !req.session.usuario ||
            req.session.usuario.tipo !== "revendedor"
        ) {
            return res.status(403).json({
                sucesso: false,
                mensagem: "Acesso negado."
            });
        }

        const revendedorId =
            Number(req.session.usuario.id);

        const usuarios =
            await carregarUsuarios();

        const revendedor =
            usuarios.find(
                u =>
                    Number(u.id) === revendedorId &&
                    u.tipo === "revendedor"
            );

        if (!revendedor) {
            return res.status(403).json({
                sucesso: false,
                mensagem: "Revendedor não encontrado."
            });
        }

        const clientes =
            usuarios
                .filter(
                    u =>
                        Number(u.revendedor_id) === revendedorId
                )
                .map(u => ({
                    id: u.id,
                    usuario: u.usuario,
                    status: u.status,
                    tipo: u.tipo,
                    validade: u.validade,
                    criado_em: u.criado_em
                }));

        return res.json({
            sucesso: true,
            limite: Number(revendedor.limite_conexoes) || 0,
            utilizados: clientes.length,
            clientes
        });

    } catch (erro) {

        console.error(
            "[ERRO LISTAR CLIENTES REVENDEDOR]",
            erro
        );

        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno."
        });
    }
});


// ==========================================
// REVENDEDOR — EU
// ==========================================

app.get("/api/revendedor/eu", async (req, res) => {

    try {

        if (
            !req.session.usuario ||
            req.session.usuario.tipo !== "revendedor"
        ) {
            return res.status(403).json({
                sucesso: false,
                mensagem: "Acesso negado."
            });
        }

        const usuarios =
            await carregarUsuarios();

        const revendedor =
            usuarios.find(
                u =>
                    Number(u.id) ===
                    Number(req.session.usuario.id)
            );

        if (!revendedor) {
            return res.status(404).json({
                sucesso: false,
                mensagem: "Revendedor não encontrado."
            });
        }

        return res.json({
            sucesso: true,
            usuario: {
                id: revendedor.id,
                usuario: revendedor.usuario,
                status: revendedor.status,
                validade: revendedor.validade,
                limite_conexoes:
                    Number(revendedor.limite_conexoes) || 0
            }
        });

    } catch (erro) {

        console.error(
            "[ERRO REVENDEDOR EU]",
            erro
        );

        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno."
        });
    }
});

`;

    const marcadorAdminListagem = "// ADMIN — LISTAR USUÁRIOS";

    const posicaoAdminListagem =
        server.indexOf(marcadorAdminListagem);

    if (posicaoAdminListagem === -1) {
        throw new Error(
            "Não encontrei o marcador da listagem administrativa."
        );
    }

    server =
        server.slice(0, posicaoAdminListagem) +
        rotaRevendedor +
        "\n" +
        server.slice(posicaoAdminListagem);

    console.log("Rotas de revendedor adicionadas.");
}


// ======================================================
// 5. PROTEÇÃO / REDIRECIONAMENTO DO PAINEL
// ======================================================

const antigoAdminRota = `
app.get("/admin.html", async (req, res) => {
`;

if (!server.includes(antigoAdminRota)) {

    const simples = `
app.get("/admin.html", (req, res) => {

    if (!req.session.usuario) {
        return res.redirect("/login");
    }

    if (req.session.usuario.tipo === "revendedor") {
        return res.sendFile(
            path.join(__dirname, "public", "revendedor.html")
        );
    }

    if (req.session.usuario.tipo !== "admin") {
        return res.status(403).send("Acesso negado.");
    }

    res.sendFile(
        path.join(__dirname, "public", "admin.html")
    );
});

`;

    const marcadorProtecao = `
// ==========================================
// PROTEÇÃO DAS PÁGINAS
// ==========================================
`;

    if (server.includes(marcadorProtecao) &&
        !server.includes('path.join(__dirname, "public", "revendedor.html")')) {

        server = server.replace(
            marcadorProtecao,
            simples + marcadorProtecao
        );

        console.log("Rota do painel de revendedor adicionada.");
    }
}


// ======================================================
// ======================================================
// ======================================================
// 6. ADMIN HTML — BOTÕES
// ======================================================

let admin = fs.readFileSync(adminPath, "utf8");

const marcadorCriarUsuario = '<h2>Criar novo usuário</h2>';

const ferramentas = `
    <div class="card">

        <h2>Ferramentas administrativas</h2>

        <div class="card-desc">
            Crie testes e contas de revendedores.
        </div>

        <div
            style="
                display:grid;
                grid-template-columns:repeat(2,1fr);
                gap:15px;
            "
        >

            <button
                type="button"
                class="btn-principal"
                onclick="abrirCriarTeste()"
                style="padding:20px;"
            >
                🧪 CRIAR TESTE
            </button>

            <button
                type="button"
                class="btn-principal"
                onclick="abrirCriarRevendedor()"
                style="
                    padding:20px;
                    background:linear-gradient(135deg,#9333ea,#6d28d9);
                "
            >
                👑 CRIAR REVENDEDOR
            </button>

        </div>

    </div>
`;

if (!admin.includes(marcadorCriarUsuario)) {
    throw new Error("Não encontrei o texto Criar novo usuário no admin.html.");
}

const posTitulo = admin.indexOf(marcadorCriarUsuario);

const posCard = admin.lastIndexOf('<div class="card">', posTitulo);

if (posCard === -1) {
    throw new Error("Não encontrei o início do card Criar novo usuário.");
}

admin =
    admin.slice(0, posCard) +
    ferramentas +
    "\n" +
    admin.slice(posCard);

console.log("Botões do administrador adicionados.");


// ======================================================
// 7. MODAIS DO ADMIN
// ======================================================

// 7. MODAIS DO ADMIN
// ======================================================

// 7. MODAIS DO ADMIN
// ======================================================

if (!admin.includes("modalCriarRevendedor")) {

    const modais = `

<!-- MODAL CRIAR TESTE -->

<div id="modalCriarTeste" class="modal-fundo">

    <div class="modal">

        <div class="modal-topo">
            <h2>Criar teste</h2>

            <button
                class="fechar"
                onclick="fecharCriarTeste()"
            >×</button>
        </div>

        <div class="modal-info">
            Crie um acesso temporário para teste.
        </div>

        <div class="campo">
            <label>Usuário</label>
            <input id="testeUsuario" autocomplete="off">
        </div>

        <div class="campo">
            <label>Senha</label>
            <input id="testeSenha" type="password">
        </div>

        <div class="campo">
            <label>Dias de acesso</label>
            <input id="testeDias" type="number" min="1" value="1">
        </div>

        <div class="modal-acoes">

            <button
                class="btn-cancelar"
                onclick="fecharCriarTeste()"
            >CANCELAR</button>

            <button
                class="btn-salvar"
                onclick="criarTeste()"
            >CRIAR TESTE</button>

        </div>

    </div>

</div>


<!-- MODAL CRIAR REVENDEDOR -->

<div id="modalCriarRevendedor" class="modal-fundo">

    <div class="modal">

        <div class="modal-topo">
            <h2>Criar revendedor</h2>

            <button
                class="fechar"
                onclick="fecharCriarRevendedor()"
            >×</button>
        </div>

        <div class="modal-info">
            O revendedor terá um painel próprio para administrar seus clientes.
        </div>

        <div class="campo">
            <label>Usuário</label>
            <input id="revendedorUsuario" autocomplete="off">
        </div>

        <div class="campo">
            <label>Senha</label>
            <input id="revendedorSenha" type="password">
        </div>

        <div class="campo">
            <label>Dias de acesso</label>
            <input id="revendedorDias" type="number" min="1" value="30">
        </div>

        <div class="campo">
            <label>Limite de clientes</label>
            <input id="revendedorLimite" type="number" min="1" value="10">
        </div>

        <div class="modal-acoes">

            <button
                class="btn-cancelar"
                onclick="fecharCriarRevendedor()"
            >CANCELAR</button>

            <button
                class="btn-salvar"
                onclick="criarRevendedor()"
            >CRIAR REVENDEDOR</button>

        </div>

    </div>

</div>

`;

    const marcadorScript = "<script>";

    if (!admin.includes(marcadorScript)) {
        throw new Error("Não encontrei o script do admin.html.");
    }

    admin = admin.replace(
        marcadorScript,
        modais + "\n" + marcadorScript
    );

    console.log("Modais adicionados.");
}


// ======================================================
// 8. JAVASCRIPT DOS BOTÕES
// ======================================================

if (!admin.includes("async function criarRevendedor()")) {

    const js = `

function abrirCriarTeste() {
    document
        .getElementById("modalCriarTeste")
        .classList.add("aberto");
}

function fecharCriarTeste() {
    document
        .getElementById("modalCriarTeste")
        .classList.remove("aberto");
}

function abrirCriarRevendedor() {
    document
        .getElementById("modalCriarRevendedor")
        .classList.add("aberto");
}

function fecharCriarRevendedor() {
    document
        .getElementById("modalCriarRevendedor")
        .classList.remove("aberto");
}

async function criarTeste() {

    const usuario =
        document.getElementById("testeUsuario").value.trim();

    const senha =
        document.getElementById("testeSenha").value;

    const dias =
        Number(document.getElementById("testeDias").value);

    if (
        !usuario ||
        !senha ||
        !Number.isInteger(dias) ||
        dias < 1
    ) {
        mostrarMensagem(
            "Preencha os dados do teste corretamente.",
            false
        );
        return;
    }

    try {

        const resposta = await fetch(
            "/api/admin/usuarios",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "same-origin",
                body: JSON.stringify({
                    usuario,
                    senha,
                    dias,
                    tipo: "teste"
                })
            }
        );

        const dados = await resposta.json();

        mostrarMensagem(
            dados.mensagem || "Operação concluída.",
            dados.sucesso
        );

        if (dados.sucesso) {

            document.getElementById("testeUsuario").value = "";
            document.getElementById("testeSenha").value = "";
            document.getElementById("testeDias").value = "1";

            fecharCriarTeste();
            carregarUsuarios();
        }

    } catch (erro) {

        console.error(erro);

        mostrarMensagem(
            "Erro de comunicação com o servidor.",
            false
        );
    }
}

async function criarRevendedor() {

    const usuario =
        document
            .getElementById("revendedorUsuario")
            .value
            .trim();

    const senha =
        document
            .getElementById("revendedorSenha")
            .value;

    const dias =
        Number(
            document
                .getElementById("revendedorDias")
                .value
        );

    const limite =
        Number(
            document
                .getElementById("revendedorLimite")
                .value
        );

    if (
        !usuario ||
        !senha ||
        !Number.isInteger(dias) ||
        dias < 1 ||
        !Number.isInteger(limite) ||
        limite < 1
    ) {
        mostrarMensagem(
            "Preencha todos os dados do revendedor corretamente.",
            false
        );
        return;
    }

    try {

        const resposta = await fetch(
            "/api/admin/revendedores",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "same-origin",
                body: JSON.stringify({
                    usuario,
                    senha,
                    dias,
                    limite_conexoes: limite
                })
            }
        );

        const dados = await resposta.json();

        mostrarMensagem(
            dados.mensagem || "Operação concluída.",
            dados.sucesso
        );

        if (dados.sucesso) {

            document.getElementById("revendedorUsuario").value = "";
            document.getElementById("revendedorSenha").value = "";
            document.getElementById("revendedorDias").value = "30";
            document.getElementById("revendedorLimite").value = "10";

            fecharCriarRevendedor();
            carregarUsuarios();
        }

    } catch (erro) {

        console.error(erro);

        mostrarMensagem(
            "Erro de comunicação com o servidor.",
            false
        );
    }
}

`;

    const marcadorCarregar =
        "/* ==========================================\n   CARREGAR USUARIOS";

    if (!admin.includes(marcadorCarregar)) {
        throw new Error("Não encontrei o ponto correto do JavaScript do admin.");
    }

    admin = admin.replace(
        marcadorCarregar,
        js + "\n" + marcadorCarregar
    );

    console.log("JavaScript dos novos botões adicionado.");
}


// ======================================================
// 9. ENVIAR TIPO NO FORMULÁRIO NORMAL
// ======================================================

const antigoBody = `
                body: JSON.stringify({
                    usuario,
                    senha,
                    dias
                })
`;

const novoBody = `
                body: JSON.stringify({
                    usuario,
                    senha,
                    dias,
                    tipo: "usuario"
                })
`;

if (admin.includes(antigoBody)) {
    admin = admin.replace(
        antigoBody,
        novoBody
    );

    console.log("Criação normal explicitamente marcada como usuario.");
}


// ======================================================
// 10. PAINEL DO REVENDEDOR
// ======================================================

const resellerHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>Painel Revendedor - LUKAFILMES</title>

<style>

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    min-height: 100vh;
    padding: 25px;
    font-family: Arial, Helvetica, sans-serif;
    background:
        radial-gradient(circle at top left, rgba(229,9,20,.16), transparent 35%),
        radial-gradient(circle at bottom right, rgba(120,0,255,.10), transparent 35%),
        #070707;
    color: #fff;
}

.container {
    width: min(1250px, 100%);
    margin: auto;
}

.topo {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 25px;
}

.logo {
    color: #fff;
    text-decoration: none;
    font-size: 28px;
    font-weight: 900;
}

.logo span {
    color: #e50914;
}

.subtitulo {
    color: #888;
    margin-top: 6px;
    font-size: 14px;
}

button {
    font-family: inherit;
}

.btn-sair {
    border: 1px solid #333;
    background: #151515;
    color: #fff;
    padding: 11px 20px;
    border-radius: 10px;
    cursor: pointer;
    font-weight: bold;
}

.btn-sair:hover {
    background: #e50914;
}

.dashboard {
    display: grid;
    grid-template-columns: repeat(3,1fr);
    gap: 15px;
    margin-bottom: 20px;
}

.card {
    background: rgba(18,18,18,.92);
    border: 1px solid #292929;
    border-radius: 18px;
    padding: 25px;
    margin-bottom: 22px;
}

.numero {
    font-size: 30px;
    font-weight: 900;
    margin-top: 8px;
}

.label {
    color: #888;
    font-size: 12px;
}

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 140px auto;
    gap: 10px;
    align-items: end;
}

.campo label {
    display: block;
    color: #aaa;
    font-size: 12px;
    margin-bottom: 5px;
}

input {
    width: 100%;
    padding: 13px;
    border-radius: 10px;
    border: 1px solid #333;
    background: #101010;
    color: white;
}

.btn {
    border: 0;
    background: linear-gradient(135deg,#9333ea,#6d28d9);
    color: white;
    padding: 13px 18px;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 800;
}

.tabela-wrapper {
    width: 100%;
    overflow-x: auto;
}

table {
    width: 100%;
    min-width: 700px;
    border-collapse: collapse;
}

th, td {
    padding: 13px 10px;
    text-align: left;
    border-bottom: 1px solid #222;
}

th {
    color: #777;
    font-size: 12px;
}

.badge {
    display: inline-flex;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: bold;
}

.ativo {
    background: rgba(0,210,106,.12);
    color: #00d26a;
}

.suspenso {
    background: rgba(229,9,20,.12);
    color: #ff555f;
}

.mensagem {
    display: none;
    padding: 12px;
    border-radius: 10px;
    margin-bottom: 15px;
}

@media(max-width:900px) {

    .dashboard {
        grid-template-columns: 1fr;
    }

    .form-grid {
        grid-template-columns: 1fr;
    }

    .topo {
        flex-direction: column;
        align-items: flex-start;
    }

    .btn-sair {
        width: 100%;
    }
}

</style>

</head>

<body>

<div class="container">

    <div class="topo">

        <div>
            <a href="/" class="logo">
                LUKA<span>FILMES</span>
            </a>

            <div class="subtitulo">
                Painel do revendedor
            </div>
        </div>

        <button
            class="btn-sair"
            onclick="sair()"
        >
            SAIR
        </button>

    </div>

    <div class="dashboard">

        <div class="card">
            <div class="label">CLIENTES</div>
            <div class="numero" id="clientesNumero">0 / 0</div>
        </div>

        <div class="card">
            <div class="label">CLIENTES ATIVOS</div>
            <div class="numero" id="clientesAtivos">0</div>
        </div>

        <div class="card">
            <div class="label">CLIENTES SUSPENSOS</div>
            <div class="numero" id="clientesSuspensos">0</div>
        </div>

    </div>

    <div class="card">

        <h2>Criar novo cliente</h2>

        <div id="mensagem" class="mensagem"></div>

        <form id="formCliente">

            <div class="form-grid">

                <div class="campo">
                    <label>Usuário</label>
                    <input id="clienteUsuario" required>
                </div>

                <div class="campo">
                    <label>Senha</label>
                    <input id="clienteSenha" type="password" required>
                </div>

                <div class="campo">
                    <label>Dias</label>
                    <input id="clienteDias" type="number" min="1" value="30" required>
                </div>

                <button class="btn" type="submit">
                    CRIAR CLIENTE
                </button>

            </div>

        </form>

    </div>

    <div class="card">

        <h2>Meus clientes</h2>

        <div class="tabela-wrapper">

            <table>

                <thead>

                    <tr>
                        <th>ID</th>
                        <th>USUÁRIO</th>
                        <th>STATUS</th>
                        <th>VALIDADE</th>
                    </tr>

                </thead>

                <tbody id="clientes">
                    <tr>
                        <td colspan="4">
                            Carregando...
                        </td>
                    </tr>
                </tbody>

            </table>

        </div>

    </div>

</div>

<script>

async function carregar() {

    try {

        const resposta =
            await fetch(
                "/api/revendedor/clientes",
                {
                    credentials: "same-origin"
                }
            );

        if (resposta.status === 403) {
            window.location.href = "/login";
            return;
        }

        const dados = await resposta.json();

        if (!dados.sucesso) {
            throw new Error(dados.mensagem || "Erro");
        }

        document.getElementById("clientesNumero")
            .textContent =
            dados.utilizados +
            " / " +
            dados.limite;

        const ativos =
            dados.clientes.filter(
                u => u.status === "ativo"
            ).length;

        const suspensos =
            dados.clientes.filter(
                u => u.status !== "ativo"
            ).length;

        document.getElementById("clientesAtivos")
            .textContent = ativos;

        document.getElementById("clientesSuspensos")
            .textContent = suspensos;

        const tbody =
            document.getElementById("clientes");

        if (!dados.clientes.length) {

            tbody.innerHTML = \`
                <tr>
                    <td colspan="4">
                        Nenhum cliente cadastrado.
                    </td>
                </tr>
            \`;

            return;
        }

        tbody.innerHTML =
            dados.clientes.map(cliente => {

                const status =
                    cliente.status === "ativo"
                        ? "ativo"
                        : "suspenso";

                return \`
                    <tr>
                        <td>\${cliente.id}</td>
                        <td>\${escapeHtml(cliente.usuario)}</td>
                        <td>
                            <span class="badge \${status}">
                                \${escapeHtml(cliente.status)}
                            </span>
                        </td>
                        <td>
                            \${cliente.validade
                                ? new Date(cliente.validade).toLocaleString("pt-BR")
                                : "—"}
                        </td>
                    </tr>
                \`;

            }).join("");

    } catch (erro) {

        console.error(erro);

        document.getElementById("clientes")
            .innerHTML = \`
                <tr>
                    <td colspan="4">
                        Erro ao carregar clientes.
                    </td>
                </tr>
            \`;
    }
}


document
.getElementById("formCliente")
.addEventListener("submit", async function(event) {

    event.preventDefault();

    const usuario =
        document.getElementById("clienteUsuario")
            .value.trim();

    const senha =
        document.getElementById("clienteSenha")
            .value;

    const dias =
        Number(
            document.getElementById("clienteDias")
                .value
        );

    try {

        const resposta =
            await fetch(
                "/api/revendedor/clientes",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "same-origin",
                    body: JSON.stringify({
                        usuario,
                        senha,
                        dias
                    })
                }
            );

        const dados =
            await resposta.json();

        mostrarMensagem(
            dados.mensagem,
            dados.sucesso
        );

        if (dados.sucesso) {

            document.getElementById("clienteUsuario").value = "";
            document.getElementById("clienteSenha").value = "";
            document.getElementById("clienteDias").value = "30";

            carregar();
        }

    } catch (erro) {

        mostrarMensagem(
            "Erro de comunicação com o servidor.",
            false
        );
    }

});


function mostrarMensagem(texto, sucesso) {

    const el =
        document.getElementById("mensagem");

    el.textContent = texto;
    el.style.display = "block";

    el.style.background =
        sucesso
            ? "rgba(0,210,106,.15)"
            : "rgba(229,9,20,.15)";

    el.style.color =
        sucesso
            ? "#00d26a"
            : "#ff5b64";
}


async function sair() {

    await fetch(
        "/logout",
        {
            credentials: "same-origin"
        }
    );

    window.location.href = "/login";
}


function escapeHtml(valor) {

    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


carregar();

</script>

</body>
</html>
`;

fs.writeFileSync(
    resellerPath,
    resellerHtml,
    "utf8"
);

console.log("Painel revendedor criado.");


// ======================================================
// 11. GRAVAR
// ======================================================

fs.writeFileSync(
    serverPath,
    server,
    "utf8"
);

fs.writeFileSync(
    adminPath,
    admin,
    "utf8"
);

console.log("");
console.log("==========================================");
console.log(" ALTERAÇÕES APLICADAS");
console.log("==========================================");
console.log("Banco: revendedor_id");
console.log("Servidor: revendedores + clientes");
console.log("Admin: criar teste + criar revendedor");
console.log("Painel: public/revendedor.html");
console.log("Netlify TOML: NÃO ALTERADO");
console.log("Netlify Function wrapper: NÃO ALTERADO");
console.log("==========================================");
