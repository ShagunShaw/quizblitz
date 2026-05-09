import { Quiz } from "../schemas/quiz.schema.ts";
import { User } from "../schemas/user.schema.ts";
import { sendNewUser, sendExistingUser } from "../emailService/sendEmail.ts";
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { generateAccessToken, generateRefreshToken } from "../auth/generateAndVerifyToken.ts";

// ✅ helper for dynamic frontend origin
const getFrontendOrigin = (req: any) => {
    return req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5173';
};

// ---------------- GOOGLE LOGIN ----------------

export const googleRedirect = (req, res) => {
    const redirectUri = 'http://localhost:3000/api/v1/auth/google/callback';
    const clientId = process.env.GOOGLE_CLIENT_ID;

    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=email profile&access_type=offline&prompt=consent`;

    return res.redirect(url);
};

export const googleCallback = async (req, res) => {
    const code = req.query.code;
    const redirectUri = 'http://localhost:3000/api/v1/auth/google/callback';

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

        const user = await User.findOneAndUpdate(
            { email: profileRes.data.email },
            { $setOnInsert: { username: profileRes.data.name, email: profileRes.data.email } },
            { upsert: true, returnDocument: 'after' }
        );

        const sessionId = Date.now() + Math.random();
        const accessToken = generateAccessToken(user._id, profileRes.data.email, sessionId);
        const refreshToken = generateRefreshToken(user._id);

        user.refreshTokens.push({ sessionId, token: refreshToken });
        await user.save();

        const origin = getFrontendOrigin(req);

        return res
            .cookie('accessToken', accessToken, {
                httpOnly: true,
                sameSite: 'lax',
                secure: false, // true only in HTTPS
                path: '/',
            })
            .cookie('refreshToken', refreshToken, {
                httpOnly: true,
                sameSite: 'lax',
                secure: false,
                path: '/',
            })
            .redirect(`${origin}/dashboard`);

    } catch (err) {
        console.error('Google OAuth Error:', err);
        return res.status(500).json({ errorMessage: err.message });
    }
};

// ---------------- AUTH ----------------

export const getUser = async (req, res) => {
    try {
        const payload = req.user;
        const user = await User.findById(payload.userId).select("-refreshTokens -createdAt -updatedAt");

        return res.status(200).json({ message: "User fetched successfully!", data: user });
    } catch (error) {
        return res.status(500).json({ errorMessage: error.message });
    }
};

export const logOutUser = async (req, res) => {
    try {
        const payload = req.user;

        const user = await User.findById(payload.userId);
        user.refreshTokens.pull({ sessionId: payload.sessionId });
        await user.save();

        const origin = getFrontendOrigin(req);

        return res
            .clearCookie('accessToken')
            .clearCookie('refreshToken')
            .json({message: "User logged out successfully", data: []})

    } catch (error) {
        return res.status(500).json({ errorMessage: error.message });
    }
};

// ---------------- SEND INVITE ----------------

export const sendEmail = async (req, res) => {
    try {
        const { quizId } = req.params;

        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).send(`QuizId ${quizId} not found!`);

        if (quiz.Hosts.length === 3) {
            return res.status(400).json({ errorMessage: "Not more than 3 hosts allowed" });
        }

        const val = quiz.Hosts.find(h => h.userId.toString() === req.user.userId.toString());
        if (!val) return res.status(401).send("You are not a host");
        if (val.role !== 'owner') return res.status(401).send("Not authorised");

        const user = await User.findById(req.user.userId);

        const { coHostEmail } = req.body;
        const coHost = await User.findOne({ email: coHostEmail });

        const payload = { quizId, coHostEmail, role: 'cohost' };
        const token = jwt.sign(payload, process.env.COHOST_TOKEN_SECRET!, {
            expiresIn: process.env.COHOST_TOKEN_EXPIRY as jwt.SignOptions['expiresIn']
        });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const acceptUrl = `${frontendUrl}/accept/${token}`;

        if (!coHost) {
            sendNewUser(coHostEmail, "Invite", user.username, quiz.Title, acceptUrl);
        } else {
            const alreadyHost = quiz.Hosts.some((id) => id.userId.equals(coHost._id));
            if (alreadyHost) {
                return res.status(400).json({ errorMessage: "Already co-host" });
            }
            sendExistingUser(coHostEmail, "Invite", user.username, quiz.Title, acceptUrl);
        }

        return res.status(200).json({ message: "Email sent" });

    } catch (error) {
        return res.status(500).json({ errorMessage: error.message });
    }
};

// ---------------- ACCEPT INVITE ----------------

export const acceptEmail = (req, res) => {
    const redirectUri = 'http://localhost:3000/api/v1/co-host/accept/callback';
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const { token } = req.params;
    const { origin } = req.query;

    // ✅ pack BOTH token + origin
    const state = JSON.stringify({
        token,
        origin: origin || process.env.FRONTEND_URL || 'http://localhost:5173'
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&state=${encodeURIComponent(state)}&response_type=code&scope=email profile&access_type=offline&prompt=consent`;

    return res.redirect(url);
};

