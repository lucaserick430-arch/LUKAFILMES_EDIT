const fs = require("fs");

const arquivo = "aplicar-revendedores.js";
let s = fs.readFileSync(arquivo, "utf8");

const inicio = s.indexOf("const resellerHtml = `");

if (inicio < 0) {
    throw new Error("Bloco resellerHtml não encontrado.");
}

const fim = s.indexOf("fs.writeFileSync(", inicio);

if (fim < 0) {
    throw new Error("Final do bloco resellerHtml não encontrado.");
}

let bloco = s.slice(inicio, fim);

// Crases internas dos templates JavaScript do painel.
// Elas precisam virar strings normais para não fechar resellerHtml.
bloco = bloco.replace(
    /tbody\.innerHTML = `([\s\S]*?)`;/,
    (m, conteudo) => {
        const seguro = conteudo
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\$\{/g, "\\${");

        return 'tbody.innerHTML = "' +
            seguro.replace(/\r?\n/g, "\\n") +
            '";';
    }
);

bloco = bloco.replace(
    /return `([\s\S]*?)`;/,
    (m, conteudo) => {
        const seguro = conteudo
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\$\{/g, "\\${");

        return 'return "' +
            seguro.replace(/\r?\n/g, "\\n") +
            '";';
    }
);

bloco = bloco.replace(
    /\.innerHTML = `([\s\S]*?)`;/,
    (m, conteudo) => {
        const seguro = conteudo
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\$\{/g, "\\${");

        return '.innerHTML = "' +
            seguro.replace(/\r?\n/g, "\\n") +
            '";';
    }
);

s = s.slice(0, inicio) + bloco + s.slice(fim);

fs.writeFileSync(arquivo, s, "utf8");

console.log("CORREÇÃO APLICADA.");
