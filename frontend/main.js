const { app, BrowserWindow } = require('electron');
const path = require('path');

function criarJanela() {
    const janela = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        backgroundColor: '#1a1a2e',
        icon: path.join(__dirname, 'assets', 'icon.png'),
        title: 'Palavramos - Wordle Multiplayer'
    });

    janela.loadFile('index.html');

    // Abrir DevTools em desenvolvimento
    // janela.webContents.openDevTools();
}

app.whenReady().then(() => {
    criarJanela();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            criarJanela();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
