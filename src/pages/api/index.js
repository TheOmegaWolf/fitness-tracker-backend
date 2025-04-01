const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./lib/database'); // Ensure correct path
const userRoutes = require('./api/routes/userRoutes');

const app = express();
app.use(express.json());
app.use(cors());

// Initialize Prisma
initializeDatabase();

// Use API routes
app.use('/api', userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
