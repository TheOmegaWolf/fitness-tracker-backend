// import { prisma } from '../../../lib/database';
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
//   // Run the CORS middleware
//   await runMiddleware(req, res, cors);

//   if (req.method === 'OPTIONS') {
//     return res.status(200).end();
//   }

//   // Extract the user ID from the path
//   const { id } = req.query;

//   if (!id) {
//     return res.status(400).json({ error: 'User ID is required' });
//   }

//   if (req.method === 'GET') {
//     try {
//       const user = await prisma.users.findUnique({
//         where: { user_id: parseInt(id) },
//         include: {
//           profile: {
//             include: {
//               workouts: true,
//               progressRecords: true,
//               intakes: {
//                 include: {
//                   nutrition: true
//                 }
//               },
//               activities: true
//             }
//           }
//         }
//       });

//       if (!user) {
//         return res.status(404).json({ error: 'User not found' });
//       }

//       return res.status(200).json({ user });
//     } catch (error) {
//       console.error('Error fetching user:', error);
//       return res.status(500).json({ error: 'Error fetching user', details: error.message });
//     }
//   }

//   if (req.method === 'PUT') {
//     try {
//       const { profile, progressRecord, workout, intake, ...updateData } = req.body;
      
//       // Get the user to find the profile ID
//       const user = await prisma.users.findUnique({
//         where: { user_id: parseInt(id) },
//         include: { profile: true }
//       });

//       if (!user || !user.profile) {
//         return res.status(404).json({ error: 'User or profile not found' });
//       }

//       const profileId = user.profile.profile_id;
      
//       // Begin a transaction for complex updates
//       const updatedUser = await prisma.$transaction(async (prisma) => {
//         // Update basic user data
//         const updatedUserData = await prisma.users.update({
//           where: { user_id: parseInt(id) },
//           data: updateData,
//           include: { profile: true }
//         });

//         // Update profile if provided
//         if (profile) {
//           await prisma.profile.update({
//             where: { profile_id: profileId },
//             data: profile
//           });
//         }

//         // Add new progress record if provided
//         if (progressRecord) {
//           await prisma.progress.create({
//             data: {
//               ...progressRecord,
//               profile_id: profileId,
//               record_date: progressRecord.record_date || new Date()
//             }
//           });
//         }

//         // Add new workout if provided
//         if (workout) {
//           await prisma.workout.create({
//             data: {
//               ...workout,
//               profile_id: profileId,
//               workout_date: workout.workout_date || new Date()
//             }
//           });
//         }

//         // Add new intake if provided
//         if (intake) {
//           await prisma.intake.create({
//             data: {
//               ...intake,
//               profile_id: profileId,
//               intake_date: intake.intake_date || new Date()
//             }
//           });
//         }

//         // Return the updated user with all related data
//         return prisma.users.findUnique({
//           where: { user_id: updatedUserData.user_id },
//           include: {
//             profile: {
//               include: {
//                 progressRecords: true,
//                 workouts: true,
//                 intakes: {
//                   include: {
//                     nutrition: true
//                   }
//                 },
//                 activities: true
//               }
//             }
//           }
//         });
//       });

//       return res.status(200).json({ user: updatedUser });
//     } catch (error) {
//       console.error("Error updating user:", error);
//       return res.status(500).json({ error: 'Error updating user', details: error.message });
//     }
//   }

//   if (req.method === 'DELETE') {
//     try {
//       // Check if user exists first
//       const existingUser = await prisma.users.findUnique({
//         where: { user_id: parseInt(id) }
//       });

//       if (!existingUser) {
//         return res.status(404).json({ error: 'User not found' });
//       }

//       // Delete the user
//       await prisma.users.delete({
//         where: { user_id: parseInt(id) }
//       });

//       return res.status(200).json({ success: true, message: 'User deleted successfully' });
//     } catch (error) {
//       console.error("Error deleting user:", error);
//       return res.status(500).json({ error: 'Error deleting user', details: error.message });
//     }
//   }

//   return res.status(405).json({ error: 'Method not allowed' });
// }