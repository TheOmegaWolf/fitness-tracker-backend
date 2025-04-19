# Fitness Tracker Application

## Hosted at :

- **https://axs8276.uta.cloud/**

## Team Members

- **Suresh, Kaushick** (1002237680)
- **Sivaprakash, Akshay Prassanna** (1002198274)
- **Sonwane, Pratik** (1002170610)
- **Shaik, Arfan** (1002260039)
- **Sheth, Jeet** (1002175315)

## Backend Runs on : http://localhost:3000

## Socket : http://localhost:5000

## Database (Mysql)

## Db Name= fitnesstracker2

## username= root

## password= akshay.s

- Make sure you have Node.js Installed
- Install all required packages at root directoryusing
  `npm install`
- Run the project using
  `npm run dev`
- Build project using
  `npm run build`

## Development Flow

### Dashboard : ( src/pages/api/activity )

- Displays key fitness metrics such as weight, steps taken, and calories burned
- Monthly progress visualized using a bar/line chart by selecting metrics weight,steps,calories,workout duration
- weekly activity progress visualized
- Daily activity breakdown shown via a bar chart
- visualizing the workout types
- AI insights to track goals effectively.

### Activity : ( src/pages/api/activity, src/pages/api/exercises, src/pages/api/profile, src/pages/api/workouts )

- Users can log their daily steps and track them
- Exercise time (active minutes) can be recorded
- we have added all the excercise data in the database
- AI-driven exercise recommendations based on user needs
- Search bar to find exercises based on specific body parts
- Each activity includes a linked YouTube tutorial
- Logged activities can be saved for daily tracking

### Analytics : ( src/pages/api/analytics )

- Data can be filtered based on time frame, metrics, and body parts
- Trend analysis of calories burned over time
- Predictive analytics showcasing actual vs. projected weight trends
- Body part focus visualization for progress tracking
- Exercise difficulty distribution across beginner, intermediate, and advanced levels and it showed on the each card whether is it beginner/intermediate/advanced
- AI-based recommendations based on user activity patterns

### Chat : ( src/pages/api/chat )

- Enables user-to-user messaging to build community and motivation.
- For this we have used socket.io ,and the server runs on the port 5000
- the chat are stored in the database

### Sign-Up ( src/pages/api/users )

- Users are required to provide First Name, Last Name, Email, and Password
- Registration is managed through Firebase and also the details are stored in the database
- Multi-factor authentication is implemented
- Confirmation email is sent to the user's registered email address

### Login ( src/pages/api/login )

- Users can log in using their registered email ID and password
- "Forgot Password" functionality is implemented via Firebase

### Nutrition ( src/pages/api/intake, src/pages/api/nutrition )

- Search functionality to fetch detailed nutritional information of food items
- Users can add food to their meals and they can save their meal based on the meal type(Breakfast/Lunch /Dinner/Snacks)
- Meal history can be saved for future reference

### Plans ( src/pages/api/subscriptions )

- Choose from Beginner, Intermediate, or Advanced fitness plans. Includes subscription and payment handling.
- Once after buying the plan , the page directs to the trainer page where user has the previlage to connect with the trainer

### trainer ( src/pages/api/users )

Once user buys the plan , they can connect with trainer by booking an appointment .

### Profile ( src/pages/api/profile )

- Displays user's personal and fitness-related information
- Users can edit their details as needed like their current weight , height , profile image
- Target weight and other fitness goals can be set

### Contact Us :

-Simple form for users to reach support with inquiries or feedback.

- Contact form for users to reach out to the development team
- Once the form is filled the mail will be sent like from whom the mail is from and their queries
- Office location details are provided

### AI Chat :

- Smart assistant to answer user questions, offer guidance, and enhance app interaction.
- we have used Open Router api
