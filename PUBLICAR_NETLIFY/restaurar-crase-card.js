const fs = require("fs");

const p = ".\\aplicar-revendedores.js";
let s = fs.readFileSync(p, "utf8");

const inicio = s.indexOf("const marcadorCriarUsuario =");

if (inicio === -1) {
    throw new Error("Não encontrei marcadorCriarUsuario.");
}

const fim = s.indexOf("`;", inicio);

if (fim === -1) {
    throw new Error("Não encontrei fechamento do marcador.");
}

const novo = 'const marcadorCriarUsuario = `\n<div class="card">\n\n        <h2>Criar novo usuário</h2>\n`;';

s =
    s.slice(0, inicio) +
    novo +
    s.slice(fim + 2);

fs.writeFileSync(p, s, "utf8");

console.log("CRASE DO MARCADOR RESTAURADA.");
