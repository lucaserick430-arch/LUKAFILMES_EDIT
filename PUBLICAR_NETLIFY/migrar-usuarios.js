const Database = require("better-sqlite3");
const fs = require("fs");

const db = new Database("./banco.db", { readonly: true });

const usuarios = db.prepare(`
    SELECT
        id,
        usuario,
        senha,
        status,
        tipo,
        validade,
        criado_em
    FROM usuarios
    ORDER BY id ASC
`).all();

db.close();

fs.writeFileSync(
    "./usuarios-netlify.json",
    JSON.stringify(usuarios, null, 2),
    "utf8"
);

console.log("USUÁRIOS EXPORTADOS:", usuarios.length);
console.log(JSON.stringify(
    usuarios.map(u => ({
        id: u.id,
        usuario: u.usuario,
        status: u.status,
        tipo: u.tipo,
        validade: u.validade,
        criado_em: u.criado_em
    })),
    null,
    2
));
