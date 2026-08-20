const fs = require('fs');
const p = 'server.js';
let s = fs.readFileSync(p, 'utf8');
const inicio = s.indexOf('app.get(\`/api/catalogo\`');
console.log(inicio);
