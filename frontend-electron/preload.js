const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('palavraMos', {
  /**
   * Envia um evento para o processo principal.
   * @param {string} channel - O nome do canal/evento.
   * @param {*} data - Os dados a serem enviados.
   */
  send: (channel, data) => {
    ipcRenderer.send('send-to-main', { channel, data });
  },

  /**
   * Registra um listener para um evento vindo do processo principal.
   * @param {string} channel - O nome do canal/evento a ser ouvido.
   * @param {Function} func - A função de callback a ser executada com os dados recebidos.
   * @returns {Function} Uma função para remover o listener.
   */
  on: (channel, func) => {
    const subscription = (_event, ...args) => func(...args);
    ipcRenderer.on(channel, subscription);

    // Retorna uma função para que o componente possa se desinscrever do evento
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  }
});
