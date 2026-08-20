const fs = require("fs");

const p = "aplicar-revendedores.js";
let s = fs.readFileSync(p, "utf8");

const antigo = `if (!server.includes("revendedor_id)")
    throw new Error("Não encontrei ponto seguro para inserir revendedor_id.");`;

const novo = `if (!server.includes("revendedor_id")) {
    throw new Error("Não encontrei ponto seguro para inserir revendedor_id.");
}`;

if (!s.includes(antigo)) {
    throw new Error("Trecho exato não encontrado.");
}

s = s.replace(antigo, novo);

fs.writeFileSync(p, s, "utf8");

console.log("CORRIGIDO.");
