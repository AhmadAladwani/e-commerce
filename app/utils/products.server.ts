import mongoose from "mongoose"
import ProductSchema from "./models/Product.server"
import { redirect } from "@remix-run/node"

type Product = {
  _id: mongoose.Types.ObjectId,
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
  user: mongoose.Types.ObjectId,
}

type SubmittedProduct = Omit<Product, '_id' | 'colors' | 'featured' | 'freeShipping' | 'inventory' | 'averageRating' | 'numOfReviews' | 'user'> & { userId: string }

export async function createProduct(submittedProduct: SubmittedProduct) {

  const { name, price, description, image, category, company } = submittedProduct

  const userId = new mongoose.Types.ObjectId(submittedProduct.userId)
  const product = { name, price, description, image, category, company, user: userId }
  const newProduct = await ProductSchema.create(product)
  return redirect('/')
}

export async function getAllProducts() {
  const products: Product[] = await ProductSchema.find()
  return products
}

export async function getSingleProduct(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Not a valid product id.')
  }
  const product: Product | null = await ProductSchema.findById(id)
  return product
}

export async function updateProduct({ name, price, description, category, company }: Omit<SubmittedProduct, 'image' | 'userId'>, productId: string, userId: string) {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error('Product id is not valid.')
  }
  const product = await ProductSchema.findById(productId)
  if (!product || product.user.toString() !== userId) {
    return null
  }
  product.name = name
  product.price = price
  product.description = description
  product.category = category
  product.company = company
  await product.save()
  return product
}

export async function deleteProduct(productId: string) {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error('Product id is not valid.')
  }
  const product = await ProductSchema.findById(productId)
  if (!product) {
    return null
  }
  await product.deleteOne()
}