const net = require('net');

// Estado da aplicação
let socket = null;
let estadoAtual = 'desconectado';
let salaAtual = null;
let nomeJogador = null;
let ehDono = false;
let horarioInicioJogo = null;
let intervaloTimer = null;

// Elementos DOM
const telas = {
    conexao: document.getElementById('connectionScreen'),
    lobby: document.getElementById('lobbyScreen'),
    sala: document.getElementById('roomScreen'),
    jogo: document.getElementById('gameScreen')
};

// Funções de utilidade
function mostrarTela(nomeTela) {
    Object.values(telas).forEach(tela => tela.classList.remove('active'));
    telas[nomeTela].classList.add('active');
}

function mostrarToast(mensagem, tipo = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = mensagem;
    toast.className = `toast toast-${tipo} show`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function enviarComando(tipo, dados = {}) {
    if (!socket) return;
    try {
        const mensagem = JSON.stringify({ tipo, dados }) + '\n';
        socket.write(mensagem);
    } catch (erro) {
        mostrarToast('Erro ao enviar comando', 'error');
    }
}

// ========== TELA DE CONEXÃO ==========
document.getElementById('connectBtn').addEventListener('click', () => {
    const host = document.getElementById('serverHost').value.trim();
    const porta = parseInt(document.getElementById('serverPort').value);
    const nome = document.getElementById('playerName').value.trim();

    if (!nome) {
        mostrarToast('Digite seu nome', 'error');
        return;
    }

    if (!host || !porta) {
        mostrarToast('Preencha todos os campos', 'error');
        return;
    }

    nomeJogador = nome;
    conectarAoServidor(host, porta);
});

function conectarAoServidor(host, porta) {
    const statusEl = document.getElementById('connectionStatus');
    statusEl.textContent = 'Conectando...';
    statusEl.className = 'status-message status-info';

    socket = net.createConnection(porta, host, () => {
        statusEl.textContent = 'Conectado! Aguarde...';
        statusEl.className = 'status-message status-success';
    });

    let buffer = '';

    socket.on('data', (data) => {
        buffer += data.toString();

        let indiceNovaLinha;
        while ((indiceNovaLinha = buffer.indexOf('\n')) !== -1) {
            const linha = buffer.substring(0, indiceNovaLinha);
            buffer = buffer.substring(indiceNovaLinha + 1);

            try {
                const mensagem = JSON.parse(linha);
                tratarMensagemServidor(mensagem);
            } catch (erro) {
                console.error('Erro ao parsear mensagem:', erro);
            }
        }
    });

    socket.on('end', () => {
        mostrarToast('Conexão encerrada', 'error');
        setTimeout(() => {
            mostrarTela('conexao');
            estadoAtual = 'desconectado';
        }, 2000);
    });

    socket.on('error', (erro) => {
        statusEl.textContent = `Erro: ${erro.message}`;
        statusEl.className = 'status-message status-error';
        mostrarToast('Erro de conexão', 'error');
    });
}

// ========== HANDLERS DO SERVIDOR ==========
function tratarMensagemServidor(mensagem) {
    const { tipo, dados } = mensagem;

    switch (tipo) {
        case 'conectado':
            // Enviar nome automaticamente
            enviarComando('definir_nome', { nome: nomeJogador });
            break;

        case 'nome_definido':
            estadoAtual = 'lobby';
            document.getElementById('welcomeName').textContent = nomeJogador;
            mostrarTela('lobby');
            // Carregar salas automaticamente
            enviarComando('listar_salas');
            mostrarToast('Conectado com sucesso!', 'success');
            break;

        case 'lista_salas':
            exibirListaSalas(dados.salas);
            break;

        case 'sala_criada':
            salaAtual = dados.sala;
            estadoAtual = 'na_sala';
            ehDono = true;
            exibirSala(salaAtual);
            mostrarTela('sala');
            mostrarToast('Sala criada!', 'success');
            break;

        case 'sala_entrou':
            salaAtual = dados.sala;
            estadoAtual = 'na_sala';
            ehDono = false;
            exibirSala(salaAtual);
            mostrarTela('sala');
            mostrarToast('Entrou na sala!', 'success');
            break;

        case 'jogador_entrou':
            if (salaAtual) {
                salaAtual.jogadores = dados.jogadores;
                atualizarListaJogadores(dados.jogadores);
                mostrarToast(`${dados.nomeJogador} entrou na sala`, 'info');
            }
            break;

        case 'jogador_saiu':
            if (salaAtual) {
                salaAtual.jogadores = dados.jogadores;
                atualizarListaJogadores(dados.jogadores);
                mostrarToast(`${dados.nomeJogador} saiu da sala`, 'info');
            }
            break;

        case 'sala_saiu':
            salaAtual = null;
            estadoAtual = 'lobby';
            ehDono = false;
            mostrarTela('lobby');
            enviarComando('listar_salas');
            break;

        case 'jogo_iniciado':
            estadoAtual = 'jogando';
            horarioInicioJogo = Date.now();
            iniciarJogo(dados);
            break;

        case 'resultado_palpite':
            tratarResultadoPalpite(dados);
            break;

        case 'jogador_venceu':
            adicionarAtividadeJogo(`🏆 ${dados.nomeJogador} venceu!`, 'success');
            break;

        case 'jogador_eliminado':
            adicionarAtividadeJogo(`💀 ${dados.nomeJogador} foi eliminado`, 'error');
            break;

        case 'jogo_finalizado':
            mostrarResultadoJogo(dados);
            break;

        case 'sala_resetada':
            mostrarToast('Sala resetada', 'info');
            estadoAtual = 'na_sala';
            break;

        case 'erro':
            mostrarToast(dados.mensagem, 'error');
            break;
    }
}

// ========== LOBBY ==========
document.getElementById('createRoomBtn').addEventListener('click', () => {
    document.getElementById('createRoomModal').classList.add('show');
});

document.getElementById('refreshRoomsBtn').addEventListener('click', () => {
    enviarComando('listar_salas');
    mostrarToast('Atualizando...', 'info');
});

document.getElementById('isPrivate').addEventListener('change', (e) => {
    document.getElementById('passwordGroup').style.display = e.target.checked ? 'block' : 'none';
});

document.getElementById('confirmCreateRoom').addEventListener('click', () => {
    const maxJogadores = parseInt(document.getElementById('maxPlayers').value);
    const limiteTempo = parseInt(document.getElementById('timeLimit').value);
    const ehPrivada = document.getElementById('isPrivate').checked;
    const senha = document.getElementById('roomPassword').value;

    enviarComando('criar_sala', {
        maxJogadores: Math.max(2, Math.min(10, maxJogadores)),
        limiteTempo,
        ehPrivada,
        senha: ehPrivada ? senha : null
    });

    document.getElementById('createRoomModal').classList.remove('show');
});

document.getElementById('cancelCreateRoom').addEventListener('click', () => {
    document.getElementById('createRoomModal').classList.remove('show');
});

// Fechar modais
document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
        btn.closest('.modal').classList.remove('show');
    });
});

