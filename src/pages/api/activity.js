/* Last Name, First Name - Student ID */
/* 
 Suresh, Kaushick ( 1002237680 ), 
 Sivaprakash, Akshay Prassanna ( 1002198274 ) ,  
 Sonwane, Pratik ( 1002170610 ) , 
 Shaik, Arfan ( 1002260039 ) , 
 Sheth, Jeet ( 1002175315 ) 
*/
import { useServerInsertedHTML } from "next/navigation";
import { prisma } from "../../lib/database";
import Cors from "cors";

// Initialize the CORS middleware
const cors = Cors({
  methods: ["GET", "PUT", "POST", "OPTIONS"],
  origin: ["http://localhost:3001", "http://localhost:3000"],
  credentials: true,
});

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

export async function getTotalCaloriesBurned(profileId) {
  try {
    const result = await prisma.progress.aggregate({
      where: {
        profile_id: profileId,
      },
      _sum: {
        calories_burnt: true,
      },
    });
    
    // Fallback to 0 if null
    const totalCalories = result._sum.calories_burnt || 0;

    return totalCalories;
  } catch (error) {
    console.error("Error fetching total calories burned:", error);
    throw new Error("Failed to fetch total calories.");
  }
}
export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    try {
      const { userId } = req.query;
      if (!userId) return res.status(400).json({ error: "User ID is required" });
  
      const user = await prisma.users.findUnique({
        where: { user_id: parseInt(userId) },
        include: {
          profile: {
            include: {
              workouts: {
                include: { exercise: true, activity: true },
                orderBy: { workout_date: "desc" },
                take: 20, // Increase the limit for better data
              },
              activities: { 
                orderBy: { activity_id: "desc" }, 
                take: 30 // Get more activities for weekly analysis
              },
              progressRecords: {
                orderBy: { record_date: "desc" },
                take: 12 // Get last 12 months of progress
              }
            },
          },
          subscription: true,
        },
      });
  
      if (!user) return res.status(404).json({ error: "Profile not found" });
  
      // Calculate statistics
      const workouts = user.profile?.workouts || [];
      const activities = user.profile?.activities || [];
      const progressRecords = user.profile?.progressRecords || [];
  
      const totalDuration = workouts.reduce(
        (acc, w) => acc + (w.duration || 0),
        0
      );
      const totalWorkouts = workouts.length;
      const avgWorkout = totalWorkouts > 0 ? totalDuration / totalWorkouts : 0;
      const totalSteps = activities.reduce((acc, a) => acc + (a.steps || 0), 0);
  
      // Streaks
      let currentStreak = 0,
        longestStreak = 0,
        lastDate = null;
      workouts.forEach((w) => {
        const d = new Date(w.workout_date).toDateString();
        if (!lastDate) currentStreak = 1;
        else {
          const diff =
            (new Date(lastDate) - new Date(d)) / (1000 * 60 * 60 * 24);
          if (diff === 1) currentStreak++;
          else {
            longestStreak = Math.max(longestStreak, currentStreak);
            currentStreak = 1;
          }
        }
        lastDate = d;
      });
      longestStreak = Math.max(longestStreak, currentStreak);
  
      // Format workout data for the dashboard
      const formattedWorkouts = workouts.map(workout => ({
        id: workout.workout_id,
        date: workout.workout_date,
        duration: workout.duration || 0,
        exerciseType: workout.exercise?.type || "Other",
        exerciseName: workout.exercise?.title || "Workout",
        exerciseLevel : workout.exercise?.level || "Beginner",
        exerciseDescription: workout.exercise?.description || "No description",
        youtubeVideo: workout.exercise?.youtube_video || null, 
        exerciseId: workout.exercise?.exercise_id || null,
        bodyPart: workout.exercise?.body_part || null
      }));
  
      // Format activities for the dashboard
      const formattedActivities = activities.map(activity => ({
        id: activity.activity_id,
        date: activity.workout?.workout_date || new Date().toISOString(),
        steps: activity.steps || 0,
        minutes: activity.minutes || 0
      }));
  
      // Format progress records for the dashboard
      const formattedProgress = progressRecords.map(progress => ({
        record_date: progress.record_date,
        weight: progress.weight || 0,
        height: progress.height || 0,
        calories_burnt: progress.calories_burnt || 0,
        fat_percentage: progress.fat_percentage || 0,
        steps: activities.filter(a => {
          const progressDate = new Date(progress.record_date);
          const activityDate = new Date(a.workout?.workout_date || new Date());
          return progressDate.getMonth() === activityDate.getMonth() && 
                 progressDate.getFullYear() === activityDate.getFullYear();
        }).reduce((sum, a) => sum + (a.steps || 0), 0),
        workout_duration: workouts.filter(w => {
          const progressDate = new Date(progress.record_date);
          const workoutDate = new Date(w.workout_date);
          return progressDate.getMonth() === workoutDate.getMonth() && 
                 progressDate.getFullYear() === workoutDate.getFullYear();
        }).reduce((sum, w) => sum + (w.duration || 0), 0)
      }));
  
      // Get exercise history and progress from profile
      const exerciseHistory = JSON.parse(
        user.profile?.exercise_history || "{}"
      );
      const progress = JSON.parse(user.profile?.progress || "{}");
      const caloriesBurnt = await getTotalCaloriesBurned(user.profile?.profile_id || -1);
      // console.log("Calories Burnt:", caloriesBurnt);
      // Prepare the response object
      const response = {
        personalInfo: {
          firstName: user.name?.split(" ")[0] || "",
          lastName: user.name?.split(" ")[1] || "",
          email: user.email,
          gender: exerciseHistory.gender || "",
          birthdate: exerciseHistory.birthdate || "",
          height: user.profile?.curr_height || 0,
          currentWeight: user.profile?.curr_weight || 0,
          goalWeight: user.profile?.goal_weight || 0,
          phoneNumber: user.phone || "",
          profileImage: user.profile?.profile_pic || "",
        },
        fitnessInfo: {
          fitnessLevel: user.profile?.fitness_level || "",
          activityLevel: exerciseHistory.activityLevel || "",
          workoutFrequency: exerciseHistory.workoutFrequency || 0,
          fitnessGoals: user.profile?.fitness_goals || [],
          preferredWorkouts: exerciseHistory.preferredWorkouts || [],
          medicalConditions: exerciseHistory.medicalConditions || [],
          startDate: progress.startDate || "",
        },
        accountInfo: {
          username: user.email?.split("@")[0] || "",
          memberSince: user.created_at?.toISOString().split("T")[0],
          subscription: user.subscription?.plan_purchased || "Free",
          subscriptionRenewal: user.subscription?.exp_date
            ?.toISOString()
            .split("T")[0],
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
          totalSteps,
          averageWorkoutLength: Math.round(avgWorkout),
          longestStreak,
          currentStreak,
          caloriesBurned: caloriesBurnt || 0,
          favoriteExercise: exerciseHistory.favoriteExercise || "Not set",
        },
        workouts: formattedWorkouts,
        activities: formattedActivities,
        progressRecords: formattedProgress,
        purchasedPlans: user.profile?.purchased_plans || [],
      };
  
      return res.status(200).json(response);
    } catch (err) {
      console.error("GET error:", err);
      return res.status(500).json({ error: "Error fetching profile data" });
    }
  }
  if (req.method === "POST") {
    try {
      const { userId, workoutPlan, steps, activeMinutes, caloriesBurned } = req.body;
      if (!userId || !workoutPlan)
        return res
          .status(400)
          .json({ error: "UserId and workoutPlan are required" });

      // Get profile ID for the user
      const userProfile = await prisma.profile.findUnique({
        where: { user_id: parseInt(userId) },
      });

      if (!userProfile) {
        return res.status(404).json({ error: "User profile not found" });
      }

      // Save workout exercises to database
      const savedWorkouts = [];
      let totalDuration = 0;
      
      for (const exercise of workoutPlan) {
        // First ensure the exercise exists in DB or create it
        const savedExercise = await prisma.exercise.upsert({
          where: { exercise_id: exercise.exercise_id || -1 },
          update: {
            title: exercise.title,
            body_part: exercise.bodyPart,
            description: exercise.description,
            type: exercise.type,
            level: exercise.level,
            youtube_video: exercise.youtube_video || null,
          },
          create: {
            title: exercise.title,
            body_part: exercise.bodyPart,
            description: exercise.description,
            type: exercise.type,
            level: exercise.level,
            youtube_video: exercise.youtube_video || null,
          },
        });

        // Get exercise duration
        const duration = exercise.duration || 15;
        totalDuration += duration;

        // Then create the workout record
        const workout = await prisma.workout.create({
          data: {
            profile_id: userProfile.profile_id,
            exercise_id: savedExercise.exercise_id,
            duration: duration,
            workout_date: new Date(exercise.date || new Date()),
          },
        });

        savedWorkouts.push(workout);
      }

      // Create an Activity record if steps or activeMinutes are provided
      if (steps || activeMinutes) {
        // Create one activity record for all workouts if there's no specific workout associated
        await prisma.activity.create({
          data: {
            profile_id: userProfile.profile_id,
            steps: steps || 0,
            minutes: activeMinutes || 0,
            // Link to the first workout if available
            workout_id: savedWorkouts.length > 0 ? savedWorkouts[0].workout_id : null,
          }
        });

        // Update profile statistics
        // await prisma.profile.update({
        //   where: { profile_id: userProfile.profile_id },
        //   data: {
        //     // Calculate approximate calories burnt (simple estimation)
        //     calories_burnt: {
        //       increment: (steps * 0.04) + (activeMinutes * 4) + (totalDuration * 5)
        //     }
        //   }
        // });
      }
      // Also create progress record for this workout session
      await prisma.progress.create({
        data: {
          profile_id: userProfile.profile_id,
          calories_burnt: caloriesBurned || 0,
          // You can add height/weight/fat_percentage if available
        }
      });
      console.log(prisma.progress);
      return res.status(200).json({ success: true, workouts: savedWorkouts });
    } catch (error) {
      console.error("POST error:", error);
      return res.status(500).json({ error: "Error saving workout data" });
    }
  }
  
  // Add a separate endpoint for activity tracking without workout
  if (req.method === "POST" && req.url.includes("/steps")) {
    try {
      const { userId, steps, minutes } = req.body;
      if (!userId) return res.status(400).json({ error: "User ID is required" });

      // Get profile ID for the user
      const userProfile = await prisma.profile.findUnique({
        where: { user_id: parseInt(userId) },
      });

      if (!userProfile) {
        return res.status(404).json({ error: "User profile not found" });
      }

      // Create Activity record
      const activity = await prisma.activity.create({
        data: {
          profile_id: userProfile.profile_id,
          steps: steps || 0,
          minutes: minutes || 0,
        }
      });

      // Update profile statistics
      const caloriesBurnt = (steps * 0.04) + (minutes * 4);
      await prisma.profile.update({
        where: { profile_id: userProfile.profile_id },
        data: {
          calories_burnt: {
            increment: caloriesBurnt
          }
        }
      });

      return res.status(200).json({ 
        success: true, 
        activity,
        caloriesBurnt 
      });
    } catch (error) {
      console.error("POST /steps error:", error);
      return res.status(500).json({ error: "Error saving activity data" });
    }
  }
  
  if (req.method === "PUT") {
    try {
      const { email, profileData } = req.body;
      if (!email || !profileData)
        return res
          .status(400)
          .json({ error: "Email and profile data are required" });

      // First get the user for access to profile
      const user = await prisma.users.findUnique({
        where: { email },
        include: { profile: true }
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
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
                goal_weight: profileData.personalInfo.goalWeight,
                gender: profileData.personalInfo.gender,
                profile_pic: profileData.personalInfo.profileImage,
                fitness_level: profileData.fitnessInfo.fitnessLevel || "BEGINNER",
                fitness_goals: profileData.fitnessInfo.fitnessGoals || [],
              },
              update: {
                curr_weight: profileData.personalInfo.currentWeight,
                curr_height: profileData.personalInfo.height,
                goal_weight: profileData.personalInfo.goalWeight,
                gender: profileData.personalInfo.gender,
                profile_pic: profileData.personalInfo.profileImage,
                fitness_level: profileData.fitnessInfo.fitnessLevel || "BEGINNER",
                fitness_goals: profileData.fitnessInfo.fitnessGoals || [],
              },
            },
          },
        },
      });

      return res
        .status(200)
        .json({ success: true, message: "Profile updated successfully" });
    } catch (error) {
      console.error("PUT error:", error);
      return res.status(500).json({ error: "Error updating profile data" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}