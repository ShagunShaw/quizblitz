import express from 'express'
import cors from 'cors'
import 'dotenv/config';
import cookieParser  from 'cookie-parser'
import UserRouter from './routes/user.route.ts'
import QuizRouter from './routes/quiz.route.ts'
import connectDB from './db.ts'
import { initSocket } from './socket.ts';
import http from 'http'

const app = express()
const PORT = process.env.PORT || 3000
const server= http.createServer(app)

await connectDB()
initSocket(server)

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use("/api/v1/", UserRouter)
app.use("/api/v1/quiz/", QuizRouter)

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})