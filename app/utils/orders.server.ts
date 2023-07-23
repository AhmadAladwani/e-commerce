import mongoose from "mongoose"
import { Order, SingleOrderItem } from "./models/Order.server"
import { getSingleProduct } from "./products.server"
import { redirect } from "@remix-run/node"

type SingleOrderType = {
  _id: string,
  name: string,
  image: string,
  price: number,
  amount: number,
  product: string,
  user: string,
}

type OrderType = {
  _id: mongoose.Types.ObjectId,
  tax: number,
  shippingFee: number,
  subtotal: number,
  total: number,
  orderItems: SingleOrderType[],
  status: 'pending' | 'failed' | 'paid' | 'delivered' | 'canceled',
  user: mongoose.Types.ObjectId,
}

export async function createOrder(cartItems: SingleOrderType[], tax: number, shippingFee: number, userId: string) {
  if (!cartItems || cartItems.length < 1) {
    throw new Error('No cart items provided.')
  }
  if (!tax || !shippingFee) {
    throw new Error('Please provide tax and shipping fee.')
  }

  let orderItems: readonly Omit<SingleOrderType, '_id'>[] = []
  let subtotal = 0

  for (const item of cartItems) {
    const dbProduct = await getSingleProduct(item.product.toString())
    if (!dbProduct) {
      throw new Error(`No product with id: ${item.product}`)
    }
    const { name, price, image, _id } = dbProduct
    const singleOrderItem = { amount: item.amount, name, price, image, product: _id.toString(), user: userId }
    orderItems = [...orderItems, singleOrderItem]
    subtotal += item.amount * price
  }
  const total = tax + shippingFee + subtotal

  await Order.create({ orderItems, total, subtotal, tax, shippingFee, user: userId })
  await SingleOrderItem.deleteMany({ user: userId })
  return redirect('/orders')
}

export async function getSingleOrder(orderId: string) {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new Error('Order id is not valid.')
  }
  const order: OrderType | null = await Order.findById(orderId)
  return order
}

export async function getCurrentUserOrders(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('User id is not valid.')
  }
  const orders: OrderType[] = await Order.find({ user: userId })
  return orders
}

export async function updateOrder(orderId: string, status: string) {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new Error('Order id is not valid.')
  }
  const order = await Order.findById(orderId)
  if (!order) {
    throw new Error(`No order with id: ${orderId}`)
  }
  const updatedOrder = await Order.findByIdAndUpdate(orderId, { status }, { new: true, runValidators: true })
  return updatedOrder
}

// For Cart Items

export async function createSingleOrderItem(singleOrderItem: Omit<SingleOrderType, '_id'>) {
  const cart = await SingleOrderItem.create({ ...singleOrderItem })
  return cart
}

export async function getSingleOrderItems(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('User id is not valid.')
  }
  const cartItems: SingleOrderType[] = await SingleOrderItem.find({ user: userId })
  return cartItems
}

export async function checkSingleOrderItemExist(userId: string, productId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('User id is not valid.')
  }
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error('Product id is not valid.')
  }
  const singleOrderItem: SingleOrderType | null = await SingleOrderItem.findOne({ user: userId, product: productId })
  return singleOrderItem
}

export async function updateSingleOrderItemAmount(singleOrderItemId: string, amount: number) {
  if (!mongoose.Types.ObjectId.isValid(singleOrderItemId)) {
    throw new Error('Single order item id is not valid.')
  }
  await SingleOrderItem.findByIdAndUpdate(singleOrderItemId, { amount }, { new: true, runValidators: true })
}

export async function deleteSingleOrderItem(singleOrderItemId: string) {
  if (!mongoose.Types.ObjectId.isValid(singleOrderItemId)) {
    throw new Error('Single order item id is not valid.')
  }
  const deletedSingleOrderItem = await SingleOrderItem.findByIdAndDelete(singleOrderItemId)
  if (!deletedSingleOrderItem) {
    throw new Error('Could not delete order item.')
  }
  return deletedSingleOrderItem
}

export async function deleteAllSingleOrderItems(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('User id is not valid.')
  }
  await SingleOrderItem.deleteMany({ user: userId })
}