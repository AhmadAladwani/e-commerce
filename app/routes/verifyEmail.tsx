import { LoaderArgs, Response, json } from "@remix-run/node"
import { useLoaderData, useNavigate } from "@remix-run/react"
import { checkVerifiedEmail, getUserId } from "~/utils/users.server"

export const loader = async ({ request }: LoaderArgs) => {
  const userId = await getUserId(request)
  if (!userId) {
    throw new Response("User id is not valid in params.", { status: 400 })
  }
  const verified = await checkVerifiedEmail(userId)
  return json({ verified, userId })
}

export default function verifyEmail() {
  const { verified, userId } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  return verified ? (
    <p className="ml-32 text-center font-bold">This user is already verified.</p>
  ) : (
    <div className="w-full h-3/5 flex flex-col justify-center items-center gap-5">
      <p>Your email is not verified, click below to verify it.</p>
      <button className="p-2 bg-blue-700" onClick={() => navigate(`/verify?userId=${userId}`)}>Verify Email</button>
    </div>
  )
}