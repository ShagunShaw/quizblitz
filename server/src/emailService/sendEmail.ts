import nodemailer from 'nodemailer'
import { existingUserTemplate } from "./existingUser.ts" 
import { newUserTemplate } from "./newUser.ts" 

const transporter= nodemailer.createTransport({
    secure: true,
    host: "smtp.gmail.com",
    port: 465,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
})

async function sendExistingUser(to, subject, hostName: string, quizTitle: string, acceptUrl: string) {
    await transporter.sendMail({
        to,
        subject,
        html: existingUserTemplate(hostName, quizTitle, acceptUrl)
    })

    console.log("Email sent!")
}

async function sendNewUser(to, subject, hostName: string, quizTitle: string, acceptUrl: string) {
    await transporter.sendMail({
        to,
        subject,
        html: newUserTemplate(hostName, quizTitle, acceptUrl)
    })

    console.log("Email sent!")
}

export { sendNewUser, sendExistingUser }