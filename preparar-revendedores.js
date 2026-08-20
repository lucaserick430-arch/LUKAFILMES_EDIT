const Database = require("better-sqlite3");

const db = new Database("banco.db");

try {
    db.exec(`
        ALTER TABLE usuarios
        ADD COLUMN limite_conexoes INTEGER NOT NULL DEFAULT 0;
    `);

    db.exec(`
        ALTER TABLE usuarios
        ADD COLUMN conexoes_utilizadas INTEGER NOT NULL DEFAULT 0;
    `);

    console.log("Banco preparado para revendedores.");
} finally {
    db.close();
}