function exibirListaSalas(salas) {
    const container = document.getElementById('roomsList');

    if (salas.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhuma sala disponível. Crie uma nova!</div>';
        return;
    }

    container.innerHTML = salas.map(sala => {
        const classeStatus = sala.estado === 'aguardando' ? 'success' :
                           sala.estado === 'jogando' ? 'warning' : 'secondary';
        const textoStatus = sala.estado === 'aguardando' ? 'Aguardando' :
                          sala.estado === 'jogando' ? 'Jogando' : 'Finalizado';
        const podeEntrar = sala.estado === 'aguardando' && sala.jogadores < sala.maxJogadores;

        return `
            <div class="room-card">
                <div class="room-card-header">
                    <h3>Sala #${sala.id}</h3>
                    <span class="badge badge-${classeStatus}">${textoStatus}</span>
                </div>
                <div class="room-card-body">
                    <div class="room-card-info">
                        <span>👤 ${sala.nomeDono}</span>
                        <span>👥 ${sala.jogadores}/${sala.maxJogadores}</span>
                        <span>${sala.ehPrivada ? '🔒 Privada' : '🌐 Pública'}</span>
                    </div>
                </div>
                <div class="room-card-footer">
                    ${podeEntrar ? `<button class="btn btn-primary btn-sm" onclick="entrarSala(${sala.id}, ${sala.ehPrivada})">Entrar</button>` :
                               '<button class="btn btn-secondary btn-sm" disabled>Indisponível</button>'}
                </div>
            </div>
        `;
    }).join('');
}

