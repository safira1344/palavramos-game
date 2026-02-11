const net = require('net');
const fs = require('fs');
const path = require('path');

const PORTA = 3000;
const HOST = '0.0.0.0';

// Estruturas de dados
const clientes = new Map(); // idSocket -> informações do cliente
const salas = new Map(); // idSala -> informações da sala
let proximoIdSala = 1;

// Carregar palavras do banco de dados
function carregarPalavras() {
    try {
        const conteudo = fs.readFileSync(path.join(__dirname, 'bd.txt'), 'utf-8');
        const palavras = conteudo.split('\n')
            .map(p => p.trim().toUpperCase())
            .filter(p => p.length === 5);
        return palavras;
    } catch (erro) {
        console.error('Erro ao carregar bd.txt:', erro.message);
        return [];
    }
}

const PALAVRAS = carregarPalavras();
console.log(`${PALAVRAS.length} palavras carregadas do banco de dados`);

// Gerar palavra aleatória
function obterPalavraAleatoria() {
    return PALAVRAS[Math.floor(Math.random() * PALAVRAS.length)];
}

// Criar sala
function criarSala(idDono, nomeDono, maxJogadores, limiteTempo, ehPrivada, senha) {
    const idSala = proximoIdSala++;
    const sala = {
        id: idSala,
        idDono,
        nomeDono,
        maxJogadores,
        limiteTempo, // em segundos
        ehPrivada,
        senha: ehPrivada ? senha : null,
        jogadores: [{ id: idDono, nome: nomeDono, pronto: true }],
        estado: 'aguardando', // aguardando, jogando, finalizado
        palavra: null,
        horarioInicio: null,
        dadosJogo: {} // idJogador -> { tentativas: [], finalizado: false, venceu: false }
    };
    salas.set(idSala, sala);
    return sala;
}

// Enviar mensagem para cliente
function enviarParaCliente(socket, tipo, dados) {
    try {
        const mensagem = JSON.stringify({ tipo, dados }) + '\n';
        socket.write(mensagem);
    } catch (erro) {
        console.error('Erro ao enviar mensagem:', erro.message);
    }
}

// Transmitir para todos na sala
function transmitirParaSala(idSala, tipo, dados, excluirIdSocket = null) {
    const sala = salas.get(idSala);
    if (!sala) return;

    sala.jogadores.forEach(jogador => {
        const cliente = clientes.get(jogador.id);
        if (cliente && cliente.socket && jogador.id !== excluirIdSocket) {
            enviarParaCliente(cliente.socket, tipo, dados);
        }
    });
}

// Verificar vitória
function verificarVitoria(palpite, palavra) {
    return palpite.toUpperCase() === palavra.toUpperCase();
}

// Gerar feedback do Wordle
function gerarFeedback(palpite, palavra) {
    palpite = palpite.toUpperCase();
    palavra = palavra.toUpperCase();

    const feedback = [];
    const letrasPalavra = palavra.split('');
    const letrasPalpite = palpite.split('');
    const usadas = new Array(5).fill(false);

    // Primeira passagem: marcar corretos
    for (let i = 0; i < 5; i++) {
        if (letrasPalpite[i] === letrasPalavra[i]) {
            feedback[i] = 'correto';
            usadas[i] = true;
        }
    }

    // Segunda passagem: marcar presentes
    for (let i = 0; i < 5; i++) {
        if (feedback[i] === 'correto') continue;

        let encontrado = false;
        for (let j = 0; j < 5; j++) {
            if (!usadas[j] && letrasPalpite[i] === letrasPalavra[j]) {
                feedback[i] = 'presente';
                usadas[j] = true;
                encontrado = true;
                break;
            }
        }

        if (!encontrado) {
            feedback[i] = 'ausente';
        }
    }

    return feedback;
}

// Iniciar jogo
function iniciarJogo(idSala) {
    const sala = salas.get(idSala);
    if (!sala || sala.estado !== 'aguardando') return;

    sala.estado = 'jogando';
    sala.palavra = obterPalavraAleatoria();
    sala.horarioInicio = Date.now();
    sala.dadosJogo = {};

    // Inicializar dados do jogo para cada jogador
    sala.jogadores.forEach(jogador => {
        sala.dadosJogo[jogador.id] = {
            tentativas: [],
            finalizado: false,
            venceu: false,
            tentativasRestantes: 5
        };
    });

    console.log(`Sala ${idSala} iniciada! Palavra: ${sala.palavra}`);

    // Notificar todos os jogadores
    transmitirParaSala(idSala, 'jogo_iniciado', {
        idSala,
        limiteTempo: sala.limiteTempo,
        jogadores: sala.jogadores.map(j => j.nome)
    });

    // Timer da partida
    if (sala.limiteTempo > 0) {
        setTimeout(() => {
            finalizarJogo(idSala, 'tempo_esgotado');
        }, sala.limiteTempo * 1000);
    }
}

// Finalizar jogo
function finalizarJogo(idSala, motivo) {
    const sala = salas.get(idSala);
    if (!sala || sala.estado !== 'jogando') return;

    sala.estado = 'finalizado';

    const resultados = sala.jogadores.map(jogador => ({
        nome: jogador.nome,
        venceu: sala.dadosJogo[jogador.id]?.venceu || false,
        tentativas: sala.dadosJogo[jogador.id]?.tentativas.length || 0
    }));

    transmitirParaSala(idSala, 'jogo_finalizado', {
        motivo,
        palavra: sala.palavra,
        resultados
    });

    console.log(`Sala ${idSala} finalizada. Motivo: ${motivo}`);

    // Resetar sala
    setTimeout(() => {
        sala.estado = 'aguardando';
        sala.palavra = null;
        sala.horarioInicio = null;
        sala.dadosJogo = {};

        transmitirParaSala(idSala, 'sala_resetada', {});
    }, 5000);
}

