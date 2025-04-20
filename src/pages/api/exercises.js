/* Last Name, First Name - Student ID */
/* 
 Suresh, Kaushick ( 1002237680 ), 
 Sivaprakash, Akshay Prassanna ( 1002198274 ) ,  
 Sonwane, Pratik ( 1002170610 ) , 
 Shaik, Arfan ( 1002260039 ) , 
 Sheth, Jeet ( 1002175315 ) 
*/
// api/exercises.js with improved lazy loading
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
const prisma = new PrismaClient();

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);
  if (req.method === "GET") {
    try {
      // Extract and validate query parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const bodyPart = req.query.bodyPart || null;

      // Ensure page and limit are positive numbers
      if (page < 1 || limit < 1) {
        return res
          .status(400)
          .json({ error: "Page and limit must be positive numbers" });
      }

      const skip = (page - 1) * limit;

      // Build where clause for filtering
      let whereClause = {};
      if (bodyPart && bodyPart !== "All") {
        whereClause.body_part = bodyPart;
      }

      // For search functionality
      if (req.query.search) {
        whereClause.title = {
          contains: req.query.search,
          mode: "insensitive", // Case-insensitive search
        };
      }

      // Execute query with pagination
      const [exercises, totalExercises] = await Promise.all([
        prisma.exercise.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: {
            title: "asc",
          },
        }),
        prisma.exercise.count({
          where: whereClause,
        }),
      ]);

      // Return structured response
      res.status(200).json({
        exercises,
        pagination: {
          total: totalExercises,
          pages: Math.ceil(totalExercises / limit),
          current: page,
          limit,
        },
      });
    } catch (error) {
      console.error("Error fetching exercises:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch exercises", details: error.message });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
