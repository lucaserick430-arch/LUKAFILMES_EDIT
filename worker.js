const { httpServerHandler } = require("cloudflare:node");

const app = require("./server_render.js");

module.exports = httpServerHandler({
  port: 3000
});
