    const dadosDasSalas = new Map();

    export const setDadosSala = (nomeDaSala, dados) => {
        const dadosAtuais = dadosDasSalas.get(nomeDaSala) || {};
        dadosDasSalas.set(nomeDaSala, {...dadosAtuais, ...dados});
    }

    export const getDadosSala = (nomeDaSala) => {
        return dadosDasSalas.get(nomeDaSala);
    }

    export const deleteDadosSala = (nomeDaSala) => {
        dadosDasSalas.delete(nomeDaSala);
    }