import { readFileSync } from 'fs';

export class Sala {

    constructor(
        {
            id,
            nome,
            status,
            rodadas,
            chaveSalaPrivada,
        } = {}
    ){
        this.id = id;
        this.nome = nome;
        this.palavrasEscolhidas = this.gerarPalavrasAleatorias(rodadas);
        this.jogadores = [];
        this.status = status;
        this.rodadas = rodadas;
        this.chaveSalaPrivada = chaveSalaPrivada;
        this.respostaJogadores = [];
        this.rankingSala = [];
        this.vencedor = [];
    }

    
    gerarChaveSalaPrivada(){
                
        let caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
        let resultado = '';
        
        for(let i =0; i < 6; i++){
            resultado += caracteres.charAt(Math.floor(Math.random()*caracteres.length));
        }

        this.chaveSalaPrivada = resultado;
    }


    gerarPalavrasAleatorias(quantidadeRodadas){

        const palavras = readFileSync('../database/db.txt','utf-8');
        const linhas = palavras.split(/\r?\n/);
        let tamanhoAleatorio = Math.random() * linhas.length;;
    
        let palavrasEscolhidas = [];

        for(const i = 0; i <= quantidadeRodadas; i++){
            palavrasEscolhidas.push(linhas[tamanhoAleatorio-1]);
        }

        this.palavrasEscolhidas = palavrasEscolhidas;

    }


    verificarPalavraOrdemEQuantidadeAcertos(palavraJogador, palavraCorreta){
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

}