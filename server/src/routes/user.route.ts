import express, { Router } from "express";
import axios from 'axios'
import { User } from "../schemas/user.schema.ts";
import { generateAccessToken, generateRefreshToken, verifyAccessToken } from "../auth/generateAndVerifyToken.ts";
import { sendEmail, logOutUser, acceptEmail } from "../controllers/user.controller.ts";
const router: Router= express.Router()

router.get('auth/google', (req, res) => {
  const redirectUri = 'http://localhost:3000/auth/google/callback';
  const clientId = process.env.GOOGLE_CLIENT_ID;

  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=email profile&access_type=offline&prompt=consent`;

  console.log("Response from /auth/google\n", url)

  res.redirect(url);
});

router.get('auth/google/callback', async (req, res) => {
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

    const user= await User.findOneAndUpdate(
      {email: profileRes.data.email},
      {$setOnInsert: {username: profileRes.data.name, email: profileRes.data.email}},
      {upsert: true, new: true}
    )

    const sessionId= Date.now() + Math.random()
    const accessToken= generateAccessToken(user._id, profileRes.data.email, sessionId)
    const refreshToken= generateRefreshToken(user._id)

    user.refreshTokens.push({sessionId, token: refreshToken})
    await user.save()

    res.cookie('accessToken', accessToken)
    res.cookie('refreshToken', refreshToken)
    res.redirect('http://localhost:5500/client/success.html');
  } catch (err) {
    console.error('Google OAuth Error:', err);
    res.send('Google login failed');
  }
})

router.post('user/logout/', verifyAccessToken, logOutUser)

router.post('/co-host/:quizId', verifyAccessToken, sendEmail)     // send email to the co-host to accept the invite

router.post('/co-host/accept' jdbj)    // This route will be called by frontend

export default router;