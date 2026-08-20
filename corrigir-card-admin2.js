const fs = require("fs");

const p = ".\\aplicar-revendedores.js";
let s = fs.readFileSync(p, "utf8");

const inicio = s.indexOf("const marcadorCriarUsuario =");

if (inicio === -1) {
    throw new Error("Não encontrei marcadorCriarUsuario.");
}

const fim = s.indexOf("`;", inicio);

if (fim === -1) {
    throw new Error("Não encontrei fechamento do marcadorCriarUsuario.");
}

const blocoAtual = s.slice(inicio, fim + 2);

console.log("Marcador atual encontrado:");
console.log(blocoAtual.substring(0, 500));

const novoMarcador = `const marcadorCriarUsuario = \`
<div class="card">`;

s =
    s.slice(0, inicio) +
    novoMarcador +
    s.slice(fim + 2);

fs.writeFileSync(p, s, "utf8");

console.log("");
console.log("MARCADOR CRIAR USUARIO CORRIGIDO.");
