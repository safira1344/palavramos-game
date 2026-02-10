import { 
    contagemIniciada,
    desconectadoDaSala,
    erroIniciarPartida,
    errouTentativa,
    jogadorSaiu,
    novoJogadorSalaMultiplayer,
    receberDadosMultiplayer,
    rodadaIniciada,
    salasListadas,
    vencedorRodada
} from "../Eventos/ReceberMultiplayerCetralizado.js";

export function rotearEventos(roteamentoDados){

    switch(roteamentoDados.evento){
        
        case 'receber_dados_multiplayer':
            parametrosDadosMultiplayer = {
                sala: roteamendoDados.dados.sala,
                mensagem: roteamentoDados.dados.mensagem
            }

            receberDadosMultiplayer(parametrosDadosMultiplayer);

            break;
        
        case 'listar_salas':
            parametrosDadosSalasDisponiveis = {
                salas: roteamentoDados.dados.salas
            }

            salasListadas(parametrosDadosMultiplayer);
            
            break;
        
        case 'erro_entrar_partida':
            parametrosErroEntrarPartida = {
                mensagem: roteamentoDados.dados.mensagem
            }

            erroIniciarPartida({mensagem});
            
            break;

        case 'novo_jogador_sala_multiplayer':
            parametrosNovoJogadorSalaMultiplayer = {
                sala: roteamentoDados.dados.sala,
                novoJogador: roteamentoDados.dados.novoJogador
            }

            novoJogadorSalaMultiplayer(parametrosDadosMultiplayer);
            break;
        
        case 'desconectado_da_sala':
            parametrosDesconectadoDaSala = {
                mensagem: roteamentoDados.dados.mensagem
            }

            desconectadoDaSala(parametrosDadosMultiplayer);
            break;
        
        case 'venceu_rodada':
            parametrosVencedorRodada = {
                jogador: roteamentoDados.dados.jogador,
                rodada: roteamentoDados.dados.rodada,
                tempo: roteamentoDados.dados.tempo
            }

            vencedorRodada(parametrosDadosMultiplayer);
            break;

        case 'jogador_saiu':
            parametrosJogadorSaida = {
                jogadorId: roteamentoDados.dados.jogadorId,
                sala: roteamentoDados.dados.sala
            }

            jogadorSaiu(parametrosDadosMultiplayer);
            break;

        case 'errou_tentativa':
            parametrosErrouTentativa = {
                indicePalavraOrdemCerta: roteamentoDados.dados.indicePalavraOrdemCerta,
                indicePalavraQuantidadeCerta: roteamentoDados.dados.indicePalavraQuantidadeCerta
            }

            errouTentativa(parametrosDadosMultiplayer);
            break;
        
        case 'erro_iniciar_partida':
            parametrosErroIniciarPartida = {
                mensagem: roteamentoDados.dados
            }

            erroIniciarPartida(parametrosDadosMultiplayer);
            break;
        
        case 'countdown_iniciado':
            parametrosCountdownIniciado = {
                segundos: roteamentoDados.dados.segundos,
                mensagem: roteamentoDados.dados.mensagem
            }

            contagemIniciada(parametrosCountdownIniciado);
            break;

        case 'rodada_iniciada':
            parametrosRodadaIniciada = {
                rodada: roteamentoDados.dados.rodada,
                tempoRodada: roteamentoDados.dados.tempoRodada,
                tempoFim: roteamentoDados.dados.tempoFim
            }

            rodadaIniciada(parametrosDadosMultiplayer);
            break;
    }
}