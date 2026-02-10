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
        this.status = '';
    }

    enviar(evento,dados){
        const pacote = JSON.stringify({evento:evento,dados:dados}) + '\n';
        this.socket.write(pacote);
    }

}