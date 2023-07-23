import { createCookieSessionStorage, redirect } from "@remix-run/node"
import UserSchema from "./models/User.server"
import mongoose from "mongoose"

type LoginForm = {
  email: string,
  password: string
}

type RegisterForm = LoginForm & { username: string }

export async function checkUserExist(email: string) {
  const user = await UserSchema.findOne({ email })
  return user
}

export async function register({ username, email, password }: RegisterForm) {
  const isFirstAccount = (await UserSchema.countDocuments()) === 0
  const role = isFirstAccount ? 'admin' : 'user'
  const user = await UserSchema.create({ username, email, password, role })
  return { id: user._id, name: user.username }
}

export async function login({ email, password }: LoginForm) {
  const user = await UserSchema.findOne({ email })
  if (!user) {
    return null
  }
  const isCorrectPassword = user.comparePassword(password)
  if (!isCorrectPassword) {
    return null
  }

  return { id: user._id, name: user.username }
}

const sessionSecret = process.env.SESSION_SECRET
if (!sessionSecret) {
  throw new Error('SESSION_SECRET must be set.')
}

const storage = createCookieSessionStorage({
  cookie: {
    name: 'remix-mongoose',
    secure: process.env.NODE_ENV === 'production',
    secrets: [sessionSecret],
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true
  }
})

export async function createUserSession(userId: string, redirectTo: string) {
  const session = await storage.getSession()
  session.set('userId', userId)
  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await storage.commitSession(session)
    }
  })
}

function getUserSession(request: Request) {
  return storage.getSession(request.headers.get('cookie'))
}

export async function getUserId(request: Request) {
  const session = await getUserSession(request)
  const userId = session.get('userId')
  if (!userId || typeof userId !== 'string') {
    return null
  }
  return userId
}

export async function requireUserId(request: Request, redirectTo: string = new URL(request.url).pathname) {
  const session = await getUserSession(request)
  const userId = session.get('userId')

  if (!userId || typeof userId !== 'string') {
    const searchParams = new URLSearchParams([
      ["redirectTo", redirectTo]
    ])
    throw redirect(`/auth?${searchParams}`)
  }
  if (userId === '64bc5d2cbd0a53e595cf7f68') {
    throw new Response('This is a demo.', { status: 401 })
  }
  return userId
}

export async function getUser(request: Request) {
  const userId = await getUserId(request)
  if (typeof userId !== 'string') {
    return null
  }

  const user = await UserSchema.findById(userId).select('_id username email verified')
  if (!user) {
    throw logout(request)
  }

  return user
}

export async function logout(request: Request) {
  const session = await getUserSession(request)
  return redirect('/auth', {
    headers: {
      'Set-Cookie': await storage.destroySession(session)
    }
  })
}

export async function requireVerifiedEmail(userId: string) {
  const user = await UserSchema.findById(userId).select('email verified')

  if (!user) {
    throw new Error('User does not exist.')
  }

  if (!user.verified) {
    throw redirect('/verifyEmail')
  }
}

export async function verifyUser(email: string) {
  await UserSchema.findOneAndUpdate({ email }, { verified: true }, { new: true, runValidators: true })
}

export async function checkVerifiedEmail(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Not a valid userId.')
  }
  const user = await UserSchema.findById(userId)
  if (!user) {
    throw new Error('User does not exist.')
  } else {
    return user.verified
  }
}

export async function getUserEmail(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Not a valid userId.')
  }
  const user = await UserSchema.findById(userId).select('email')
  if (!user) {
    throw new Error('User does not exist.')
  }
  return user.email
}

export async function getUsername(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('User id is not valid.')
  }
  const user = await UserSchema.findById(userId).select('username')
  if (!user) {
    throw new Error('User does not exist.')
  }
  return user.username
}