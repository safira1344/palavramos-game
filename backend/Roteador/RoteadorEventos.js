import { criarPartidaMultiplayer } from "../Eventos/MultiplayerCentralizado.js";


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
                nome: roteamentoDados.dados.nomeSala,
                chave: roteamentoDados.dados.chave,
                jogador: jogador
            };

            

            break;
    }
}