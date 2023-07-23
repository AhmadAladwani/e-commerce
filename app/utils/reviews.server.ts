import mongoose from "mongoose"
import ReviewSchema from "./models/Review.server"
import { getSingleProduct } from "./products.server.js"
import { redirect } from "@remix-run/node"

export type Review = {
  _id: mongoose.Types.ObjectId,
  rating: number,
  title: string,
  comment: string,
  user: string,
  product: string
}

export async function createReview(submittedReview: Omit<Review, '_id'>) {
  const { product: productId, user: userId } = submittedReview
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('User id is not valid.')
  }
  const product = await getSingleProduct(productId.toString())
  if (!product) {
    throw new Error('Product does not exist.')
  }
  const alreadySubmitted = await ReviewSchema.findOne({ product: productId, user: userId })
  if (alreadySubmitted) {
    throw new Error('Already submitted review for this product.')
  }
  await ReviewSchema.create(submittedReview)
  return redirect(`/product/${productId}`)
}

export async function getReviews(productId: string) {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error('Product id is not valid.')
  }
  const reviews: (Review & { author: { username: string } })[] = await ReviewSchema.find({ product: productId }).populate('author')
  const reviewsWithUsername: (Review & { username: string })[] = []
  reviews.forEach(review => {
    reviewsWithUsername.push({ _id: review._id, rating: review.rating, title: review.title, comment: review.comment, user: review.user, product: review.user, username: review.author.username })
  })
  return reviewsWithUsername
}

export async function getRecentReviews(productId: string) {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error('Product id is not valid.')
  }
  const reviews = await ReviewSchema.find({ product: productId }).limit(5)
  return reviews
}

export async function getSingleReview(reviewId: string) {
  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    throw new Error('Not a valid review id.')
  }
  const review: Review | null = await ReviewSchema.findById(reviewId)
  if (!review) {
    throw new Error(`No review exists with id: ${reviewId}`)
  }
  return review
}

export async function updateReview(reviewId: string, userId: string, reviewBody: Omit<Review, '_id' | 'user' | 'product'>) {
  await checkReviewErrors(reviewId, userId)
  const review = await ReviewSchema.findOne({ _id: reviewId })
  if (!review) {
    throw new Error('Could not update review.')
  }
  review.rating = reviewBody.rating
  review.title = reviewBody.title
  review.comment = reviewBody.comment
  await review.save()
  return redirect(`/product/${review.product}`)
}

export async function deleteReview(reviewId: string, userId: string) {
  await checkReviewErrors(reviewId, userId)
  const review = await ReviewSchema.findById(reviewId)
  if (!review) {
    throw new Error('Could not delete review as review does not exist.')
  }
  await review.deleteOne()
  return redirect(`/product/${review.product}`)
}

async function checkReviewErrors(reviewId: string, userId: string) {
  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    throw new Error('Review id is not valid.')
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('User id is not valid.')
  }
  const review = await ReviewSchema.findById(reviewId)
  if (!review) {
    throw new Error(`No review exists with id: ${reviewId}`)
  }
  if (review.user.toString() !== userId) {
    throw new Error('This review does not belong to you.')
  }
}

export async function checkUserReviewForProduct(userId: string, productId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('User id is not valid.')
  }
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error('Product id is not valid.')
  }
  const product = await getSingleProduct(productId)
  if (!product) {
    throw new Error('Product does not exist.')
  }
  const review = await ReviewSchema.findOne({ user: userId, product: productId })
  if (review) {
    throw new Error('You have already submitted a review for this product.')
  }
}