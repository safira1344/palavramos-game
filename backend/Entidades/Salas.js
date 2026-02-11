import { readFileSync } from 'fs';

export class Sala {

    constructor({
        id,
        nome,
        status,
        rodadas,
        chaveSalaPrivada,
        privacidade = "publica",
        maxJogadores = 4,
    } = {}) {
        this.id = id;
        this.nome = nome;
        this.palavrasEscolhidas = this.gerarPalavrasAleatorias(rodadas);
        this.jogadores = [];
        this.status = status;
        this.rodadas = rodadas;
        this.chaveSalaPrivada = chaveSalaPrivada;
        this.privacidade = privacidade;
        this.maxJogadores = maxJogadores;
        this.respostaJogadores = [];
        this.rankingSala = [];
        this.vencedor = [];
        this.timer = null;
    }

    
    gerarChaveSalaPrivada(){
                
        let caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
        let resultado = '';
        
        for(let i =0; i < 6; i++){
            resultado += caracteres.charAt(Math.floor(Math.random()*caracteres.length));
        }

        this.chaveSalaPrivada = resultado;
    }


    //Ajustado para consistência de caminho e corrigida lógica do for que retornava undefined
    gerarPalavrasAleatorias(quantidadeRodadas) {
        const caminhoArquivo = join(__dirname, '..', 'Dados', 'db.txt');
        const palavras = readFileSync(caminhoArquivo, 'utf-8');
        const linhas = palavras.split(/\r?\n/).filter(linha => linha.trim());

        let palavrasEscolhidas = [];

        for (let i = 0; i < quantidadeRodadas; i++) {
            const indiceAleatorio = Math.floor(Math.random() * linhas.length);
            palavrasEscolhidas.push(linhas[indiceAleatorio]);
        }

        return palavrasEscolhidas;
    }


    verificarPalavraOrdemEQuantidadeAcertos(palavraJogador, palavraCorreta){
        const tentativa = palavraJogador.toUpperCase().split('');
        const alvo = palavraCorreta.toUpperCase().split('');

        let acumuladorQuantidade = 0;
        let acumuladorOrdem = 0;
        let indicePalavraOrdemCerta = [];
        let indicePalavraQuantidadeCerta = [];

        //Calcula quantos estão na ordem certa
        for(let indiceTentativa = 0; indiceTentativa < alvo.length; indiceTentativa++){
            if(tentativa[indiceTentativa] === alvo[indiceTentativa]){
                acumuladorOrdem++;

                indicePalavraOrdemCerta.push(indiceTentativa);
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
                        
                        indicePalavraQuantidadeCerta.push(indiceTentativa);
                        alvo[indiceAlvo] = null;
                        break;
                    }
                }
            }
        }

        return {
            indicePalavraOrdemCerta:indicePalavraOrdemCerta,
            indicePalavraQuantidadeCerta:indicePalavraQuantidadeCerta
        };

    }

    calcularVencedor(){
        

        return {
            nome:nome,
            pontuacao:pontuacao
        }
    }

    obterDados() {
        return {
            id: this.id,
            nome: this.nome,
            status: this.status,
            rodadas: this.rodadas,
            privacidade: this.privacidade,
            maxJogadores: this.maxJogadores,
            jogadoresAtuais: this.jogadores.length,
            jogadores: this.jogadores.map(j => ({ id: j.id, nome: j.nome, dono: j.dono })),
            precisaSenha: this.privacidade === "fechada"
        };
    }

}