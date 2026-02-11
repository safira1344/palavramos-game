class Cliente {
    constructor(socket, idSocket) {
        this.socket = socket;
        this.id = idSocket;
        this.nome = null;
        this.idSala = null;
    }

    setNome(nome) {
        this.nome = nome;
    }

    setSala(idSala) {
        this.idSala = idSala;
    }

    limparSala() {
        this.idSala = null;
    }
}

module.exports = Cliente;
