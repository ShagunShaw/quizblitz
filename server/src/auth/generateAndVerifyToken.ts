import jwt from 'jsonwebtoken'
import { User } from '../schemas/user.schema.ts'
import type { JwtPayload } from 'jsonwebtoken'

type JwtExpiry = `${number}d` | `${number}h` | `${number}m` | `${number}s`

const ACCESS_TOKEN_SECRET= process.env.ACCESS_TOKEN_SECRET
const ACCESS_TOKEN_EXPIRY= process.env.ACCESS_TOKEN_EXPIRY
const REFRESH_TOKEN_SECRET= process.env.REFRESH_TOKEN_SECRET
const REFRESH_TOKEN_EXPIRY= process.env.REFRESH_TOKEN_EXPIRY

if(!ACCESS_TOKEN_SECRET || !ACCESS_TOKEN_EXPIRY || !REFRESH_TOKEN_SECRET || !REFRESH_TOKEN_EXPIRY) throw new Error("One of the access token secret/expiry or refresh token secret/expiry is missing")

export const generateAccessToken = (userId, email, sessionId) => {
  const payload = {userId, email, sessionId}
  const accessToken= jwt.sign(payload, ACCESS_TOKEN_SECRET, {expiresIn: ACCESS_TOKEN_EXPIRY as JwtExpiry, algorithm: 'HS256'})
  return accessToken
}

export const generateRefreshToken = (userId) => {
  const payload = {userId}
  const token= jwt.sign(payload, REFRESH_TOKEN_SECRET, {expiresIn: REFRESH_TOKEN_EXPIRY as JwtExpiry, algorithm: 'HS256'})
  return token
}

export const verifyAccessToken = (req, res, next) => {
    const token = req.headers['authorization'].split(' ')[1] || req.cookies.accessToken;
    // console.log("Token: ", token);
  
    if (!token) {
      return res.status(401).send("You must be logged in to access this route");
    }
  
    try {
      const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      if(err.name === "TokenExpiredError")
      {
        verifyRefreshToken(req, res, next)
      }
      return res.status(401).send("Invalid token, this is the error message:" + err);
    }
};

export const verifyRefreshToken = async (req, res, next) => {
    const token = req.cookies.refreshToken;
    console.log("Token: ", token);
  
    if (!token) {
      return res.status(401).send("Refresh Token not found!! Please login");
    }
  
    try {
      const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as JwtPayload;
      if(!decoded)    res.status(500).send("Failed to decode the refresh token")

      const user= await User.findById(decoded.userId)
      const refreshTokens= user.refreshTokens

      const session= refreshTokens.find(item => item.token === token)
      if(!session)    res.status(401).send("Invalid Refresh Token, please login and continue")

      const newAccessToken= generateAccessToken(decoded.userId, user.email, session.sessionId)
      req.user= {userId: decoded.userId, email: user.email, sessionId: session.sessionId}
      req.cookie('accessToken', newAccessToken)
      next();
    } catch (err) {
      if(err.name === "TokenExpiredError")
      {
        return res.status(401).send("Token has expired. please login again!!")
      }
      return res.status(401).send("Invalid token, this is the error message:" + err);
    }
}