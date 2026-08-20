const fs = require("fs");

const s = fs.readFileSync("aplicar-revendedores.js", "utf8");

const inicio = s.indexOf("const resellerHtml = `");
const fim = s.indexOf("fs.writeFileSync(", inicio);

if (inicio < 0 || fim < 0) {
    throw new Error("Não encontrei o bloco resellerHtml.");
}

const bloco = s.slice(inicio, fim);

const linhas = bloco.split(/\r?\n/);

linhas.forEach((linha, i) => {
    if (linha.includes("`")) {
        console.log(
            String(i + 1).padStart(4, " ") +
            " | " +
            linha
        );
    }
});
