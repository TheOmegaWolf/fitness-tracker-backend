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

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    try {
      const { email } = req.query;
      if (!email) return res.status(400).json({ error: "Email is required" });

      const user = await prisma.users.findUnique({
        where: { email },
        include: {
          profile: {
            include: {
              workouts: {
                include: { exercise: true },
                orderBy: { workout_date: "desc" },
                take: 10,
              },
              activities: { orderBy: { activity_id: "desc" }, take: 5 },
            },
          },
          subscription: true,
        },
      });

      if (!user) return res.status(404).json({ error: "Profile not found" });

      const workouts = user.profile?.workouts || [];
      const totalDuration = workouts.reduce(
        (acc, w) => acc + (w.duration || 0),
        0
      );
      const totalWorkouts = workouts.length;
      const avgWorkout = totalWorkouts > 0 ? totalDuration / totalWorkouts : 0;

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

      const exerciseHistory = JSON.parse(
        user.profile?.exercise_history || "{}"
      );
      const progress = JSON.parse(user.profile?.progress || "{}");

      const response = {
        personalInfo: {
          firstName: user.name?.split(" ")[0] || "",
          lastName: user.name?.split(" ")[1] || "",
          email: user.email,
          gender: exerciseHistory.gender || "",
          birthdate: exerciseHistory.birthdate || "",
          height: user.profile?.curr_height || 0,
          currentWeight: user.profile?.curr_weight || 0,
          goalWeight: progress.targetWeight || 0,
          phoneNumber: user.phone || "",
          profileImage: user.profile?.photo || "",
        },
        fitnessInfo: {
          fitnessLevel: exerciseHistory.fitnessLevel || "",
          activityLevel: exerciseHistory.activityLevel || "",
          workoutFrequency: exerciseHistory.workoutFrequency || 0,
          fitnessGoals: progress.fitnessGoals || [],
          preferredWorkouts: exerciseHistory.preferredWorkouts || [],
          medicalConditions: exerciseHistory.medicalConditions || [],
          startDate: progress.startDate || "",
        },
        accountInfo: {
          username: user.username || "",
          memberSince: user.createdAt?.toISOString().split("T")[0],
          subscription: user.subscription?.type || "Free",
          subscriptionRenewal: user.subscription?.renewalDate
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
          averageWorkoutLength: Math.round(avgWorkout),
          longestStreak,
          currentStreak,
          caloriesBurned: Math.round(user.profile?.calories_burnt || 0),
          favoriteExercise: exerciseHistory.favoriteExercise || "Not set",
        },
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
      const { userId, workoutPlan, steps, activeMinutes } = req.body;
      if (!userId || !workoutPlan)
        return res
          .status(400)
          .json({ error: "UserId and workoutPlan are required" });

      // Save workout exercises to database
      const savedWorkouts = [];
      for (const exercise of workoutPlan) {
        // First ensure the exercise exists in DB or create it
        const savedExercise = await prisma.exercises.upsert({
          where: { title: exercise.title },
          update: {
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

        // Then create the workout record
        const workout = await prisma.workouts.create({
          data: {
            user_id: parseInt(userId),
            exercise_id: savedExercise.exercise_id,
            duration: exercise.duration,
            workout_date: new Date(exercise.date),
          },
        });

        savedWorkouts.push(workout);
      }

      // Update user stats with steps and active minutes if needed
      if (steps || activeMinutes) {
        await prisma.profiles.updateMany({
          where: { user_id: parseInt(userId) },
          data: {
            // You might want to append to existing values rather than overwrite
            steps_count: { increment: steps },
            active_minutes: { increment: activeMinutes },
          },
        });
      }

      return res.status(200).json({ success: true, workouts: savedWorkouts });
    } catch (error) {
      console.error("POST error:", error);
      return res.status(500).json({ error: "Error saving workout data" });
    }
  }
  if (req.method === "PUT") {
    try {
      const { email, profileData } = req.body;
      if (!email || !profileData)
        return res
          .status(400)
          .json({ error: "Email and profile data are required" });

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
                  favoriteExercise: profileData.statistics.favoriteExercise,
                }),
                progress: JSON.stringify({
                  targetWeight: profileData.personalInfo.goalWeight,
                  fitnessGoals: profileData.fitnessInfo.fitnessGoals,
                  startDate: profileData.fitnessInfo.startDate,
                  lastUpdated: new Date().toISOString(),
                }),
                purchasedPlans: user.profile?.purchased_plans || [],
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
                  favoriteExercise: profileData.statistics.favoriteExercise,
                }),
                progress: JSON.stringify({
                  targetWeight: profileData.personalInfo.goalWeight,
                  fitnessGoals: profileData.fitnessInfo.fitnessGoals,
                  startDate: profileData.fitnessInfo.startDate,
                  lastUpdated: new Date().toISOString(),
                }),
                purchasedPlans: user.profile?.purchased_plans || [],
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
