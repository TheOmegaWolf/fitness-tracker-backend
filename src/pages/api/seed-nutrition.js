import { prisma } from '../../lib/database';
import Cors from 'cors';
import nutritionData from '../../data/nutritionData';
// Setup CORS
const cors = Cors({
  methods: ['POST', 'OPTIONS'],
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
});

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const inserted = [];

    for (const item of nutritionData) {
      const existing = await prisma.nutrition.findFirst({
        where: { food_item: item.food_item }
      });

      if (!existing) {
        const created = await prisma.nutrition.create({
          data: {
            food_item: item.food_item,
            category: item.category || null,
            calories: item.calories || 0,
            protein: item.protein || 0,
            carbs: item.carbs || 0,
            fat: item.fat || 0,
            fiber: item.fiber || 0,
            sugar: item.sugar || 0,
            sodium: item.sodium || 0,
            cholesterol: item.cholesterol || 0
          }
        });

        inserted.push(created);
      }
    }

    return res.status(200).json({
      success: true,
      message: `${inserted.length} new items added`,
      data: inserted
    });

  } catch (error) {
    console.error('Error seeding nutrition data:', error);
    return res.status(500).json({ error: 'Failed to insert nutrition data', details: error.message });
  }
}
