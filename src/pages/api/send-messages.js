// pages/api/send-message.js
import { prisma } from '../../lib/database'; // Adjust path as needed
import Cors from 'cors';

// Initialize CORS middleware
const cors = Cors({
  methods: ['POST', 'OPTIONS'],
  origin: '*',
  credentials: true,
});

// Helper method to run middleware
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  // Run CORS middleware
  await runMiddleware(req, res, cors);
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    const message = req.body;
    
    // Validate the message
    if (!message.sender_id || !message.receiver_id || !message.message) {
      return res.status(400).json({ 
        message: 'Invalid message format. Required fields: sender_id, receiver_id, message' 
      });
    }
    
    console.log('Received message via HTTP:', message);
    
    // Save the message to database
    const newMessage = await prisma.chat.create({
      data: {
        sender_id: message.sender_id,
        receiver_id: message.receiver_id,
        message: message.message,
        timestamp: new Date()
      },
    });
    
    console.log('Message saved via HTTP route:', newMessage);
    
    // Return the saved message
    return res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error saving message via HTTP:', error);
    return res.status(500).json({ 
      message: 'Failed to save message', 
      error: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
}