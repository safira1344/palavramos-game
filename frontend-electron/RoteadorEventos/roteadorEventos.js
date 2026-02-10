/**
 * Roteia eventos recebidos (geralmente do servidor TCP) para o processo de renderização (Angular).
 * @param {Electron.BrowserWindow} browserWindow - A instância da janela principal do Electron.
 * @param {object} eventData - O objeto de evento.
 * @param {string} eventData.evento - O nome do canal/evento a ser enviado para o Angular.
 * @param {*} eventData.dados - Os dados a serem enviados.
 */
export function rotearEventos(browserWindow, eventData) {
  const { evento, dados } = eventData;

  if (!evento) {
    console.error('Roteador de Eventos: O campo "evento" está faltando nos dados recebidos.', eventData);
    return;
  }

  if (browserWindow && !browserWindow.isDestroyed()) {
    console.log(`Roteando evento '${evento}' para o Angular com dados:`, dados);
    // Envia o evento e os dados para o processo de renderização (Angular)
    // O Angular estará ouvindo neste canal (ex: 'listar_salas')
    browserWindow.webContents.send(evento, dados);
  } else {
    console.error('Roteador de Eventos: A janela do navegador não está disponível para enviar o evento.');
  }
}
