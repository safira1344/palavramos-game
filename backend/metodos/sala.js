const { obterPalavraAleatoria } = require('./palavras');
const { transmitirParaSala } = require('./comunicacao');
const Sala = require('../entidades/Sala');

let proximoIdSala = 1;

function criarSala(clientes, salas, idDono, nomeDono, config) {
    const sala = new Sala(
        proximoIdSala++,
        idDono,
        nomeDono,
        config.maxJogadores || 2,
        config.limiteTempo || 300,
        config.ehPrivada || false,
        config.senha || null
    );
    salas.set(sala.id, sala);
    return sala;
}

function iniciarJogo(clientes, salas, idSala) {
    const sala = salas.get(idSala);
    if (!sala || sala.estado !== 'aguardando') return;

    const palavra = obterPalavraAleatoria();
    sala.inicializar(palavra);

    transmitirParaSala(clientes, salas)(idSala, 'jogo_iniciado', {
        idSala,
        limiteTempo: sala.limiteTempo,
        jogadores: sala.jogadores.map(j => j.nome)
    });

    // Temporizador
    if (sala.limiteTempo > 0) {
        setTimeout(() => {
            finalizarJogo(clientes, salas, idSala, 'tempo_esgotado');
        }, sala.limiteTempo * 1000);
    }
}

function finalizarJogo(clientes, salas, idSala, motivo) {
    const sala = salas.get(idSala);
    if (!sala || sala.estado !== 'jogando') return;

    sala.estado = 'finalizado';

    const resultados = sala.jogadores.map(jogador => ({
        nome: jogador.nome,
        venceu: sala.dadosJogo[jogador.id]?.venceu || false,
        tentativas: sala.dadosJogo[jogador.id]?.tentativas.length || 0
    }));

    transmitirParaSala(clientes, salas)(idSala, 'jogo_finalizado', {
        motivo,
        palavra: sala.palavra,
        resultados
    });

    console.log(`Sala ${idSala} finalizada. Motivo: ${motivo}`);

    // Resetar sala para quando for jogar novamente
    setTimeout(() => {
        sala.resetar();
        transmitirParaSala(clientes, salas)(idSala, 'sala_resetada', {});
    }, 5000);
}

module.exports = {
    criarSala,
    iniciarJogo,
    finalizarJogo
};
