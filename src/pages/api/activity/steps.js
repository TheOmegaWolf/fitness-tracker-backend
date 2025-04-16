// api/activity/steps.js
import { PrismaClient } from '@prisma/client';
import Cors from 'cors';

// Initialize the CORS middleware
const cors = Cors({
  methods: ['GET', 'PUT', 'OPTIONS'],
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

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // Run the CORS middleware
  await runMiddleware(req, res, cors);

  if (req.method === 'POST') {
    const { userId, steps, minutes } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    try {
      // Get profile ID for the user
      const profile = await prisma.profile.findUnique({
        where: { user_id: parseInt(userId) }
      });

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      // Create activity record
      const activity = await prisma.activity.create({
        data: {
          profile_id: profile.profile_id,
          steps: steps || 0,
          minutes: minutes || 0
        }
      });

      res.status(201).json({ activity });
    } catch (error) {
      console.error('Error saving activity:', error);
      res.status(500).json({ error: 'Failed to save activity data' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}