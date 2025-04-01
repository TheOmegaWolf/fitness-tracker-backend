import { prisma } from '../../lib/database';
import Cors from 'cors';

// Initialize the CORS middleware
const cors = Cors({
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  origin: ['http://localhost:3001', 'http://localhost:3000'], // Add your origins here
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
      const users = await prisma.users.findMany();
      return res.status(200).json(users);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: 'Error fetching users' });
    }
  } 
  else if (req.method === 'POST') {
    try {
      const { 
        firstName, 
        lastName, 
        email, 
        password, 
        id, // Firebase UID
        createdAt
      } = req.body;

      // Check if user with this email already exists
      const existingUser = await prisma.users.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      // Create new user in MySQL using Prisma
      const newUser = await prisma.users.create({
        data: { 
          name: `${firstName} ${lastName}`,  
          email, 
          password, // Note: Password is already hashed by Firebase
          created_at: createdAt ? new Date(createdAt) : new Date(),
          // Set up a default profile for the user
          profile: {
            create: {
              curr_weight: null,
              curr_height: null,
              total_steps: 0,
              calories_burnt: 0.0
            }
          }
        },
        include: {
          profile: true
        }
      });

      return res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      return res.status(500).json({ error: 'Error creating user' });
    }
  } 
  else if (req.method === 'PUT') {
    try {
      const { email, ...updateData } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required for updating user' });
      }

      const updatedUser = await prisma.users.update({
        where: { email },
        data: updateData
      });

      return res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      return res.status(500).json({ error: 'Error updating user' });
    }
  }
  else {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
}