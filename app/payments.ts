import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET as string, { apiVersion: "2022-11-15" });
export async function createPaymentIntent(total: number, orderId: string) {
  return await stripe.paymentIntents.create({
    amount: total,
    currency: 'usd',
    automatic_payment_methods: {
      enabled: true,
    },
    metadata: { orderId },
  })
}

export async function retrievePaymentIntent(id: string) {
  return await stripe.paymentIntents.retrieve(id);
}