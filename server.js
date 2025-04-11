const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');

// Create Express app
const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});
console.log(io)
// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('message', async (message) => {
    try {
      const newMessage = await prisma.chat.create({
        data: {
          sender_id: message.sender_id,
          receiver_id: message.receiver_id,
          message: message.message,
          timestamp: new Date()
        },
      });
      io.emit('message', newMessage);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// API Routes
app.post('/api/chat', async (req, res) => {
  try {
    const { action, query = '', senderId, receiverId } = req.body;
    
    if (action === 'search') {
      const allUsers = await prisma.users.findMany({
        where: { user_id: { not: senderId } },
        select: { user_id: true, name: true, email: true },
      });
      
      const users = allUsers.filter(user =>
        user.name.toLowerCase().includes(query.toLowerCase())
      );
      
      return res.status(200).json({ users });
    }
    
    if (action === 'getMessages') {
      const messages = await prisma.chat.findMany({
        where: {
          OR: [
            { sender_id: senderId, receiver_id: receiverId },
            { sender_id: receiverId, receiver_id: senderId },
          ],
        },
        orderBy: { timestamp: 'asc' },
      });
      return res.status(200).json({ messages });
    }
    
    return res.status(400).json({ message: 'Invalid action' });
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/send-message', async (req, res) => {
  try {
    const message = req.body;
    
    if (!message.sender_id || !message.receiver_id || !message.message) {
      return res.status(400).json({ message: 'Invalid message format' });
    }
    
    const newMessage = await prisma.chat.create({
      data: {
        sender_id: message.sender_id,
        receiver_id: message.receiver_id,
        message: message.message,
        timestamp: new Date()
      },
    });
    
    io.emit('message', newMessage);
    return res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error saving message:', error);
    return res.status(500).json({ message: 'Failed to save message' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await prisma.users.findUnique({
      where: { email },
      select: { user_id: true, name: true, email: true },
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    return res.status(200).json({ user });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Login failed' });
  }
});

// Start server
const PORT = process.env.PORT || 5000; // Changed to port 5000
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});