import express from 'express'
import cors from 'cors'
import 'dotenv/config';
import cookieParser  from 'cookie-parser'
import UserRouter from './routes/user.route.ts'
import QuizRouter from './routes/quiz.routes.ts'
import connectDB from './db.ts'

const app = express()
const PORT = process.env.PORT || 3000

await connectDB()

app.use(cors())
app.use(express.json())
app.use(cookieParser())
app.use("/", UserRouter)
app.use("/quiz", QuizRouter)

app.use((err, req, res, next) => {          // This is for error handling
  console.log(err, req, res, next)
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})