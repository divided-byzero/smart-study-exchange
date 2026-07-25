const { verifyToken } = require('../utils/jwt');

function initSockets(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required.'));
      const decoded = verifyToken(token);
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token.'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);

    socket.on('typing', ({ receiverId }) => {
      io.to(`user:${receiverId}`).emit('typing', { senderId: socket.userId });
    });

    socket.on('disconnect', () => {
      socket.leave(`user:${socket.userId}`);
    });
  });
}

module.exports = { initSockets };
