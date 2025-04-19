/* Last Name, First Name - Student ID */
/* 
 Suresh, Kaushick ( 1002237680 ), 
 Sivaprakash, Akshay Prassanna ( 1002198274 ) ,  
 Sonwane, Pratik ( 1002170610 ) , 
 Shaik, Arfan ( 1002260039 ) , 
 Sheth, Jeet ( 1002175315 ) 
*/
const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./lib/database'); // Ensure correct path
const userRoutes = require('./users');

const app = express();
app.use(express.json());
app.use(cors());

// Initialize Prisma
initializeDatabase();

// Use API routes
app.use('/api', userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
