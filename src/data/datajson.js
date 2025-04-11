const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client
const prisma = new PrismaClient();

// Path to your JSON file containing nutrition data
const jsonFilePath = path.join(__dirname, 'nutritionData.json');

async function importNutritionData() {
  try {
    // Read and parse the JSON file
    const nutritionRawData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    
    console.log('Starting nutrition data import...');
    
    // Transform the data to array format for Prisma
    const nutritionData = [];
    
    for (const [foodItemName, details] of Object.entries(nutritionRawData)) {
      nutritionData.push({
        food_item: foodItemName,
        category: details.Category || null,
        calories: details["Calories (kcal)"] || null,
        protein: details["Protein (g)"] || null,
        carbs: details["Carbohydrates (g)"] || null,
        fat: details["Fat (g)"] || null,
        fiber: details["Fiber (g)"] || null,
        sugar: details["Sugars (g)"] || null,
        sodium: details["Sodium (mg)"] || null,
        cholesterol: details["Cholesterol (mg)"] || null,
      });
    }
    
    // Create records in the database
    const result = await prisma.nutrition.createMany({
      data: nutritionData,
      skipDuplicates: true, // Skip records with duplicate food_item names
    });
    
    console.log(`Successfully imported ${result.count} nutrition records`);
    return result;
    
  } catch (error) {
    console.error('Error importing nutrition data:', error);
    throw error;
  } finally {
    // Disconnect Prisma client
    await prisma.$disconnect();
    console.log('Prisma client disconnected');
  }
}

// Execute the import function
importNutritionData()
  .then(() => console.log('Nutrition data import completed'))
  .catch(err => console.error('Nutrition data import failed:', err));