const { enviarParaCliente, transmitirParaSala } = require('../metodos/comunicacao');
const { gerarFeedback, verificarVitoria } = require('../metodos/palavramos');
const { criarSala, iniciarJogo, finalizarJogo } = require('../metodos/sala');

function tratarComando(clientes, salas, socket, idSocket, mensagem) {
    const cliente = clientes.get(idSocket);
    if (!cliente) return;

    const { tipo, dados } = mensagem;

    switch (tipo) {
        case 'definir_nome':
            cliente.setNome(dados.nome);
            enviarParaCliente(socket, 'nome_definido', { nome: dados.nome });
            break;

        case 'listar_salas':
            const listaSalas = Array.from(salas.values()).map(sala => ({
                id: sala.id,
                nomeDono: sala.nomeDono,
                jogadores: sala.jogadores.length,
                maxJogadores: sala.maxJogadores,
                ehPrivada: sala.ehPrivada,
                estado: sala.estado
            }));
            enviarParaCliente(socket, 'lista_salas', { salas: listaSalas });
            break;

        case 'criar_sala':
            if (!cliente.nome) {
                enviarParaCliente(socket, 'erro', { mensagem: 'Defina seu nome primeiro' });
                break;
            }
            const sala = criarSala(clientes, salas, idSocket, cliente.nome, dados);
            cliente.setSala(sala.id);
            enviarParaCliente(socket, 'sala_criada', {
                idSala: sala.id,
                sala: sala.paraDados()
            });
            console.log(`Sala ${sala.id} criada por ${cliente.nome}`);
            break;

        case 'entrar_sala':
            if (!cliente.nome) {
                enviarParaCliente(socket, 'erro', { mensagem: 'Defina seu nome primeiro' });
                break;
            }

            const salaParaEntrar = salas.get(dados.idSala);
            if (!salaParaEntrar) {
                enviarParaCliente(socket, 'erro', { mensagem: 'Sala não encontrada' });
                break;
            }

            if (salaParaEntrar.estado !== 'aguardando') {
                enviarParaCliente(socket, 'erro', { mensagem: 'Sala já iniciou o jogo' });
                break;
            }

            if (salaParaEntrar.estaCheia()) {
                enviarParaCliente(socket, 'erro', { mensagem: 'Sala está cheia' });
                break;
            }

            if (!salaParaEntrar.validarSenha(dados.senha)) {
                enviarParaCliente(socket, 'erro', { mensagem: 'Senha incorreta' });
                break;
            }

            salaParaEntrar.adicionarJogador(idSocket, cliente.nome);
            cliente.setSala(salaParaEntrar.id);

            enviarParaCliente(socket, 'sala_entrou', {
                idSala: salaParaEntrar.id,
                sala: salaParaEntrar.paraDados()
            });

            transmitirParaSala(clientes, salas)(salaParaEntrar.id, 'jogador_entrou', {
                nomeJogador: cliente.nome,
                jogadores: salaParaEntrar.jogadores
            }, idSocket);

            console.log(`${cliente.nome} entrou na sala ${salaParaEntrar.id}`);
            break;

        case 'sair_sala':
            if (!cliente.idSala) {
                enviarParaCliente(socket, 'erro', { mensagem: 'Você não está em nenhuma sala' });
                break;
            }

            const salaAtual = salas.get(cliente.idSala);
            if (salaAtual) {
                salaAtual.removerJogador(idSocket);

                transmitirParaSala(clientes, salas)(salaAtual.id, 'jogador_saiu', {
                    nomeJogador: cliente.nome,
                    jogadores: salaAtual.jogadores
                });

                // Aqui é pra deletar a sala caso o dono saia ou não tiver mais ninguém
                if (salaAtual.jogadores.length === 0 || salaAtual.idDono === idSocket) {
                    salas.delete(salaAtual.id);
                    console.log(`Sala ${salaAtual.id} deletada`);
                }
            }

            cliente.limparSala();
            enviarParaCliente(socket, 'sala_saiu', {});
            break;

        case 'iniciar_jogo':
            if (!cliente.idSala) {
                enviarParaCliente(socket, 'erro', { mensagem: 'Você não está em nenhuma sala' });
                break;
            }

            const salaParaIniciar = salas.get(cliente.idSala);
            if (!salaParaIniciar) {
                enviarParaCliente(socket, 'erro', { mensagem: 'Sala não encontrada' });
                break;
            }

            if (salaParaIniciar.idDono !== idSocket) {
                enviarParaCliente(socket, 'erro', { mensagem: 'Apenas o dono pode iniciar' });
                break;
            }

            if (salaParaIniciar.jogadores.length < 1) {
                enviarParaCliente(socket, 'erro', { mensagem: 'Sala precisa de pelo menos 1 jogador' });
                break;
            }

            iniciarJogo(clientes, salas, salaParaIniciar.id);
            break;

        case 'palpite':
            if (!cliente.idSala) {
                enviarParaCliente(socket, 'erro', { mensagem: 'Você não está em nenhuma sala' });
                break;
            }

            const salaJogo = salas.get(cliente.idSala);
            if (!salaJogo || salaJogo.estado !== 'jogando') {
                enviarParaCliente(socket, 'erro', { mensagem: 'Jogo não está em andamento' });
                break;
            }

            const dadosJogador = salaJogo.dadosJogo[idSocket];
            if (!dadosJogador) {
                enviarParaCliente(socket, 'erro', { mensagem: 'Dados do jogador não encontrados' });
                break;
            }

            if (dadosJogador.finalizado) {
                enviarParaCliente(socket, 'erro', { mensagem: 'Você já terminou suas tentativas' });
                break;
            }

            const palpite = dados.palavra.toUpperCase();
            if (palpite.length !== 5) {
                enviarParaCliente(socket, 'erro', { mensagem: 'Palavra deve ter 5 letras' });
                break;
            }

            const feedback = gerarFeedback(palpite, salaJogo.palavra);
            const venceu = verificarVitoria(palpite, salaJogo.palavra);

            dadosJogador.tentativas.push({ palavra: palpite, feedback });
            dadosJogador.tentativasRestantes--;

            if (venceu) {
                dadosJogador.finalizado = true;
                dadosJogador.venceu = true;

                enviarParaCliente(socket, 'resultado_palpite', {
                    palpite,
                    feedback,
                    venceu: true,
                    tentativasRestantes: dadosJogador.tentativasRestantes
                });

                transmitirParaSala(clientes, salas)(salaJogo.id, 'jogador_venceu', {
                    nomeJogador: cliente.nome,
                    tentativas: dadosJogador.tentativas.length
                }, idSocket);

                // Ver se geral terminou
                const todosFinalizados = Object.values(salaJogo.dadosJogo).every(dj => dj.finalizado);
                if (todosFinalizados) {
                    finalizarJogo(clientes, salas, salaJogo.id, 'todos_finalizaram');
                }
            } else {
                if (dadosJogador.tentativasRestantes === 0) {
                    dadosJogador.finalizado = true;

                    enviarParaCliente(socket, 'resultado_palpite', {
                        palpite,
                        feedback,
                        venceu: false,
                        tentativasRestantes: 0,
                        eliminado: true
                    });

                    transmitirParaSala(clientes, salas)(salaJogo.id, 'jogador_eliminado', {
                        nomeJogador: cliente.nome
                    }, idSocket);

                    const todosFinalizados = Object.values(salaJogo.dadosJogo).every(dj => dj.finalizado);
                    if (todosFinalizados) {
                        finalizarJogo(clientes, salas, salaJogo.id, 'todos_finalizaram');
                    }
                } else {
                    enviarParaCliente(socket, 'resultado_palpite', {
                        palpite,
                        feedback,
                        venceu: false,
                        tentativasRestantes: dadosJogador.tentativasRestantes
                    });
                }
            }
            break;

        default:
            enviarParaCliente(socket, 'erro', { mensagem: 'Comando desconhecido' });
    }
}

module.exports = tratarComando;
