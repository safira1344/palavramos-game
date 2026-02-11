const net = require('net');
const readline = require('readline');

const HOST = 'localhost';
const PORT = 3000;

let socket = null;
let currentState = 'disconnected'; // disconnected, connected, lobby, in_room, playing
let currentRoom = null;
let playerName = null;
let isOwner = false;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
});

// Cores para o terminal
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgGray: '\x1b[100m'
};

function colorText(text, color) {
    return `${color}${text}${colors.reset}`;
}

function printHeader(text) {
    console.log('\n' + colorText('═'.repeat(60), colors.cyan));
    console.log(colorText(`  ${text}`, colors.bright + colors.cyan));
    console.log(colorText('═'.repeat(60), colors.cyan) + '\n');
}

function printBox(lines) {
    const maxLen = Math.max(...lines.map(l => l.length));
    console.log(colorText('┌─' + '─'.repeat(maxLen) + '─┐', colors.cyan));
    lines.forEach(line => {
        const padding = ' '.repeat(maxLen - line.length);
        console.log(colorText('│ ', colors.cyan) + line + padding + colorText(' │', colors.cyan));
    });
    console.log(colorText('└─' + '─'.repeat(maxLen) + '─┘', colors.cyan));
}

function printFeedback(word, feedback) {
    let output = '  ';
    for (let i = 0; i < word.length; i++) {
        const letter = word[i];
        if (feedback[i] === 'correct') {
            output += colorText(` ${letter} `, colors.bright + colors.bgGreen);
        } else if (feedback[i] === 'present') {
            output += colorText(` ${letter} `, colors.bright + colors.bgYellow);
        } else {
            output += colorText(` ${letter} `, colors.bgGray);
        }
        output += ' ';
    }
    console.log(output);
}

function sendCommand(type, data = {}) {
    if (!socket) return;
    try {
        const message = JSON.stringify({ type, data }) + '\n';
        socket.write(message);
    } catch (err) {
        console.error(colorText('❌ Erro ao enviar comando', colors.red));
    }
}

function showWelcome() {
    printHeader('🎮 PALAVRAMOS - Wordle Multiplayer');
    console.log(colorText('Bem-vindo ao Palavramos!', colors.bright));
    console.log('\nConectando ao servidor...\n');
}

function showMainMenu() {
    printHeader('MENU PRINCIPAL');
    console.log(colorText('Comandos disponíveis:', colors.bright));
    console.log('  ' + colorText('nome <seu_nome>', colors.cyan) + ' - Definir seu nome');
    console.log('  ' + colorText('listar', colors.cyan) + '          - Ver salas disponíveis');
    console.log('  ' + colorText('criar', colors.cyan) + '           - Criar nova sala');
    console.log('  ' + colorText('entrar <id>', colors.cyan) + '    - Entrar em uma sala');
    console.log('  ' + colorText('sair', colors.cyan) + '            - Desconectar');
    console.log();
}

function showRoomMenu() {
    printHeader('SALA DE ESPERA');
    console.log(colorText('Comandos disponíveis:', colors.bright));
    if (isOwner) {
        console.log('  ' + colorText('iniciar', colors.cyan) + ' - Iniciar partida');
    }
    console.log('  ' + colorText('sair', colors.cyan) + '    - Sair da sala');
    console.log();
}

function showGameMenu() {
    printHeader('JOGO EM ANDAMENTO');
    console.log(colorText('Digite uma palavra de 5 letras para fazer sua tentativa', colors.bright));
    console.log(colorText('Você tem 5 tentativas para acertar!', colors.yellow));
    console.log();
}

