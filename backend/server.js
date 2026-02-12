const net = require('net');
const { PORTA, HOST } = require('./config');
const { Cliente } = require('./entidades');
const { palavras, comunicacao } = require('./metodos');
const { tratarComando } = require('./eventos');

// Maps pra clientes conectados e salas ativas
const clientes = new Map();
const salas = new Map();

const totalPalavras = palavras.inicializar();

const servidor = net.createServer((socket) => {
    const idSocket = `${socket.remoteAddress}:${socket.remotePort}`;

    const cliente = new Cliente(socket, idSocket);
    clientes.set(idSocket, cliente);

    console.log(`Cliente conectado: ${idSocket}`);
    comunicacao.enviarParaCliente(socket, 'conectado', {
        mensagem: 'Bem-vindo ao Palavramos!'
    });

    let buffer = '';

    socket.on('data', (data) => {
        buffer += data.toString();

        let indiceNovaLinha;
        while ((indiceNovaLinha = buffer.indexOf('\n')) !== -1) {
            const linha = buffer.substring(0, indiceNovaLinha);
            buffer = buffer.substring(indiceNovaLinha + 1);

            try {
                const mensagem = JSON.parse(linha);
                tratarComando(clientes, salas, socket, idSocket, mensagem);
            } catch (erro) {
                console.error('Erro ao fazer o parsing da mensagem:', erro.message);
                comunicacao.enviarParaCliente(socket, 'erro', {
                    mensagem: 'Mensagem inválida'
                });
            }
        }
    });

    socket.on('end', () => {
        console.log(`Cliente desconectado: ${idSocket}`);

        const cliente = clientes.get(idSocket);
        if (cliente && cliente.idSala) {
            const sala = salas.get(cliente.idSala);
            if (sala) {
                sala.removerJogador(idSocket);

                comunicacao.transmitirParaSala(clientes, salas)(
                    sala.id,
                    'jogador_saiu',
                    {
                        nomeJogador: cliente.nome,
                        jogadores: sala.jogadores
                    }
                );

                if (sala.jogadores.length === 0 || sala.idDono === idSocket) {
                    salas.delete(sala.id);
                    console.log(`Sala ${sala.id} deletada`);
                }
            }
        }

        clientes.delete(idSocket);
    });

    socket.on('error', (erro) => {
        console.error(`Erro no socket ${idSocket}:`, erro.message);
    });
});

servidor.listen(PORTA, HOST, () => {
    console.log(`Palavramos rodando em ${HOST}:${PORTA}`);
    console.log(`${totalPalavras} palavras disponíveis`);
});
