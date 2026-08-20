const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");

const db = new Database("banco.db");

const usuario = "admin";
const senha = "LUKA123";

const senhaHash = bcrypt.hashSync(senha, 12);

try {
    db.prepare(`
        INSERT INTO usuarios
        (usuario, senha, status, tipo)
        VALUES (?, ?, 'ativo', 'admin')
    `).run(usuario, senhaHash);

    console.log("");
    console.log("================================");
    console.log(" ADMINISTRADOR CRIADO");
    console.log("================================");
    console.log("Usuário: admin");
    console.log("Senha: LUKA123");
    console.log("");

} catch (erro) {

    console.log("Erro:", erro.message);

}

db.close();