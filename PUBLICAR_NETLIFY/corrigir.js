const fs=require('fs');
const p='js/script.js';
let l=fs.readFileSync(p,'utf8').split(/\r?\n/);
fs.writeFileSync(p,l.join('\n'),'utf8');
console.log('CORRIGIDO');
