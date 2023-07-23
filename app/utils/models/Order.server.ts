import mongoose from "mongoose"

export interface ISingleOrderItemSchema {
  name: string,
  image: string,
  price: number,
  amount: number,
  product: mongoose.Types.ObjectId,
  user: mongoose.Types.ObjectId,
}

const SingleOrderItemSchema = new mongoose.Schema<ISingleOrderItemSchema>({
  name: { type: String, required: true },
  image: { type: String, required: true },
  price: { type: Number, required: true },
  amount: { type: Number, required: true },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
})

interface IOrderSchema {
  tax: number,
  shippingFee: number,
  subtotal: number,
  total: number,
  orderItems: ISingleOrderItemSchema[],
  status: 'pending' | 'failed' | 'paid' | 'delivered' | 'canceled',
  user: mongoose.Types.ObjectId,
}

type OrderDocumentProps = {
  orderItems: mongoose.Types.DocumentArray<ISingleOrderItemSchema>,
}
type OrderModelType = mongoose.Model<IOrderSchema, {}, OrderDocumentProps>

const OrderSchema = new mongoose.Schema<IOrderSchema, OrderModelType>(
  {
    tax: {
      type: Number,
      required: true,
    },
    shippingFee: {
      type: Number,
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    orderItems: [SingleOrderItemSchema],
    status: {
      type: String,
      enum: ['pending', 'failed', 'paid', 'delivered', 'canceled'],
      default: 'pending',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
)

const SingleOrderItem = mongoose.model<ISingleOrderItemSchema>('Single Order Item', SingleOrderItemSchema)
const Order = mongoose.model<IOrderSchema, OrderModelType>('Order', OrderSchema)

export { Order, SingleOrderItem }