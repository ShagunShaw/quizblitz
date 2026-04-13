import { v4 as uuidv4 } from 'uuid';
import { Quiz } from "../schemas/quiz.schema.ts";
import { User } from '../schemas/user.schema.ts';
import { Question } from '../schemas/question.schema.ts';

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

        const quiz = await Quiz.findById(quizId).populate('Questions')
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

export const addQuestions = async (req, res) => {
    try {
        const { quizId } = req.params
        const questions = req.body

        const quiz = await Quiz.findById(quizId)
        if (!quiz) res.status(404).send(`QuizId ${quizId} not found!`)

        for (let i = 0; i < questions.length; i++) {
            const { point, time, question, options, correctOption } = questions[i]

            if (point) questions[i].point = Number(point)
            if (time) questions[i].time = Number(time)
            if (correctOption) questions[i].correctOption = Number(correctOption)

            if (!questions[i].point) return res.status(400).json({ message: `Point is missing for question ${i + 1}` })

            if (!question) return res.status(400).json({ message: `Question text is missing for question ${i + 1}` })

            if (!options || !Array.isArray(options)) return res.status(400).json({ message: `Options are missing for question ${i + 1}` })

            if (options.length < 2 || options.length > 5) return res.status(400).json({ message: `Options must be between 2 and 5 for question ${i + 1}` })

            if (questions[i].correctOption === undefined || questions[i].correctOption === null) return res.status(400).json({ message: `Correct option is missing for question ${i + 1}` })
        }

        const data = await Question.insertMany(questions) as any[]

        for (let i = 0; i < data.length; i++) {
            quiz.Questions.push(data[i]._id)
        }

        await quiz.save()

        res.status(201).json({ message: "Questions added successfully", data })
    } catch (error) {
        res.status(500).json({ errorCode: error.code, errorMessage: error.message })
    }
}

export const removeQuestions = async (req, res) => {
    try {
        const { quizId } = req.params
        const questionIds = req.body             // should be an array only, from the frontend

        const quiz = await Quiz.findById(quizId)
        if (!quiz) return res.status(404).send(`QuizId ${quizId} not found!`)
        if (!questionIds || !Array.isArray(questionIds)) return res.status(400).send(`Question id/s are either not present or is not present as an array`)

        const response = await Question.deleteMany({ _id: { $in: questionIds } });

        (quiz.Questions as any).pull(...questionIds)
        await quiz.save()

        res.status(200).json({ message: "Questions removed successfully", data: response })
    } catch (error) {
        res.status(500).json({ errorCode: error.code, errorMessage: error.message })
    }
}

export const updateQuestions = async (req, res) => {
    const { quizId } = req.params
    const questions = req.body

    const quiz = await Quiz.findById(quizId)
    if (!quiz) res.status(404).send(`QuizId ${quizId} not found!`)

    for (let i = 0; i < questions.length; i++) {
        const { point, time, question, options, correctOption } = questions[i]

        if (point) questions[i].point = Number(point)
        if (time) questions[i].time = Number(time)
        if (correctOption) questions[i].correctOption = Number(correctOption)

        // For this part, we dont need any validation that which field is present which is not, simply in our findByIdAndUpdate(), those fields that are present will be updated and those which are not will remain untouched. We just need to ensure that the correct datatype of each field is getting inserted (if they are)
    }

    // Parallel Processing
    const results = await Promise.all(questions.map(q =>
        Question.findByIdAndUpdate(q._id, q, { new: true })
    ))

    res.status(200).json({ message: "Fields updated successfully!", data: results })
}