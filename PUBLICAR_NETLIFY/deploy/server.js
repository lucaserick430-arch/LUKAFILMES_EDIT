const http = require("http");
const fs = require("fs");
const path = require("path");
const api = require("./netlify/functions/api.js");

const PORT = 3000;
const ROOT = __dirname;

const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".mp4": "video/mp4",
    ".m4a": "audio/mp4",
    ".mp3": "audio/mpeg"
};

function arquivoEstatico(req, res) {
    let urlPath = decodeURIComponent(req.url.split("?")[0]);

    if (urlPath === "/") {
        urlPath = "/index.html";
    }

    const arquivo = path.normalize(
        path.join(ROOT, urlPath)
    );

    if (!arquivo.startsWith(ROOT)) {
        res.writeHead(403);
        res.end("Acesso negado");
        return;
    }

    fs.readFile(arquivo, (erro, dados) => {
        if (erro) {
            res.writeHead(404, {
                "Content-Type": "text/plain; charset=utf-8"
            });
            res.end("Arquivo não encontrado");
            return;
        }

        const extensao = path.extname(arquivo).toLowerCase();

        res.writeHead(200, {
            "Content-Type":
                mimeTypes[extensao] ||
                "application/octet-stream"
        });

        res.end(dados);
    });
}

const server = http.createServer(async (req, res) => {
    try {
        const url = new URL(
            req.url,
            `http://${req.headers.host}`
        );

        console.log(
            `[HTTP] ${req.method} ${url.pathname}${url.search}`
        );

        if (url.pathname.startsWith("/api/")) {
            const resultado = await api.handler({
                httpMethod: req.method,
                path: url.pathname,
                rawPath: url.pathname,
                queryStringParameters:
                    Object.fromEntries(url.searchParams.entries()),
                headers: req.headers,
                body: null,
                isBase64Encoded: false
            });

            const headers = resultado.headers || {};

            res.writeHead(
                resultado.statusCode || 200,
                headers
            );

            res.end(resultado.body || "");
            return;
        }

        arquivoEstatico(req, res);

    } catch (erro) {
        console.error("[SERVER] ERRO:", erro);

        res.writeHead(500, {
            "Content-Type": "application/json; charset=utf-8"
        });

        res.end(
            JSON.stringify({
                sucesso: false,
                erro: erro.message
            })
        );
    }
});

server.listen(PORT, () => {
    console.log("");
    console.log("====================================");
    console.log("       LUKAFILMES ONLINE LOCAL");
    console.log("====================================");
    console.log("");
    console.log(`Site: http://localhost:${PORT}`);
    console.log(`API:  http://localhost:${PORT}/api`);
    console.log("");
    console.log("Servidor iniciado.");
    console.log("Pressione CTRL+C para parar.");
    console.log("");
});