function handleServerMessage(message) {
    const { type, data } = message;

    switch (type) {
        case 'connected':
            console.log(colorText('✅ Conectado ao servidor!', colors.green));
            console.log(colorText(data.message, colors.bright));
            console.log();
            showMainMenu();
            currentState = 'lobby';
            rl.prompt();
            break;

        case 'name_set':
            playerName = data.name;
            console.log(colorText(`✅ Nome definido: ${data.name}`, colors.green));
            rl.prompt();
            break;

        case 'rooms_list':
            console.log();
            printHeader('SALAS DISPONÍVEIS');
            
            if (data.rooms.length === 0) {
                console.log(colorText('  Nenhuma sala disponível. Crie uma nova!', colors.gray));
            } else {
                data.rooms.forEach(room => {
                    const status = room.state === 'waiting' ? colorText('AGUARDANDO', colors.green) :
                                  room.state === 'playing' ? colorText('JOGANDO', colors.yellow) :
                                  colorText('FINALIZADO', colors.gray);
                    const privacy = room.isPrivate ? colorText('🔒 PRIVADA', colors.red) : colorText('🌐 PÚBLICA', colors.green);
                    
                    console.log(colorText(`  [${room.id}]`, colors.bright) + ` ${room.ownerName} - ${room.players}/${room.maxPlayers} jogadores - ${status} - ${privacy}`);
                });
            }
            console.log();
            rl.prompt();
            break;

        case 'room_created':
            currentRoom = data.room;
            currentState = 'in_room';
            isOwner = true;
            console.log(colorText(`✅ Sala ${data.roomId} criada com sucesso!`, colors.green));
            console.log();
            showRoomInfo(currentRoom);
            showRoomMenu();
            rl.prompt();
            break;

        case 'room_joined':
            currentRoom = data.room;
            currentState = 'in_room';
            isOwner = false;
            console.log(colorText(`✅ Entrou na sala ${data.roomId}`, colors.green));
            console.log();
            showRoomInfo(currentRoom);
            showRoomMenu();
            rl.prompt();
            break;

        case 'player_joined':
            currentRoom.players = data.players;
            console.log(colorText(`\n👤 ${data.playerName} entrou na sala!`, colors.cyan));
            showRoomInfo(currentRoom);
            rl.prompt();
            break;

        case 'player_left':
            if (currentRoom) {
                currentRoom.players = data.players;
                console.log(colorText(`\n👋 ${data.playerName} saiu da sala`, colors.gray));
                showRoomInfo(currentRoom);
            }
            rl.prompt();
            break;

        case 'room_left':
            currentRoom = null;
            currentState = 'lobby';
            isOwner = false;
            console.log(colorText('✅ Você saiu da sala', colors.green));
            showMainMenu();
            rl.prompt();
            break;

        case 'game_started':
            currentState = 'playing';
            console.log();
            printHeader('🎮 PARTIDA INICIADA!');
            console.log(colorText(`Jogadores: ${data.players.join(', ')}`, colors.bright));
            console.log(colorText(`Tempo limite: ${data.timeLimit}s`, colors.yellow));
            console.log();
            showGameMenu();
            rl.prompt();
            break;

        case 'guess_result':
            console.log();
            printFeedback(data.guess, data.feedback);
            
            if (data.won) {
                console.log(colorText('\n🎉 PARABÉNS! Você acertou a palavra!', colors.bright + colors.green));
                currentState = 'waiting_end';
            } else if (data.eliminated) {
                console.log(colorText(`\n❌ Você foi eliminado! (0 tentativas restantes)`, colors.red));
                console.log(colorText('Aguarde os outros jogadores terminarem...', colors.gray));
                currentState = 'waiting_end';
            } else {
                console.log(colorText(`\n📊 Tentativas restantes: ${data.attemptsLeft}`, colors.yellow));
            }
            console.log();
            rl.prompt();
            break;

        case 'player_won':
            console.log(colorText(`\n🏆 ${data.playerName} acertou a palavra em ${data.attempts} tentativas!`, colors.bright + colors.green));
            rl.prompt();
            break;

        case 'player_eliminated':
            console.log(colorText(`\n💀 ${data.playerName} foi eliminado`, colors.red));
            rl.prompt();
            break;

        case 'game_ended':
            console.log();
            printHeader('🏁 PARTIDA FINALIZADA');
            console.log(colorText(`A palavra era: ${data.word}`, colors.bright + colors.cyan));
            console.log(colorText(`Motivo: ${data.reason === 'timeout' ? 'Tempo esgotado' : 'Todos terminaram'}`, colors.yellow));
            console.log();
            console.log(colorText('📊 RESULTADOS:', colors.bright));
            data.results.forEach((result, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
                const status = result.won ? colorText('VENCEU', colors.green) : colorText('PERDEU', colors.red);
                console.log(`  ${medal} ${result.name} - ${status} (${result.attempts} tentativas)`);
            });
            console.log();
            currentState = 'in_room';
            rl.prompt();
            break;

        case 'room_reset':
            console.log(colorText('\n🔄 Sala resetada. Aguardando próxima partida...', colors.cyan));
            showRoomMenu();
            rl.prompt();
            break;

        case 'error':
            console.log(colorText(`\n❌ Erro: ${data.message}`, colors.red));
            rl.prompt();
            break;

        default:
            console.log(colorText(`Mensagem desconhecida: ${type}`, colors.gray));
            rl.prompt();
    }
}

