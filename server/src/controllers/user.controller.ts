import { Quiz } from "../schemas/quiz.schema.ts";
import { User } from "../schemas/user.schema.ts";
import { sendNewUser, sendExistingUser } from "../emailService/sendEmail.ts"
import jwt from 'jsonwebtoken'
import axios from 'axios'
import { generateAccessToken, generateRefreshToken } from "../auth/generateAndVerifyToken.ts";

export const googleRedirect = (req, res) => {
    const redirectUri = 'http://localhost:3000/auth/google/callback';
    const clientId = process.env.GOOGLE_CLIENT_ID;

    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=email profile&access_type=offline&prompt=consent`;

    console.log("Response from /auth/google\n", url)

    res.redirect(url);
}

export const googleCallback = async (req, res) => {
    const code = req.query.code;
    const redirectUri = 'http://localhost:3000/auth/google/callback';

    try {
        const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
        });

        const accessTokenByGoogle = tokenRes.data.access_token;

        const profileRes = await axios.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            {
                headers: { Authorization: `Bearer ${accessTokenByGoogle}` },
            }
        );

        console.log('🔗 Google User:', {
            name: profileRes.data.name,
            email: profileRes.data.email,
        });

        const user = await User.findOneAndUpdate(
            { email: profileRes.data.email },
            { $setOnInsert: { username: profileRes.data.name, email: profileRes.data.email } },
            { upsert: true, new: true }
        )

        const sessionId = Date.now() + Math.random()
        const accessToken = generateAccessToken(user._id, profileRes.data.email, sessionId)
        const refreshToken = generateRefreshToken(user._id)

        user.refreshTokens.push({ sessionId, token: refreshToken })
        await user.save()

        res.cookie('accessToken', accessToken)
        res.cookie('refreshToken', refreshToken)
        res.redirect('http://localhost:5500/client/success.html');
    } catch (err) {
        console.error('Google OAuth Error:', err);
        res.send('Google login failed');
    }
}

export const getUser = async (req, res) => {
    try {
        const payload= req.user
        const user= await User.findById(payload.userId)

        res.status(200).json({message: "User fetched successfully!", data: user})
    } catch (error) {
        res.status(500).json({ errorCode: error.code, errorMessage: error.message })
    }
}

export const logOutUser = async (req, res) => {
    try {
        const payload = req.user;

        const user = await User.findById(payload.userId)
        user.refreshTokens.pull({ sessionId: payload.sessionId })
        await user.save()

        res.clearCookie('accessToken')
        res.clearCookie('refreshToken')
        res.status(200).send("User logged out successfully").redirect("http://localhost:5500/client/logout.html")
    } catch (error) {
        res.status(500).json({ errorCode: error.code, errorMessage: error.message })
    }
}

export const sendEmail = async (req, res) => {
    try {
        const { quizId } = req.params

        const quiz = await Quiz.findById(quizId)
        if (quiz.Hosts.length === 3) {
            res.status(400).send("Not more than 3 hosts can be there for a quiz")
        }

        const user = await User.findById(req.user.userId)

        const { coHostEmail } = req.body
        const coHost = await User.findOne({ email: coHostEmail })

        const subject = "You've been invited to co-host a quiz on QuizBlitz!"

        type JwtExpiry = `${number}d` | `${number}h` | `${number}m` | `${number}s`
        const payload = { quizId, coHostEmail, role: 'cohost' }
        const token = jwt.sign(payload, process.env.COHOST_TOKEN_SECRET, { expiresIn: process.env.COHOST_TOKEN_EXPIRY as JwtExpiry, algorithm: 'HS256' })
        const acceptUrl = `http://localhost:5500/client/acceptInvite.html?token=${token}`         // Update this with your react route later

        if (!coHost) {
            sendNewUser(coHostEmail, subject, user.username, quiz.Title, acceptUrl)
        }
        else {
            const alreadyHost = quiz.Hosts.some((id) => id.userId.equals(coHost._id));

            if (alreadyHost) {
                return res.status(400).send("This user is already a co-host for this quiz");
            }

            sendExistingUser(coHostEmail, subject, user.username, quiz.Title, acceptUrl)
        }

        res.status(200).send("Email sent successfully!")
    } catch (error) {
        res.status(500).json({ errorCode: error.code, errorMessage: error.message })
    }
}

