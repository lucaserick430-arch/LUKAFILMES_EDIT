const { getStore } = require("@netlify/blobs");

async function teste() {
    try {
        const siteID = process.env.NETLIFY_SITE_ID;
        const token = process.env.NETLIFY_AUTH_TOKEN;

        console.log("SITE ID:", !!siteID);
        console.log("TOKEN:", !!token);

        const store = getStore({
            name: "lukafilmes",
            siteID,
            token
        });

        await store.set("teste.txt", "TESTE LUKAFILMES");

        const valor = await store.get("teste.txt", {
            type: "text"
        });

        console.log("LEITURA:", valor);
    } catch (erro) {
        console.error("ERRO BLOBS:", erro.message);
        process.exit(1);
    }
}

teste();
