import { 
    criarPartidaMultiplayer, 
    entrarSalaMultiplayer, 
    sairSalaMultiplayer,
    listarSalas,
    iniciarPartidaMultiplayer,
    verificarPalavraMultiplayer,
    criarPartidaMultiplayerSemRodadas,
    verificarPalavraMultiplayerSemRodadas
} from "../Eventos/MultiplayerCentralizado.js";

export function rotearEventos(roteamentoDados,jogador){

    switch(roteamentoDados.evento){
        
        case 'criar_partida_multiplayer':
            const parametrosPartidaMultiplayer = {
                nomeUsuario: roteamentoDados.dados.nomeUsuario,
                privacidade: roteamentoDados.dados.privacidade,
                jogador: jogador,
                tempo: roteamentoDados.dados.tempo
            };
            
            console.log('dados que chegaram do index.js:',parametrosEntrarSalaMultiplayer)
            criarPartidaMultiplayerSemRodadas(parametrosPartidaMultiplayer);

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

        case 'listar_salas':
            listarSalas(jogador);
            break;
        
        case 'iniciar_partida':
            const parametrosIniciar = {
                idSala: roteamentoDados.dados.idSala,
                jogador: jogador
            };
            iniciarPartidaMultiplayer(parametrosIniciar);
            break;
        
        case 'verificar_palavra':
            const parametrosVerificar = {
                palavraJogador: roteamentoDados.dados.palavra,
                idSala: roteamentoDados.dados.idSala,
                tempo: roteamentoDados.dados.tempo,
                jogador: jogador
            };
            verificarPalavraMultiplayerSemRodadas(parametrosVerificar);
            break;
    }
}