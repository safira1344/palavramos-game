import { criarPartidaMultiplayer, entrarSalaMultiplayer, sairSalaMultiplayer } from "../Eventos/MultiplayerCentralizado.js";


export function rotearEventos(roteamentoDados,jogador){

    switch(roteamentoDados.evento){
        
        case 'criar_partida_multiplayer':
            const parametrosPartidaMultiplayer = {
                nomeUsuario: roteamentoDados.dados.nomeUsuario,
                privacidade: roteamentoDados.dados.privacidade,
                quantidadeRodadas: roteamentoDados.dados.quantidadeRodadas,
                jogador: jogador
            };

            criarPartidaMultiplayer(parametrosPartidaMultiplayer);

            break;
        
        case 'entrar_sala_multiplayer':
            const parametrosEntrarSalaMultiplayer = {
                idSala: roteamentoDados.dados.idSala,
                chave: roteamentoDados.dados.chave,
                jogador: jogador
            };

            entrarSalaMultiplayer(parametrosEntrarSalaMultiplayer);            

            break;
        
        case 'sair_sala_multiplayer':
            const parametrosSairSalaMultiplayer = {
                idSala: roteamentoDados.dados.idSala,
                jogador: jogador
            };

            sairSalaMultiplayer(parametrosSairSalaMultiplayer);

            break;
    }
}