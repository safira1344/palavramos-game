    import { readFile } from 'fs/promises';
    import { setDadosSala, getDadosSala, deleteDadosSala } from './gerenciamento.salas.js';


    async function gerarPalavrasAleatorias(quantidadeRodadas){

        const palavras = await readFile('../database/db.txt','utf-8');
        const linhas = palavras.split(/\r?\n/);
        let tamanhoAleatorio = Math.random() * linhas.length;;
    
        let palavrasEscolhidas = [];

        for(const i = 0; i <= quantidadeRodadas; i++){
            palavrasEscolhidas.push(linhas[tamanhoAleatorio-1]);
        }

        return {
            palavrasEscolhidas: palavrasEscolhidas,
            rodadas: quantidade
        }
    }

    
    function gerarChaveSalaPrivada(){
                
        let caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
        let resultado = '';
        
        for(let i =0; i < 6; i++){
            resultado += caracteres.charAt(Math.floor(Math.random()*caracteres.length));
        }

        return resultado;
    }


    function verificarPalavraOrdemEQuantidadeAcertos(palavraJogador, palavraCorreta){
        const tentativa = palavraJogador.toUpperCase().split('');
        const alvo = palavraCorreta.toUpperCase().split('');

        let acumuladorQuantidade = 0;
        let acumuladorOrdem = 0;

        //Calcula quantos estão na ordem certa
        for(let indiceTentativa = 0; indiceTentativa < alvo.length; indiceTentativa++){
            if(tentativa[indiceTentativa] === alvo[indiceTentativa]){
                acumuladorOrdem++;

                tentativa[indiceTentativa] = null;
                alvo[indiceTentativa] = null;
            }
        }

        //Calcula quantidade de acertos mas em posições incorretas
        for(let indiceTentativa = 0; indiceTentativa < alvo.length; indiceTentativa++){
            if(tentativa[indiceTentativa] !== null){
                for(let indiceAlvo = 0; indiceAlvo < alvo.length; indiceAlvo++){
                    if(alvo[indiceAlvo] !== null && tentativa[indiceTentativa] === alvo[indiceAlvo]){
                        acumuladorQuantidade++;
                        
                        alvo[indiceAlvo] = null;
                        break;
                    }
                }
            }
        }

        return `Existem ${acumuladorOrdem} letras na ordem correta e ${acumuladorQuantidade} estão certas mas no local errado`;

    }


    /*
    SERVIDOR DEVE CRIAR UMA PARTIDA ASSIM QUE O BOTÃO DE PROCURAR
    PARTIDA FOR PRESSIONADO NO FRONTEND -> O EMIT VEM DE LÁ

    ELE GERA UM ID UNICO DA PARTIDA E PROCURA POR UMA PARTIDA MULTIPLAYER
    FAZ UMA LISTA DE 5 PALAVRAS
    */
    export const gerenciarPartidaMultiplayer = async (socket, io) => {

        io.on('criarPartidaMultiplayer', (nomeUsuario, privacidade, quantidadeRodadas) => {

            const nomeDaSala = `Sala de ${nomeUsuario}`;
            const {palavrasEscolhidas, rodadas} = gerarPalavrasAleatorias(quantidadeRodadas);

            socket.join(nomeDaSala);

            if (privacidade === 'fechada') {

                const chave = gerarChaveSalaPrivada();

                setDadosSala(nomeDaSala, {

                    palavras: palavrasEscolhidas,
                    status: 'aberta',
                    quantidadeJogadores: 1,
                    rodada: rodadas,
                    chaveSalaPrivada: chave,
                    nomeJogadores: [nomeUsuario],
                    dono: nomeUsuario,
                    respostaJogadores:{
                        resposta:null,
                        tempo: null
                    },
                    rankingSala: [
                        {
                            nomeJogador:nomeUsuario,
                            quantidadePontos: 0
                        }
                    ],
                    vencedor: {
                        nomeJogador: null,
                        rodada: null,
                        tempo: null
                    }

                });

                return {
                    nomeDaSala: nomeDaSala,
                    palavrasEscolhidas: palavrasEscolhidas,
                    status: 'aberta',
                    chaveSalaPrivada:chave
                }

            } else {

                setDadosSala(nomeDaSala, {

                    palavras: palavrasEscolhidas,
                    status: 'aberta',
                    quantidadeJogadores: 1,
                    rodada: rodadas,
                    nomeJogadores: [nomeUsuario],
                    dono:nomeUsuario,
                    respostaJogadores:{
                        resposta: null,
                        tempo: null
                    },
                    rankingSala: [
                        {
                            nomeJogador:nomeUsuario,
                            quantidadePontos: 0
                        }
                    ],
                    vencedor: {
                        nomeJogador: null,
                        rodada: null,
                        tempo: null
                    }

                });

                return {
                    nomeDaSala: nomeDaSala,
                    palavrasEscolhidas: palavrasEscolhidas,
                    status: 'aberta'
                }

            }
        });


        io.on('entrarSalaMultiplayer', (nomeDaSala,chave) => {
            
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

            if(dadosSala.quantidade <= 0){
                deleteDadosSala(nomeDaSala);
            }else{
                dadosSala.quantidade--;
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
    }