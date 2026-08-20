const serverless = require("serverless-http");

const app = require("../../server_netlify");

exports.handler = serverless(app);