window.entrarSala = function(idSala, ehPrivada) {
    if (ehPrivada) {
        document.getElementById('joinRoomId').textContent = idSala;
        document.getElementById('joinRoomModal').classList.add('show');

        document.getElementById('confirmJoinRoom').onclick = () => {
            const senha = document.getElementById('joinRoomPassword').value;
            enviarComando('entrar_sala', { idSala, senha });
            document.getElementById('joinRoomModal').classList.remove('show');
            document.getElementById('joinRoomPassword').value = '';
        };

        document.getElementById('cancelJoinRoom').onclick = () => {
            document.getElementById('joinRoomModal').classList.remove('show');
            document.getElementById('joinRoomPassword').value = '';
        };
    } else {
        enviarComando('entrar_sala', { idSala, senha: '' });
    }
};

// ========== SALA ==========
function exibirSala(sala) {
    document.getElementById('currentRoomId').textContent = sala.id;
    document.getElementById('roomOwner').textContent = sala.nomeDono;
    document.getElementById('maxPlayerCount').textContent = sala.maxJogadores;
    document.getElementById('roomTimeLimit').textContent = sala.limiteTempo > 0 ? `${sala.limiteTempo}s` : 'Sem limite';

    atualizarListaJogadores(sala.jogadores);

    const botaoIniciar = document.getElementById('startGameBtn');
    botaoIniciar.style.display = ehDono ? 'block' : 'none';
}

function atualizarListaJogadores(jogadores) {
    const container = document.getElementById('playersList');
    document.getElementById('playerCount').textContent = jogadores.length;

    container.innerHTML = jogadores.map(jogador => `
        <div class="player-item">
            <span class="player-name">${jogador.nome}</span>
            ${jogador.id === salaAtual.idDono ? '<span class="badge badge-warning">Dono</span>' : ''}
        </div>
    `).join('');
}

document.getElementById('leaveRoomBtn').addEventListener('click', () => {
    enviarComando('sair_sala');
});

document.getElementById('startGameBtn').addEventListener('click', () => {
    enviarComando('iniciar_jogo');
});

// ========== JOGO ==========
function iniciarJogo(dados) {
    mostrarTela('jogo');
    document.getElementById('attemptsLeft').textContent = '5';
    document.getElementById('guessesContainer').innerHTML = '';
    document.getElementById('gameActivity').innerHTML = '';
    document.getElementById('guessInput').value = '';
    document.getElementById('guessInput').disabled = false;
    document.getElementById('submitGuessBtn').disabled = false;

    // Resetar teclado
    document.querySelectorAll('.key').forEach(tecla => {
        tecla.className = 'key';
        if (tecla.dataset.key === 'ENTER' || tecla.dataset.key === 'BACKSPACE') {
            tecla.classList.add('key-wide');
        }
    });

    // Exibir jogadores
    exibirJogadoresJogo(dados.jogadores);

    // Iniciar timer
    if (dados.limiteTempo > 0) {
        iniciarTimer(dados.limiteTempo);
    } else {
        document.getElementById('timeRemaining').textContent = '∞';
    }

    adicionarAtividadeJogo('Partida iniciada! Boa sorte! 🍀', 'info');
}

function exibirJogadoresJogo(jogadores) {
    const container = document.getElementById('gamePlayers');
    container.innerHTML = jogadores.map(nome => `
        <div class="game-player-item">
            <span class="player-indicator">🟢</span>
            <span>${nome}</span>
        </div>
    `).join('');
}

function iniciarTimer(segundos) {
    if (intervaloTimer) clearInterval(intervaloTimer);

    let restante = segundos;
    const display = document.getElementById('timeRemaining');

    intervaloTimer = setInterval(() => {
        restante--;
        const mins = Math.floor(restante / 60);
        const segs = restante % 60;
        display.textContent = `${mins}:${segs.toString().padStart(2, '0')}`;

        if (restante <= 0) {
            clearInterval(intervaloTimer);
        }
    }, 1000);
}

function adicionarAtividadeJogo(mensagem, tipo = 'info') {
    const container = document.getElementById('gameActivity');
    const item = document.createElement('div');
    item.className = `activity-item activity-${tipo}`;
    item.textContent = mensagem;
    container.insertBefore(item, container.firstChild);

    // Limitar a 10 itens
    while (container.children.length > 10) {
        container.removeChild(container.lastChild);
    }
}

// Input de palpite
document.getElementById('guessInput').addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

document.getElementById('guessInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        enviarPalpite();
    }
});

document.getElementById('submitGuessBtn').addEventListener('click', enviarPalpite);

