import express, { Router } from "express";
import { User } from "../schemas/user.schema.ts";
import { verifyAccessToken } from "../auth/generateAndVerifyToken.ts";
import { sendEmail, logOutUser, acceptEmail, googleRedirect, googleCallback, acceptCallback } from "../controllers/user.controller.ts";
const router: Router= express.Router()

router.get('auth/google', googleRedirect);

router.get('auth/google/callback', googleCallback)

router.post('user/logout/', verifyAccessToken, logOutUser)

router.post('/co-host/:quizId', verifyAccessToken, sendEmail)     // send email to the co-host to accept the invite

router.post('/co-host/accept/:token', acceptEmail)    // This route will be called by frontend

router.post('/co-host/accept/callback', acceptCallback)

export default router;