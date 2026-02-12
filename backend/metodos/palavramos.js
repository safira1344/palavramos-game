function verificarVitoria(palpite, palavra) {
    return palpite.toUpperCase() === palavra.toUpperCase();
}

function gerarFeedback(palpite, palavra) {
    palpite = palpite.toUpperCase();
    palavra = palavra.toUpperCase();

    const feedback = [];
    const letrasPalavra = palavra.split('');
    const letrasPalpite = palpite.split('');
    const usadas = new Array(5).fill(false);

    // Destacar letras que são corretas no quadradinho
    for (let i = 0; i < 5; i++) {
        if (letrasPalpite[i] === letrasPalavra[i]) {
            feedback[i] = 'correto';
            usadas[i] = true;
        }
    }

    // Destacar letras que estão presentes porém tá no quadradinho errado
    for (let i = 0; i < 5; i++) {
        if (feedback[i] === 'correto') continue;

        let encontrado = false;
        for (let j = 0; j < 5; j++) {
            if (!usadas[j] && letrasPalpite[i] === letrasPalavra[j]) {
                feedback[i] = 'presente';
                usadas[j] = true;
                encontrado = true;
                break;
            }
        }

        if (!encontrado) {
            feedback[i] = 'ausente';
        }
    }

    return feedback;
}

module.exports = {
    verificarVitoria,
    gerarFeedback
};
