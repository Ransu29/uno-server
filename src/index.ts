import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import { SocketHandler } from './application/SocketHandler';
import { Logger } from './infrastructure/Logger';

dotenv.config();

const port = process.env.PORT || 3000;

const app = express();
app.use(cors());

// Health Check (Used by Load Balancers / K8s)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*", 
    methods: ["GET", "POST"]
  }
});

new SocketHandler(io);

const server = httpServer.listen(port, () => {
  Logger.info(`UNO Server running`, 'System', { url: `http://localhost:${port}` });
});

// --- GRACEFUL SHUTDOWN ---

const shutdown = (signal: string) => {
  Logger.info(`${signal} received: closing HTTP server`, 'System');
  
  // 1. Stop accepting new connections
  server.close(() => {
    Logger.info('HTTP server closed', 'System');
    
    // 2. Disconnect all sockets gracefully
    io.close(() => {
        Logger.info('Socket.IO server closed', 'System');
        process.exit(0);
    });
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));