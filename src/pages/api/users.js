import { prisma } from '../../lib/database';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            const users = await prisma.users.findMany();
            return res.status(200).json(users);
        } catch (error) {
            console.log(error)
            return res.status(500).json({ error: 'Error fetching users' });
        }
    } 
    else if (req.method === 'POST') {
        try {
            const { username, email, password, firstName, lastName, age, weight, height, fitnessGoal } = req.body;
            const newUser = await prisma.user.create({
                data: { username, email, password, firstName, lastName, age, weight, height, fitnessGoal },
            });
            return res.status(201).json(newUser);
        } catch (error) {
            return res.status(500).json({ error: 'Error creating user' });
        }
    } 
    else {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
}
