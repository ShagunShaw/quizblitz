import express, { Router } from "express";
import { verifyAccessToken } from "../auth/generateAndVerifyToken.ts";
import { addQuiz, getAllQuiz, getQuizById, removeQuizById, addQuestions, removeQuestions, updateQuestions, updateQuizById, getQuizByRoomCode } from "../controllers/quiz.controller.ts";

const router: Router= express.Router()
// router.use(verifyAccessToken)

router.post('/', verifyAccessToken, addQuiz)     // done       // For adding a quiz               

router.get('/', verifyAccessToken, getAllQuiz)      // done

router.get('/:quizId', verifyAccessToken, getQuizById)      // done

router.delete('/:quizId', verifyAccessToken, removeQuizById)     // done      // also remove questions from question schema as well

router.patch('/:quizId', verifyAccessToken, updateQuizById)     // done

router.post('/questions/:quizId', verifyAccessToken, addQuestions)      // done

router.delete('/questions/:quizId', verifyAccessToken, removeQuestions)     // done

router.patch('/questions/:quizId', verifyAccessToken, updateQuestions)      // done

// load all questions for the ATTEMPT QUIZ part  --> I think it's already done in the 'router.get('/:quizId', getQuidById)' part, just see how the frontend requests for it and then will optimize it later

router.get('/room/:roomCode', getQuizByRoomCode)

export default router;