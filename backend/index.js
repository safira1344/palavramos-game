import net from 'node:net';
import { rotearEventos } from './Roteador/RoteadorEventos.js';
import { clientesConectados, salasAtivas } from './Estados/EstadoGlobal.js';
import { Jogador } from './Entidades/Jogadores.js';

    const porta = 3100;
    const enderecoIp = '127.0.0.1';

    const socketServer = net.createServer((socket) => {
    });

    socketServer.on('connection', (socket) => {
    
        console.log(`${socket.remoteAddress} está ouvindo eventos do servidor na porta ${socket.remotePort}`);

        socket.setEncoding('utf-8');
        
        const idJogador = crypto.randomUUID();

        const jogador = new Jogador(
            {
            id: idJogador,
            socket: socket,
            nome: `Convidado-${idJogador.substring(0,4)}`,
            }
        );

        clientesConectados.set(idJogador,jogador);

        socket.on('data', (dados) => {
            const dadosBrutos = dados.toString().trim();

            if(!dadosBrutos) return;

            const dadosJson = JSON.parse(dadosBrutos); 

            const roteamentoDados = 
            {
                evento: dadosJson.evento,
                dados: dadosJson.dados
            };

            rotearEventos(roteamentoDados,jogador);

        });

        socket.on('end', () => {
            clientesConectados.delete(idJogador);
        });

        //Também colocar depois um try catch na conexão
        //Posteriormente cuidar de timeout de jogador para reconecta-lo na sala correta.
    });

    socketServer.listen(porta, enderecoIp,() => {
        console.log(`Servidor escutando socket em:${enderecoIp}:${porta} `);
    });
