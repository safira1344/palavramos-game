export const enviarPalavra = (palavra) => {

    window.palavraMos.send('verificar_palavra',palavra);
}


export const iniciarPartida = ({idSala}) =>{
    window.palavraMos.send('iniciar_partida',idSala);
}


export const solicitarSalas = () => {
    window.palavraMos.send('listar_salas');
}


export const entrarSala = ({idSala,chave}) => {
    window.palavraMos.send('entrar_sala_multiplayer',{
        idSala: idSala,
        chave: chave
    });
}


export const sairSala = (idSala) => {
    window.palavraMos.send('sair_sala_multiplayer',
        idSala
    );
}


export const criarSala = ({nomeUsuario, privacidade, quantidadeRodadas, maxJogadores, jogador}) => {


    window.palavraMos.send('criar_partida_multiplayer',{
        nomeUsuario:nomeUsuario,
        privacidade:privacidade,
        quantidadeRodadas:quantidadeRodadas,
        maxJogadores: maxJogadores,
        jogador: jogador
    });
}