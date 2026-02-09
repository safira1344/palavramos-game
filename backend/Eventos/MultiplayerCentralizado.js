import { salasAtivas } from "../Estados/EstadoGlobal.js";
import { Sala } from "../Entidades/Salas.js";
import * as crypto from "crypto";

/*
    SERVIDOR DEVE CRIAR UMA PARTIDA ASSIM QUE O BOTÃO DE PROCURAR
    PARTIDA FOR PRESSIONADO NO FRONTEND -> O EMIT VEM DE LÁ

    ELE GERA UM ID UNICO DA PARTIDA E PROCURA POR UMA PARTIDA MULTIPLAYER
    FAZ UMA LISTA DE 5 PALAVRAS
    */
export const criarPartidaMultiplayer = ({
    nomeUsuario,
    privacidade,
    quantidadeRodadas,
    jogador,
}) => {
    const nomeDaSala = `Sala de ${nomeUsuario}`;

    if (privacidade === "fechada") {
        const idSala = crypto.randomUUID();

        const dadosSala = new Sala({
            id: idSala,
            nome: nomeDaSala,
            jogadores: [jogador],
            status: "aguardando_jogadores",
            rodadas: quantidadeRodadas,
            chaveSalaPrivada: chave,
        });

        dadosSala.gerarChaveSalaPrivada();

        salasAtivas.set(idSala, dadosSala);
        jogador.enviar("receber_dados_multiplayer", dadosSala);
    } else {
        const idSala = crypto.randomUUID();

        const dadosSala = new Sala({
            id: idSala,
            nome: nomeDaSala,
            jogadores: [jogador],
            status: "aguardando_jogadores",
            rodadas: rodadas,
        });

        salasAtivas.set(idSala, dadosSala);
        jogador.enviar("receber_dados_multiplayer", dadosSala);
    }
};


export const entrarSalaMultiplayer = ({ idSala, chave, jogador }) => {
    const salaAtiva = salasAtivas.get(idSala);

    if (chave && chave === salaAtiva.chaveSalaPrivada) {
        salaAtiva.jogadores.push(jogador);
        salaAtiva.status = "aguardando_inicializacao";
        jogador.status = "no_lobby";
        jogador.dono = false;

        jogador.enviar("novo_jogador_sala_multiplayer", salaAtiva);
    } else if (!chave) {
        salaAtiva.jogadores.push(jogador);
        salaAtiva.status = "aguardando_inicializacao";
        jogador.status = "no_lobby";
        jogador.dono = false;

        jogador.enviar("novo_jogador_sala_multiplayer", salaAtiva);
    }

    jogador.enviar("erro_entrar_partida", "Ocorreu um erro ao entrar na partida");
};


export const sairSalaMultiplayer = ({ idSala, jogador }) => {
    const salaAtiva = salasAtivas.get(idSala);
    const index = salaAtiva.jogadores.indexOf(jogador);

    if (index > -1) {
        salasAtivas.jogadores.splice(jogador, 1);
    }

    if (salaAtiva.jogadores.length <= 0) {
        salasAtivas.delete();
    }

    jogador.enviar("desconectado_da_sala", "Você se desconectou da sala");
};


export const verificarPalavraMultiplayer = ({
    palavraJogador,
    idSala,
    rodada,
    tempo,
}) => {
    const salaAtiva = salasAtivas.get(idSala);
    const tentativa = palavraJogador.toUpperCase();
    const alvo = salaAtiva.palavrasEscolhidas[rodada - 1].toUpperCase();

    if (rodada === salaAtiva.rodadas[rodada - 1] && tentativa === alvo) {
        const vencedor = {
            jogador: jogador,
            rodada: rodada,
            tempo: tempo,
        };

        salaAtiva.vencedor.push(vencedor);

        jogador.enviar('venceu_rodada', vencedor);
    } else {
        
       const verificarPalavra = salaAtiva.verificarPalavraOrdemEQuantidadeAcertos(tentativa, alvo);
       
       jogador.enviar('errou_tentativa',verificarPalavra);
    }
};


export const iniciarPartidaMultiplayer = ({ idSala, jogador, rodada }) => {
    const salaAtiva = salasAtivas.get(idSala);

    if (jogador.dono === false) {
        return "Apenas o dono pode iniciar a partida";
    }

    if (salaAtiva.jogadores.length > 1){ 
        salaAtiva.status = "em_progresso";
        const tempoRodada = 60000;
        const tempoInicio = Date.now();
        const tempoFim = tempoInicio * tempoRodada;
    
        for(const jogador in salaAtiva.jogadores){
            jogador.enviar('rodada_iniciada',{tempoRodada,tempoFim});
        }

        
         
    }



    
};
