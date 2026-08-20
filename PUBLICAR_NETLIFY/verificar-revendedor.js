const fs = require("fs");

const arquivo = "aplicar-revendedores.js";
const linhas = fs.readFileSync(arquivo, "utf8").split(/\r?\n/);

for (let i = 1400; i <= 1500 && i < linhas.length; i++) {
    console.log(String(i + 1).padStart(4, " ") + " | " + linhas[i]);
}
