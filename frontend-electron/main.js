import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { app, BrowserWindow, ipcMain } = require('electron');
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'net';
import { rotearEventos } from './RoteadorEventos/roteadorEventos.js';

let janelaPrincipal;
let clientSocket;

function criarConexaoSocketTcp() {
    clientSocket = net.createConnection({ host: '127.0.0.1', port: 3100 }, () => {
        console.log('Conectado ao servidor TCP');
        janelaPrincipal.webContents.send('tcp-status', 'Conectado');
    });

    clientSocket.on('data', (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log('Dados recebidos do servidor:', message);
            // Roteia o evento vindo do socket para o Angular
            rotearEventos(janelaPrincipal, message);
        } catch (error) {
            console.error('Erro ao processar dados do socket:', error);
            console.log('Dados brutos:', data.toString());
        }
    });

    clientSocket.on('end', () => {
        console.log('Desconectado do servidor TCP');
        janelaPrincipal.webContents.send('tcp-status', 'Desconectado');
    });

    clientSocket.on('error', (err) => {
        console.error('Erro no socket TCP:', err.message);
        janelaPrincipal.webContents.send('tcp-status', 'Erro');
    });
}

function criarJanela() {
    const nomeArquivo = fileURLToPath(import.meta.url);
    const diretorioArquivo = path.dirname(nomeArquivo);
    janelaPrincipal = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(diretorioArquivo, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
    });

    janelaPrincipal.loadFile(path.join(diretorioArquivo, 'src-ui/dist/app/browser/index.html'));
    // janelaPrincipal.webContents.openDevTools(); // Descomente para depuração
}

app.whenReady().then(() => {
    criarJanela();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            criarJanela();
        }
    });

    criarConexaoSocketTcp();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Listener para todos os eventos vindos do Angular
ipcMain.on('send-to-main', (event, { channel, data }) => {
    console.log(`Evento recebido do Angular no canal '${channel}':`, data);

    // Aqui, você pode decidir o que fazer com o evento.
    // Por exemplo, enviar para o socket TCP.
    if (clientSocket && clientSocket.writable) {
        const message = JSON.stringify({ evento: channel, dados: data });
        clientSocket.write(message);
    } else {
        console.error('Socket não está conectado ou não é gravável.');
        // Você pode querer enviar uma resposta de erro para o Angular
        janelaPrincipal.webContents.send('error', { message: 'Não foi possível enviar a mensagem para o servidor.' });
    }
});