import { httpServerHandler } from "cloudflare:node";

const app = require("./server_render.js");

app.listen(3000);

export default httpServerHandler({ port: 3000 });
