import { LoaderArgs, Response } from "@remix-run/node"
import { isRouteErrorResponse, useLoaderData, useRouteError } from "@remix-run/react"
import { sendEmail, verifyToken } from "~/utils/tokenSender.server"

export const loader = async ({ request }: LoaderArgs) => {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  if (token) {
    const textErrorOrMessage = await verifyToken(token, request)
    return { sentEmail: false, textErrorOrEmail: textErrorOrMessage }
  }
  const userId = url.searchParams.get('userId')
  if (!userId) {
    throw new Response('UserId not provided in search params.', { status: 400 })
  }
  const { error, textErrorOrEmail } = await sendEmail(userId, request)
  if (error) {
    return { sentEmail: false, textErrorOrEmail }
  }
  return { sentEmail: true, textErrorOrEmail }
}

export default function Verify() {
  const { sentEmail, textErrorOrEmail } = useLoaderData<typeof loader>()
  return sentEmail ? (
    <p className="mt-32 font-bold text-center">Please click on the link that has been sent to: {textErrorOrEmail} to verify your email.</p>
  ) : (<p className="mt-32 font-bold text-center">{textErrorOrEmail}</p>)
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