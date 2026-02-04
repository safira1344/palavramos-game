export class Jogador{

    constructor(
        {
            id,
            socket,
            nome,
            dono
        } = {}
    ){
        this.id = id;
        this.socket = socket;
        this.nome = nome;
        this.dono = dono;
    }

    enviar(evento,dados){
        const pacote = JSON.stringify({evento,dados}) + '\n';
    }

}