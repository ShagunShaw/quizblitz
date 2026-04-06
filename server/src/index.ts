import express from 'express'
import cors from 'cors'
import 'dotenv/config';
// integrate google auth using clerk

const app= express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.use((err, req, res, next) => {          // This is for error handling
  console.log(err, req, res, next)
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})