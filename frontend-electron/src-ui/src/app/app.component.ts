import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { criarSala, solicitarSalas, entrarSala } from '../../../Eventos/EnviarMultiplayerCentralizado.js';

// Define a interface para o objeto exposto pelo preload.js
declare global {
  interface Window {
    palavraMos: {
      send: (channel: string, data?: any) => void;
      on: (channel: string, func: (...args: any[]) => void) => () => void;
    };
  }
}

interface Room {
  id: string;
  nome: string;
  privacidade: 'publica' | 'fechada';
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'PalavraMos';
  
  allRooms: Room[] = [];
  filteredRooms: Room[] = [];
  selectedRoom: Room | null = null;
  showCreateOptions = false;
  searchTerm: string = '';
  newMatchPlayerName: string = '';
  newMatchIsPrivate: boolean = false;

  private roomsSubscription: (() => void) | null = null;

  constructor(private ngZone: NgZone) { } // Inject NgZone

  ngOnInit(): void {
    if (window.palavraMos) {
      this.roomsSubscription = window.palavraMos.on('lista_salas', (salas: Room[]) => {
        console.log('Salas recebidas do processo principal:', salas);
        this.ngZone.run(() => { // Run inside NgZone
          setTimeout(() => {
            this.allRooms = salas;
            this.filterRooms();
          }, 0);
        });
      });

      solicitarSalas();
    } else {
      console.warn('API "palavraMos" não encontrada. A aplicação não está rodando no Electron?');
    }
  }

  ngOnDestroy(): void {
    if (this.roomsSubscription) {
      this.roomsSubscription();
    }
  }

  logClick() {
    console.log('Criar Partida button clicked. Current showCreateOptions:', this.showCreateOptions);
  }

  filterRooms(): void {
    if (!this.searchTerm) {
      this.filteredRooms = this.allRooms;
    } else {
      this.filteredRooms = this.allRooms.filter(room => 
        room.nome.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  selectRoom(room: Room): void {
    this.selectedRoom = room;
    console.log('Sala selecionada:', room);
  }

  createMatch(type: 'Multiplayer' | 'Speedrun'): void {
    if (!this.newMatchPlayerName.trim()) {
      alert('Por favor, insira seu nome para criar uma partida.');
      return;
    }
    
    if (type === 'Multiplayer') {
      const nomeUsuario = this.newMatchPlayerName;
      const privacidade = this.newMatchIsPrivate ? 'fechada' : 'publica';
      const quantidadeRodadas = 5; // Valor padrão
      const maxJogadores = 4; // Valor padrão
      const jogador = { id: `player_${Date.now()}`, nome: nomeUsuario }; // Gerar um ID temporário

      criarSala({
        nomeUsuario,
        privacidade,
        quantidadeRodadas,
        maxJogadores,
        jogador
      });
      console.log(`Criando partida Multiplayer com os dados:`, { nomeUsuario, privacidade, quantidadeRodadas, maxJogadores, jogador });
    } else {
      // Lógica para Speedrun, se necessário
      console.log('Criando partida Speedrun');
    }

    this.showCreateOptions = false;
  }

  enterRoom(room: Room): void {
    if (!room) return;
    
    let chave: string | null = null;
    if (room.privacidade === 'fechada') {
      chave = prompt('Esta sala é privada. Por favor, insira a chave de acesso:');
      if (chave === null) return; // O usuário cancelou o prompt
    }

    console.log('Entrando na sala:', room.id, 'com chave:', chave);
    entrarSala({ idSala: room.id, chave: chave });
  }
}