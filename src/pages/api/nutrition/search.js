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

  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Your existing nutrition search logic
  if (req.method === 'GET') {
    try {
      const { term } = req.query;
      
      if (!term) {
        return res.status(400).json({ error: 'Search term is required' });
      }
      
      // For older Prisma versions, use contains without mode option
      const foods = await prisma.nutrition.findMany({
        where: {
          food_item: {
            contains: term,
          }
        },
        take: 10, // Limit results
      });
      
      return res.status(200).json(foods);
    } catch (error) {
      console.error('Error searching foods:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  } else {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}