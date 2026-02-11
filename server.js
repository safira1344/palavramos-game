const net = require('net');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const HOST = '0.0.0.0';

// Estruturas de dados
const clients = new Map(); // socketId -> client info
const rooms = new Map(); // roomId -> room info
let nextRoomId = 1;

// Carregar palavras do banco de dados
function loadWords() {
    try {
        const content = fs.readFileSync(path.join(__dirname, 'bd.txt'), 'utf-8');
        const words = content.split('\n')
            .map(w => w.trim().toUpperCase())
            .filter(w => w.length === 5);
        return words;
    } catch (err) {
        console.error('Erro ao carregar bd.txt:', err.message);
        return [];
    }
}

const WORDS = loadWords();
console.log(`${WORDS.length} palavras carregadas do banco de dados`);

// Gerar palavra aleatória
function getRandomWord() {
    return WORDS[Math.floor(Math.random() * WORDS.length)];
}

// Criar sala
function createRoom(ownerId, ownerName, maxPlayers, timeLimit, isPrivate, password) {
    const roomId = nextRoomId++;
    const room = {
        id: roomId,
        ownerId,
        ownerName,
        maxPlayers,
        timeLimit, // em segundos
        isPrivate,
        password: isPrivate ? password : null,
        players: [{ id: ownerId, name: ownerName, ready: true }],
        state: 'waiting', // waiting, playing, finished
        word: null,
        startTime: null,
        gameData: {} // playerId -> { attempts: [], finished: false, won: false }
    };
    rooms.set(roomId, room);
    return room;
}

// Enviar mensagem para cliente
function sendToClient(socket, type, data) {
    try {
        const message = JSON.stringify({ type, data }) + '\n';
        socket.write(message);
    } catch (err) {
        console.error('Erro ao enviar mensagem:', err.message);
    }
}

// Broadcast para todos na sala
function broadcastToRoom(roomId, type, data, excludeSocketId = null) {
    const room = rooms.get(roomId);
    if (!room) return;

    room.players.forEach(player => {
        const client = clients.get(player.id);
        if (client && client.socket && player.id !== excludeSocketId) {
            sendToClient(client.socket, type, data);
        }
    });
}

// Verificar vitória
function checkWin(guess, word) {
    return guess.toUpperCase() === word.toUpperCase();
}

// Gerar feedback do Wordle
function generateFeedback(guess, word) {
    guess = guess.toUpperCase();
    word = word.toUpperCase();
    
    const feedback = [];
    const wordLetters = word.split('');
    const guessLetters = guess.split('');
    const used = new Array(5).fill(false);

    // Primeira passagem: marcar corretos
    for (let i = 0; i < 5; i++) {
        if (guessLetters[i] === wordLetters[i]) {
            feedback[i] = 'correct';
            used[i] = true;
        }
    }

    // Segunda passagem: marcar presentes
    for (let i = 0; i < 5; i++) {
        if (feedback[i] === 'correct') continue;
        
        let found = false;
        for (let j = 0; j < 5; j++) {
            if (!used[j] && guessLetters[i] === wordLetters[j]) {
                feedback[i] = 'present';
                used[j] = true;
                found = true;
                break;
            }
        }
        
        if (!found) {
            feedback[i] = 'absent';
        }
    }

    return feedback;
}

// Iniciar jogo
function startGame(roomId) {
    const room = rooms.get(roomId);
    if (!room || room.state !== 'waiting') return;

    room.state = 'playing';
    room.word = getRandomWord();
    room.startTime = Date.now();
    room.gameData = {};

    // Inicializar dados do jogo para cada jogador
    room.players.forEach(player => {
        room.gameData[player.id] = {
            attempts: [],
            finished: false,
            won: false,
            attemptsLeft: 5
        };
    });

    console.log(`Sala ${roomId} iniciada! Palavra: ${room.word}`);

    // Notificar todos os jogadores
    broadcastToRoom(roomId, 'game_started', {
        roomId,
        timeLimit: room.timeLimit,
        players: room.players.map(p => p.name)
    });

    // Timer da partida
    if (room.timeLimit > 0) {
        setTimeout(() => {
            endGame(roomId, 'timeout');
        }, room.timeLimit * 1000);
    }
}

