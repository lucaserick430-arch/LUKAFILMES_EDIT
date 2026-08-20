const fs = require("fs");

const p = "aplicar-revendedores.js";
let s = fs.readFileSync(p, "utf8");

const inicio = s.indexOf("const resellerHtml = `");
const fim = s.indexOf("fs.writeFileSync(", inicio);

if (inicio < 0 || fim < 0) {
    throw new Error("Bloco resellerHtml não encontrado.");
}

let bloco = s.slice(inicio, fim);

// Escapa somente as crases internas do JavaScript
// que estão dentro da string resellerHtml.
const linhas = bloco.split(/\r?\n/);

let dentro = false;

for (let i = 0; i < linhas.length; i++) {

    const linha = linhas[i];

    if (i === 0) {
        continue;
    }

    if (linha.trim() === "`;") {
        // Esta é a crase final do resellerHtml.
        continue;
    }

    if (
        linha.includes("tbody.innerHTML = `") ||
        linha.includes("return `") ||
        linha.includes(".innerHTML = `")
    ) {
        linhas[i] = linha.replace(/`/g, "\\`");
        continue;
    }

    if (
        linha.trim() === "`;"
    ) {
        linhas[i] = linha.replace(/`/g, "\\`");
    }
}

// Corrige especificamente as crases isoladas que fecham
// os templates internos.
for (let i = 1; i < linhas.length - 1; i++) {

    if (linhas[i].trim() === "`;" &&
        !(
            i === linhas.length - 1
        )
    ) {
        linhas[i] = linhas[i].replace(/`/g, "\\`");
    }
}

bloco = linhas.join("\n");

s = s.slice(0, inicio) + bloco + s.slice(fim);

fs.writeFileSync(p, s, "utf8");

console.log("Crases internas corrigidas.");
