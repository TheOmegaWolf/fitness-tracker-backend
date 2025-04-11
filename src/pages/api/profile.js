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
  
  // GET: Fetch user profile data
  if (req.method === 'GET') {
    try {
      // Support both email and userId as query parameters
      const { email, userId } = req.query;
      
      if (!email && !userId) {
        return res.status(400).json({ error: 'Email or User ID is required' });
      }

      let user;
      let profile;
      
      // If email is provided, use the first approach
      if (email) {
        user = await prisma.users.findUnique({
          where: { email },
          include: {
            profile: {
              include: {
                workouts: { include: { exercise: true }, orderBy: { workout_date: 'desc' }, take: 10 },
                activities: { orderBy: { activity_id: 'desc' }, take: 5 }
              }
            },
            subscription: true
          }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });
        
        const workouts = user.profile?.workouts || [];
        const totalDuration = workouts.reduce((acc, w) => acc + (w.duration || 0), 0);
        const totalWorkouts = workouts.length;
        const avgWorkout = totalWorkouts > 0 ? totalDuration / totalWorkouts : 0;

        // Streaks calculation
        let currentStreak = 0, longestStreak = 0, lastDate = null;
        workouts.forEach((w) => {
          const d = new Date(w.workout_date).toDateString();
          if (!lastDate) currentStreak = 1;
          else {
            const diff = (new Date(lastDate) - new Date(d)) / (1000 * 60 * 60 * 24);
            if (diff === 1) currentStreak++;
            else {
              longestStreak = Math.max(longestStreak, currentStreak);
              currentStreak = 1;
            }
          }
          lastDate = d;
        });
        longestStreak = Math.max(longestStreak, currentStreak);

        const exerciseHistory = JSON.parse(user.profile?.exercise_history || '{}');
        const progress = JSON.parse(user.profile?.progress || '{}');

        const response = {
          personalInfo: {
            firstName: user.name?.split(' ')[0] || '',
            lastName: user.name?.split(' ')[1] || '',
            email: user.email,
            gender: exerciseHistory.gender || '',
            birthdate: exerciseHistory.birthdate || '',
            height: user.profile?.curr_height || 0,
            currentWeight: user.profile?.curr_weight || 0,
            goalWeight: progress.targetWeight || 0,
            phoneNumber: user.phone || '',
            profileImage: user.profile?.photo || '',
          },
          fitnessInfo: {
            fitnessLevel: exerciseHistory.fitnessLevel || '',
            activityLevel: exerciseHistory.activityLevel || '',
            workoutFrequency: exerciseHistory.workoutFrequency || 0,
            fitnessGoals: progress.fitnessGoals || [],
            preferredWorkouts: exerciseHistory.preferredWorkouts || [],
            medicalConditions: exerciseHistory.medicalConditions || [],
            startDate: progress.startDate || '',
          },
          accountInfo: {
            username: user.username || '',
            memberSince: user.createdAt?.toISOString().split('T')[0],
            subscription: user.subscription?.type || 'Free',
            subscriptionRenewal: user.subscription?.renewalDate?.toISOString().split('T')[0],
            notificationPreferences: {
              email: user.email_notifications || false,
              push: user.push_notifications || false,
              sms: user.sms_notifications || false,
            },
            dataSharing: {
              anonymizedResearch: user.research_consent || false,
              thirdPartyApps: user.third_party_sharing || false,
            },
          },
          statistics: {
            totalWorkouts,
            totalDuration,
            averageWorkoutLength: Math.round(avgWorkout),
            longestStreak,
            currentStreak,
            caloriesBurned: Math.round(user.profile?.calories_burnt || 0),
            favoriteExercise: exerciseHistory.favoriteExercise || 'Not set',
          },
          purchasedPlans: user.profile?.purchased_plans || []
        };

        return res.status(200).json(response);
      }
      
      // If userId is provided, use the second approach
      if (userId) {
        profile = await prisma.profile.findUnique({
          where: { user_id: parseInt(userId) },
          include: {
            progressRecords: {
              orderBy: {
                record_date: 'desc'
              },
              take: 10 // Get only recent records
            },
            workouts: {
              include: {
                exercise: true
              },
              orderBy: {
                workout_date: 'desc'
              },
              take: 5 // Get only recent workouts
            },
            activities: {
              orderBy: {
                activity_id: 'desc'
              },
              take: 10 // Get only recent activities
            }
          }
        });

        if (!profile) {
          return res.status(404).json({ error: 'User profile not found' });
        }

        // Get workout summary stats
        const workoutStats = await prisma.$queryRaw`
          SELECT 
            COUNT(*) as totalWorkouts,
            SUM(duration) as totalMinutes
          FROM Workout
          WHERE profile_id = ${profile.profile_id}
        `;

        // Get activity summary stats
        const activityStats = await prisma.$queryRaw`
          SELECT 
            SUM(steps) as totalSteps,
            SUM(minutes) as totalActiveMinutes
          FROM Activity
          WHERE profile_id = ${profile.profile_id}
        `;

        return res.status(200).json({
          profile,
          stats: {
            workouts: workoutStats[0] || { totalWorkouts: 0, totalMinutes: 0 },
            activities: activityStats[0] || { totalSteps: 0, totalActiveMinutes: 0 }
          }
        });
      }

    } catch (err) {
      console.error('GET error:', err);
      return res.status(500).json({ error: 'Error fetching profile data', details: err.message });
    }
  }

  // PUT: Update profile information
  if (req.method === 'PUT') {
    try {
      // Support both email and userId as parameters
      const { email, userId } = req.body;
      
      if (!email && !userId) {
        return res.status(400).json({ error: 'Email or User ID is required' });
      }

      // Handle email-based update (first approach)
      if (email) {
        const { profileData } = req.body;
        if (!profileData) {
          return res.status(400).json({ error: 'Profile data is required' });
        }

        const updatedUser = await prisma.users.update({
          where: { email },
          data: {
            name: `${profileData.personalInfo.firstName} ${profileData.personalInfo.lastName}`,
            phone: profileData.personalInfo.phoneNumber,
            profile: {
              upsert: {
                create: {
                  curr_weight: profileData.personalInfo.currentWeight,
                  curr_height: profileData.personalInfo.height,
                  calories_burnt: profileData.statistics.caloriesBurned || 0,
                  photo: profileData.personalInfo.profileImage,
                  exercise_history: JSON.stringify({
                    ...profileData.fitnessInfo,
                    gender: profileData.personalInfo.gender,
                    birthdate: profileData.personalInfo.birthdate,
                    favoriteExercise: profileData.statistics.favoriteExercise
                  }),
                  progress: JSON.stringify({
                    targetWeight: profileData.personalInfo.goalWeight,
                    fitnessGoals: profileData.fitnessInfo.fitnessGoals,
                    startDate: profileData.fitnessInfo.startDate,
                    lastUpdated: new Date().toISOString()
                  }),
                  purchased_plans: profileData.purchasedPlans || []
                },
                update: {
                  curr_weight: profileData.personalInfo.currentWeight,
                  curr_height: profileData.personalInfo.height,
                  calories_burnt: profileData.statistics.caloriesBurned || 0,
                  photo: profileData.personalInfo.profileImage,
                  exercise_history: JSON.stringify({
                    ...profileData.fitnessInfo,
                    gender: profileData.personalInfo.gender,
                    birthdate: profileData.personalInfo.birthdate,
                    favoriteExercise: profileData.statistics.favoriteExercise
                  }),
                  progress: JSON.stringify({
                    targetWeight: profileData.personalInfo.goalWeight,
                    fitnessGoals: profileData.fitnessInfo.fitnessGoals,
                    startDate: profileData.fitnessInfo.startDate,
                    lastUpdated: new Date().toISOString()
                  }),
                  purchased_plans: profileData.purchasedPlans || []
                }
              }
            }
          }
        });

        // Create progress record for tracking
        const userProfile = await prisma.profile.findUnique({
          where: { user_id: updatedUser.id }
        });

        if (userProfile) {
          await prisma.progress.create({
            data: {
              profile_id: userProfile.profile_id,
              record_date: new Date(),
              weight: profileData.personalInfo.currentWeight,
              height: profileData.personalInfo.height,
              calories_burnt: profileData.statistics.caloriesBurned || 0,
              fat_percentage: null
            }
          });
        }

        return res.status(200).json({ success: true, message: 'Profile updated successfully' });
      }
      
      // Handle userId-based update (second approach)
      if (userId) {
        const { 
          weight, 
          height, 
          fitnessGoals,
          weeklyTarget,
          purchasedPlans
        } = req.body;

        // Check if profile exists
        const profile = await prisma.profile.findUnique({
          where: { user_id: parseInt(userId) }
        });

        if (!profile) {
          return res.status(404).json({ error: 'User profile not found' });
        }

        // Update profile
        const updateData = {};
        
        if (weight) updateData.curr_weight = parseFloat(weight);
        if (height) updateData.curr_height = parseFloat(height);
        
        // Store additional information as JSON
        if (fitnessGoals || weeklyTarget) {
          let profileData = {};
          
          try {
            if (profile.active_plan) {
              profileData = JSON.parse(profile.active_plan);
            }
          } catch (e) {
            profileData = {};
          }
          
          if (fitnessGoals) profileData.fitnessGoals = fitnessGoals;
          if (weeklyTarget) profileData.weeklyTarget = weeklyTarget;
          
          updateData.active_plan = JSON.stringify(profileData);
        }

        // Store purchased plans
        if (purchasedPlans) {
          updateData.purchased_plans = JSON.stringify(purchasedPlans);
        }

        // Update the profile
        const updatedProfile = await prisma.profile.update({
          where: { profile_id: profile.profile_id },
          data: updateData
        });

        // Create a new progress record with the updated values
        if (weight || height) {
          await prisma.progress.create({
            data: {
              profile_id: profile.profile_id,
              record_date: new Date(),
              weight: weight ? parseFloat(weight) : profile.curr_weight,
              height: height ? parseFloat(height) : profile.curr_height,
              calories_burnt: profile.calories_burnt,
              fat_percentage: null // This could be updated if you track it
            }
          });
        }

        return res.status(200).json({
          message: 'Profile updated successfully',
          profile: updatedProfile
        });
      }

    } catch (error) {
      console.error("Error updating profile:", error);
      return res.status(500).json({ error: 'Error updating profile', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}