export const acceptCallback = async (req, res) => {
    const code = req.query.code;
    const state = JSON.parse(req.query.state as string);
    const { token, origin } = state;
    const redirectUri = 'http://localhost:3000/api/v1/co-host/accept/callback';

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

        const payload: any = jwt.verify(token, process.env.COHOST_TOKEN_SECRET);

        if (payload.coHostEmail !== profileRes.data.email) {
            return res.status(400).json({ errorMessage: "Wrong email used" });
        }

        // Add later: check if the co-host has already been added to the quiz or not. If no, proceed further, if yes then return

        const user = await User.findOneAndUpdate(
            { email: payload.coHostEmail },
            { $setOnInsert: { username: profileRes.data.name, email: profileRes.data.email } },
            { upsert: true, new: true }
        );

        const quiz = await Quiz.findById(payload.quizId);
        quiz.Hosts.push({ userId: user._id, role: 'cohost' });
        await quiz.save();

        const sessionId = Date.now() + Math.random();
        const accessToken = generateAccessToken(user._id, profileRes.data.email, sessionId);
        const refreshToken = generateRefreshToken(user._id);

        user.refreshTokens.push({ sessionId, token: refreshToken });
        await user.save();

        const origin = getFrontendOrigin(req);

        return res
            .cookie('accessToken', accessToken)
            .cookie('refreshToken', refreshToken)
            .redirect(`${origin}/dashboard`);

    } catch (error) {
        console.error('Co-Host OAuth Error:', error);
        return res.status(500).json({ errorMessage: error.message });
    }
};

// ---------------- REMOVE COHOST ----------------

export const removeCoHost = async (req, res) => {
    try {
        const { quizId } = req.params;
        const { coHostId } = req.body;
        const payload = req.user;

        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ errorMessage: `Quiz not found` });

        const val = quiz.Hosts.find(h => h.userId.toString() === payload.userId);
        if (!val || val.role !== 'owner') {
            return res.status(401).json({ errorMessage: "Not authorized" });
        }

        await Quiz.findByIdAndUpdate(
            quizId,
            { $pull: { Hosts: { userId: coHostId } } },
            { new: true }
        );

        return res.status(200).json({ message: "Co-Host removed" });

    } catch (error) {
        return res.status(500).json({ errorMessage: error.message });
    }
};

// ---------------- LEAVE QUIZ ----------------

export const leaveQuiz = async (req, res) => {
    try {
        const payload = req.user;
        const { quizId } = req.params;

        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ errorMessage: `Quiz not found` });

        const val = quiz.Hosts.find(h => h.userId.toString() === payload.userId);
        if (!val) return res.status(401).json({ errorMessage: "Not a host" });

        if (val.role === 'owner') {
            return res.status(401).json({ errorMessage: "Owner cannot leave" });
        }

        await Quiz.findByIdAndUpdate(
            quizId,
            { $pull: { Hosts: { userId: payload.userId } } },
            { new: true }
        );

        return res.status(200).json({ message: `Left quiz successfully` });

    } catch (error) {
        return res.status(500).json({ errorMessage: error.message });
    }
};