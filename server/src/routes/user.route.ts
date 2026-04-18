import express, { Router } from "express";
import { verifyAccessToken } from "../auth/generateAndVerifyToken.ts";
import { sendEmail, logOutUser, acceptEmail, googleRedirect, googleCallback, acceptCallback, removeCoHost, leaveQuiz, getUser } from "../controllers/user.controller.ts";
const router: Router= express.Router()

router.get("/health", (req, res) => res.json({message: "Server is healthy"}))

router.get('/auth/google', googleRedirect);         // done

router.get('/auth/google/callback', googleCallback)         // done

router.get('/', verifyAccessToken, getUser)     // done

router.post('/logout/', verifyAccessToken, logOutUser)      // done

router.post('/co-host/:quizId', verifyAccessToken, sendEmail)   // done  // send email to the co-host to accept the invite

router.get('/accept/:token', acceptEmail)    // This route will be called by frontend

router.get('/co-host/accept/callback', acceptCallback)

router.delete('/:quizId/co-host', verifyAccessToken, removeCoHost)

router.delete('/:quizId/leave', verifyAccessToken, leaveQuiz)       // done

export default router;