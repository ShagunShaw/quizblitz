import express, { Router } from "express";
import { verifyAccessToken } from "../auth/generateAndVerifyToken.ts";
import { addQuiz, getAllQuiz, getQuizById, removeQuizById, addQuestions, removeQuestions, updateQuestions, updateQuizById } from "../controllers/quiz.controller.ts";

const router: Router= express.Router()
router.use(verifyAccessToken)

router.post('/', addQuiz)            // For adding a quiz               

router.get('/', getAllQuiz)

router.get('/:quizId', getQuizById)

router.delete('/:quizId', removeQuizById)           // also remove questions from question schema as well

router.patch('/:quizId', updateQuizById)

router.post('/questions/:quizId', addQuestions)

router.delete('/questions/:quizId', removeQuestions)

router.patch('/questions/:quizId', updateQuestions)

// load all questions for the ATTEMPT QUIZ part  --> I think it's already done in the 'router.get('/:quizId', getQuidById)' part, just see how the frontend requests for it and then will optimize it later

// router.get('/attemptQuiz/:roomCode')         // TO BE DONE (also remove the 'verifyAccessToken' middleware from this route, and at the end of the controller of this route, dont forget to set 'isAttempted' from the quiz schema to 'true')


export default router;