import { LoaderArgs, Response } from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { createPaymentIntent } from '~/payments'
import { getSingleOrder } from '~/utils/orders.server';
import { requireUserId } from '~/utils/users.server';

const stripePromise = loadStripe('pk_test_TYooMQauvdEDq54NiTphI7jx')

export const loader = async ({ request }: LoaderArgs) => {
  const userId = await requireUserId(request)
  const url = new URL(request.url)
  const orderId = url.searchParams.get('orderId')
  if (!userId) {
    throw new Response('Unauthorized', { status: 401 })
  }
  if (orderId) {
    const order = await getSingleOrder(orderId)
    if (!order) {
      throw new Response(`No order exists with id ${orderId}`, { status: 404 })
    }
    if (userId !== order.user.toString()) {
      throw new Response('This is not your order.', { status: 403 })
    }
    const total = order.total
    return await createPaymentIntent(total, orderId)
  }
  return null
}

export default function Payments() {
  const paymentIntent = useLoaderData<typeof loader>()
  console.log(`Type of paymentIntent is: ${typeof paymentIntent}`)

  const options = {
    // passing the client secret obtained from the server
    clientSecret: paymentIntent?.client_secret!,
  };

  return (
    <div style={{ padding: '20px' }}>
      <Elements stripe={stripePromise} options={options}>
        <Outlet />
      </Elements>
    </div>
  );
}