import express from 'express'
import cors from 'cors'
import 'dotenv/config';
import cookieParser from 'cookie-parser'
import UserRouter from './routes/user.route.ts'
import QuizRouter from './routes/quiz.route.ts'
import connectDB from './db.ts'
import { initSocket } from './socket.ts';
import http from 'http'
import cron from 'node-cron'
import { Quiz } from './schemas/quiz.schema.ts';

const app = express()
const PORT = process.env.PORT || 3000
const server = http.createServer(app)

await connectDB()
initSocket(server)

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use("/api/v1/", UserRouter)
app.use("/api/v1/quiz/", QuizRouter)

server.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})

cron.schedule('0 3 * * *', async () => {
  // if this application scales in production, then we an maintain an array sort of things in our database which contain all the quiz id's that had been attempted and are not permanent. As the 'endQuiz' event is triggered in socket.io, we add values to that array and at time of the cron job, just retrieve all values from the array and perform 'findByIdAndDelete()'. For now, we are not adding anything as such.
  const response = await Quiz.deleteMany({
    isAttempted: true,
    isPermanent: false
  });

  console.log(`${response.deletedCount} quizzes deleted at ${new Date()}`);
})