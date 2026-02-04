import { salasAtivas } from "../Estados/EstadoGlobal.js";
import { Sala } from "../Entidades/Salas.js";
import * as crypto from "crypto"; 

    /*
    SERVIDOR DEVE CRIAR UMA PARTIDA ASSIM QUE O BOTÃO DE PROCURAR
    PARTIDA FOR PRESSIONADO NO FRONTEND -> O EMIT VEM DE LÁ

    ELE GERA UM ID UNICO DA PARTIDA E PROCURA POR UMA PARTIDA MULTIPLAYER
    FAZ UMA LISTA DE 5 PALAVRAS
    */
    export const criarPartidaMultiplayer = ({nomeUsuario,privacidade,quantidadeRodadas,jogador}) => {
            
        const nomeDaSala = `Sala de ${nomeUsuario}`;

        if (privacidade === 'fechada') {

            const idSala = crypto.randomUUID();

            const dadosSala = new Sala(
                {
                    id: idSala,
                    nome: nomeDaSala,
                    jogadores: [jogador],
                    status: 'aguardando_jogadores',
                    rodadas: quantidadeRodadas,
                    chaveSalaPrivada: chave,
                }
            );

            dadosSala.gerarChaveSalaPrivada();

            salasAtivas.set(idSala,dadosSala);
            jogador.enviar('receber_dados_multiplayer',dadosSala);

            } else {

            const idSala = crypto.randomUUID();

            const dadosSala = new Sala(
                {
                    id: idSala,
                    nome: nomeDaSala,
                    jogadores: [jogador],
                    status: 'aguardando_jogadores',
                    rodadas: rodadas
                }
            );

            salasAtivas.set(idSala,dadosSala);
            jogador.enviar('receber_dados_multiplayer',dadosSala);

            }
        }


   /* export const entrarSalaMultiplayer = ({nomeDaSala,chave}) => {
            
            const dadosSala = getDadosSala(nomeDaSala);

            if(chave && chave === dadosSala.chave){
                socket.join(nomeDaSala);
                dadosSala.quantidadeJogadores++;

                return 'Você entrou na sala fechada';                
            }else if(!chave){
                socket.join(nomeDaSala);
                dadosSala.quantidadeJogadores++;

                return 'Você entrou na sala aberta';
            }

            return 'Não foi possível entrar na sala, tente novamente';
        });


        io.on('sairSalaMultiplayer', (nomeDaSala, nomeJogador) => {
            socket.leave(nomeDaSala);
            socket.to(nomeDaSala).emit('jogadorDesconectado',`Jogador ${nomeJogador} se desconectou`);

            const dadosSala = getDadosSala(nomeDaSala);

            if(dadosSala.quantidadeJogadores <= 0){
                deleteDadosSala(nomeDaSala);
            }else{
                dadosSala.quantidadeJogadores--;
            }

            return 'Você se desconectou da sala';
        });


        io.on('verificarPalavraMultiplayer', (palavraJogador, nomeJogador, rodada, tempo) => {
            const dadosSala = getDadosSala(nomeDaSala);
            const tentativa = palavraJogador.toUpperCase();
            const alvo = dadosSala.palavraEscolhida[rodada-1].toUpperCase();

            if(
                rodada === dadosSala.rodada[rodada-1] && 
                tentativa === alvo
            ){
                dadosSala.vencedor.nomeJogador = nomeJogador;
                dadosSala.vencedor.rodada = rodada;
                dadosSala.vencedor.tempo = tempo;

                return `Jogador ${nomeJogador} venceu a rodada`;
            }else{
                verificarPalavraOrdemEQuantidadeAcertos(tentativa,alvo);
            }

        });


        io.on('iniciarPartidaMultiplayer', (nomeDaSala, nomeJogador) => {
            const dadosSala = getDadosSala(nomeDaSala);

            if(dadosSala.dono !== nomeJogador){
                return 'Apenas o dono pode iniciar a partida';
            }

            if(dadosSala.quantidadeJogadores > 1){
                dadosSala.status = 'em progresso';

                //Haver contagem do tempo.
                let tempo = 0;

                socket.to(nomeDaSala).emit
            }
        });
        */
