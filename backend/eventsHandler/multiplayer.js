    import { readFile } from 'fs/promises';
    import { setDadosSala, getDadosSala } from './gerenciamento.salas.js';


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

            if (privacidade === 'privada') {

                const chave = gerarChaveSalaPrivada();

                setDadosSala(nomeDaSala, {
                    palavras: palavrasEscolhidas,
                    status: 'aberta',
                    quantidadeJogadores: 1,
                    rodada: rodadas,
                    chaveSalaPrivada: chave,
                    nomeJogadores: [nomeUsuario],
                    rankingSala: []
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
                    rankingSala: []
                });

                return {
                    nomeDaSala: nomeDaSala,
                    palavrasEscolhidas: palavrasEscolhidas,
                    status: 'aberta'
                }

            }
        });


        io.on('entrarSalaMultiplayer', (nomeDaSala) => {
            socket.join(nomeDaSala);
        });


        io.on('sairSalaMultiplayer', (nomeDaSala) => {
            socket.leave(nomeDaSala);
        });


        io.on('verificarPalavraMultiplayer', (palavraJogador) => {

        });
    }