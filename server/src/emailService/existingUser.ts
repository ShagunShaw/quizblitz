export const existingUserTemplate = (hostName: string, quizTitle: string, acceptUrl: string) =>
`
<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
  <p style="font-size: 20px; font-weight: bold; margin: 0 0 4px;">QuizBlitz</p>
  <p style="font-size: 13px; color: #888; margin: 0 0 16px;">quiz hosting, made simple</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 0 0 16px;">
  <p style="font-size: 15px; margin: 0 0 8px;">Hi there 👋</p>
  <p style="font-size: 14px; color: #555; line-height: 1.6; margin: 0 0 16px;">You had been invited you be a co-host of the quiz on QuizBlitz by ${hostName}</p>
  <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 0 0 16px;">
    <p style="font-size: 13px; color: #888; margin: 0 0 4px;">Quiz</p>
    <p style="font-size: 15px; font-weight: bold; margin: 0;">${quizTitle}</p>
  </div>
  <a href="${acceptUrl}" style="display: inline-block; background: #185FA5; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: bold;">Accept Invite</a>
  <p style="font-size: 12px; color: #aaa; margin: 16px 0 0;">This invite expires in 24 hours. If you didn't expect this, ignore this email.</p>
</div>
`