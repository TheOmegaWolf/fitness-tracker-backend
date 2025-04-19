/* Last Name, First Name - Student ID */
/* 
 Suresh, Kaushick ( 1002237680 ), 
 Sivaprakash, Akshay Prassanna ( 1002198274 ) ,  
 Sonwane, Pratik ( 1002170610 ) , 
 Shaik, Arfan ( 1002260039 ) , 
 Sheth, Jeet ( 1002175315 ) 
*/
// import { IncomingForm } from 'formidable';
// import { createWriteStream, mkdir } from 'fs';
// import { promisify } from 'util';
// import path from 'path';
// import Cors from 'cors';

// // Configure CORS
// const cors = Cors({
//   methods: ['POST', 'OPTIONS'],
//   origin: ['http://localhost:3001', 'http://localhost:3000'],
//   credentials: true,
// });

// // Helper to run middleware
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

// // Make mkdir return a promise
// const mkdirAsync = promisify(mkdir);

// // Disable the default body parser to handle form data
// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };

// export default async function handler(req, res) {
//   // Run CORS middleware
//   await runMiddleware(req, res, cors);

//   if (req.method === 'OPTIONS') {
//     return res.status(200).end();
//   }

//   if (req.method !== 'POST') {
//     return res.status(405).json({ error: 'Method Not Allowed' });
//   }

//   try {
//     // Authenticate user (extract user from session/token)
//     // This is a simplified example - implement proper auth
//     const userEmail = req.headers.authorization || 'user@example.com';
    
//     if (!userEmail) {
//       return res.status(401).json({ error: 'Unauthorized' });
//     }

//     // Ensure upload directory exists
//     const uploadDir = path.join(process.cwd(), 'public', 'uploads');
//     try {
//       await mkdirAsync(uploadDir, { recursive: true });
//     } catch (err) {
//       if (err.code !== 'EEXIST') throw err;
//     }

//     // Parse the form data
//     const form = new IncomingForm({
//       uploadDir,
//       keepExtensions: true,
//       maxFileSize: 10 * 1024 * 1024, // 10MB limit
//     });

//     form.parse(req, async (err, fields, files) => {
//       if (err) {
//         console.error('Form parsing error:', err);
//         return res.status(500).json({ error: 'Error uploading file' });
//       }

//       if (!files.profilePic) {
//         return res.status(400).json({ error: 'No file uploaded' });
//       }

//       const file = files.profilePic;
      
//       // Generate a unique filename using user email and timestamp
//       const fileExt = path.extname(file.originalFilename || file.filepath);
//       const sanitizedEmail = userEmail.replace(/[^a-zA-Z0-9]/g, '_');
//       const filename = `${sanitizedEmail}_${Date.now()}${fileExt}`;
      
//       const finalPath = path.join(uploadDir, filename);
      
//       // Create a read stream from the temporary file
//       const readStream = createReadStream(file.filepath);
      
//       // Create a write stream to the final destination
//       const writeStream = createWriteStream(finalPath);
      
//       // Pipe the file to the final destination
//       readStream.pipe(writeStream);
      
//       // Wait for the file to be written
//       await new Promise((resolve, reject) => {
//         writeStream.on('finish', resolve);
//         writeStream.on('error', reject);
//       });
      
//       // File URL for the frontend
//       const fileUrl = `/uploads/${filename}`;
      
//       return res.status(200).json({ 
//         success: true, 
//         message: 'File uploaded successfully',
//         fileUrl 
//       });
//     });
//   } catch (error) {
//     console.error('Upload error:', error);
//     return res.status(500).json({ error: 'Error processing upload' });
//   }
// }