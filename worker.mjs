import { httpServerHandler } from "cloudflare:node";
import { env as cfEnv } from "cloudflare:workers";

const app = require("./server_render.js");

app.locals.cloudflareEnv = cfEnv;
app.listen(3000);

const handler = httpServerHandler({
  port: 3000
});

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    /*
     * Todas as rotas passam primeiro pelo Express.
     * As páginas protegidas continuam respeitando sessão/autorização.
     */

    /*
     * APIs e demais rotas continuam no Express.
     */
    return handler.fetch(request, env, ctx);
  }
};
