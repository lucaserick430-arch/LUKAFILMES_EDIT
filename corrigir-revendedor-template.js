const fs = require("fs");

const arquivo = ".\\aplicar-revendedores.js";

let s = fs.readFileSync(arquivo, "utf8");

const inicio = s.indexOf("const resellerHtml = `");

if (inicio === -1) {
    throw new Error("Não encontrei const resellerHtml.");
}

const fim = s.indexOf("`;\n\nfs.writeFileSync(", inicio);

if (fim === -1) {
    throw new Error("Não encontrei o final de resellerHtml.");
}

let bloco = s.slice(inicio, fim);

/*
 * Escapa apenas as interpolações que pertencem
 * ao JavaScript do futuro revendedor.html.
 */

const correcoes = [
    ["${cliente.id}", "\\${cliente.id}"],
    ["${escapeHtml(cliente.usuario)}", "\\${escapeHtml(cliente.usuario)}"],
    ["${status}", "\\${status}"],
    ["${escapeHtml(cliente.status)}", "\\${escapeHtml(cliente.status)}"],
    ["${cliente.validade", "\\${cliente.validade"]
];

for (const [antigo, novo] of correcoes) {
    bloco = bloco.split(antigo).join(novo);
}

s =
    s.slice(0, inicio) +
    bloco +
    s.slice(fim);

fs.writeFileSync(arquivo, s, "utf8");

console.log("CORREÇÃO DO RESELLER HTML APLICADA.");
