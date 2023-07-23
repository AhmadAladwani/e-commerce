import { ActionArgs, LoaderArgs } from "@remix-run/node"
import { Form, isRouteErrorResponse, useLoaderData, useNavigate, useRouteError } from "@remix-run/react"
import { createOrder, deleteSingleOrderItem, getSingleOrderItems, updateSingleOrderItemAmount } from "~/utils/orders.server"
import { badRequest } from "~/utils/request.server"
import { getUserId, requireUserId, requireVerifiedEmail } from "~/utils/users.server"

export const loader = async ({ request }: LoaderArgs) => {
  const userId = await getUserId(request)
  if (!userId) {
    throw new Response('Unauthorized', { status: 401 })
  }
  await requireVerifiedEmail(userId)
  const cartItems = await getSingleOrderItems(userId)
  return cartItems
}

export const action = async ({ request }: ActionArgs) => {
  const userId = await requireUserId(request)
  const form = await request.formData()
  const cartItemId = form.get('cartItemId')
  const amountString = form.get('amount')
  const amount = Number(amountString)
  const intent = form.get('intent')

  if (intent === 'increaseAmount' || intent === 'decreaseAmount' || intent === 'deleteFromCart') {
    if (typeof cartItemId !== 'string' || typeof amount !== 'number' || typeof intent !== 'string') {
      return badRequest({ fieldErrors: null, fields: null, formError: 'Form not submitted correctly.' })
    }
    if (intent === 'increaseAmount' || intent === 'decreaseAmount') {
      const updatedAmount = intent === 'increaseAmount' ? amount + 1 : amount - 1
      await updateSingleOrderItemAmount(cartItemId, updatedAmount)
      return null
    } else if (intent === 'deleteFromCart') {
      await deleteSingleOrderItem(cartItemId)
      return null
    }
  } else if (intent === 'createOrder') {
    const cartItems = await getSingleOrderItems(userId)
    return createOrder(cartItems, 50, 70, userId)
  } else {
    throw new Response(`The intent ${intent} is not supported.`, { status: 400 })
  }
}

export default function Cart() {
  const cartItems = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  return (
    <div className="flex flex-col justify-center items-center p-5 gap-10">
      {cartItems.length > 0 ?
        <Form method="POST">
          <button className="p-2 bg-green-500" name="intent" type="submit" value="createOrder">Create Order</button>
        </Form> :
        <p>No items have been added to your cart.</p>}
      {cartItems.map(cartItem => {
        return (
          <div key={cartItem._id} className="p-5 border-4 border-blue-500 border-solid">
            <img className="max-w-xl" src={cartItem.image} onClick={() => navigate(`/product/${cartItem.product}`)} />
            <div className="p-5 flex justify-between items-center">
              <div className="space-y-5">
                <p><span>Name:</span> {cartItem.name}</p>
                <p><span>Price:</span> {cartItem.price}</p>
                <p><span>Amount:</span> {cartItem.amount}</p>
              </div>
              <Form method="POST" className="p-5 flex flex-col gap-5">
                <input type="hidden" name="cartItemId" value={cartItem._id} />
                <input type="hidden" name="amount" value={cartItem.amount} />
                <button className="p-2 bg-green-500" name="intent" type="submit" value="increaseAmount">Increase Amount</button>
                <button className="p-2 bg-red-500" name="intent" type="submit" value={cartItem.amount === 1 ? "deleteFromCart" : "decreaseAmount"}>{cartItem.amount === 1 ? "Delete From Cart" : "Decrease Amount"}</button>
              </Form>
            </div>
            <p className="text-2xl text-blue-700 underline italic">Click on the image to view the product.</p>
          </div>
        )
      })}
    </div>
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