/* Last Name, First Name - Student ID */
/* 
 Suresh, Kaushick ( 1002237680 ), 
 Sivaprakash, Akshay Prassanna ( 1002198274 ) ,  
 Sonwane, Pratik ( 1002170610 ) , 
 Shaik, Arfan ( 1002260039 ) , 
 Sheth, Jeet ( 1002175315 ) 
*/
// pages/api/subscriptions/index.js - Endpoint for creating subscriptions
import { prisma } from '../../../lib/database';
import Cors from 'cors';

// Initialize the CORS middleware
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

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { user_id, cardholder, card_number, exp_date, cvv, plan_purchased } = req.body;

      // Validate required fields
      if (!user_id || !cardholder || !card_number || !exp_date || !cvv || !plan_purchased) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      // Check if user already has a subscription
      const existingSubscription = await prisma.subscriptions.findUnique({
        where: { user_id: parseInt(user_id) },
      });

      let subscription;
      
      if (existingSubscription) {
        // Update existing subscription
        subscription = await prisma.subscriptions.update({
          where: { user_id: parseInt(user_id) },
          data: {
            cardholder,
            card_number,
            exp_date: new Date(exp_date),
            cvv,
            plan_purchased,
            date_of_purchase: new Date(),
          },
        });
      } else {
        // Create new subscription
        subscription = await prisma.subscriptions.create({
          data: {
            user_id: parseInt(user_id),
            cardholder,
            card_number,
            exp_date: new Date(exp_date),
            cvv,
            plan_purchased,
          },
        });
      }

      return res.status(201).json({
        message: 'Subscription created successfully',
        subscription: {
          subscription_id: subscription.subscription_id,
          user_id: subscription.user_id,
          plan_purchased: subscription.plan_purchased,
          date_of_purchase: subscription.date_of_purchase,
        },
      });
    } catch (error) {
      console.error('Error creating subscription:', error);
      return res.status(500).json({ error: 'Failed to create subscription' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
