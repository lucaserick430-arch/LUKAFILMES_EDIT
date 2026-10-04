const serverless = require("serverless-http");

const app = require("../../server_render");

exports.handler = serverless(app);
