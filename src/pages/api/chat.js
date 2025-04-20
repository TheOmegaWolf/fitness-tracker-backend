/* Last Name, First Name - Student ID */
/* 
 Suresh, Kaushick ( 1002237680 ), 
 Sivaprakash, Akshay Prassanna ( 1002198274 ) ,  
 Sonwane, Pratik ( 1002170610 ) , 
 Shaik, Arfan ( 1002260039 ) , 
 Sheth, Jeet ( 1002175315 ) 
*/
import { prisma } from '../../lib/database'; // Adjust path if different
import Cors from 'cors';

// Initialize the CORS middleware with proper configuration
const cors = Cors({
  methods: ['GET', 'POST', 'OPTIONS'],
  origin: ['http://localhost:3001', 'http://localhost:3000'],
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
  // Run the CORS middleware
  await runMiddleware(req, res, cors);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { action, query, senderId, receiverId, userId } = req.body;

  try {
    if (action === 'search') {
      // Convert senderId to integer
      const senderIdInt = parseInt(senderId, 10);
      
      const allUsers = await prisma.users.findMany({
        where: {
          user_id: { not: senderIdInt },
        },
        select: {
          user_id: true,
          name: true,
          email: true,
        },
      });
    
      const users = allUsers.filter(user =>
        user.name.toLowerCase().includes(query.toLowerCase())
      );
    
      return res.status(200).json({ users });
    }

    if (action === 'getMessages') {
      // Convert IDs to integers
      const senderIdInt = parseInt(senderId, 10);
      const receiverIdInt = parseInt(receiverId, 10);
      
      const messages = await prisma.chat.findMany({
        where: {
          OR: [
            { sender_id: senderIdInt, receiver_id: receiverIdInt },
            { sender_id: receiverIdInt, receiver_id: senderIdInt },
          ],
        },
        orderBy: { timestamp: 'asc' },
      });
      return res.status(200).json({ messages });
    }

    if (action === 'getRecentConversations') {
      // Convert userId to integer
      const userIdInt = parseInt(userId, 10);
      
      // First find all distinct users who've had conversations with this user
      const chatPartners = await prisma.$queryRaw`
        SELECT DISTINCT 
          CASE 
            WHEN sender_id = ${userIdInt} THEN receiver_id 
            ELSE sender_id 
          END as partner_id
        FROM chat
        WHERE sender_id = ${userIdInt} OR receiver_id = ${userIdInt}
      `;

      // Extract just the IDs as an array and convert to integers
      const partnerIds = chatPartners.map(partner => parseInt(partner.partner_id, 10));

      // If no conversations found
      if (partnerIds.length === 0) {
        return res.status(200).json({ conversations: [] });
      }

      // Get user details for each conversation partner
      const conversations = await prisma.users.findMany({
        where: {
          user_id: { in: partnerIds }  // Now partnerIds contains integers
        },
        select: {
          user_id: true,
          name: true,
          email: true,
        }
      });

      // For each conversation, get the latest message
      for (const convo of conversations) {
        const convoUserIdInt = parseInt(convo.user_id, 10);
        
        const latestMessage = await prisma.chat.findFirst({
          where: {
            OR: [
              { sender_id: userIdInt, receiver_id: convoUserIdInt },
              { sender_id: convoUserIdInt, receiver_id: userIdInt },
            ],
          },
          orderBy: { timestamp: 'desc' },
          select: {
            message: true,
            timestamp: true,
          }
        });

        // Add the latest message data to the conversation object
        convo.lastMessage = latestMessage?.message || '';
        convo.lastTimestamp = latestMessage?.timestamp || null;
      }

      // Sort conversations by most recent message
      conversations.sort((a, b) => {
        if (!a.lastTimestamp) return 1;
        if (!b.lastTimestamp) return -1;
        return new Date(b.lastTimestamp) - new Date(a.lastTimestamp);
      });

      return res.status(200).json({ conversations });
    }

    return res.status(400).json({ message: 'Invalid action' });
  } catch (error) {
    console.error('Chat API error:', error.stack);
    return res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    await prisma.$disconnect();
  }
}