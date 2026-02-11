class Sala {
    constructor(id, idDono, nomeDono, maxJogadores, limiteTempo, ehPrivada, senha) {
        this.id = id;
        this.idDono = idDono;
        this.nomeDono = nomeDono;
        this.maxJogadores = maxJogadores;
        this.limiteTempo = limiteTempo;
        this.ehPrivada = ehPrivada;
        this.senha = ehPrivada ? senha : null;
        this.jogadores = [{ id: idDono, nome: nomeDono, pronto: true }];
        this.estado = 'aguardando';
        this.palavra = null;
        this.horarioInicio = null;
        this.dadosJogo = {};
    }

    adicionarJogador(id, nome) {
        this.jogadores.push({ id, nome, pronto: true });
    }

    removerJogador(id) {
        this.jogadores = this.jogadores.filter(j => j.id !== id);
    }

    inicializar(palavra) {
        this.estado = 'jogando';
        this.palavra = palavra;
        this.horarioInicio = Date.now();
        this.dadosJogo = {};

        this.jogadores.forEach(jogador => {
            this.dadosJogo[jogador.id] = {
                tentativas: [],
                finalizado: false,
                venceu: false,
                tentativasRestantes: 5
            };
        });
    }

    resetar() {
        this.estado = 'aguardando';
        this.palavra = null;
        this.horarioInicio = null;
        this.dadosJogo = {};
    }

    estaCheia() {
        return this.jogadores.length >= this.maxJogadores;
    }

    validarSenha(senha) {
        return !this.ehPrivada || this.senha === senha;
    }

    paraDados() {
        return {
            id: this.id,
            nomeDono: this.nomeDono,
            jogadores: this.jogadores,
            maxJogadores: this.maxJogadores,
            estado: this.estado
        };
    }
}

module.exports = Sala;
