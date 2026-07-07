/*   Since sending emails via SMPT protocol is not supported on Render's free tier, so we will be using 'Resend' application to do so as Render's free tier supports it   */ 


/*
import nodemailer from 'nodemailer'
import { existingUserTemplate } from "./existingUser.ts" 
import { newUserTemplate } from "./newUser.ts" 

const transporter= nodemailer.createTransport({
    secure: false,
    host: "smtp.gmail.com",
    port: 587,
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
*/



import { Resend } from "resend";
import { existingUserTemplate } from "./existingUser.ts";
import { newUserTemplate } from "./newUser.ts";

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendExistingUser(
  to: string,
  subject: string,
  hostName: string,
  quizTitle: string,
  acceptUrl: string
) {
  const { error } = await resend.emails.send({
    from: "QuizBlitz <onboarding@resend.dev>",
    to,
    subject,
    html: existingUserTemplate(hostName, quizTitle, acceptUrl),
  });

  if (error) throw error;

  console.log("Email sent!");
}

async function sendNewUser(
  to: string,
  subject: string,
  hostName: string,
  quizTitle: string,
  acceptUrl: string
) {
  const { error } = await resend.emails.send({
    from: "QuizBlitz <onboarding@resend.dev>",
    to,
    subject,
    html: newUserTemplate(hostName, quizTitle, acceptUrl),
  });

  if (error) throw error;

  console.log("Email sent!");
}

export { sendNewUser, sendExistingUser }