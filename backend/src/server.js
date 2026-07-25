require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const { initSockets } = require('./sockets');

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((s) => s.trim());

const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true },
});

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// NFR2: keep the API responsive; basic rate limiting to protect against abuse
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use('/api/', limiter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/books', require('./routes/books'));
app.use('/api/exchanges', require('./routes/exchanges')(io));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/quizzes', require('./routes/quizzes'));
app.use('/api/search', require('./routes/search'));
app.use('/api/messages', require('./routes/messages')(io));
app.use('/api/ratings', require('./routes/ratings')(io));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/ads', require('./routes/ads'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/admin', require('./routes/admin')(io));
app.use('/api/users', require('./routes/users'));

initSockets(io);

// 404 handler
app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found.' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ error: 'CORS: origin not allowed.' });
  }
  res.status(err.statusCode || 500).json({ error: err.message || 'Internal server error.' });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Smart Study Exchange API listening on port ${PORT}`);
});

module.exports = { app, server, io };
