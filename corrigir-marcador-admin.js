const fs = require("fs");

const p = "./aplicar-revendedores.js";

let s = fs.readFileSync(p, "utf8");

const antigo = `    const marcadorAdminListagem = \`
// ==========================================
// ADMIN — LISTAR USUÁRIOS
// ==========================================
\`;

    if (!server.includes(marcadorAdminListagem)) {
        throw new Error("Não encontrei o marcador da listagem administrativa.");
    }

    server = server.replace(
        marcadorAdminListagem,
        rotaRevendedor + "\\n" + marcadorAdminListagem
    );

    console.log("Rotas de revendedor adicionadas.");
`;

const novo = `    const marcadorAdminListagem = "// ADMIN — LISTAR USUÁRIOS";

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
        "\\n" +
        server.slice(posicaoAdminListagem);

    console.log("Rotas de revendedor adicionadas.");
`;

if (!s.includes(antigo)) {
    throw new Error(
        "Bloco antigo do marcador administrativo não encontrado."
    );
}

s = s.replace(antigo, novo);

fs.writeFileSync(p, s, "utf8");

console.log("CORREÇÃO DO MARCADOR ADMIN APLICADA.");