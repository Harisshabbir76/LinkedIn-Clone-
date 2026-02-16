const { Server } = require('socket.io');
let io = null;

function init(server) {
  if (io) return io;
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('[socket] connected', socket.id);

    socket.on('join', (room) => {
      try {
        socket.join(room);
        console.log(`[socket] ${socket.id} joined room:`, room);
      } catch (e) {
        console.error('Join room error', e);
      }
    });

    socket.on('leave', (room) => {
      socket.leave(room);
    });

    socket.on('disconnect', (reason) => {
      console.log('[socket] disconnected', socket.id, reason);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

module.exports = { init, getIO };
