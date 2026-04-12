import { v4 as uuidv4 } from 'uuid';
import { Quiz } from "../schemas/quiz.schema.ts";
import { User } from '../schemas/user.schema.ts';

export const addQuiz = async (req, res) => {
    try {
        const { userId } = req.user;
        const code = uuidv4().split('-')[0];
        const { title, description, isPermanent, startTime } = req.body

        if (description && description.length > 150) {
            res.status(400).send("Description length should be 150 at max.")
        }

        const quiz = await Quiz.create({
            Hosts: [{ userId: userId, role: 'owner' }],
            roomCode: code,
            Title: title,
            Description: description,
            isPermanent: isPermanent || false,
            startTime: new Date(startTime)
        })

        res.status(201)
            .json({ message: "Quiz created succesfully!", data: quiz })
    } catch (error) {
        res.status(500).json({ errorCode: error.code, errorMessage: error.message })
    }
}

export const getAllQuiz = async (req, res) => {
    try {
        const payload = req.user

        const quizes = await Quiz.find({ 'Hosts.userId': payload.userId }).select("roomCode, Title, Description, TotalPoints, QuestionsCount, startTime")

        res.status(200)
            .json({ message: "Quizes fetched successfully", data: quizes })
    } catch (error) {
        res.status(500).json({ errorCode: error.code, errorMessage: error.message })
    }
}

export const getQuidById = async (req, res) => {
    try {
        const { userId } = req.user;
        const { quizId } = req.params;

        const quiz = await Quiz.findById(quizId)
        if (!quiz.Hosts.includes(userId)) {
            res.status(401)
                .json({ errorCode: 401, errorMessage: "You are not authorised to access this quiz!!" })
        }

        res.status(200)
            .json({ message: "Quiz fetched successfully", data: quiz })
    } catch (error) {
        res.status(500).json({ errorCode: error.code, errorMessage: error.message })
    }
}

export const removeQuizById = async (req, res) => {
    try {
        const { userId } = req.user;
        const { quizId } = req.params;

        const response = await Quiz.findOneAndDelete({
            _id: quizId,
            'Hosts.userId': userId
        })

        if (!response) {
            return res.status(401)
                .json({ errorCode: 401, errorMessage: "You are not authorised to delete this quiz!!" })
        }

        res.status(200)
            .json({ message: "Quiz deleted successfully", data: response })
    } catch (error) {
        res.status(500).json({ errorCode: error.code, errorMessage: error.message })
    }
}