    import { createServer }  from 'http';
    import { gerenciarPartidaMultiplayer } from './eventsHandler/multiplayer.js';
    import { Server } from 'socket.io';
    
    const httpServer = createServer(); 
    const io = new Server(httpServer,{
        cors:{
            origin:
                '*',
        },
        path:'/socket.io/'
    });

    io.on("connection",(socket) => {
        console.log('Socket.io conectado');
        gerenciarPartidaMultiplayer(socket,io);

        socket.on('disconnect',(socket) => {
        socket.disconnect();
        });

    });


    httpServer.listen(7000);