function enviarPalpite() {
    const input = document.getElementById('guessInput');
    const palavra = input.value.trim().toUpperCase();

    if (palavra.length !== 5) {
        mostrarToast('A palavra deve ter 5 letras', 'error');
        return;
    }

    if (!/^[A-Z]+$/.test(palavra)) {
        mostrarToast('Apenas letras são permitidas', 'error');
        return;
    }

    enviarComando('palpite', { palavra });
    input.value = '';
}

// Teclado virtual
document.querySelectorAll('.key').forEach(tecla => {
    tecla.addEventListener('click', () => {
        const input = document.getElementById('guessInput');
        const letra = tecla.dataset.key;

        if (letra === 'ENTER') {
            enviarPalpite();
        } else if (letra === 'BACKSPACE') {
            input.value = input.value.slice(0, -1);
        } else if (input.value.length < 5) {
            input.value += letra;
        }

        input.focus();
    });
});

function tratarResultadoPalpite(dados) {
    const container = document.getElementById('guessesContainer');

    // Criar linha de tentativa
    const linhaPalpite = document.createElement('div');
    linhaPalpite.className = 'guess-row';

    for (let i = 0; i < 5; i++) {
        const quadro = document.createElement('div');
        quadro.className = `tile tile-${dados.feedback[i]}`;
        quadro.textContent = dados.palpite[i];
        linhaPalpite.appendChild(quadro);

        // Animar
        setTimeout(() => {
            quadro.classList.add('flip');
        }, i * 100);
    }

    container.appendChild(linhaPalpite);

    // Atualizar teclado
    for (let i = 0; i < 5; i++) {
        const letra = dados.palpite[i];
        const feedback = dados.feedback[i];
        const teclaEl = document.querySelector(`.key[data-key="${letra}"]`);

        if (teclaEl && !teclaEl.classList.contains('key-correct')) {
            if (feedback === 'correto') {
                teclaEl.classList.add('key-correct');
            } else if (feedback === 'presente' && !teclaEl.classList.contains('key-present')) {
                teclaEl.classList.add('key-present');
            } else if (feedback === 'ausente') {
                teclaEl.classList.add('key-absent');
            }
        }
    }

    // Atualizar tentativas
    document.getElementById('attemptsLeft').textContent = dados.tentativasRestantes;

    if (dados.venceu) {
        document.getElementById('guessInput').disabled = true;
        document.getElementById('submitGuessBtn').disabled = true;
        mostrarToast('🎉 Parabéns! Você venceu!', 'success');
        adicionarAtividadeJogo('Você acertou a palavra!', 'success');
    } else if (dados.eliminado) {
        document.getElementById('guessInput').disabled = true;
        document.getElementById('submitGuessBtn').disabled = true;
        mostrarToast('❌ Você foi eliminado', 'error');
        adicionarAtividadeJogo('Suas tentativas acabaram', 'error');
    } else {
        adicionarAtividadeJogo(`Tentativa: ${dados.palpite}`, 'info');
    }
}

function mostrarResultadoJogo(dados) {
    if (intervaloTimer) clearInterval(intervaloTimer);

    const modal = document.getElementById('resultModal');
    const conteudo = document.getElementById('resultContent');

    const textoMotivo = dados.motivo === 'tempo_esgotado' ? 'Tempo esgotado' : 'Todos terminaram';

    conteudo.innerHTML = `
        <div class="result-info">
            <h3>A palavra era: <span class="word-reveal">${dados.palavra}</span></h3>
            <p class="reason">Motivo: ${textoMotivo}</p>
        </div>

        <div class="results-table">
            <h3>📊 Resultados</h3>
            ${dados.resultados.map((resultado, indice) => {
                const medalha = indice === 0 ? '🥇' : indice === 1 ? '🥈' : indice === 2 ? '🥉' : '';
                const classeStatus = resultado.venceu ? 'success' : 'error';
                const textoStatus = resultado.venceu ? 'VENCEU' : 'PERDEU';

                return `
                    <div class="result-row">
                        <span class="medal">${medalha}</span>
                        <span class="player-name">${resultado.nome}</span>
                        <span class="badge badge-${classeStatus}">${textoStatus}</span>
                        <span class="attempts">${resultado.tentativas} tentativas</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    modal.classList.add('show');
}

document.getElementById('backToRoomBtn').addEventListener('click', () => {
    document.getElementById('resultModal').classList.remove('show');
    mostrarTela('sala');
    estadoAtual = 'na_sala';
});

// Fechar modal ao clicar fora
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }
});
