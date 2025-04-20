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

  // Get the nutrition ID from the URL
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Nutrition ID is required' });
  }

  // Handle GET request to fetch a specific nutrition item
  if (req.method === 'GET') {
    try {
      // Parse the ID as integer
      const nutritionId = parseInt(id, 10);
      
      if (isNaN(nutritionId)) {
        return res.status(400).json({ error: 'Invalid nutrition ID' });
      }
      
      const nutritionItem = await prisma.nutrition.findUnique({
        where: {
          nutrition_id: nutritionId
        }
      });
      
      if (!nutritionItem) {
        return res.status(404).json({ error: 'Nutrition item not found' });
      }
      
      return res.status(200).json(nutritionItem);
    } catch (error) {
      console.error('Error fetching nutrition item:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  } else {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}