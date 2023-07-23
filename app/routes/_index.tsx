import { LoaderArgs, redirect } from "@remix-run/node"
import { getUserId } from "~/utils/users.server"

export const loader = async ({ request }: LoaderArgs) => {
  const userId = await getUserId(request)
  if (userId) {
    return redirect("/products")
  } else {
    return redirect("/auth")
  }
}