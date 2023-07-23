import { LoaderArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { retrievePaymentIntent } from '~/payments'
import { updateOrder } from '~/utils/orders.server';

export const loader = async ({ request }: LoaderArgs) => {
  const url = new URL(request.url);
  const paymentIntentId = url.searchParams.get('payment_intent');
  const paymentIntent = await retrievePaymentIntent(paymentIntentId!)
  const orderId = paymentIntent.metadata.orderId
  await updateOrder(orderId, 'paid')
  return { paymentIntent }
}

export default function Success() {
  const { paymentIntent } = useLoaderData<typeof loader>()
  return (
    <div>
      <h1>Success</h1>
      <p>
        You have successfully paid for your order. Thank you for your
        purchase.
      </p>
      <p>
        PaymenIntent: {paymentIntent.status}
      </p>
    </div>
  );
}