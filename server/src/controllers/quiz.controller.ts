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
            return res.status(400).json({ errorMessage: "Description length should be 150 at max.", errorCode: 400 })
        }

        if (new Date() > new Date(startTime)) {
            return res.status(400).json({ errorMessage: "The given time has already passed", errorCode: 400 })
        }

        const quiz = await Quiz.create({
            Hosts: [{ userId: userId, role: 'owner' }],
            roomCode: code,
            Title: title,
            Description: description,
            isPermanent: isPermanent || false,              // Remember: Boolean("false") is also true, so send false as Boolean only and not as String
            startTime: new Date(startTime)
        })

        return res.status(201)
            .json({ message: "Quiz created succesfully!", data: quiz })
    } catch (error) {
        return res.status(500).json({ errorCode: error.code, errorMessage: error.message })
    }
}

export const getAllQuiz = async (req, res) => {
    try {
        const payload = req.user

        const quizes = await Quiz.find({ 'Hosts.userId': payload.userId }).select("roomCode Title Description TotalPoints QuestionsCount startTime")

        return res.status(200)
            .json({ message: "Quizes fetched successfully", data: quizes })
    } catch (error) {
        return res.status(500).json({ errorCode: error.code, errorMessage: error.message })
    }
}

export const getQuizById = async (req, res) => {
    try {
        const { userId } = req.user;
        const { quizId } = req.params;

        const quiz = await Quiz.findById(quizId).populate('Questions')
        if (!quiz) return res.status(404).json({ errorMessage: "QuizId not found!", errorCode: 404 })
            
        if (!quiz.Hosts.some(host => host.userId.toString() === userId.toString())) {
            return res.status(401)
                .json({ errorCode: 401, errorMessage: "You are not authorised to access this quiz!!" })
        }

        return res.status(200)
            .json({ message: "Quiz fetched successfully", data: quiz })
    } catch (error) {
        return res.status(500).json({ errorCode: error.code, errorMessage: error.message })
    }
}

export const removeQuizById = async (req, res) => {
    try {
        const { userId } = req.user;
        const { quizId } = req.params;

        const response = await Quiz.findOneAndDelete({
            _id: quizId,
            'Hosts.userId': userId
        }).select("Questions")

        if (!response) {
            return res.status(401)
                .json({ errorCode: 401, errorMessage: "You are not authorised to delete this quiz!!" })
        }

        const ques = await Question.deleteMany({
            _id: { $in: response.Questions }
        })

        return res.status(200)
            .json({ message: "Quiz deleted successfully", data: response })
    } catch (error) {
        return res.status(500).json({ errorCode: error.code, errorMessage: error.message })
    }
}

export const updateQuizById = async (req, res) => {
    try {
        const { quizId } = req.params
        const details = req.body
        const payload = req.user

        if (details.Hosts || details.roomCode || details.Questions || details.TotalPoints || details.QuestionsCount || details.isAttempted) return res.status(400).json({ errorMessage: "You cannot update any other fields", errorCode: 400 })

        const quiz = await Quiz.findById(quizId)
        if (!quiz) return res.status(404).json({ errorMessage: `QuizId not found!`, errorCode: 404 })

        const val = quiz.Hosts.find(h => h.userId.toString() === payload.userId)
        if (!val) return res.status(401).json({ errorMessage: "You are not authorised to update this quiz", errorCode: 401 })

        const response = await Quiz.findByIdAndUpdate(quizId, details, { new: true })

        return res.status(200).json({ message: "Fields Updated successfullt", data: response })
    }
    catch (error) {
        return res.status(500).json({ errorCode: error.code, errorMessage: error.message })
    }
}

