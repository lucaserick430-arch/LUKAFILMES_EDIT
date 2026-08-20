const fs = require("fs");

const p = "aplicar-revendedores.js";

let s = fs.readFileSync(p, "utf8");

const antigo = `if (!server.includes("revendedor_id")) {
    throw new Error("Não encontrei ponto seguro para inserir revendedor_id.");
}`;

const novo = `if (!server.includes(antigoInsert)) {
    throw new Error("Não encontrei o bloco INSERT original dos usuários.");
}`;

if (!s.includes(antigo)) {
    throw new Error("Bloco de verificação antigo não encontrado.");
}

s = s.replace(antigo, novo);

fs.writeFileSync(p, s, "utf8");

console.log("VERIFICACAO CORRIGIDA.");
