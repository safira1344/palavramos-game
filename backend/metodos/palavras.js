const fs = require('fs');
const path = require('path');

let PALAVRAS = [];

function carregarPalavras() {
    try {
        const conteudo = fs.readFileSync(path.join(__dirname, '..', 'bd.txt'), 'utf-8');
        const palavras = conteudo.split('\n')
            .map(p => p.trim().toUpperCase())
            .filter(p => p.length === 5);
        return palavras;
    } catch (erro) {
        console.error('Erro ao carregar bd.txt:', erro.message);
        return [];
    }
}

function obterPalavraAleatoria() {
    return PALAVRAS[Math.floor(Math.random() * PALAVRAS.length)];
}

function inicializar() {
    PALAVRAS = carregarPalavras();
    return PALAVRAS.length;
}

module.exports = {
    inicializar,
    obterPalavraAleatoria,
    getTotalPalavras: () => PALAVRAS.length
};
