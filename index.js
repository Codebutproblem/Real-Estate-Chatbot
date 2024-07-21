import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { askQuestion } from './agent.js';
dotenv.config();


const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.status(200).json({ message: 'Welcome to the Real Estate Chatbot API' });
});

app.post('/agent', async (req, res) => {
    const input = req.body.input;
    const result = await askQuestion(input);
    res.status(200).json(result);
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});