// Manipulador de comandos
function tratarComando(socket, idSocket, mensagem) {
    const cliente = clientes.get(idSocket);
    if (!cliente) return;

    const { tipo, dados } = mensagem;

    switch (tipo) {
        case 'definir_nome':
            cliente.nome = dados.nome;
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
            const sala = criarSala(
                idSocket,
                cliente.nome,
                dados.maxJogadores || 2,
                dados.limiteTempo || 300,
                dados.ehPrivada || false,
                dados.senha || null
            );
            cliente.idSala = sala.id;
            enviarParaCliente(socket, 'sala_criada', {
                idSala: sala.id,
                sala: {
                    id: sala.id,
                    nomeDono: sala.nomeDono,
                    jogadores: sala.jogadores,
                    maxJogadores: sala.maxJogadores,
                    estado: sala.estado
                }
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

            if (salaParaEntrar.jogadores.length >= salaParaEntrar.maxJogadores) {
                enviarParaCliente(socket, 'erro', { mensagem: 'Sala está cheia' });
                break;
            }

            if (salaParaEntrar.ehPrivada && salaParaEntrar.senha !== dados.senha) {
                enviarParaCliente(socket, 'erro', { mensagem: 'Senha incorreta' });
                break;
            }

            salaParaEntrar.jogadores.push({ id: idSocket, nome: cliente.nome, pronto: true });
            cliente.idSala = salaParaEntrar.id;

            enviarParaCliente(socket, 'sala_entrou', {
                idSala: salaParaEntrar.id,
                sala: {
                    id: salaParaEntrar.id,
                    nomeDono: salaParaEntrar.nomeDono,
                    jogadores: salaParaEntrar.jogadores,
                    maxJogadores: salaParaEntrar.maxJogadores,
                    estado: salaParaEntrar.estado
                }
            });

            transmitirParaSala(salaParaEntrar.id, 'jogador_entrou', {
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
                salaAtual.jogadores = salaAtual.jogadores.filter(j => j.id !== idSocket);

                transmitirParaSala(salaAtual.id, 'jogador_saiu', {
                    nomeJogador: cliente.nome,
                    jogadores: salaAtual.jogadores
                });

                // Se sala ficou vazia ou dono saiu, deletar sala
                if (salaAtual.jogadores.length === 0 || salaAtual.idDono === idSocket) {
                    salas.delete(salaAtual.id);
                    console.log(`Sala ${salaAtual.id} deletada`);
                }
            }

            cliente.idSala = null;
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

            iniciarJogo(salaParaIniciar.id);
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

            // Processar tentativa
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

                transmitirParaSala(salaJogo.id, 'jogador_venceu', {
                    nomeJogador: cliente.nome,
                    tentativas: dadosJogador.tentativas.length
                }, idSocket);

                // Verificar se todos terminaram
                const todosFinalizados = Object.values(salaJogo.dadosJogo).every(dj => dj.finalizado);
                if (todosFinalizados) {
                    finalizarJogo(salaJogo.id, 'todos_finalizaram');
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

                    transmitirParaSala(salaJogo.id, 'jogador_eliminado', {
                        nomeJogador: cliente.nome
                    }, idSocket);

                    // Verificar se todos terminaram
                    const todosFinalizados = Object.values(salaJogo.dadosJogo).every(dj => dj.finalizado);
                    if (todosFinalizados) {
                        finalizarJogo(salaJogo.id, 'todos_finalizaram');
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

// Criar servidor
const servidor = net.createServer((socket) => {
    const idSocket = `${socket.remoteAddress}:${socket.remotePort}`;

    clientes.set(idSocket, {
        socket,
        nome: null,
        idSala: null
    });

    console.log(`Cliente conectado: ${idSocket}`);
    enviarParaCliente(socket, 'conectado', { mensagem: 'Bem-vindo ao Palavramos!' });

    let buffer = '';

    socket.on('data', (data) => {
        buffer += data.toString();

        let indiceNovaLinha;
        while ((indiceNovaLinha = buffer.indexOf('\n')) !== -1) {
            const linha = buffer.substring(0, indiceNovaLinha);
            buffer = buffer.substring(indiceNovaLinha + 1);

            try {
                const mensagem = JSON.parse(linha);
                tratarComando(socket, idSocket, mensagem);
            } catch (erro) {
                console.error('Erro ao parsear mensagem:', erro.message);
                enviarParaCliente(socket, 'erro', { mensagem: 'Mensagem inválida' });
            }
        }
    });

    socket.on('end', () => {
        console.log(`Cliente desconectado: ${idSocket}`);

        const cliente = clientes.get(idSocket);
        if (cliente && cliente.idSala) {
            const sala = salas.get(cliente.idSala);
            if (sala) {
                sala.jogadores = sala.jogadores.filter(j => j.id !== idSocket);

                transmitirParaSala(sala.id, 'jogador_saiu', {
                    nomeJogador: cliente.nome,
                    jogadores: sala.jogadores
                });

                if (sala.jogadores.length === 0 || sala.idDono === idSocket) {
                    salas.delete(sala.id);
                    console.log(`Sala ${sala.id} deletada`);
                }
            }
        }

        clientes.delete(idSocket);
    });

    socket.on('error', (erro) => {
        console.error(`Erro no socket ${idSocket}:`, erro.message);
    });
});

servidor.listen(PORTA, HOST, () => {
    console.log(`🎮 Servidor Palavramos rodando em ${HOST}:${PORTA}`);
    console.log(`📚 ${PALAVRAS.length} palavras disponíveis`);
});