export const addQuestions = async (req, res) => {
    try {
        const { quizId } = req.params
        const { questions } = req.body

        const quiz = await Quiz.findById(quizId)
        if (!quiz) return res.status(404).json({ errorMessage: "QuizId not found!", errorCode: 404 })

        for (let i = 0; i < questions.length; i++) {
            const { point, time, question, options, correctOption } = questions[i]

            if (point) questions[i].point = Number(point)
            if (time) questions[i].time = Number(time)
            if (correctOption) questions[i].correctOption = Number(correctOption)

            if (!questions[i].point) return res.status(400).json({ errorMessage: `Point is missing for question ${i + 1}`, errorCode: 400 })

            if (!question) return res.status(400).json({ errorMessage: `Question text is missing for question ${i + 1}`, errorCode: 400 })

            if (!options || !Array.isArray(options)) return res.status(400).json({ errorMessage: `Options are missing for question ${i + 1}`, errorCode: 400 })

            if (options.length < 2 || options.length > 5) return res.status(400).json({ errorMessage: `Options must be between 2 and 5 for question ${i + 1}`, errorCode: 400 })

            if (questions[i].correctOption === undefined || questions[i].correctOption === null) return res.status(400).json({ errorMessage: `Correct option is missing for question ${i + 1}`, errorCode: 400 })

            if (typeof questions[i].correctOption !== "number") return res.status(400).json({ errorMessage: `Correct option must be the index number of the options array only for question ${i + 1}`, errorCode: 400 })
        }

        const data = await Question.insertMany(questions) as any[]

        for (let i = 0; i < data.length; i++) {
            quiz.Questions.push(data[i]._id)
        }

        await quiz.save()

        return res.status(201).json({ message: "Questions added successfully", data })
    } catch (error) {
        return res.status(500).json({ errorCode: error.code, errorMessage: error.message })
    }
}

export const removeQuestions = async (req, res) => {
    try {
        const { quizId } = req.params
        const { questionIds } = req.body             // should be an array only, from the frontend

        const quiz = await Quiz.findById(quizId)
        if (!quiz) return res.status(404).json({ errorMessage: "QuizId not found!", errorCode: 404 })
        if (!questionIds || !Array.isArray(questionIds)) return res.status(400).json({ errorMessage: "Question id/s are either not present or is not present as an array", errorCode: 400 })

        const response = await Question.deleteMany({ _id: { $in: questionIds } });

        (quiz.Questions as any).pull(...questionIds)
        await quiz.save()

        return res.status(200).json({ message: "Questions removed successfully", data: response })
    } catch (error) {
        return res.status(500).json({ errorCode: error.code, errorMessage: error.message })
    }
}

export const updateQuestions = async (req, res) => {
    try {
        const { quizId } = req.params
        const { questions } = req.body          // We also need to pass each question's (to be updated) _id from the frontend to update the value

        const quiz = await Quiz.findById(quizId)
        if (!quiz) return res.status(404).json({ errorMessage: "QuizId not found!", errorCode: 404 })

        for (let i = 0; i < questions.length; i++) {
            const { point, time, question, options, correctOption } = questions[i]

            if (point) questions[i].point = Number(point)
            if (time) questions[i].time = Number(time)
            if (correctOption) questions[i].correctOption = Number(correctOption)

            // For this part, we dont need any validation that which field is present which is not, simply in our findByIdAndUpdate(), those fields that are present will be updated and those which are not will remain untouched. We just need to ensure that the correct datatype of each field is getting inserted (if they are)
        }

        // Parallel Processing
        const results = await Promise.all(questions.map(q =>
            Question.findByIdAndUpdate(q._id, q, { returnDocument: 'after' })
        ))

        const allQuestions = await Question.find({
            _id: { $in: quiz.Questions }
        }).lean()

        let total = 0
        for (let q of allQuestions) {
            total += q.point
        }

        await Quiz.findByIdAndUpdate(quizId, {
            TotalPoints: total
        })

        return res.status(200).json({ message: "Fields updated successfully!", data: results })
    } catch (error) {
        return res.status(500).json({ errorCode: error.code, errorMessage: error.message })
    }
}