const fs = require("fs");

const p = "aplicar-revendedores.js";
let s = fs.readFileSync(p, "utf8");

const alvo = "</html>\n\\`;";

if (!s.includes(alvo)) {
    throw new Error("Fechamento incorreto do resellerHtml não encontrado.");
}

s = s.replace(
    alvo,
    "</html>\n`;"
);

fs.writeFileSync(p, s, "utf8");

console.log("FECHAMENTO DO resellerHtml CORRIGIDO.");
