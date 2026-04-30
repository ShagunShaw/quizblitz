import jwt from 'jsonwebtoken'
import { User } from '../schemas/user.schema.ts'
import type { JwtPayload } from 'jsonwebtoken'

type JwtExpiry = `${number}d` | `${number}h` | `${number}m` | `${number}s`

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY

if (!ACCESS_TOKEN_SECRET || !ACCESS_TOKEN_EXPIRY || !REFRESH_TOKEN_SECRET || !REFRESH_TOKEN_EXPIRY)
  throw new Error("One of the access token secret/expiry or refresh token secret/expiry is missing")

// ------------------- GENERATE -------------------

export const generateAccessToken = (userId, email, sessionId) => {
  const payload = { userId, email, sessionId }
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY as JwtExpiry,
    algorithm: 'HS256'
  })
}

export const generateRefreshToken = (userId) => {
  const payload = { userId }
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY as JwtExpiry,
    algorithm: 'HS256'
  })
}

// ------------------- VERIFY ACCESS -------------------

export const verifyAccessToken = (req, res, next) => {
  const token =
    req.headers['authorization']?.split(' ')[1] ||
    req.cookies?.accessToken

  if (!token) {
    return res.status(401).send("You must be logged in to access this route")
  }

  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET)
    req.user = decoded
    return next()
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return verifyRefreshToken(req, res, next) // ✅ IMPORTANT RETURN
    }
    return res.status(401).send("Invalid token: " + err.message)
  }
}

// ------------------- VERIFY REFRESH -------------------

export const verifyRefreshToken = async (req, res, next) => {
  const token = req.cookies?.refreshToken
  console.log("Token: ", token)

  if (!token) {
    return res.status(401).send("Refresh Token not found!! Please login")
  }

  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as JwtPayload

    if (!decoded) {
      return res.status(500).send("Failed to decode the refresh token")
    }

    const user = await User.findById(decoded.userId)
    if (!user) {
      return res.status(404).send("User not found")
    }

    const session = user.refreshTokens.find(item => item.token === token)
    if (!session) {
      return res.status(401).send("Invalid Refresh Token, please login again")
    }

    const newAccessToken = generateAccessToken(decoded.userId, user.email, session.sessionId)

    req.user = {
      userId: decoded.userId,
      email: user.email,
      sessionId: session.sessionId
    }

    // ✅ FIXED (res.cookie, not req.cookie)
    res.cookie('accessToken', newAccessToken)

    return next() // ✅ RETURN
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).send("Token has expired. please login again!!")
    }
    return res.status(401).send("Invalid token: " + err.message)
  }
}