export const acceptEmail = async (req, res) => {
    const redirectUri = 'http://localhost:3000/co-host/accept/callback';
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const { token } = req.params

    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&state=${token}&response_type=code&scope=email profile&access_type=offline&prompt=consent`;          // 'state=${token}' is where we are passing our token to be extracted in the callback route using 'req.query.state'

    console.log("Response from /co-host/accept/:token\n", url)

    res.redirect(url);
}


interface IInvitePayload {
    quizId: string
    coHostEmail: string
    role: string
}

export const acceptCallback = async (req, res) => {
    const code = req.query.code;
    const token = req.query.state;
    const redirectUri = 'http://localhost:3000/co-host/accept/callback';

    try {
        const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
        });

        const accessTokenByGoogle = tokenRes.data.access_token;

        const profileRes = await axios.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            {
                headers: { Authorization: `Bearer ${accessTokenByGoogle}` },
            }
        );

        console.log('🔗 Google User:', {
            name: profileRes.data.name,
            email: profileRes.data.email,
        });

        const payload = jwt.verify(token, process.env.COHOST_TOKEN_SECRET) as IInvitePayload
        if (payload.coHostEmail !== profileRes.data.email) {
            res.status(400).send("You must login with the email to which the invite has been sent!!")
        }

        const user = await User.findOneAndUpdate(
            { email: payload.coHostEmail },
            { $setOnInsert: { username: profileRes.data.name, email: profileRes.data.email } },
            { upsert: true, new: true }
        )

        const quiz = await Quiz.findById(payload.quizId)
        quiz.Hosts.push({ userId: user._id, role: 'cohost' })
        await quiz.save()

        const sessionId = Date.now() + Math.random()
        const accessToken = generateAccessToken(user._id, profileRes.data.email, sessionId)
        const refreshToken = generateRefreshToken(user._id)

        user.refreshTokens.push({ sessionId, token: refreshToken })
        await user.save()

        res.cookie('accessToken', accessToken)
        res.cookie('refreshToken', refreshToken)

        res.status(200)
            .redirect('http://localhost:5500/quizDashboard.html')
    } catch (err) {
        console.error('Co-Host OAuth Error:', err);
        res.send('Co-Host adding failed');
    }
}

export const removeCoHost = async (req, res) => {
    try {
        const { quizId } = req.params
        const { coHostId } = req.body
        const payload = req.user

        const quiz = await Quiz.findById(quizId)
        if (!quiz) res.status(404).send(`QuizId ${quizId} not found!`)

        const val = quiz.Hosts.find(h => h.userId.toString() === payload.userId)
        if (!val) return res.status(401).send("You are not a host of this quiz")
        if (val.role !== 'owner') res.status(401).send("You are not authorised to remove any co-host from this quiz")

        (quiz.Hosts as any).pull({ userId: coHostId })
        await quiz.save()

        res.status(200).json({ message: "Co-Host removed successfully", data: [] })
    } catch (error) {
        res.status(500).json({ errorCode: error.code, errorMessage: error.message })
    }
}

export const leaveQuiz = async (req, res) => {
    try {
        const payload = req.user
        const { quizId } = req.params

        const quiz = await Quiz.findById(quizId)
        if (!quiz) res.status(404).send(`QuizId ${quizId} not found!`)

        const val = quiz.Hosts.find(h => h.userId.toString() === payload.userId)
        if (!val) return res.status(401).send("You are not a host of this quiz")
        if (val.role === 'owner') res.status(401).send("You cannot leave this quiz as you are the owner here. Delete this quiz instead!")

            (quiz.Hosts as any).pull({ userId: payload.userId })
        await quiz.save()

        res.status(200).json({ message: `Co-host ${payload.userId} has left the quiz successfully!`, data: [] })
    } catch (error) {
        res.status(500).json({ errorCode: error.code, errorMessage: error.message })
    }
}