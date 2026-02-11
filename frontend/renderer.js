const net = require('net');

// Estado da aplicação
let socket = null;
let currentState = 'disconnected';
let currentRoom = null;
let playerName = null;
let isOwner = false;
let gameStartTime = null;
let timerInterval = null;

// Elementos DOM
const screens = {
    connection: document.getElementById('connectionScreen'),
    lobby: document.getElementById('lobbyScreen'),
    room: document.getElementById('roomScreen'),
    game: document.getElementById('gameScreen')
};

// Funções de utilidade
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast toast-${type} show`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function sendCommand(type, data = {}) {
    if (!socket) return;
    try {
        const message = JSON.stringify({ type, data }) + '\n';
        socket.write(message);
    } catch (err) {
        showToast('Erro ao enviar comando', 'error');
    }
}

// ========== TELA DE CONEXÃO ==========
document.getElementById('connectBtn').addEventListener('click', () => {
    const host = document.getElementById('serverHost').value.trim();
    const port = parseInt(document.getElementById('serverPort').value);
    const name = document.getElementById('playerName').value.trim();

    if (!name) {
        showToast('Digite seu nome', 'error');
        return;
    }

    if (!host || !port) {
        showToast('Preencha todos os campos', 'error');
        return;
    }

    playerName = name;
    connectToServer(host, port);
});

function connectToServer(host, port) {
    const statusEl = document.getElementById('connectionStatus');
    statusEl.textContent = 'Conectando...';
    statusEl.className = 'status-message status-info';

    socket = net.createConnection(port, host, () => {
        statusEl.textContent = 'Conectado! Aguarde...';
        statusEl.className = 'status-message status-success';
    });

    let buffer = '';

    socket.on('data', (data) => {
        buffer += data.toString();
        
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            const line = buffer.substring(0, newlineIndex);
            buffer = buffer.substring(newlineIndex + 1);
            
            try {
                const message = JSON.parse(line);
                handleServerMessage(message);
            } catch (err) {
                console.error('Erro ao parsear mensagem:', err);
            }
        }
    });

    socket.on('end', () => {
        showToast('Conexão encerrada', 'error');
        setTimeout(() => {
            showScreen('connection');
            currentState = 'disconnected';
        }, 2000);
    });

    socket.on('error', (err) => {
        statusEl.textContent = `Erro: ${err.message}`;
        statusEl.className = 'status-message status-error';
        showToast('Erro de conexão', 'error');
    });
}

// ========== HANDLERS DO SERVIDOR ==========
function handleServerMessage(message) {
    const { type, data } = message;

    switch (type) {
        case 'connected':
            // Enviar nome automaticamente
            sendCommand('set_name', { name: playerName });
            break;

        case 'name_set':
            currentState = 'lobby';
            document.getElementById('welcomeName').textContent = playerName;
            showScreen('lobby');
            // Carregar salas automaticamente
            sendCommand('list_rooms');
            showToast('Conectado com sucesso!', 'success');
            break;

        case 'rooms_list':
            displayRoomsList(data.rooms);
            break;

        case 'room_created':
            currentRoom = data.room;
            currentState = 'in_room';
            isOwner = true;
            displayRoom(currentRoom);
            showScreen('room');
            showToast('Sala criada!', 'success');
            break;

        case 'room_joined':
            currentRoom = data.room;
            currentState = 'in_room';
            isOwner = false;
            displayRoom(currentRoom);
            showScreen('room');
            showToast('Entrou na sala!', 'success');
            break;

        case 'player_joined':
            if (currentRoom) {
                currentRoom.players = data.players;
                updatePlayersList(data.players);
                showToast(`${data.playerName} entrou na sala`, 'info');
            }
            break;

        case 'player_left':
            if (currentRoom) {
                currentRoom.players = data.players;
                updatePlayersList(data.players);
                showToast(`${data.playerName} saiu da sala`, 'info');
            }
            break;

        case 'room_left':
            currentRoom = null;
            currentState = 'lobby';
            isOwner = false;
            showScreen('lobby');
            sendCommand('list_rooms');
            break;

        case 'game_started':
            currentState = 'playing';
            gameStartTime = Date.now();
            startGame(data);
            break;

        case 'guess_result':
            handleGuessResult(data);
            break;

        case 'player_won':
            addGameActivity(`🏆 ${data.playerName} venceu!`, 'success');
            break;

        case 'player_eliminated':
            addGameActivity(`💀 ${data.playerName} foi eliminado`, 'error');
            break;

        case 'game_ended':
            showGameResult(data);
            break;

        case 'room_reset':
            showToast('Sala resetada', 'info');
            currentState = 'in_room';
            break;

        case 'error':
            showToast(data.message, 'error');
            break;
    }
}

// ========== LOBBY ==========
document.getElementById('createRoomBtn').addEventListener('click', () => {
    document.getElementById('createRoomModal').classList.add('show');
});

document.getElementById('refreshRoomsBtn').addEventListener('click', () => {
    sendCommand('list_rooms');
    showToast('Atualizando...', 'info');
});

document.getElementById('isPrivate').addEventListener('change', (e) => {
    document.getElementById('passwordGroup').style.display = e.target.checked ? 'block' : 'none';
});

document.getElementById('confirmCreateRoom').addEventListener('click', () => {
    const maxPlayers = parseInt(document.getElementById('maxPlayers').value);
    const timeLimit = parseInt(document.getElementById('timeLimit').value);
    const isPrivate = document.getElementById('isPrivate').checked;
    const password = document.getElementById('roomPassword').value;

    sendCommand('create_room', {
        maxPlayers: Math.max(2, Math.min(10, maxPlayers)),
        timeLimit,
        isPrivate,
        password: isPrivate ? password : null
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

function displayRoomsList(rooms) {
    const container = document.getElementById('roomsList');
    
    if (rooms.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhuma sala disponível. Crie uma nova!</div>';
        return;
    }

    container.innerHTML = rooms.map(room => {
        const statusClass = room.state === 'waiting' ? 'success' : 
                           room.state === 'playing' ? 'warning' : 'secondary';
        const statusText = room.state === 'waiting' ? 'Aguardando' :
                          room.state === 'playing' ? 'Jogando' : 'Finalizado';
        const canJoin = room.state === 'waiting' && room.players < room.maxPlayers;

        return `
            <div class="room-card">
                <div class="room-card-header">
                    <h3>Sala #${room.id}</h3>
                    <span class="badge badge-${statusClass}">${statusText}</span>
                </div>
                <div class="room-card-body">
                    <div class="room-card-info">
                        <span>👤 ${room.ownerName}</span>
                        <span>👥 ${room.players}/${room.maxPlayers}</span>
                        <span>${room.isPrivate ? '🔒 Privada' : '🌐 Pública'}</span>
                    </div>
                </div>
                <div class="room-card-footer">
                    ${canJoin ? `<button class="btn btn-primary btn-sm" onclick="joinRoom(${room.id}, ${room.isPrivate})">Entrar</button>` : 
                               '<button class="btn btn-secondary btn-sm" disabled>Indisponível</button>'}
                </div>
            </div>
        `;
    }).join('');
}

window.joinRoom = function(roomId, isPrivate) {
    if (isPrivate) {
        document.getElementById('joinRoomId').textContent = roomId;
        document.getElementById('joinRoomModal').classList.add('show');
        
        document.getElementById('confirmJoinRoom').onclick = () => {
            const password = document.getElementById('joinRoomPassword').value;
            sendCommand('join_room', { roomId, password });
            document.getElementById('joinRoomModal').classList.remove('show');
            document.getElementById('joinRoomPassword').value = '';
        };
        
        document.getElementById('cancelJoinRoom').onclick = () => {
            document.getElementById('joinRoomModal').classList.remove('show');
            document.getElementById('joinRoomPassword').value = '';
        };
    } else {
        sendCommand('join_room', { roomId, password: '' });
    }
};

// ========== SALA ==========
function displayRoom(room) {
    document.getElementById('currentRoomId').textContent = room.id;
    document.getElementById('roomOwner').textContent = room.ownerName;
    document.getElementById('maxPlayerCount').textContent = room.maxPlayers;
    document.getElementById('roomTimeLimit').textContent = room.timeLimit > 0 ? `${room.timeLimit}s` : 'Sem limite';
    
    updatePlayersList(room.players);
    
    const startBtn = document.getElementById('startGameBtn');
    startBtn.style.display = isOwner ? 'block' : 'none';
}

function updatePlayersList(players) {
    const container = document.getElementById('playersList');
    document.getElementById('playerCount').textContent = players.length;
    
    container.innerHTML = players.map(player => `
        <div class="player-item">
            <span class="player-name">${player.name}</span>
            ${player.id === currentRoom.ownerId ? '<span class="badge badge-warning">Dono</span>' : ''}
        </div>
    `).join('');
}

document.getElementById('leaveRoomBtn').addEventListener('click', () => {
    sendCommand('leave_room');
});

document.getElementById('startGameBtn').addEventListener('click', () => {
    sendCommand('start_game');
});

// ========== JOGO ==========
function startGame(data) {
    showScreen('game');
    document.getElementById('attemptsLeft').textContent = '5';
    document.getElementById('guessesContainer').innerHTML = '';
    document.getElementById('gameActivity').innerHTML = '';
    document.getElementById('guessInput').value = '';
    document.getElementById('guessInput').disabled = false;
    document.getElementById('submitGuessBtn').disabled = false;
    
    // Reset keyboard
    document.querySelectorAll('.key').forEach(key => {
        key.className = 'key';
        if (key.dataset.key === 'ENTER' || key.dataset.key === 'BACKSPACE') {
            key.classList.add('key-wide');
        }
    });
    
    // Display players
    displayGamePlayers(data.players);
    
    // Start timer
    if (data.timeLimit > 0) {
        startTimer(data.timeLimit);
    } else {
        document.getElementById('timeRemaining').textContent = '∞';
    }
    
    addGameActivity('Partida iniciada! Boa sorte! 🍀', 'info');
}

function displayGamePlayers(players) {
    const container = document.getElementById('gamePlayers');
    container.innerHTML = players.map(name => `
        <div class="game-player-item">
            <span class="player-indicator">🟢</span>
            <span>${name}</span>
        </div>
    `).join('');
}

function startTimer(seconds) {
    if (timerInterval) clearInterval(timerInterval);
    
    let remaining = seconds;
    const display = document.getElementById('timeRemaining');
    
    timerInterval = setInterval(() => {
        remaining--;
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        display.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        
        if (remaining <= 0) {
            clearInterval(timerInterval);
        }
    }, 1000);
}

function addGameActivity(message, type = 'info') {
    const container = document.getElementById('gameActivity');
    const item = document.createElement('div');
    item.className = `activity-item activity-${type}`;
    item.textContent = message;
    container.insertBefore(item, container.firstChild);
    
    // Limitar a 10 itens
    while (container.children.length > 10) {
        container.removeChild(container.lastChild);
    }
}

// Input de guess
document.getElementById('guessInput').addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

document.getElementById('guessInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        submitGuess();
    }
});

document.getElementById('submitGuessBtn').addEventListener('click', submitGuess);

function submitGuess() {
    const input = document.getElementById('guessInput');
    const word = input.value.trim().toUpperCase();
    
    if (word.length !== 5) {
        showToast('A palavra deve ter 5 letras', 'error');
        return;
    }
    
    if (!/^[A-Z]+$/.test(word)) {
        showToast('Apenas letras são permitidas', 'error');
        return;
    }
    
    sendCommand('guess', { word });
    input.value = '';
}

// Teclado virtual
document.querySelectorAll('.key').forEach(key => {
    key.addEventListener('click', () => {
        const input = document.getElementById('guessInput');
        const letter = key.dataset.key;
        
        if (letter === 'ENTER') {
            submitGuess();
        } else if (letter === 'BACKSPACE') {
            input.value = input.value.slice(0, -1);
        } else if (input.value.length < 5) {
            input.value += letter;
        }
        
        input.focus();
    });
});

function handleGuessResult(data) {
    const container = document.getElementById('guessesContainer');
    
    // Criar linha de tentativa
    const guessRow = document.createElement('div');
    guessRow.className = 'guess-row';
    
    for (let i = 0; i < 5; i++) {
        const tile = document.createElement('div');
        tile.className = `tile tile-${data.feedback[i]}`;
        tile.textContent = data.guess[i];
        guessRow.appendChild(tile);
        
        // Animar
        setTimeout(() => {
            tile.classList.add('flip');
        }, i * 100);
    }
    
    container.appendChild(guessRow);
    
    // Atualizar teclado
    for (let i = 0; i < 5; i++) {
        const letter = data.guess[i];
        const feedback = data.feedback[i];
        const keyEl = document.querySelector(`.key[data-key="${letter}"]`);
        
        if (keyEl && !keyEl.classList.contains('key-correct')) {
            if (feedback === 'correct') {
                keyEl.classList.add('key-correct');
            } else if (feedback === 'present' && !keyEl.classList.contains('key-present')) {
                keyEl.classList.add('key-present');
            } else if (feedback === 'absent') {
                keyEl.classList.add('key-absent');
            }
        }
    }
    
    // Atualizar tentativas
    document.getElementById('attemptsLeft').textContent = data.attemptsLeft;
    
    if (data.won) {
        document.getElementById('guessInput').disabled = true;
        document.getElementById('submitGuessBtn').disabled = true;
        showToast('🎉 Parabéns! Você venceu!', 'success');
        addGameActivity('Você acertou a palavra!', 'success');
    } else if (data.eliminated) {
        document.getElementById('guessInput').disabled = true;
        document.getElementById('submitGuessBtn').disabled = true;
        showToast('❌ Você foi eliminado', 'error');
        addGameActivity('Suas tentativas acabaram', 'error');
    } else {
        addGameActivity(`Tentativa: ${data.guess}`, 'info');
    }
}

function showGameResult(data) {
    if (timerInterval) clearInterval(timerInterval);
    
    const modal = document.getElementById('resultModal');
    const content = document.getElementById('resultContent');
    
    const reasonText = data.reason === 'timeout' ? 'Tempo esgotado' : 'Todos terminaram';
    
    content.innerHTML = `
        <div class="result-info">
            <h3>A palavra era: <span class="word-reveal">${data.word}</span></h3>
            <p class="reason">Motivo: ${reasonText}</p>
        </div>
        
        <div class="results-table">
            <h3>📊 Resultados</h3>
            ${data.results.map((result, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                const statusClass = result.won ? 'success' : 'error';
                const statusText = result.won ? 'VENCEU' : 'PERDEU';
                
                return `
                    <div class="result-row">
                        <span class="medal">${medal}</span>
                        <span class="player-name">${result.name}</span>
                        <span class="badge badge-${statusClass}">${statusText}</span>
                        <span class="attempts">${result.attempts} tentativas</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    modal.classList.add('show');
}

document.getElementById('backToRoomBtn').addEventListener('click', () => {
    document.getElementById('resultModal').classList.remove('show');
    showScreen('room');
    currentState = 'in_room';
});

// Fechar modal ao clicar fora
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }
});
