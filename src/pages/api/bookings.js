import { prisma } from '../../lib/database';
import Cors from 'cors';

// Initialize the CORS middleware with appropriate configuration
const cors = Cors({
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  origin: true, // Allow requests from any origin
  credentials: true,
  optionsSuccessStatus: 200
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
  console.log('Received request:', req.method, 'to', req.url);
  console.log('Request headers:', req.headers);
  
  // Run the CORS middleware first
  try {
    await runMiddleware(req, res, cors);
  } catch (corsError) {
    console.error('CORS middleware error:', corsError);
  }

  // Set CORS headers manually as a backup
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    console.log('Processing POST request with body:', req.body);
    
    try {
      const { user_id, trainer_id, date, time, session_type, notes } = req.body;

      // Validate required fields
      if (!user_id || !trainer_id || !date || !time || !session_type) {
        console.error('Missing required fields:', { user_id, trainer_id, date, time, session_type });
        return res.status(400).json({ error: 'Missing required fields' });
      }

      console.log('Creating booking record with data:', { 
        user_id, 
        trainer_id, 
        date, 
        time, 
        session_type, 
        notes 
      });

      // Create booking record in database
      try {
        const booking = await prisma.bookings.create({
          data: {
            user_id: parseInt(user_id),
            trainer_id: parseInt(trainer_id),
            booking_date: new Date(date),
            booking_time: time,
            session_type,
            notes: notes || '',
            status: 'confirmed',
            created_at: new Date()
          }
        });

        console.log('Booking created successfully:', booking);
        return res.status(201).json({ success: true, booking });
      } catch (dbError) {
        console.error('Database error when creating booking:', dbError);
        return res.status(500).json({ error: 'Database error', details: dbError.message });
      }
    } catch (error) {
      console.error('Error in POST handler:', error);
      return res.status(500).json({ error: 'Failed to create booking', details: error.message });
    }
  }

  if (req.method === 'GET') {
    try {
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const bookings = await prisma.bookings.findMany({
        where: { user_id: parseInt(userId) },
        orderBy: { booking_date: 'desc' }
      });

      return res.status(200).json({ bookings });
    } catch (error) {
      console.error('Error fetching bookings:', error);
      return res.status(500).json({ error: 'Failed to fetch bookings', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}