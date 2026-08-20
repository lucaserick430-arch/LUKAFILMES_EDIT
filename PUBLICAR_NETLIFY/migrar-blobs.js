const { getStore } = require("@netlify/blobs");
const fs = require("fs");

async function main() {

    const usuarios = JSON.parse(
        fs.readFileSync("./usuarios-netlify.json", "utf8")
    );

    const store = getStore("lukafilmes-usuarios");

    await store.setJSON(
        "usuarios",
        usuarios
    );

    console.log(
        "USUÁRIOS ENVIADOS PARA NETLIFY BLOBS:",
        usuarios.length
    );

    console.log(
        usuarios.map(u => ({
            id: u.id,
            usuario: u.usuario,
            status: u.status,
            tipo: u.tipo,
            validade: u.validade
        }))
    );
}

main().catch(erro => {
    console.error("ERRO AO MIGRAR USUÁRIOS:", erro);
    process.exit(1);
});
