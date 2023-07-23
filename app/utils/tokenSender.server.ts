import nodemailer from "nodemailer"
import jwt from "jsonwebtoken"
import { checkVerifiedEmail, getUser, getUserEmail, verifyUser } from "./users.server";
import type { JwtPayload } from "jsonwebtoken";

const transport = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "USER",
    pass: "PASSWORD"
  }
});

export async function sendEmail(userId: string, request: Request) {
  const { error, textErrorOrEmail } = await checkUserErrors(userId, request)
  if (error) {
    return { error, textErrorOrEmail }
  } else {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET as string, { expiresIn: process.env.JWT_LIFETIME })
    const info = await transport.sendMail({
      from: "EMAIL",
      to: textErrorOrEmail,
      subject: "Email Verification",
      text: `Verify your email here: http://localhost:3000/verify?token=${token}`,
      html: '<h1>Verify your email.</h1>'
    })
    await transport.sendMail(info)
    return { error, textErrorOrEmail }
  }
}

export async function verifyToken(token: string, request: Request) {
  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload
    const userId = decodedToken.userId as string
    const { error, textErrorOrEmail } = await checkUserErrors(userId, request)
    if (error) {
      return textErrorOrEmail
    } else {
      await verifyUser(textErrorOrEmail)
      return 'Email successfully verified! You can visit the products now.'
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message)
    } else {
      throw new Error('Unknown error.')
    }
  }
}

async function checkUserErrors(userId: string, request: Request) {
  const user = await getUser(request)
  if (!user) {
    return { error: true, textErrorOrEmail: 'You are not currently logged in.' }
  } else if (user._id.toString() !== userId) {
    const emailToVerify = await getUserEmail(userId)
    return { error: true, textErrorOrEmail: `You are not logged in with this email that you are trying to verify: ${emailToVerify}` }
  } else {
    const verified = await checkVerifiedEmail(user._id.toString())
    if (verified) {
      return { error: true, textErrorOrEmail: 'You are already verified.' }
    } else {
      return { error: false, textErrorOrEmail: user.email }
    }
  }
}