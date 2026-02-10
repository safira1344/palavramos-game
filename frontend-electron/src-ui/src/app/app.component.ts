import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  name: string;
  isPrivate: boolean;
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

  ngOnInit(): void {
    // Registra um listener para receber a lista de salas do processo principal
    if (window.palavraMos) {
      this.roomsSubscription = window.palavraMos.on('listar_salas', (rooms: Room[]) => {
        console.log('Salas recebidas do processo principal:', rooms);
        this.allRooms = rooms;
        this.filterRooms();
      });

      // Solicita a lista de salas ao iniciar o componente
      window.palavraMos.send('get_salas');
    } else {
      console.warn('API "palavraMos" não encontrada. A aplicação não está rodando no Electron?');
    }
  }

  ngOnDestroy(): void {
    // Remove o listener ao destruir o componente para evitar vazamentos de memória
    if (this.roomsSubscription) {
      this.roomsSubscription();
    }
  }

  filterRooms(): void {
    if (!this.searchTerm) {
      this.filteredRooms = this.allRooms;
    } else {
      this.filteredRooms = this.allRooms.filter(room => 
        room.id.toLowerCase().includes(this.searchTerm.toLowerCase())
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
    
    const matchData = {
      type,
      playerName: this.newMatchPlayerName,
      isPrivate: this.newMatchIsPrivate
    };

    console.log(`Criando partida com os dados:`, matchData);
    this.showCreateOptions = false;
    window.palavraMos?.send('criar_partida', matchData);
  }

  enterRoom(room: Room): void {
    if (!room) return;
    console.log('Entrando na sala:', room);
    window.palavraMos?.send('entrar_sala', { roomId: room.id });
  }
}