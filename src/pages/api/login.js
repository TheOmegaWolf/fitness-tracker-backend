import { prisma } from '../../lib/database';
import Cors from 'cors';
import { DateTime } from 'luxon';

// Initialize the CORS middleware
const cors = Cors({
  methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
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

  if (req.method === 'POST') {
    try {
      const { email, password } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Find the user with the provided email
      const user = await prisma.users.findUnique({
        where: { email },
        include: {
          profile: true,
        },
      });

      // If user doesn't exist
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // In this case, we're not actually verifying the password
      // since Firebase is handling authentication
      // We're just checking if the user exists in our database

      // Return user data without the password
      const { password: _, ...userWithoutPassword } = user;

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Error during login process' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required for updating last login' });
      }

      // Get the current UTC time
      const currentDate = new Date();

      // Convert to Central Time (America/Chicago, which will be CDT on April 1, 2025)
      const timeZone = 'America/Chicago';
      const zonedDate = DateTime.fromJSDate(currentDate, { zone: 'utc' }).setZone(timeZone);

      // Format the date to MySQL-compatible format (YYYY-MM-DD HH:mm:ss)
      const formattedDate = zonedDate.toFormat('yyyy-MM-dd HH:mm:ss');

      console.log('Current UTC time:', currentDate.toISOString());
      console.log('Converted to Central Daylight Time (CDT):', formattedDate);

      // Update the user with the adjusted last_login time
      const updatedUser = await prisma.users.update({
        where: { email },
        data: {
          last_login: new Date(formattedDate), // Prisma will handle the conversion to UTC for storage
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Last login updated successfully',
        timestamp: formattedDate,
        user: updatedUser,
      });
    } catch (error) {
      console.error('Error updating last login:', error);
      return res.status(500).json({ error: 'Error updating last login', details: error.message });
    }
  } else {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
}