import { httpServerHandler } from "cloudflare:node";

const app = require("./server_render.js");

app.listen(3000);

const handler = httpServerHandler({ port: 3000 });

export default {
    async fetch(request, env, ctx) {
        // Disponibiliza as variáveis/segredos do Cloudflare
        // para o código legado que usa process.env.
        const variaveis = [
            "TMDB_TOKEN",
            "XTREAM_DNS",
            "XTREAM_USERNAME",
            "XTREAM_PASSWORD",
            "SESSION_SECRET",
            "CLOUDFLARE_WORKERS",
            "NODE_ENV"
        ];

        for (const nome of variaveis) {
            if (env[nome] !== undefined) {
                process.env[nome] = String(env[nome]);
            }
        }

        return handler.fetch(request, env, ctx);
    }
};