function showRoomInfo(room) {
    printBox([
        colorText(`Sala #${room.id} - ${room.ownerName}`, colors.bright),
        `Jogadores: ${room.players.length}/${room.maxPlayers}`,
        '',
        colorText('Jogadores esperando:', colors.bright),
        ...room.players.map(p => `  • ${p.name}${p.id === room.ownerId ? ' (dono)' : ''}`)
    ]);
}

function handleInput(line) {
    const input = line.trim();
    if (!input) {
        rl.prompt();
        return;
    }

    const [cmd, ...args] = input.split(' ');
    const command = cmd.toLowerCase();

    if (currentState === 'lobby') {
        switch (command) {
            case 'nome':
                if (args.length === 0) {
                    console.log(colorText('❌ Use: nome <seu_nome>', colors.red));
                } else {
                    sendCommand('set_name', { name: args.join(' ') });
                }
                break;

            case 'listar':
                sendCommand('list_rooms');
                break;

            case 'criar':
                if (!playerName) {
                    console.log(colorText('❌ Defina seu nome primeiro com: nome <seu_nome>', colors.red));
                    break;
                }
                
                console.log();
                rl.question('Número máximo de jogadores (2-10): ', (max) => {
                    const maxPlayers = parseInt(max) || 2;
                    rl.question('Tempo limite em segundos (0 para sem limite): ', (time) => {
                        const timeLimit = parseInt(time) || 300;
                        rl.question('Sala privada? (s/n): ', (priv) => {
                            const isPrivate = priv.toLowerCase() === 's';
                            if (isPrivate) {
                                rl.question('Senha da sala: ', (pass) => {
                                    sendCommand('create_room', {
                                        maxPlayers: Math.max(2, Math.min(10, maxPlayers)),
                                        timeLimit,
                                        isPrivate,
                                        password: pass
                                    });
                                    rl.prompt();
                                });
                            } else {
                                sendCommand('create_room', {
                                    maxPlayers: Math.max(2, Math.min(10, maxPlayers)),
                                    timeLimit,
                                    isPrivate: false
                                });
                                rl.prompt();
                            }
                        });
                    });
                });
                return;

            case 'entrar':
                if (!playerName) {
                    console.log(colorText('❌ Defina seu nome primeiro com: nome <seu_nome>', colors.red));
                    break;
                }
                
                if (args.length === 0) {
                    console.log(colorText('❌ Use: entrar <id_da_sala>', colors.red));
                } else {
                    const roomId = parseInt(args[0]);
                    rl.question('Senha (deixe vazio se pública): ', (password) => {
                        sendCommand('join_room', { roomId, password });
                        rl.prompt();
                    });
                    return;
                }
                break;

            case 'sair':
                console.log(colorText('👋 Desconectando...', colors.yellow));
                process.exit(0);
                break;

            default:
                console.log(colorText('❌ Comando desconhecido', colors.red));
                showMainMenu();
        }
    } else if (currentState === 'in_room') {
        switch (command) {
            case 'iniciar':
                if (!isOwner) {
                    console.log(colorText('❌ Apenas o dono da sala pode iniciar', colors.red));
                } else {
                    sendCommand('start_game');
                }
                break;

            case 'sair':
                sendCommand('leave_room');
                break;

            default:
                console.log(colorText('❌ Comando desconhecido', colors.red));
                showRoomMenu();
        }
    } else if (currentState === 'playing') {
        // Durante o jogo, qualquer input é uma tentativa
        const word = input.toUpperCase();
        if (word.length !== 5) {
            console.log(colorText('❌ A palavra deve ter exatamente 5 letras', colors.red));
        } else if (!/^[A-Z]+$/.test(word)) {
            console.log(colorText('❌ A palavra deve conter apenas letras', colors.red));
        } else {
            sendCommand('guess', { word });
            return; // Não mostra prompt, espera resposta do servidor
        }
    } else if (currentState === 'waiting_end') {
        console.log(colorText('⏳ Aguardando fim da partida...', colors.gray));
    }

    rl.prompt();
}

function connectToServer() {
    socket = net.createConnection(PORT, HOST, () => {
        // Conexão estabelecida
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
                console.error(colorText('❌ Erro ao processar mensagem do servidor', colors.red));
            }
        }
    });

    socket.on('end', () => {
        console.log(colorText('\n❌ Conexão com servidor encerrada', colors.red));
        process.exit(0);
    });

    socket.on('error', (err) => {
        console.error(colorText(`❌ Erro de conexão: ${err.message}`, colors.red));
        process.exit(1);
    });
}

// Iniciar
showWelcome();
connectToServer();

rl.on('line', handleInput);

rl.on('close', () => {
    console.log(colorText('\n👋 Até logo!', colors.yellow));
    process.exit(0);
});