// Finalizar jogo
function endGame(roomId, reason) {
    const room = rooms.get(roomId);
    if (!room || room.state !== 'playing') return;

    room.state = 'finished';
    
    const results = room.players.map(player => ({
        name: player.name,
        won: room.gameData[player.id]?.won || false,
        attempts: room.gameData[player.id]?.attempts.length || 0
    }));

    broadcastToRoom(roomId, 'game_ended', {
        reason,
        word: room.word,
        results
    });

    console.log(`Sala ${roomId} finalizada. Motivo: ${reason}`);

    // Resetar sala
    setTimeout(() => {
        room.state = 'waiting';
        room.word = null;
        room.startTime = null;
        room.gameData = {};
        
        broadcastToRoom(roomId, 'room_reset', {});
    }, 5000);
}

// Handler de comandos
function handleCommand(socket, socketId, message) {
    const client = clients.get(socketId);
    if (!client) return;

    const { type, data } = message;

    switch (type) {
        case 'set_name':
            client.name = data.name;
            sendToClient(socket, 'name_set', { name: data.name });
            break;

        case 'list_rooms':
            const roomsList = Array.from(rooms.values()).map(room => ({
                id: room.id,
                ownerName: room.ownerName,
                players: room.players.length,
                maxPlayers: room.maxPlayers,
                isPrivate: room.isPrivate,
                state: room.state
            }));
            sendToClient(socket, 'rooms_list', { rooms: roomsList });
            break;

        case 'create_room':
            if (!client.name) {
                sendToClient(socket, 'error', { message: 'Defina seu nome primeiro' });
                break;
            }
            const room = createRoom(
                socketId,
                client.name,
                data.maxPlayers || 2,
                data.timeLimit || 300,
                data.isPrivate || false,
                data.password || null
            );
            client.roomId = room.id;
            sendToClient(socket, 'room_created', {
                roomId: room.id,
                room: {
                    id: room.id,
                    ownerName: room.ownerName,
                    players: room.players,
                    maxPlayers: room.maxPlayers,
                    state: room.state
                }
            });
            console.log(`Sala ${room.id} criada por ${client.name}`);
            break;

        case 'join_room':
            if (!client.name) {
                sendToClient(socket, 'error', { message: 'Defina seu nome primeiro' });
                break;
            }
            
            const roomToJoin = rooms.get(data.roomId);
            if (!roomToJoin) {
                sendToClient(socket, 'error', { message: 'Sala não encontrada' });
                break;
            }

            if (roomToJoin.state !== 'waiting') {
                sendToClient(socket, 'error', { message: 'Sala já iniciou o jogo' });
                break;
            }

            if (roomToJoin.players.length >= roomToJoin.maxPlayers) {
                sendToClient(socket, 'error', { message: 'Sala está cheia' });
                break;
            }

            if (roomToJoin.isPrivate && roomToJoin.password !== data.password) {
                sendToClient(socket, 'error', { message: 'Senha incorreta' });
                break;
            }

            roomToJoin.players.push({ id: socketId, name: client.name, ready: true });
            client.roomId = roomToJoin.id;

            sendToClient(socket, 'room_joined', {
                roomId: roomToJoin.id,
                room: {
                    id: roomToJoin.id,
                    ownerName: roomToJoin.ownerName,
                    players: roomToJoin.players,
                    maxPlayers: roomToJoin.maxPlayers,
                    state: roomToJoin.state
                }
            });

            broadcastToRoom(roomToJoin.id, 'player_joined', {
                playerName: client.name,
                players: roomToJoin.players
            }, socketId);

            console.log(`${client.name} entrou na sala ${roomToJoin.id}`);
            break;

        case 'leave_room':
            if (!client.roomId) {
                sendToClient(socket, 'error', { message: 'Você não está em nenhuma sala' });
                break;
            }

            const currentRoom = rooms.get(client.roomId);
            if (currentRoom) {
                currentRoom.players = currentRoom.players.filter(p => p.id !== socketId);
                
                broadcastToRoom(currentRoom.id, 'player_left', {
                    playerName: client.name,
                    players: currentRoom.players
                });

                // Se sala ficou vazia ou dono saiu, deletar sala
                if (currentRoom.players.length === 0 || currentRoom.ownerId === socketId) {
                    rooms.delete(currentRoom.id);
                    console.log(`Sala ${currentRoom.id} deletada`);
                }
            }

            client.roomId = null;
            sendToClient(socket, 'room_left', {});
            break;

        case 'start_game':
            if (!client.roomId) {
                sendToClient(socket, 'error', { message: 'Você não está em nenhuma sala' });
                break;
            }

            const roomToStart = rooms.get(client.roomId);
            if (!roomToStart) {
                sendToClient(socket, 'error', { message: 'Sala não encontrada' });
                break;
            }

            if (roomToStart.ownerId !== socketId) {
                sendToClient(socket, 'error', { message: 'Apenas o dono pode iniciar' });
                break;
            }

            if (roomToStart.players.length < 1) {
                sendToClient(socket, 'error', { message: 'Sala precisa de pelo menos 1 jogador' });
                break;
            }

            startGame(roomToStart.id);
            break;

        case 'guess':
            if (!client.roomId) {
                sendToClient(socket, 'error', { message: 'Você não está em nenhuma sala' });
                break;
            }

            const gameRoom = rooms.get(client.roomId);
            if (!gameRoom || gameRoom.state !== 'playing') {
                sendToClient(socket, 'error', { message: 'Jogo não está em andamento' });
                break;
            }

            const playerData = gameRoom.gameData[socketId];
            if (!playerData) {
                sendToClient(socket, 'error', { message: 'Dados do jogador não encontrados' });
                break;
            }

            if (playerData.finished) {
                sendToClient(socket, 'error', { message: 'Você já terminou suas tentativas' });
                break;
            }

            const guess = data.word.toUpperCase();
            if (guess.length !== 5) {
                sendToClient(socket, 'error', { message: 'Palavra deve ter 5 letras' });
                break;
            }

            // Processar tentativa
            const feedback = generateFeedback(guess, gameRoom.word);
            const won = checkWin(guess, gameRoom.word);

            playerData.attempts.push({ word: guess, feedback });
            playerData.attemptsLeft--;

            if (won) {
                playerData.finished = true;
                playerData.won = true;
                
                sendToClient(socket, 'guess_result', {
                    guess,
                    feedback,
                    won: true,
                    attemptsLeft: playerData.attemptsLeft
                });

                broadcastToRoom(gameRoom.id, 'player_won', {
                    playerName: client.name,
                    attempts: playerData.attempts.length
                }, socketId);

                // Verificar se todos terminaram
                const allFinished = Object.values(gameRoom.gameData).every(pd => pd.finished);
                if (allFinished) {
                    endGame(gameRoom.id, 'all_finished');
                }
            } else {
                if (playerData.attemptsLeft === 0) {
                    playerData.finished = true;
                    
                    sendToClient(socket, 'guess_result', {
                        guess,
                        feedback,
                        won: false,
                        attemptsLeft: 0,
                        eliminated: true
                    });

                    broadcastToRoom(gameRoom.id, 'player_eliminated', {
                        playerName: client.name
                    }, socketId);

                    // Verificar se todos terminaram
                    const allFinished = Object.values(gameRoom.gameData).every(pd => pd.finished);
                    if (allFinished) {
                        endGame(gameRoom.id, 'all_finished');
                    }
                } else {
                    sendToClient(socket, 'guess_result', {
                        guess,
                        feedback,
                        won: false,
                        attemptsLeft: playerData.attemptsLeft
                    });
                }
            }
            break;

        default:
            sendToClient(socket, 'error', { message: 'Comando desconhecido' });
    }
}

