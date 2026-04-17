import express, { Router } from "express";
import { verifyAccessToken } from "../auth/generateAndVerifyToken.ts";
import { addQuiz, getAllQuiz, getQuizById, removeQuizById, addQuestions, removeQuestions, updateQuestions, updateQuizById, getQuizByRoomCode } from "../controllers/quiz.controller.ts";

const router: Router= express.Router()
// router.use(verifyAccessToken)

router.post('/', verifyAccessToken, addQuiz)            // For adding a quiz               

router.get('/', verifyAccessToken, getAllQuiz)

router.get('/:quizId', verifyAccessToken, getQuizById)

router.delete('/:quizId', verifyAccessToken, removeQuizById)           // also remove questions from question schema as well

router.patch('/:quizId', verifyAccessToken, updateQuizById)

router.post('/questions/:quizId', verifyAccessToken, addQuestions)

router.delete('/questions/:quizId', verifyAccessToken, removeQuestions)

router.patch('/questions/:quizId', verifyAccessToken, updateQuestions)

// load all questions for the ATTEMPT QUIZ part  --> I think it's already done in the 'router.get('/:quizId', getQuidById)' part, just see how the frontend requests for it and then will optimize it later

router.get('/room/:roomCode', getQuizByRoomCode)

export default router;