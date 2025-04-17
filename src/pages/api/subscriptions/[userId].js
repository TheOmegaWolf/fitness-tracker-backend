import { prisma } from '../../../lib/database';
import Cors from 'cors';

// Initialize the CORS middleware
const cors = Cors({
  methods: ['GET', 'OPTIONS'],
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

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const userId = parseInt(req.query.userId);

      if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      // Get user's subscription
      const subscription = await prisma.subscriptions.findUnique({
        where: { user_id: userId },
        select: {
          subscription_id: true,
          user_id: true,
          plan_purchased: true,
          date_of_purchase: true,
        },
      });

      return res.status(200).json({ subscription });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      return res.status(500).json({ error: 'Failed to fetch subscription' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}