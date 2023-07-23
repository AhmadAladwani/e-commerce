import { ActionArgs, LoaderArgs, redirect } from "@remix-run/node"
import { Form, isRouteErrorResponse, useActionData, useRouteError, useSearchParams } from "@remix-run/react"
import { useState } from "react"
import { badRequest } from "~/utils/request.server"
import { checkUserExist, createUserSession, getUser, login, register } from "~/utils/users.server"

function validateUsername(username: string) {
  if (username.length < 3) {
    return 'Usernames must be at least 3 characters long.'
  } else if (username.length > 50) {
    return 'Usernames must not be more than 50 characters long.'
  }
}

function validateEmail(email: string) {
  if (/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email)) {
    return 'Please enter a valid email.'
  }
}

function validatePassword(password: string) {
  if (password.length < 6) {
    return 'Passwords must be at least 6 characters long.'
  }
}

function validateUrl(url: string) {
  const urls = ['/products', '/']
  if (urls.includes(url)) {
    return url
  }
  return '/products'
}

export const action = async ({ request }: ActionArgs) => {
  const form = await request.formData()
  const intent = form.get('intent')
  if (intent === 'demo') {
    return createUserSession('64bc5d2cbd0a53e595cf7f68', '/products')
  }

  const loginType = form.get('loginType')
  const username = form.get('username')
  const email = form.get('email')
  const password = form.get('password')
  const redirectTo = validateUrl(form.get('redirectTo') as string) || '/products'

  if (
    typeof loginType !== 'string' ||
    (loginType === 'register' && typeof username !== 'string') ||
    typeof email !== 'string' ||
    typeof password !== 'string'
  ) {
    return badRequest({
      fieldErrors: null,
      fields: null,
      formError: 'Form not submitted correctly'
    })
  }

  const fields = { loginType, password, username, email }
  const fieldErrors = {
    username: loginType === 'register' && typeof username === 'string' && validateUsername(username),
    email: null,
    password: validatePassword(password)
  }
  if (Object.values(fieldErrors).some(Boolean)) {
    return badRequest({ fieldErrors, fields, formError: null })
  }

  switch (loginType) {
    case 'login': {
      const user = await login({ email, password })
      if (!user) {
        return badRequest({
          fieldErrors: null,
          fields,
          formError: 'Username/Password combination is incorrect.'
        })
      }
      return createUserSession(user.id.toString(), redirectTo)
    }
    case 'register': {
      const userExists = await checkUserExist(email)
      if (userExists) {
        console.log(userExists)
        return badRequest({
          fieldErrors: null,
          fields,
          formError: `User with email ${email} already exists.`
        })
      }
      if (loginType === 'register' && typeof username === 'string') {
        const user = await register({ username, email, password })
        if (!user) {
          return badRequest({
            fieldErrors: null,
            fields,
            formError: 'Something went wrong trying to create a new user.'
          })
        }
        return createUserSession(user.id.toString(), redirectTo)
      }
    }
    default: {
      return badRequest({
        fieldErrors: null,
        fields,
        formError: 'Login type invalid'
      })
    }
  }
}

export const loader = async ({ request }: LoaderArgs) => {
  const user = await getUser(request)
  if (user) {
    return redirect('/products?message=You are already logged in.')
  }
  return null
}

export default function Login() {
  const actionData = useActionData<typeof action>()
  const [searchParams] = useSearchParams()
  const [loginType, setLoginType] = useState<boolean>(true)
  console.log(actionData)

  return (
    <>
      <Form method="POST" className="m-auto mt-20 w-96 space-y-4 border-4 border-red-500 p-5 bg-red-400 flex flex-col justify-center items-center">
        <input type="hidden" name="redirectTo" value={searchParams.get("redirectTo") ?? undefined} />
        <fieldset>
          <legend>
            Login or Register?
          </legend>
          <label>
            <input type="radio" name="loginType" value="login"
              checked={loginType} onChange={() => setLoginType(true)} />{" "}
            Login
          </label>
          <label>
            <input type="radio" name="loginType" value="register"
              checked={loginType === false}
              onChange={() => setLoginType(false)} />{" "}
            Register
          </label>
        </fieldset>
        {!loginType && (
          <>
            <label htmlFor="username">Enter your username.</label>
            <input className="w-full" id="username" name="username" type="text" placeholder="Username" defaultValue={actionData?.fields?.username ?? undefined} aria-invalid={Boolean(actionData?.fieldErrors?.username)} aria-errormessage={actionData?.fieldErrors?.username ? "username-error" : undefined} />
            {actionData?.fieldErrors?.username && <p className="error" role="alert">{actionData?.fieldErrors?.username}</p>}
          </>
        )}
        <label htmlFor="email">Enter your email.</label>
        <input className="w-full" id="email" name="email" type="email" placeholder="Email" defaultValue={actionData?.fields?.email} aria-invalid={Boolean(actionData?.fieldErrors?.email)} aria-errormessage={actionData?.fieldErrors?.email ? "email-error" : undefined} />
        {actionData?.fieldErrors?.email && <p className="error" role="alert">{actionData?.fieldErrors?.email}</p>}
        <label htmlFor="password">Enter your password.</label>
        <input className="w-full" id="password" name="password" type="password" placeholder="Password" defaultValue={actionData?.fields?.password} aria-invalid={Boolean(actionData?.fieldErrors?.password)} aria-errormessage={actionData?.fieldErrors?.password ? "password-error" : undefined} />
        {actionData?.fieldErrors?.password && (<p className="error" role="alert">{actionData?.fieldErrors?.password}</p>)}
        {actionData?.formError && <p className="error" role="alert">{actionData?.formError}</p>}
        <button className="w-full h-10 bg-purple-600 rounded-lg disabled:bg-slate-500" disabled>Disabled</button>
      </Form>
      <Form method="POST" className="p-5 flex justify-center items-center">
        <button className="mx-auto w-96 h-10 bg-yellow-300 rounded-lg disabled:bg-slate-500" name="intent" type="submit" value="demo">Try Demo</button>
      </Form>
    </>
  )
}

export function ErrorBoundary() {
  const error = useRouteError()
  if (isRouteErrorResponse(error)) {
    return (
      <div className="w-full h-screen flex flex-col justify-center items-center gap-10">
        <p className="error"><span>Error status:</span> {error.status}</p>
        <p className="error"><span>Error statusText:</span> {error.statusText}</p>
        <p className="error"><span>Error data:</span> {error.data}</p>
      </div>
    )
  } else if (error instanceof Error) {
    return (
      <div className="w-full h-screen flex flex-col justify-center items-center gap-10">
        <p className="error"><span>Error name:</span> {error.name}</p>
        <p className="error"><span>Error message:</span> {error.message}</p>
      </div>
    )
  } else {
    return (
      <p className="mt-32 text-center error"><span>Unknown error.</span></p>
    )
  }
}