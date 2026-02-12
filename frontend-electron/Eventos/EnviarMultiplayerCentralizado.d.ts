// Eventos/EnviarMultiplayerCentralizado.d.ts

interface Jogador {
    id: string;
    nome: string;
    // Adicione outras propriedades do jogador se souber
}

interface CriarSalaPayload {
    nomeUsuario: string;
    privacidade: 'publica' | 'fechada';
    quantidadeRodadas: number;
    maxJogadores: number;
    jogador: Jogador;
}

interface EntrarSalaPayload {
    idSala: string;
    chave: string | null;
}

export declare const enviarPalavra: (palavra: string) => void;
export declare const iniciarPartida: (payload: { idSala: string }) => void;
export declare const solicitarSalas: () => void;
export declare const entrarSala: (payload: EntrarSalaPayload) => void;
export declare const sairSala: (idSala: string) => void;
export declare const criarSala: (payload: CriarSalaPayload) => void;
