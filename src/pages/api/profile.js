import { prisma } from '../../lib/database';
import Cors from 'cors';

// Initialize the CORS middleware
const cors = Cors({
  methods: ['GET', 'PUT', 'OPTIONS'],
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

  // GET profile data
  if (req.method === 'GET') {
    try {
      const { email } = req.query;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const userProfile = await prisma.users.findUnique({
        where: { email },
        include: {
          profile: {
            include: {
              workouts: {
                include: {
                  exercise: true
                },
                orderBy: {
                  workout_date: 'desc'
                },
                take: 10
              },
              activities: {
                orderBy: {
                  activity_id: 'desc'
                },
                take: 5
              }
            }
          },
          subscription: true
        }
      });

      if (!userProfile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      // Calculate fitness statistics
      const workouts = userProfile.profile?.workouts || [];
      const totalWorkouts = workouts.length;
      const totalHours = workouts.reduce((acc, workout) => acc + (workout.duration || 0), 0) / 60;
      const avgWorkoutMinutes = totalWorkouts > 0 ? (totalHours * 60) / totalWorkouts : 0;
      
      // Find workout streaks
      let currentStreak = 0;
      let longestStreak = 0;
      let lastWorkoutDate = null;

      workouts.forEach((workout) => {
        const workoutDate = new Date(workout.workout_date).toDateString();
        if (!lastWorkoutDate) {
          currentStreak = 1;
        } else {
          const dayDiff = Math.floor((new Date(lastWorkoutDate) - new Date(workoutDate)) / (1000 * 60 * 60 * 24));
          if (dayDiff === 1) {
            currentStreak++;
          } else {
            longestStreak = Math.max(longestStreak, currentStreak);
            currentStreak = 1;
          }
        }
        lastWorkoutDate = workoutDate;
      });
      longestStreak = Math.max(longestStreak, currentStreak);

      // Enhance the response with calculated statistics
      const enhancedProfile = {
        ...userProfile,
        fitnessStats: {
          totalWorkouts,
          totalHours: Math.round(totalHours),
          avgWorkoutMinutes: Math.round(avgWorkoutMinutes),
          longestStreak,
          currentStreak,
          caloriesBurned: Math.round(userProfile.profile?.calories_burnt || 0),
        }
      };

      return res.status(200).json(enhancedProfile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      return res.status(500).json({ error: 'Error fetching profile data' });
    }
  }

  // UPDATE profile data
  if (req.method === 'PUT') {
    try {
      const { email, profileData } = req.body;

      if (!email || !profileData) {
        return res.status(400).json({ error: 'Email and profile data are required' });
      }

      // Update user data
      const updatedProfile = await prisma.users.update({
        where: { email },
        data: {
          name: profileData.name,
          phone: profileData.phone,
          profile: {
            upsert: {
              create: {
                curr_weight: profileData.currentWeight,
                curr_height: profileData.height,
                total_steps: profileData.totalSteps || 0,
                calories_burnt: profileData.caloriesBurned || 0,
                exercise_history: JSON.stringify({
                  fitnessLevel: profileData.fitnessLevel || 'Beginner',
                  activityLevel: profileData.activityLevel || 'Moderate',
                  workoutFrequency: profileData.workoutFrequency || '3 times per week',
                  preferredWorkouts: profileData.preferredWorkouts || [],
                  medicalConditions: profileData.medicalConditions || []
                }),
                progress: JSON.stringify({
                  targetWeight: profileData.goalWeight,
                  fitnessGoals: profileData.fitnessGoals || [],
                  startDate: new Date().toISOString()
                })
              },
              update: {
                curr_weight: profileData.currentWeight,
                curr_height: profileData.height,
                total_steps: profileData.totalSteps || 0,
                calories_burnt: profileData.caloriesBurned || 0,
                exercise_history: JSON.stringify({
                  fitnessLevel: profileData.fitnessLevel || 'Beginner',
                  activityLevel: profileData.activityLevel || 'Moderate',
                  workoutFrequency: profileData.workoutFrequency || '3 times per week',
                  preferredWorkouts: profileData.preferredWorkouts || [],
                  medicalConditions: profileData.medicalConditions || []
                }),
                progress: JSON.stringify({
                  targetWeight: profileData.goalWeight,
                  fitnessGoals: profileData.fitnessGoals || [],
                  lastUpdated: new Date().toISOString()
                })
              }
            }
          }
        },
        include: {
          profile: true,
          subscription: true
        }
      });

      return res.status(200).json(updatedProfile);
    } catch (error) {
      console.error('Error updating profile:', error);
      return res.status(500).json({ error: 'Error updating profile data' });
    }
  }

  // Return 405 for any other HTTP method
  return res.status(405).json({ error: 'Method not allowed' });
}
