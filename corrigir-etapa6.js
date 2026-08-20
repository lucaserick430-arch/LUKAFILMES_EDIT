const fs = require("fs");

const p = ".\\aplicar-revendedores.js";
let s = fs.readFileSync(p, "utf8");

const inicio = s.indexOf("// 6. ADMIN HTML — BOTÕES");
const fim = s.indexOf("// 7. MODAIS DO ADMIN");

if (inicio === -1 || fim === -1) {
    throw new Error("Não encontrei os limites da etapa 6.");
}

const etapaAtual = s.slice(inicio, fim);

const novaEtapa = `// ======================================================
// 6. ADMIN HTML — BOTÕES
// ======================================================

let admin = fs.readFileSync(adminPath, "utf8");

const marcadorCriarUsuario = '<h2>Criar novo usuário</h2>';

const ferramentas = \`
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
\`;

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
    "\\n" +
    admin.slice(posCard);

console.log("Botões do administrador adicionados.");


// ======================================================
// 7. MODAIS DO ADMIN
// ======================================================

`;

s =
    s.slice(0, inicio) +
    novaEtapa +
    s.slice(fim);

fs.writeFileSync(p, s, "utf8");

console.log("ETAPA 6 CORRIGIDA PARA LOCALIZAR O CARD PELO TÍTULO.");
