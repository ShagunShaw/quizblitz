import express, { Router } from "express";
import { verifyAccessToken } from "../auth/generateAndVerifyToken.ts";
import { addQuiz, getAllQuiz, getQuidById, removeQuizById } from "../controllers/quiz.controller.ts";

const router: Router= express.Router()
router.use(verifyAccessToken)

router.post('/', addQuiz)            // For adding a quiz

router.get('/', getAllQuiz)

router.get('/:quizId', getQuidById)

router.delete('/:quizId', removeQuizById)

// Create questions (of course in a bulk for the 1st time), add more questions, remove a particular question, update a particular question (option, question description, correct answer, points, time, etc,  and most important ATTEMPT QUIZ with the provided link)


export default router;