/* Last Name, First Name - Student ID */
/* 
 Suresh, Kaushick ( 1002237680 ), 
 Sivaprakash, Akshay Prassanna ( 1002198274 ) ,  
 Sonwane, Pratik ( 1002170610 ) , 
 Shaik, Arfan ( 1002260039 ) , 
 Sheth, Jeet ( 1002175315 ) 
*/
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
      const users = await prisma.users.findMany({
        include: {
          profile: {
            include: {
              workouts: true,
              progressRecords: true,
              intakes: {
                include: {
                  nutrition: true
                }
              },
              activities: true
            }
          }
        }
      });
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

      // Get current date for consistent use
      const currentDate = createdAt ? new Date(createdAt) : new Date();

      // Create new user in MySQL using Prisma with profile and related records
      const newUser = await prisma.users.create({
        data: { 
          name: `${firstName} ${lastName}`,  
          email, 
          password, // Note: Password is already hashed by Firebase
          created_at: currentDate,
          // Set up a default profile for the user
          profile: {
            create: {
              curr_weight: 70.0, // Default average weight in kg
              curr_height: 170.0, // Default average height in cm
              total_steps: 0,
              calories_burnt: 0.0,
              photo: null,
              active_plan: null,
              // Create an initial progress record
              progressRecords: {
                create: {
                  record_date: currentDate,
                  weight: 70.0,
                  height: 170.0,
                  calories_burnt: 0.0,
                  fat_percentage: 20.0 // Default body fat percentage
                }
              }
            }
          }
        },
        include: {
          profile: {
            include: {
              progressRecords: true
            }
          }
        }
      });

      // Now let's add some default nutrition data
      // First, ensure we have basic nutrition items in the database
      const defaultNutritionItems = [
        { food_item: 'Apple', category: 'Fruit', calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, sugar: 19, sodium: 2, cholesterol: 0 },
        { food_item: 'Chicken Breast', category: 'Protein', calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 74, cholesterol: 85 },
        { food_item: 'Brown Rice', category: 'Grain', calories: 216, protein: 5, carbs: 45, fat: 1.8, fiber: 3.5, sugar: 0.7, sodium: 10, cholesterol: 0 }
      ];

      // Check if any of these nutrition items already exist
      for (const item of defaultNutritionItems) {
        const existingItem = await prisma.nutrition.findFirst({
          where: { food_item: item.food_item }
        });

        if (!existingItem) {
          await prisma.nutrition.create({ data: item });
        }
      }

      // Now create a sample intake for the user using one of these nutrition items
      if (newUser.profile) {
        const apple = await prisma.nutrition.findFirst({
          where: { food_item: 'Apple' }
        });

        if (apple) {
          await prisma.intake.create({
            data: {
              profile_id: newUser.profile.profile_id,
              intake_date: currentDate,
              type_meal: 'Snack',
              quantity: 1,
              nutrition_id: apple.nutrition_id
            }
          });
        }
      }

      // Fetch the user again with all related data
      const userWithAllData = await prisma.users.findUnique({
        where: { user_id: newUser.user_id },
        include: {
          profile: {
            include: {
              progressRecords: true,
              intakes: {
                include: {
                  nutrition: true
                }
              }
            }
          }
        }
      });

      return res.status(201).json(userWithAllData);
    } catch (error) {
      console.error("Error creating user:", error);
      return res.status(500).json({ error: 'Error creating user', details: error.message });
    }
  } 
  else if (req.method === 'PUT') {
    try {
      const { 
        email, 
        profile, 
        progressRecord, 
        workout, 
        intake, 
        ...updateData 
      } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required for updating user' });
      }

      // Get the user to find the profile ID
      const user = await prisma.users.findUnique({
        where: { email },
        include: { profile: true }
      });

      if (!user || !user.profile) {
        return res.status(404).json({ error: 'User or profile not found' });
      }

      const profileId = user.profile.profile_id;
      
      // Begin a transaction for complex updates
      const updatedUser = await prisma.$transaction(async (prisma) => {
        // Update basic user data
        const updatedUserData = await prisma.users.update({
          where: { email },
          data: updateData,
          include: { profile: true }
        });

        // Update profile if provided
        if (profile) {
          await prisma.profile.update({
            where: { profile_id: profileId },
            data: profile
          });
        }

        // Add new progress record if provided
        if (progressRecord) {
          await prisma.progress.create({
            data: {
              ...progressRecord,
              profile_id: profileId,
              record_date: progressRecord.record_date || new Date()
            }
          });
        }

        // Add new workout if provided
        if (workout) {
          await prisma.workout.create({
            data: {
              ...workout,
              profile_id: profileId,
              workout_date: workout.workout_date || new Date()
            }
          });
        }

        // Add new intake if provided
        if (intake) {
          await prisma.intake.create({
            data: {
              ...intake,
              profile_id: profileId,
              intake_date: intake.intake_date || new Date()
            }
          });
        }

        // Return the updated user with all related data
        return prisma.users.findUnique({
          where: { user_id: updatedUserData.user_id },
          include: {
            profile: {
              include: {
                progressRecords: true,
                workouts: true,
                intakes: {
                  include: {
                    nutrition: true
                  }
                },
                activities: true
              }
            }
          }
        });
      });

      return res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      return res.status(500).json({ error: 'Error updating user', details: error.message });
    }
  }
  else {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
}