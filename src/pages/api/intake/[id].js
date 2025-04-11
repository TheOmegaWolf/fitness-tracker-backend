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

  // Get the intake ID from the URL
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Intake ID is required' });
  }

  // Handle DELETE request to remove an intake record
  if (req.method === 'DELETE') {
    try {
      // Parse the ID as integer
      const intakeId = parseInt(id, 10);
      
      if (isNaN(intakeId)) {
        return res.status(400).json({ error: 'Invalid intake ID' });
      }
      
      // Delete the intake record
      await prisma.intake.delete({
        where: {
          intake_id: intakeId
        }
      });
      
      return res.status(200).json({ success: true, message: 'Intake record deleted successfully' });
    } catch (error) {
      console.error('Error deleting intake record:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  } 
  // Handle GET request to fetch a specific intake item (optional)
  else if (req.method === 'GET') {
    try {
      // Parse the ID as integer
      const intakeId = parseInt(id, 10);
      
      if (isNaN(intakeId)) {
        return res.status(400).json({ error: 'Invalid intake ID' });
      }
      
      const intakeItem = await prisma.intake.findUnique({
        where: {
          intake_id: intakeId
        },
        include: {
          nutrition: true
        }
      });
      
      if (!intakeItem) {
        return res.status(404).json({ error: 'Intake record not found' });
      }
      
      return res.status(200).json(intakeItem);
    } catch (error) {
      console.error('Error fetching intake record:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  } else {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}