import { prisma } from "../../lib/database";
import Cors from "cors";

// Initialize the CORS middleware
const cors = Cors({
  methods: ["GET", "OPTIONS"],
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
      const { userId, timeFrame = "weekly" } = req.query;
      if (!userId) return res.status(400).json({ error: "User ID is required" });

      // Get the user profile first
      const profile = await prisma.profile.findFirst({
        where: { user_id: parseInt(userId) },
      });

      if (!profile) return res.status(404).json({ error: "Profile not found" });

      // Set date ranges based on the timeFrame
      const currentDate = new Date();
      let startDate = new Date();
      
      if (timeFrame === "weekly") {
        startDate.setDate(currentDate.getDate() - 7);
      } else if (timeFrame === "monthly") {
        startDate.setMonth(currentDate.getMonth() - 1);
      } else if (timeFrame === "quarterly") {
        startDate.setMonth(currentDate.getMonth() - 3);
      } else {
        // Default to weekly
        startDate.setDate(currentDate.getDate() - 7);
      }

      // Get calories burnt from progress table
      const caloriesData = await prisma.progress.findMany({
        where: {
          profile_id: profile.profile_id,
          record_date: {
            gte: startDate,
          },
        },
        select: {
          record_date: true,
          calories_burnt: true,
        },
        orderBy: {
          record_date: 'asc',
        },
      });

      // Get exercise time from workout table
      const exerciseTimeData = await prisma.workout.findMany({
        where: {
          profile_id: profile.profile_id,
          workout_date: {
            gte: startDate,
          },
        },
        select: {
          workout_date: true,
          duration: true,
        },
        orderBy: {
          workout_date: 'asc',
        },
      });

      // Get weight from progress table
      const weightData = await prisma.progress.findMany({
        where: {
          profile_id: profile.profile_id,
        },
        select: {
          record_date: true,
          weight: true,
        },
        orderBy: {
          record_date: 'asc',
        },
      });

      // Process body part distribution
      const bodyPartDistribution = await prisma.workout.findMany({
        where: {
          profile_id: profile.profile_id,
        },
        include: {
          exercise: {
            select: {
              body_part: true,
            },
          },
        },
      });

      // Count exercises by body part
      const bodyPartCounts = {};
      bodyPartDistribution.forEach(workout => {
        const bodyPart = workout.exercise?.body_part || "Other";
        bodyPartCounts[bodyPart] = (bodyPartCounts[bodyPart] || 0) + 1;
      });

      // Format body part data for charts
      const bodyPartData = Object.keys(bodyPartCounts).map(bodyPart => ({
        name: bodyPart,
        value: bodyPartCounts[bodyPart],
      }));

      // Process exercise difficulty distribution
      const difficultyDistribution = await prisma.workout.findMany({
        where: {
          profile_id: profile.profile_id,
        },
        include: {
          exercise: {
            select: {
              level: true,
            },
          },
        },
      });

      // Count exercises by difficulty
      const difficultyCounts = {
        "Beginner": 0,
        "Intermediate": 0,
        "Advanced": 0,
      };

      difficultyDistribution.forEach(workout => {
        const level = workout.exercise?.level || "Beginner";
        if (difficultyCounts.hasOwnProperty(level)) {
          difficultyCounts[level]++;
        } else {
          difficultyCounts["Beginner"]++; // Default to beginner if level is unknown
        }
      });

      // Format difficulty data for charts
      const difficultyData = Object.keys(difficultyCounts).map(level => ({
        name: level,
        value: difficultyCounts[level],
      }));

      // Calculate predictive weight based on calories burned and current trend
      // This is a simple linear prediction model
      let predictiveWeightData = [];
      if (weightData.length >= 2) {
        const latestWeight = weightData[weightData.length - 1];
        const previousWeight = weightData[weightData.length - 2];
        
        if (latestWeight?.weight && previousWeight?.weight) {
          const weightDifference = latestWeight.weight - previousWeight.weight;
          const daysDifference = Math.max(1, Math.round((new Date(latestWeight.record_date) - new Date(previousWeight.record_date)) / (1000 * 60 * 60 * 24)));
          const dailyWeightChange = weightDifference / daysDifference;
          
          // Format weight data for the chart
          const formattedWeightData = weightData.map(item => ({
            date: item.record_date.toISOString().split('T')[0],
            value: item.weight || null,
          }));
          
          // Generate predictions for the next 4 weeks
          for (let i = 1; i <= 4; i++) {
            const predictionDate = new Date(latestWeight.record_date);
            predictionDate.setDate(predictionDate.getDate() + (i * 7));
            
            const predictedWeight = latestWeight.weight + (dailyWeightChange * i * 7);
            
            predictiveWeightData.push({
              date: predictionDate.toISOString().split('T')[0],
              value: predictedWeight,
              isPrediction: true,
            });
          }
          
          // Combine actual weights and predictions
          predictiveWeightData = [...formattedWeightData, ...predictiveWeightData];
        }
      }

      // Format time-based data for charts
      const formatTimeData = (data, dateField, valueField) => {
        return data.map(item => ({
          date: item[dateField].toISOString().split('T')[0],
          value: item[valueField] || 0,
        }));
      };

      // Get exercises for recommendations
      const exerciseRecommendations = await prisma.exercise.findMany({
        where: {
          body_part: {
            in: Object.keys(bodyPartCounts).length > 0 
              ? Object.keys(bodyPartCounts)
              : undefined,
          },
        },
        take: 5,
      });

      // Format exercise recommendations
      const formattedRecommendations = exerciseRecommendations.map(exercise => ({
        title: exercise.title,
        description: exercise.description || "",
        bodyPart: exercise.body_part || "General",
        type: exercise.type || "Strength",
        level: exercise.level || "Beginner",
        youtube_video: exercise.youtube_video || null,
      }));

      // Format the response
      const response = {
        calories: formatTimeData(caloriesData, 'record_date', 'calories_burnt'),
        exerciseTime: formatTimeData(exerciseTimeData, 'workout_date', 'duration'),
        weight: formatTimeData(weightData, 'record_date', 'weight'),
        bodyPartDistribution: bodyPartData,
        difficultyDistribution: difficultyData,
        predictiveWeight: predictiveWeightData,
        exerciseRecommendations: formattedRecommendations,
      };

      return res.status(200).json(response);
    } catch (err) {
      console.error("GET error:", err);
      return res.status(500).json({ error: "Error fetching analytics data", details: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
