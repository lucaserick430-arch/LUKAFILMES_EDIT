const fs=require('fs');
const p='js/script.js';
let s=fs.readFileSync(p,'utf8');
const inicio=s.indexOf('// FILMES POR GÊNERO');
const fim=s.indexOf('// RENDERIZAR CATEGORIA');
if(inicio===-1||fim===-1)throw new Error('Bloco de genero nao encontrado');
const novo=String.raw`// FILMES POR GÊNERO
// ======================================================

const generosDistribuidos = new Set();

function renderizarPorGenero(categoria,genero) {

    const filmes = filmesCatalogo.filter(filme => {
        if (!Array.isArray(filme.generos) || !filme.generos.includes(genero)) return false;

        const id = String(filme.id || filme.tmdb_id || filme.titulo || '').trim().toLowerCase();
        if (!id || generosDistribuidos.has(id)) return false;

        generosDistribuidos.add(id);
        return true;
    }).slice(0,20);

    renderizarCategoria(categoria,filmes);
}

`;
s=s.substring(0,inicio)+novo+s.substring(fim);
fs.writeFileSync(p,s,'utf8');
console.log('CATEGORIAS CORRIGIDAS');
