import express, { Router } from "express";
import { verifyAccessToken } from "../auth/generateAndVerifyToken.ts";
import { addQuiz, getAllQuiz, getQuidById, removeQuizById, addQuestions, removeQuestions, updateQuestions } from "../controllers/quiz.controller.ts";

const router: Router= express.Router()
router.use(verifyAccessToken)

router.post('/', addQuiz)            // For adding a quiz

router.get('/', getAllQuiz)

router.get('/:quizId', getQuidById)

router.delete('/:quizId', removeQuizById)

router.post('questions/:quizId', addQuestions)

router.delete('questions/:quizId', removeQuestions)

router.patch('questions/:quidId', updateQuestions)

// load all questions for the ATTEMPT QUIZ part  --> I think it's already done in the 'router.get('/:quizId', getQuidById)' part, just see how the frontend requests for it and then will optimize it later

router.get('attemptQuiz/:roomCode')         // TO BE DONE (also remove the 'verifyAccessToken' middleware from this route)


export default router;