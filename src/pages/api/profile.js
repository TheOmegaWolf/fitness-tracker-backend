// This file should be located at /pages/api/profile.js in a Next.js project
import { prisma } from '../../lib/database';
import Cors from 'cors';

// Initialize the CORS middleware
const cors = Cors({
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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
  // Run the CORS middleware first
  await runMiddleware(req, res, cors);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.status(200).end();
  }

  // Authenticate user (extract user from Authorization header, which now contains the email from session storage)
  const userEmail = req.headers.authorization;
  
  if (!userEmail) {
    return res.status(401).json({ error: 'Unauthorized - Email not provided' });
  }

  // GET: Fetch user profile
  if (req.method === 'GET') {
    try {
      const user = await prisma.users.findUnique({
        where: { email: userEmail },
        include: {
          profile: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Remove sensitive data
      const { password, ...userWithoutPassword } = user;

      return res.status(200).json({
        success: true,
        user: userWithoutPassword,
        profile: user.profile || null,
      });
    } catch (error) {
      console.error('Profile fetch error:', error);
      return res.status(500).json({ error: 'Error fetching profile data' });
    }
  } 
  
  // PUT: Update user profile
  else if (req.method === 'PUT') {
    try {
      const { user: userData, profile: profileData } = req.body;

      if (!userData && !profileData) {
        return res.status(400).json({ error: 'No data provided for update' });
      }

      // Get the existing user
      const existingUser = await prisma.users.findUnique({
        where: { email: userEmail },
        include: { profile: true },
      });

      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update user data
      const updatedUser = await prisma.users.update({
        where: { email: userEmail },
        data: {
          name: userData.name || existingUser.name,
          phone: userData.phone || existingUser.phone,
        },
      });

      // Prepare fitness goals data
      // Ensure the fitness_goals is stored as a proper JSON array
      const fitnessGoals = Array.isArray(profileData.fitness_goals) 
        ? profileData.fitness_goals 
        : (profileData.fitness_goals ? [profileData.fitness_goals] : []);

      // Handle profile update/creation
      let profileResult;
      if (!existingUser.profile) {
        // Create profile if it doesn't exist
        profileResult = await prisma.profile.create({
          data: {
            user_id: existingUser.user_id,
            gender: profileData.gender,
            birthday: profileData.birthday ? new Date(profileData.birthday) : null,
            height: profileData.height ? parseFloat(profileData.height) : null,
            curr_weight: profileData.curr_weight ? parseFloat(profileData.curr_weight) : null,
            goal_weight: profileData.goal_weight ? parseFloat(profileData.goal_weight) : null,
            fitness_level: profileData.fitness_level || 'BEGINNER',
            fitness_goals: fitnessGoals, // Store fitness goals as JSON
            profile_pic: profileData.profile_pic || null,
          },
        });
      } else {
        // Update existing profile
        profileResult = await prisma.profile.update({
          where: { user_id: existingUser.user_id },
          data: {
            gender: profileData.gender !== undefined ? profileData.gender : existingUser.profile.gender,
            birthday: profileData.birthday !== undefined 
              ? (profileData.birthday ? new Date(profileData.birthday) : null) 
              : existingUser.profile.birthday,
            height: profileData.height !== undefined 
              ? (profileData.height ? parseFloat(profileData.height) : null) 
              : existingUser.profile.height,
            curr_weight: profileData.curr_weight !== undefined 
              ? (profileData.curr_weight ? parseFloat(profileData.curr_weight) : null) 
              : existingUser.profile.curr_weight,
            goal_weight: profileData.goal_weight !== undefined 
              ? (profileData.goal_weight ? parseFloat(profileData.goal_weight) : null) 
              : existingUser.profile.goal_weight,
            fitness_level: profileData.fitness_level !== undefined 
              ? profileData.fitness_level 
              : existingUser.profile.fitness_level,
            fitness_goals: profileData.fitness_goals !== undefined 
              ? fitnessGoals 
              : existingUser.profile.fitness_goals,
            profile_pic: profileData.profile_pic !== undefined 
              ? profileData.profile_pic 
              : existingUser.profile.profile_pic,
          },
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          ...updatedUser,
          profile: profileResult,
        },
      });
    } catch (error) {
      console.error('Profile update error:', error);
      return res.status(500).json({ error: 'Error updating profile', details: error.message });
    }
  } else {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
}
// // This file should be located at /pages/api/profile.js in a Next.js project
// import { prisma } from '../../lib/database';
// import Cors from 'cors';

// // Initialize the CORS middleware
// const cors = Cors({
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   origin: ['http://localhost:3001', 'http://localhost:3000'],
//   credentials: true,
// });

// // Helper method to run middleware
// function runMiddleware(req, res, fn) {
//   return new Promise((resolve, reject) => {
//     fn(req, res, (result) => {
//       if (result instanceof Error) {
//         return reject(result);
//       }
//       return resolve(result);
//     });
//   });
// }

// export default async function handler(req, res) {
//   // Run the CORS middleware first
//   await runMiddleware(req, res, cors);

//   // Handle preflight requests
//   if (req.method === 'OPTIONS') {
//     res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
//     res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
//     res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
//     res.setHeader('Access-Control-Allow-Credentials', 'true');
//     return res.status(200).end();
//   }

//   // Authenticate user (extract user from session/token)
//   const userEmail = req.headers.authorization || 'cowesip608@bariswc.com';
  
//   if (!userEmail) {
//     return res.status(401).json({ error: 'Unauthorized' });
//   }

//   // GET: Fetch user profile
//   if (req.method === 'GET') {
//     try {
//       const user = await prisma.users.findUnique({
//         where: { email: userEmail },
//         include: {
//           profile: true,
//         },
//       });

//       if (!user) {
//         return res.status(404).json({ error: 'User not found' });
//       }

//       // Remove sensitive data
//       const { password, ...userWithoutPassword } = user;

//       return res.status(200).json({
//         success: true,
//         user: userWithoutPassword,
//         profile: user.profile || null,
//       });
//     } catch (error) {
//       console.error('Profile fetch error:', error);
//       return res.status(500).json({ error: 'Error fetching profile data' });
//     }
//   } 
  
//   // PUT: Update user profile
//   else if (req.method === 'PUT') {
//     try {
//       const { user: userData, profile: profileData } = req.body;

//       if (!userData && !profileData) {
//         return res.status(400).json({ error: 'No data provided for update' });
//       }

//       // Get the existing user
//       const existingUser = await prisma.users.findUnique({
//         where: { email: userEmail },
//         include: { profile: true },
//       });

//       if (!existingUser) {
//         return res.status(404).json({ error: 'User not found' });
//       }

//       // Update user data
//       const updatedUser = await prisma.users.update({
//         where: { email: userEmail },
//         data: {
//           name: userData.name || existingUser.name,
//           phone: userData.phone || existingUser.phone,
//         },
//       });

//       // Prepare fitness goals data
//       // Ensure the fitness_goals is stored as a proper JSON array
//       const fitnessGoals = Array.isArray(profileData.fitness_goals) 
//         ? profileData.fitness_goals 
//         : (profileData.fitness_goals ? [profileData.fitness_goals] : []);

//       // Handle profile update/creation
//       let profileResult;
//       if (!existingUser.profile) {
//         // Create profile if it doesn't exist
//         profileResult = await prisma.profile.create({
//           data: {
//             user_id: existingUser.user_id,
//             gender: profileData.gender,
//             birthday: profileData.birthday ? new Date(profileData.birthday) : null,
//             height: profileData.height ? parseFloat(profileData.height) : null,
//             curr_weight: profileData.curr_weight ? parseFloat(profileData.curr_weight) : null,
//             goal_weight: profileData.goal_weight ? parseFloat(profileData.goal_weight) : null,
//             fitness_level: profileData.fitness_level || 'BEGINNER',
//             fitness_goals: fitnessGoals, // Store fitness goals as JSON
//             // activity_level: profileData.activity_level || null,
//             // workout_frequency: profileData.workout_frequency 
//             //   ? parseInt(profileData.workout_frequency, 10) 
//             //   : null,
//             profile_pic: profileData.profile_pic || null,
//           },
//         });
//       } else {
//         // Update existing profile
//         profileResult = await prisma.profile.update({
//           where: { user_id: existingUser.user_id },
//           data: {
//             gender: profileData.gender !== undefined ? profileData.gender : existingUser.profile.gender,
//             birthday: profileData.birthday !== undefined 
//               ? (profileData.birthday ? new Date(profileData.birthday) : null) 
//               : existingUser.profile.birthday,
//             height: profileData.height !== undefined 
//               ? (profileData.height ? parseFloat(profileData.height) : null) 
//               : existingUser.profile.height,
//             curr_weight: profileData.curr_weight !== undefined 
//               ? (profileData.curr_weight ? parseFloat(profileData.curr_weight) : null) 
//               : existingUser.profile.curr_weight,
//             goal_weight: profileData.goal_weight !== undefined 
//               ? (profileData.goal_weight ? parseFloat(profileData.goal_weight) : null) 
//               : existingUser.profile.goal_weight,
//             fitness_level: profileData.fitness_level !== undefined 
//               ? profileData.fitness_level 
//               : existingUser.profile.fitness_level,
//             fitness_goals: profileData.fitness_goals !== undefined 
//               ? fitnessGoals 
//               : existingUser.profile.fitness_goals,
//             // activity_level: profileData.activity_level !== undefined 
//             //   ? profileData.activity_level 
//             //   : existingUser.profile.activity_level,
//             // workout_frequency: profileData.workout_frequency !== undefined 
//             //   ? parseInt(profileData.workout_frequency, 10) 
//             //   : existingUser.profile.workout_frequency,
//             profile_pic: profileData.profile_pic !== undefined 
//               ? profileData.profile_pic 
//               : existingUser.profile.profile_pic,
//           },
//         });
//       }

//       return res.status(200).json({
//         success: true,
//         message: 'Profile updated successfully',
//         user: {
//           ...updatedUser,
//           profile: profileResult,
//         },
//       });
//     } catch (error) {
//       console.error('Profile update error:', error);
//       return res.status(500).json({ error: 'Error updating profile', details: error.message });
//     }
//   } else {
//     return res.status(405).json({ error: 'Method Not Allowed' });
//   }
// }
