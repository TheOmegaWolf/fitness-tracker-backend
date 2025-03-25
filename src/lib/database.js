const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Function to create initial database tables
async function initializeDatabase() {
  try {
    // User Table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(50),
        last_name VARCHAR(50),
        age INT,
        weight DECIMAL(5,2),
        height DECIMAL(5,2),
        fitness_goal VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Activity Logging Table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        activity_type VARCHAR(50),
        duration INT,
        calories_burned DECIMAL(6,2),
        date DATE,
        additional_notes TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Progress Tracking Table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS progress (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        weight DECIMAL(5,2),
        body_fat_percentage DECIMAL(4,2),
        muscle_mass DECIMAL(4,2),
        date DATE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

module.exports = {
  pool,
  initializeDatabase
};
