/* Last Name, First Name - Student ID */
/* 
 Suresh, Kaushick ( 1002237680 ), 
 Sivaprakash, Akshay Prassanna ( 1002198274 ) ,  
 Sonwane, Pratik ( 1002170610 ) , 
 Shaik, Arfan ( 1002260039 ) , 
 Sheth, Jeet ( 1002175315 ) 
*/
import { prisma } from '../../../lib/database';
import Cors from 'cors';

// Initialize the CORS middleware
const cors = Cors({
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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

  try {
    // For demonstration purposes, we'll use a hardcoded profile_id
    // In production, you should get this from the authenticated user's session
    const profile_id = 1; // Replace with actual user profile ID from auth
    
    if (req.method === 'GET') {
      // Get all intake items for the user
      const intakes = await prisma.intake.findMany({
        where: {
          profile_id: profile_id,
        },
        include: {
          nutrition: true,
        },
        orderBy: {
          intake_date: 'desc',
        },
      });
      
      return res.status(200).json(intakes);
    } else if (req.method === 'POST') {
      const { type_meal, items } = req.body;
      
      if (!type_meal || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Invalid request data' });
      }
      
      // Create all intake items in a transaction
      const createdIntakes = await prisma.$transaction(
        items.map(item => 
          prisma.intake.create({
            data: {
              profile_id: profile_id,
              type_meal: type_meal,
              quantity: item.quantity,
              nutrition_id: item.nutrition_id,
            },
          })
        )
      );
      
      return res.status(201).json(createdIntakes);
    } else {
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Error handling intake request:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

