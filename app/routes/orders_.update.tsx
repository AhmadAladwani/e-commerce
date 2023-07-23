import { ActionArgs } from "@remix-run/node"
import { updateOrder } from "~/utils/orders.server"
import { requireUserId, requireVerifiedEmail } from "~/utils/users.server"

export const action = async ({ request }: ActionArgs) => {
  const userId = await requireUserId(request)
  await requireVerifiedEmail(userId)
  const { orderId } = await request.json()
  await updateOrder(orderId, 'paid')
  return null
}