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
    maxJogadores,
    jogador,
}) => {
    const nomeDaSala = `Sala de ${nomeUsuario}`;
    const idSala = crypto.randomUUID();

    const dadosSala = new Sala({
        id: idSala,
        nome: nomeDaSala,
        jogadores: [jogador],
        status: "aguardando_jogadores",
        rodadas: quantidadeRodadas,
        privacidade: privacidade, // Adicionei para quando a sala for retornada, saber a privacidade
        maxJogadores: maxJogadores // Modifiquei para ter um limite de jogadores
    });

    if (privacidade === "fechada") {
        dadosSala.gerarChaveSalaPrivada();
    }

    jogador.dono = true;
    jogador.status = "no_lobby";
    jogador.idSala = idSala;

    salasAtivas.set(idSala, dadosSala);
    jogador.enviar("receber_dados_multiplayer", {
        sala: dadosSala.obterDados(),
        mensagem: "Sala criada com sucesso"
    });
    
    // Notificar sobre nova sala pública
    if (privacidade === "publica") {
        notificarNovasSalas();
    }
};

export const listarSalas = (jogador) => {
    const salasDisponiveis = [];
    
    for (const [id, sala] of salasAtivas.entries()) {
        if (sala.status === "aguardando_jogadores") {
            salasDisponiveis.push(sala.obterDados());
        }
    }
    
    jogador.enviar("lista_salas", { salas: salasDisponiveis });
};


export const entrarSalaMultiplayer = ({ idSala, chave, jogador }) => {
    const salaAtiva = salasAtivas.get(idSala);

    if (!salaAtiva) {
        jogador.enviar("erro_entrar_partida", "Sala não encontrada");
        return;
    }

    if (salaAtiva.status !== "aguardando_jogadores") {
        jogador.enviar("erro_entrar_partida", "A partida já começou");
        return;
    }

    if (salaAtiva.jogadores.length >= salaAtiva.maxJogadores) {
        jogador.enviar("erro_entrar_partida", "Sala cheia");
        return;
    }

    if (salaAtiva.privacidade === "fechada") {
        if (!chave || chave !== salaAtiva.chaveSalaPrivada) {
            jogador.enviar("erro_entrar_partida", "Senha incorreta");
            return;
        }
    }

    salaAtiva.jogadores.push(jogador);
    jogador.status = "no_lobby";
    jogador.dono = false;
    jogador.idSala = idSala;

    notificarJogadoresSala(salaAtiva, "novo_jogador_sala_multiplayer", {
        sala: salaAtiva.obterDados(),
        novoJogador: { id: jogador.id, nome: jogador.nome }
    });

    // Verificar se atingiu o número máximo e iniciar countdown
    if (salaAtiva.jogadores.length === salaAtiva.maxJogadores) {
        iniciarContagem(salaAtiva);
    }
};


export const sairSalaMultiplayer = ({ idSala, jogador }) => {
    const salaAtiva = salasAtivas.get(idSala);

    if (!salaAtiva) return;

    const index = salaAtiva.jogadores.findIndex(j => j.id === jogador.id);

    if (index > -1) {
        salaAtiva.jogadores.splice(index, 1);
        jogador.idSala = null;
        jogador.status = '';
        
        jogador.enviar("desconectado_da_sala", "Você se desconectou da sala");

        // Se era o dono, transferir posse para o próximo jogador
        if (jogador.dono && salaAtiva.jogadores.length > 0) {
            salaAtiva.jogadores[0].dono = true;
            notificarJogadoresSala(salaAtiva, "novo_dono", { 
                novoDonoId: salaAtiva.jogadores[0].id 
            });
        }

        if (salaAtiva.jogadores.length > 0) {
            notificarJogadoresSala(salaAtiva, "jogador_saiu", {
                jogadorId: jogador.id,
                sala: salaAtiva.obterDados()
            });
        } else {
            // Deletar sala vazia
            salasAtivas.delete(idSala);
        }
    }
};


export const verificarPalavraMultiplayer = ({
    palavraJogador,
    idSala,
    rodada,
    tempo,
}) => {
    const salaAtiva = salasAtivas.get(idSala);

    if (!salaAtiva) return;

    const tentativa = palavraJogador.toUpperCase();
    const alvo = salaAtiva.palavrasEscolhidas[rodada - 1].toUpperCase();

    //Retirei primeiro if por conta da redundância
    if (tentativa === alvo) {
        const vencedor = {
            jogador: jogador,
            rodada: rodada,
            tempo: tempo,
        };

        salaAtiva.vencedor.push(vencedor);

        notificarJogadoresSala(salaAtiva, 'venceu_rodada', vencedor);
    } else {
        
       const verificarPalavra = salaAtiva.verificarPalavraOrdemEQuantidadeAcertos(tentativa, alvo);
       
       jogador.enviar('errou_tentativa',verificarPalavra);
    }
};


export const iniciarPartidaMultiplayer = ({ idSala, jogador, rodada }) => {
    const salaAtiva = salasAtivas.get(idSala);

    if (!salaAtiva) {
        jogador.enviar("erro_iniciar_partida", "Sala não encontrada");
        return;
    }

    if (!jogador.dono) {
        jogador.enviar("erro_iniciar_partida", "Apenas o dono pode iniciar a partida");
        return;
    }

    if (salaAtiva.jogadores.length < 2) {
        jogador.enviar("erro_iniciar_partida", "Aguarde mais jogadores");
        return;
    }

    iniciarContagem(salaAtiva);
};

function iniciarContagem(sala) {
    sala.status = "iniciando";
    
    notificarJogadoresSala(sala, "countdown_iniciado", { 
        segundos: 2,
        mensagem: "A partida começará em 2 segundos..." 
    });

    setTimeout(() => {
        iniciarPartida(sala);
    }, 2000);
}

function iniciarPartida(sala) {
    sala.status = "em_progresso";
    const tempoRodada = 60000;
    const tempoInicio = Date.now();
    const tempoFim = tempoInicio + tempoRodada;

    notificarJogadoresSala(sala, "rodada_iniciada", {
        rodada: 1,
        tempoRodada,
        tempoFim
    });
}

function notificarJogadoresSala(sala, evento, dados) {
    for (const jogador of sala.jogadores) {
        jogador.enviar(evento, dados);
    }
}

async function notificarNovasSalas() {
    const { clientesConectados } = await import("../Estados/EstadoGlobal.js");
    
    for (const [id, jogador] of clientesConectados.entries()) {
        if (!jogador.idSala) { // Apenas jogadores fora de salas
            listarSalas(jogador);
        }
    }
}