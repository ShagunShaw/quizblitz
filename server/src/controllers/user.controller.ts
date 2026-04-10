import { Quiz } from "../schemas/quiz.schema.ts";
import { User } from "../schemas/user.schema.ts";
import { sendNewUser, sendExistingUser } from "../emailService/sendEmail.ts"
import jwt from 'jsonwebtoken'

export const logOutUser= async (req, res) => {
    try {
        const payload= req.user;

        const user= await User.findById(payload.userId)
        user.refreshTokens.pull({ sessionId: payload.sessionId })
        await user.save()

        res.clearCookie('accessToken')
        res.clearCookie('refreshToken')
        res.status(200).send("User logged out successfully").redirect("http://localhost:5500/client/logout.html")
    } catch (error) {
        res.status(500).json({errorCode: error.code, errorMessage: error.message})
    }
}

export const sendEmail= async (req, res) => {
    try {
        const { quizId }= req.params

        const quiz= await Quiz.findById(quizId)
        if(quiz.Hosts.length === 3) {
            res.status(400).send("Not more than 3 hosts can be there for a quiz")
        }

        const user= await User.findById(req.user.userId)
        
        const { coHostEmail }= req.body
        const coHost= await User.find({email: coHostEmail})
        const subject= "You've been invited to co-host a quiz on QuizBlitz!"

        type JwtExpiry = `${number}d` | `${number}h` | `${number}m` | `${number}s`
        const payload= {quizId, coHostEmail, role: 'cohost'}
        const token= jwt.sign(payload, process.env.COHOST_TOKEN_SECRET, {expiresIn: process.env.COHOST_TOKEN_EXPIRY as JwtExpiry, algorithm: 'HS256'})
        const acceptUrl= `http://localhost:5500/client/acceptInvite.html?token=${token}`         // Update this with your react route later

        if(!coHost) {
            sendNewUser(coHostEmail, subject, user.username, quiz.Title, acceptUrl)
        }
        else {
            sendExistingUser(coHostEmail, subject, user.username, quiz.Title, acceptUrl)
        }

        res.status(200).send("Email sent successfully!")
    } catch (error) {
        res.status(500).json({errorCode: error.code, errorMessage: error.message})
    }
}

export const acceptEmail= async (req, res) => {
    
}