export function rotearEventos(browserWindow, eventData) {
  const { evento, dados } = eventData;

  if (!evento) {
    console.error('Roteador de Eventos: O campo "evento" está faltando nos dados recebidos.', eventData);
    return;
  }

  if (browserWindow && !browserWindow.isDestroyed()) {
    console.log(`Roteando evento '${evento}' para o Angular com dados:`, dados);
    browserWindow.webContents.send(evento, dados);
  } else {
    console.error('Roteador de Eventos: A janela do navegador não está disponível para enviar o evento.');
  }
}
