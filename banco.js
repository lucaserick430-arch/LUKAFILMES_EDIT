
const Database = require("better-sqlite3");

const db = new Database("banco.db");

db.exec(`
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ativo',
    tipo TEXT NOT NULL DEFAULT 'usuario',
    validade DATETIME,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

try {
    db.exec(`
        ALTER TABLE usuarios ADD COLUMN validade DATETIME;
    `);
} catch (erro) {
    // A coluna já existe.
}

console.log("Banco de dados atualizado com sucesso!");

db.close();

