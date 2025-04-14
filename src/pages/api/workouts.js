// api/workouts.js
import { PrismaClient } from "@prisma/client";
import Cors from "cors";

// Initialize the CORS middleware
const cors = Cors({
  methods: ["GET", "PUT", "OPTIONS"],
  origin: ["http://localhost:3001", "http://localhost:3000"],
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
export async function getProfileByUserId(userId) {
  try {
    const profile = await prisma.profile.findUnique({
      where: {
        user_id: userId,
      },
      include: {
        workouts: true,
        activities: true,
        progressRecords: true,
        intakes: {
          include: {
            nutrition: true,
          },
        },
      },
    });

    return profile;
  } catch (error) {
    console.error("Failed to get profile:", error);
    throw error;
  }
}
/**
 * Fetch exercise by exercise ID
 * @param {number} exerciseId - The exercise ID
 * @returns {Promise<Exercise|null>} - Returns the exercise or null if not found
 */
export async function getExerciseById(exerciseId) {
  try {
    const exercise = await prisma.exercise.findUnique({
      where: {
        exercise_id: exerciseId,
      },
      include: {
        workouts: {
          include: {
            profile: {
              include: {
                user: true, // optional, to get user info via profile
              },
            },
          },
        },
        analyses: true,
      },
    });

    return exercise;
  } catch (error) {
    console.error("Failed to get exercise:", error);
    throw error;
  }
}
const prisma = new PrismaClient();

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);
  if (req.method === "POST") {
    try {
      const { userId, workouts, steps, activeMinutes } = req.body;

      // Validate request data
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      if (!workouts || !Array.isArray(workouts) || workouts.length === 0) {
        return res
          .status(400)
          .json({ error: "At least one workout is required" });
      }

      // Check if user exists
      const user = await prisma.users.findUnique({
        where: { user_id: parseInt(userId) },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Transaction to save all workouts
      const savedWorkouts = await prisma.$transaction(async (prisma) => {
        // Save each workout
        const savedItems = [];

        for (const workout of workouts) {
          // Validate workout data
          if (!workout.exercise_id) {
            throw new Error("Each workout must have an exercise_id");
          }
          const exercise = await getExerciseById(workout.exercise_id);
          if (!exercise) {
            throw new Error(
              `Exercise with ID ${workout.exercise_id} not found`
            );
          }

          // Convert workout_date from string to Date
          const workoutDate = new Date(workout.date);
          const profile = await getProfileByUserId(parseInt(userId));
          // Save the workout
          const savedWorkout = await prisma.workout.create({
            data: {
              profile_id: profile.profile_id, // ✅ Correct
              exercise_id: workout.exercise_id, // ✅ Correct
              workout_date: workoutDate,
              duration: workout.duration || 15,
              start_time: workout.start_time || new Date(),
            },
            include: {
              exercise: true, // Include exercise details in the response
            },
          });

          savedItems.push(savedWorkout);
        }

        // Save activity metrics (steps and active minutes) if provided
        if (steps > 0 || activeMinutes > 0) {
          const today = new Date();

          // Check if there's already an activity entry for today
          const existingActivity = await prisma.activity.findFirst({
            where: {
              user_id: parseInt(userId),
              activity_date: {
                gte: new Date(today.setHours(0, 0, 0, 0)),
                lt: new Date(today.setHours(23, 59, 59, 999)),
              },
            },
          });

          if (existingActivity) {
            // Update existing activity
            await prisma.activity.update({
              where: { activity_id: existingActivity.activity_id },
              data: {
                steps: existingActivity.steps + steps,
                active_minutes: existingActivity.active_minutes + activeMinutes,
              },
            });
          } else {
            // Create new activity
            await prisma.activity.create({
              data: {
                user_id: parseInt(userId),
                activity_date: new Date(),
                steps,
                active_minutes: activeMinutes,
              },
            });
          }
        }

        return savedItems;
      });

      // Return success response
      res.status(201).json({
        message: "Workout saved successfully",
        workouts: savedWorkouts,
      });
    } catch (error) {
      console.error("Error saving workout:", error);
      res
        .status(500)
        .json({ error: "Failed to save workout", details: error.message });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
