import mongoose from "mongoose"
import { ISingleOrderItemSchema } from "./Order.server"

interface IProduct {
  name: string,
  price: number,
  description: string,
  image: string,
  category: 'office' | 'kitchen' | 'bedroom',
  company: 'ikea' | 'liddy' | 'marcos',
  colors: mongoose.Types.Array<string>,
  featured: boolean,
  freeShipping: boolean,
  inventory: number,
  averageRating: number
  numOfReviews: number,
  user: mongoose.Schema.Types.ObjectId,
}

const ProductSchema = new mongoose.Schema<IProduct>({
  name: {
    type: String,
    trim: true,
    required: [true, 'Please provide product name'],
    maxlength: [100, 'Name can not be more than 100 characters'],
  },
  price: {
    type: Number,
    required: [true, 'Please provide product price'],
    default: 0,
  },
  description: {
    type: String,
    required: [true, 'Please provide product description'],
    maxlength: [1000, 'Description can not be more than 1000 characters'],
  },

  image: {
    type: String,
    default: '/uploades/example.jpeg',
  },
  category: {
    type: String,
    required: [true, 'Please provide product category'],
    enum: ['office', 'kitchen', 'bedroom'],
  },
  company: {
    type: String,
    required: [true, 'Please provide company'],
    enum: {
      values: ['ikea', 'liddy', 'marcos'],
      message: '{VALUE} is not supported',
    },
  },
  colors: {
    type: [String],
    default: ['#222'],
    required: true,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  freeShipping: {
    type: Boolean,
    default: false,
  },
  inventory: {
    type: Number,
    required: true,
    default: 15,
  },
  averageRating: {
    type: Number,
    default: 0,
  },
  numOfReviews: {
    type: Number,
    default: 0,
  },
  user: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
    required: true,
  }
})

ProductSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
  await mongoose.model('Review').deleteMany({ product: this._id })
  await mongoose.model('Single Order Item').deleteOne({ product: this._id })
  const orderModel = mongoose.model('Order')
  const orders = await orderModel.find({ 'orderItems.product': this._id, status: { $ne: 'paid' } })
  orders.forEach(async order => {
    let subtotal = 0
    const newOrderItems = order.orderItems.filter((orderItem: ISingleOrderItemSchema) => {
      if (orderItem.product.toString() !== this._id.toString()) {
        subtotal += orderItem.amount * orderItem.price
        return true
      } else {
        return false
      }
    })

    console.log(newOrderItems)
    const total = subtotal + order.shippingFee + order.tax
    await orderModel.findByIdAndUpdate(order._id, { orderItems: newOrderItems, subtotal, total }, { new: true, runValidators: true })
  })
})

ProductSchema.pre('save', async function (next) {
  await mongoose.model('Single Order Item').findOneAndUpdate({ product: this._id }, { name: this.name, price: this.price })

  const orders = await mongoose.model('Order').find({ 'orderItems.product': this._id, status: { $ne: 'paid' } })

  orders.forEach(async order => {
    let subtotal = 0
    order.orderItems.forEach((orderItem: ISingleOrderItemSchema) => {
      if (orderItem.product.toString() === this._id.toString()) {
        orderItem.name = this.name
        orderItem.price = this.price
      }
      subtotal += orderItem.amount * orderItem.price
    })
    order.subtotal = subtotal
    order.total = subtotal + order.shippingFee + order.tax
    await order.save()
  })
})

export default mongoose.model<IProduct>('Product', ProductSchema)