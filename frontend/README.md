# 🎮 Palavramos - Interface Electron

Interface gráfica moderna para o jogo Palavramos usando Electron.

## 📦 Instalação

1. Entre na pasta frontend:
```bash
cd frontend
```

2. Instale as dependências:
```bash
npm install
```

## 🚀 Executar

### Desenvolvimento
```bash
npm start
```

## ✨ Recursos

### Tela de Conexão
- Configuração do servidor (host e porta)
- Definição do nome do jogador
- Status de conexão em tempo real

### Lobby
- Lista de salas disponíveis
- Filtros por tipo (pública/privada)
- Criação de nova sala com configurações
- Atualização automática das salas

### Criação de Sala
- Definir número máximo de jogadores (2-10)
- Configurar tempo limite da partida
- Opção de sala privada com senha
- Interface intuitiva com validação

### Sala de Espera
- Lista de jogadores esperando
- Indicador do dono da sala
- Contador de jogadores
- Botão de iniciar (apenas para o dono)

### Jogo
- **Grade de Tentativas**: Visualização de todas as tentativas com feedback colorido
- **Teclado Virtual**: Teclado QWERTY completo com atualização de cores
- **Input de Palavra**: Campo de entrada com validação
- **Contador de Tentativas**: Mostra tentativas restantes
- **Timer**: Contagem regressiva do tempo da partida
- **Lista de Jogadores**: Jogadores ativos na partida
- **Feed de Atividade**: Notificações em tempo real

### Feedback Visual (Estilo Wordle)
- 🟩 **Verde**: Letra correta na posição correta
- 🟨 **Amarelo**: Letra existe mas está em posição errada
- ⬜ **Cinza**: Letra não existe na palavra

### Tela de Resultados
- Palavra revelada
- Ranking de jogadores
- Medalhas para top 3
- Estatísticas de cada jogador

## 🎨 Interface

### Design
- Tema escuro moderno
- Gradientes e efeitos de blur
- Animações suaves
- Responsivo e adaptável
- Feedback visual claro

### Cores
- **Background**: Gradiente azul escuro
- **Cards**: Azul translúcido com blur
- **Accent**: Cyan (#00adb5)
- **Sucesso**: Verde (#22c55e)
- **Erro**: Vermelho (#ef4444)
- **Aviso**: Amarelo (#f59e0b)

## 🎯 Atalhos de Teclado

### Durante o Jogo
- **Letras A-Z**: Digitar tentativa
- **Enter**: Enviar tentativa
- **Backspace**: Apagar letra

## 🔧 Estrutura de Arquivos

```
frontend/
├── main.js          # Processo principal do Electron
├── index.html       # Interface HTML
├── renderer.js      # Lógica do cliente (renderer process)
├── styles.css       # Estilos CSS
├── package.json     # Configurações e dependências
└── README.md        # Esta documentação
```

## 🌐 Conectando a um Servidor

### Servidor Local
- Host: `localhost`
- Porta: `3000`

### Servidor Remoto
- Host: `IP do servidor`
- Porta: `Porta configurada`

## 💡 Dicas de Uso

1. **Primeiro uso**: Configure o servidor e escolha um nome único
2. **Criar sala**: Use configurações adequadas ao número de jogadores
3. **Salas privadas**: Anote a senha para compartilhar com amigos
4. **Durante o jogo**: Use o teclado virtual ou físico
5. **Após o jogo**: Aguarde na sala para uma nova partida

## 🔒 Comunicação

A aplicação usa **sockets TCP puros** (módulo `net` do Node.js) para comunicação com o servidor:

- **Protocolo**: TCP
- **Formato**: JSON com delimitador `\n`
- **Encoding**: UTF-8
- **Tipo**: Cliente-Servidor

## 🐛 Solução de Problemas

### Não conecta ao servidor
- Verifique se o servidor está rodando
- Confirme host e porta corretos
- Verifique firewall/antivírus

### Electron não inicia
- Execute `npm install` novamente
- Verifique versão do Node.js (14+)
- Limpe cache: `npm cache clean --force`

### Teclas não funcionam
- Clique no campo de input
- Verifique se o jogo está ativo
- Recarregue a aplicação (Ctrl+R)

## 🚀 Compilar Executável

Para criar um executável standalone:

```bash
npm install --save-dev electron-builder
npm run build
```

O executável será criado na pasta `dist/`.

## 📝 Protocolo de Comandos

### Enviados pelo Cliente
- `set_name`: Definir nome
- `list_rooms`: Listar salas
- `create_room`: Criar sala
- `join_room`: Entrar na sala
- `leave_room`: Sair da sala
- `start_game`: Iniciar jogo
- `guess`: Enviar tentativa

### Recebidos do Servidor
- `connected`: Confirmação de conexão
- `name_set`: Nome confirmado
- `rooms_list`: Lista de salas
- `room_created/joined`: Sala criada/entrou
- `player_joined/left`: Jogador entrou/saiu
- `game_started`: Jogo iniciado
- `guess_result`: Resultado da tentativa
- `player_won/eliminated`: Jogador venceu/eliminado
- `game_ended`: Jogo finalizado
- `error`: Mensagem de erro

## 🎮 Experiência do Usuário

### Notificações
- **Toast**: Notificações temporárias no canto inferior direito
- **Atividade**: Feed de eventos durante o jogo
- **Modais**: Para ações importantes (resultado, configurações)

### Animações
- Flip das tiles ao revelar feedback
- Transições suaves entre telas
- Hover effects nos botões e cards
- Escala nos cliques

### Responsividade
- Adapta para diferentes tamanhos de tela
- Grid flexível
- Scrollbars personalizadas
- Layout otimizado para desktop

## 📄 Licença

ISC

## 👨‍💻 Desenvolvimento

- **Framework**: Electron 28.0.0
- **Node Integration**: Habilitado para sockets TCP
- **Context Isolation**: Desabilitado para acesso direto ao `net`

---

**Divirta-se jogando Palavramos! 🎉**
