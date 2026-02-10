export const enviarPalavra = (palavra) => {
    window.PalavraMos.enviarParaSocket({evento:'verificar_palavra',dados:palavra});
}


export const iniciarPartida = ({idSala}) =>{
    window.PalavraMos.enviarParaSocket({evento:'iniciar_partida',dados:idSala});
}


export const solicitarSalas = () => {
    window.PalavraMos.enviarParaSocket({evento:'listar_salas'});
}


export const entrarSala = ({idSala,chave}) => {
    window.PalavraMos.enviarParaSocket({evento:'entrar_sala_multiplayer',dados:{
        idSala: idSala,
        chave: chave
    }
});
}


export const sairSala = (idSala) => {
    window.PalavraMos.enviarParaSocket({evento:'sair_sala_multiplayer',dados:{
        idSala:idSala
    }});
}


export const criarSala = ({nomeUsuario, privacidade, quantidadeRodadas}) => {
    window.PalavraMos.enviarParaSocket({evento:'criar_partida_multiplayer',dados:{
        nomeUsuario:nomeUsuario,
        privacidade:privacidade,
        quantidadeRodadas:quantidadeRodadas
    }});
}