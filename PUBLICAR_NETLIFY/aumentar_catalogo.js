const fs = require('fs');

const p = 'server.js';
const backup = 'server_backup_catalogo.js';

fs.copyFileSync(p, backup);

let s = fs.readFileSync(p, 'utf8');

const inicioApi = s.indexOf('/api/catalogo');
const inicio = s.lastIndexOf('app.get(', inicioApi);
const fim = s.indexOf('// ADMIN', inicio);

if (inicio < 0 || fim < 0) {
  throw new Error('BLOCO CATALGAO NAO ENCONTRADO');
}

const novo = `app.get('/api/catalogo', async (req, res) => {
    try {
        const paginas = [];

        for (let pagina = 1; pagina <= 5; pagina++) {
            const d = await tmdb('/movie/popular?language=pt-BR&page=' + pagina);
            paginas.push(...d(.results || []));
        }

        for (const ano of [2025, 2026]) {
            for (let pagina = 1; pagina <= 5; pagina++) {
                const d = await tmdb('/discover/movie?language=pt-BR&sort_by=popularity.desc&primary_release_year=' + ano + '&page=' + pagina + '&include_adult=false');
                paginas.push(...d.results || []);
            }
        }

        for (const genero of [28, 35, 27, 878, 10749]) {
            for (let pagina = 1; pagina <= 3; pagina++) {
                const d = await tmdb('/discover/movie?language=pt-BR&with_genres=' + genero + '&sort_by=popularity.desc&page=' + pagina + '&include_adult=false');
                paginas.push(...d.results || []);
            }
        }

        const mapa = new Map();

        for (const filme of paginas) {
            if (filme && filme.id && !mapa.has(filme.id)) {
                mapa.set(filme.id, filme);
            }
        }

        const filmes = Array.from(mapa.values()).map(converterFilme);

        return res.json({
            sucesso: true,
            total: filmes.length,
            filmes
        });


    } catch (erro) {
        console.error('[ERRO CATALOGO]', error);


        return res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível carregar o catálogo.'
        });
    }
});
`;

fs.writeFileSync(p, s.slice(0, inicio) + novo + s.slice(fim), 'utf8');

console.log('CATALOGO ATUALIZADO');
console.log('TAMANHO=' + fs.statSync(p).size);

