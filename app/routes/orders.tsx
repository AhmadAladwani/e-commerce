import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js"
import { LoaderArgs } from "@remix-run/node"
import { isRouteErrorResponse, useLoaderData, useNavigate, useRouteError } from "@remix-run/react"
import { getCurrentUserOrders } from "~/utils/orders.server"
import { getUserId, requireVerifiedEmail } from "~/utils/users.server"

export const loader = async ({ request }: LoaderArgs) => {
  const userId = await getUserId(request)
  if (!userId) {
    throw new Response('Unauthorized', { status: 401 })
  }
  await requireVerifiedEmail(userId)
  const orders = await getCurrentUserOrders(userId)
  return orders
}

export default function Orders() {
  const orders = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  return (
    <div>
      {orders.map(order => {
        return (
          <div key={order._id} className="p-4 m-20 flex flex-col justify-center items-center border-4 border-red-500 border-double">
            <div className="w-full flex justify-evenly items-center">
              <div>
                <h1>Total: {order.total}</h1>
                <h2>Subtotal: {order.subtotal}</h2>
              </div>
              <div>
                <h3>Tax: {order.tax}</h3>
                <h3>Shipping Fee: {order.shippingFee}</h3>
              </div>
            </div>
            <p className="text-2xl font-bold uppercase"><span className="underline italic">Status:</span> {order.status}</p>
            <p className="text-2xl underline italic font-bold self-start ml-32">Items:</p>
            {order.orderItems.map(orderItem => (
              <div key={orderItem._id} className="w-full flex justify-evenly items-center p-5 m-5 border-4 border-green-300 border-solid bg-white">
                <p><span>Name:</span> {orderItem.name}</p>
                <p><span>Price:</span> {orderItem.price}</p>
                <p><span>Amount:</span> {orderItem.amount}</p>
              </div>
            ))}
            {order.status === "paid" ?
              <p className="p-5 text-2xl underline italic text-white">You already paid for this order.</p> :
              <>
                <button className="p-2 bg-blue-600 mb-5 disabled:bg-slate-600" disabled={order.user === '64bc5d2cbd0a53e595cf7f68'} onClick={() => navigate(`/pay?orderId=${order._id}`)}>Pay with Stripe</button>
                {order.user === '64bc5d2cbd0a53e595cf7f68' ? (<p className="text-xl font-bold underline italic">Cannot pay with paypal when using demo.</p>) :
                  <PayPalScriptProvider options={{ clientId: "AQxl-t9MZLjtwNx3sTBh-K1-5k1pBfY94emsjykvTx1wYHLIbJt8lIcWtzLK8KwBtery0OSX_5t7Sbhx" }}>
                    <PayPalButtons
                      createOrder={(data, actions) => {
                        return actions.order.create({
                          purchase_units: [
                            {
                              amount: {
                                value: order.total.toString()
                              }
                            }
                          ]
                        })
                      }}
                      onApprove={(data, actions) => {
                        return fetch("/orders/update", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json"
                          },
                          body: JSON.stringify({
                            orderId: order._id
                          })
                        }).then(response => {
                          navigate("/orders")
                          return response.json()
                        })
                      }}
                    />
                  </PayPalScriptProvider>
                }
              </>
            }
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