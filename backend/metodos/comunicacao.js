function enviarParaCliente(socket, tipo, dados) {
    try {
        const mensagem = JSON.stringify({ tipo, dados }) + '\n';
        socket.write(mensagem);
    } catch (erro) {
        console.error('Erro ao enviar mensagem:', erro.message);
    }
}

function transmitirParaSala(clientes, salas) {
    return (idSala, tipo, dados, excluirIdSocket = null) => {
        const sala = salas.get(idSala);
        if (!sala) return;

        sala.jogadores.forEach(jogador => {
            const cliente = clientes.get(jogador.id);
            if (cliente && cliente.socket && jogador.id !== excluirIdSocket) {
                enviarParaCliente(cliente.socket, tipo, dados);
            }
        });
    };
}

module.exports = {
    enviarParaCliente,
    transmitirParaSala
};