// Criar servidor
const server = net.createServer((socket) => {
    const socketId = `${socket.remoteAddress}:${socket.remotePort}`;
    
    clients.set(socketId, {
        socket,
        name: null,
        roomId: null
    });

    console.log(`Cliente conectado: ${socketId}`);
    sendToClient(socket, 'connected', { message: 'Bem-vindo ao Palavramos!' });

    let buffer = '';

    socket.on('data', (data) => {
        buffer += data.toString();
        
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            const line = buffer.substring(0, newlineIndex);
            buffer = buffer.substring(newlineIndex + 1);
            
            try {
                const message = JSON.parse(line);
                handleCommand(socket, socketId, message);
            } catch (err) {
                console.error('Erro ao parsear mensagem:', err.message);
                sendToClient(socket, 'error', { message: 'Mensagem inválida' });
            }
        }
    });

    socket.on('end', () => {
        console.log(`Cliente desconectado: ${socketId}`);
        
        const client = clients.get(socketId);
        if (client && client.roomId) {
            const room = rooms.get(client.roomId);
            if (room) {
                room.players = room.players.filter(p => p.id !== socketId);
                
                broadcastToRoom(room.id, 'player_left', {
                    playerName: client.name,
                    players: room.players
                });

                if (room.players.length === 0 || room.ownerId === socketId) {
                    rooms.delete(room.id);
                    console.log(`Sala ${room.id} deletada`);
                }
            }
        }
        
        clients.delete(socketId);
    });

    socket.on('error', (err) => {
        console.error(`Erro no socket ${socketId}:`, err.message);
    });
});

server.listen(PORT, HOST, () => {
    console.log(`🎮 Servidor Palavramos rodando em ${HOST}:${PORT}`);
    console.log(`📚 ${WORDS.length} palavras disponíveis`);
});
