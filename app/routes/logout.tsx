import { LoaderArgs } from "@remix-run/node";
import { logout } from "~/utils/users.server";

export const loader = async ({ request }: LoaderArgs) => {
  return logout(request)
}