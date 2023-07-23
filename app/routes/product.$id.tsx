import { ActionArgs, LoaderArgs, Response, json, redirect } from "@remix-run/node"
import { Form, isRouteErrorResponse, useLoaderData, useNavigate, useRouteError } from "@remix-run/react";
import { useState } from "react";
import { checkSingleOrderItemExist, createSingleOrderItem, deleteSingleOrderItem, updateSingleOrderItemAmount } from "~/utils/orders.server";
import { deleteProduct, getSingleProduct } from "~/utils/products.server";
import { badRequest } from "~/utils/request.server";
import { Review, getReviews } from "~/utils/reviews.server";
import { getUserId, requireUserId, requireVerifiedEmail } from "~/utils/users.server";

export const loader = async ({ request, params }: LoaderArgs) => {
  const userId = await getUserId(request)
  if (!userId) {
    throw new Response('Unauthorized', { status: 401 })
  }
  await requireVerifiedEmail(userId)
  if (!params.id) {
    throw new Response('Id not valid in params. - Loader')
  }
  const product = await getSingleProduct(params.id)
  if (!product) {
    throw new Response("Product not found.", { status: 404 })
  }
  const reviews: (Review & { username: string })[] = await getReviews(params.id)

  const cartItem = await checkSingleOrderItemExist(userId, params.id)
  return json({ userId, product, reviews: reviews, cartItem })
}

export const action = async ({ request, params }: ActionArgs) => {
  const userId = await requireUserId(request)
  const form = await request.formData()
  const intent = form.get('intent')
  if (intent === 'addToCart' || intent === 'increaseAmount' || intent === 'deleteFromCart' || intent === 'decreaseAmount') {
    const image = form.get('productImage')
    const name = form.get('productName')
    const priceString = form.get('productPrice')
    const price = Number(priceString)
    const amountString = form.get('productAmount')
    const amount = Number(amountString)
    const productId = form.get('productId')

    if (
      typeof image !== 'string' ||
      typeof name !== 'string' ||
      typeof amount !== 'number' ||
      typeof amount !== 'number' ||
      typeof productId !== 'string'
    ) {
      return badRequest({
        fieldErrors: null,
        fields: null,
        formError: 'Form not submitted correctly.'
      })
    }
    if (intent === 'addToCart') {
      await createSingleOrderItem({ image, name, price, amount, product: productId, user: userId })
      return null
    } else if (intent === 'increaseAmount' || intent === 'deleteFromCart' || intent === 'decreaseAmount') {
      const cartItemId = form.get('cartItemId')
      if (typeof cartItemId !== 'string') {
        return badRequest({
          fieldErrors: null,
          fields: null,
          formError: 'Form not submitted correctly.'
        })
      }
      if (intent === 'increaseAmount' || intent === 'decreaseAmount') {
        const updatedAmount = intent === 'increaseAmount' ? amount + 1 : amount - 1
        await updateSingleOrderItemAmount(cartItemId, updatedAmount)
        return null
      } else if (intent === 'deleteFromCart') {
        await deleteSingleOrderItem(cartItemId)
        return null
      }
    }
  } else if (intent === 'delete') {
    const userId = await requireUserId(request)
    if (!params.id) {
      throw new Response('No id in params. - Action', { status: 400 })
    }
    const product = await getSingleProduct(params.id)
    if (!product) {
      throw new Response("Can't delete what does not exist.", { status: 404 })
    }
    if (product.user.toString() !== userId) {
      throw new Response("Pssh, nice try. That's not your product.", { status: 403 })
    }
    await deleteProduct(product._id.toString())
    return redirect('/')
  } else {
    throw new Response(`The intent ${intent} is not supported.`, { status: 400 })
  }
}

export default function Product() {
  const { userId, product, reviews, cartItem } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const [showMoreReviews, setShowMoreReviews] = useState(false)
  const recentReviews = reviews.slice(0, 3)
  const ownReview = reviews.find(review => review.user === userId)

  return (
    <div className="mx-auto mt-16 flex flex-col justify-center items-center gap-16">
      <div className="w-full flex flex-row justify-evenly items-center">
        <img className="max-w-xl" src={product.image} />
        <div className="bg-white max-w-xl flex flex-col gap-5 border-4 border-solid border-red-500 p-5">
          <p><span>Name:</span> {product.name}</p>
          <p><span>Price:</span> {product.price}</p>
          <p><span>Description:</span> {product.description}</p>
        </div>
      </div>
      <div className="w-full flex justify-evenly items-center">
        <p className="p-5 bg-slate-500"><span>Category:</span> {product.category}</p>
        <p className="p-5 bg-slate-500"><span>Company:</span> {product.company}</p>
        {product.featured && <p className="font-bold">Featured</p>}
      </div>
      <div className="w-full flex justify-evenly items-center">
        <p className="p-5 bg-lime-600"><span>Free shipping:</span> {product.freeShipping ? "Yes" : "No"}</p>
        <p className="p-5 bg-lime-600"><span>Inventory:</span> {product.inventory}</p>
        <p className="p-5 bg-lime-600"><span>Average rating:</span> {product.averageRating}</p>
      </div>
      <p className="p-5 bg-red-600"><span>Number of reviews:</span> {product.numOfReviews}</p>
      {product.user === userId && (
        <>
          <button className="p-2 bg-green-500" onClick={() => navigate(`/product/${product._id}/update`)}>Update</button>
          <Form method="POST">
            <button className="p-2 bg-red-500 disabled:bg-slate-500" name="intent" type="submit" value="delete">Delete</button>
          </Form>
        </>
      )
      }
      {cartItem &&
        <>
          <p className="text-2xl font-bold">This item is already added to your cart. Click below to modify the amount of this product.</p>
          <p className="p-5 bg-blue-500"><span>Amount:</span> {cartItem.amount}</p>
        </>
      }
      <Form method="POST" className="flex flex-col gap-10">
        <input type="hidden" name="productImage" value={product.image} />
        <input type="hidden" name="productName" value={product.name} />
        <input type="hidden" name="productPrice" value={product.price} />
        <input type="hidden" name="productAmount" value={cartItem ? cartItem.amount : 1} />
        <input type="hidden" name="productId" value={product._id} />
        {cartItem && <input type="hidden" name="cartItemId" value={cartItem._id} />}

        <button
          className="p-2 bg-green-500"
          name="intent"
          type="submit"
          value={cartItem ? "increaseAmount" : "addToCart"}
        >
          {cartItem ? "Increase Amount" : "Add to Cart"}
        </button>
        {cartItem &&
          <button
            className="p-2 bg-red-500"
            name="intent"
            type="submit"
            value={cartItem.amount === 1 ? "deleteFromCart" : "decreaseAmount"}
          >
            {cartItem.amount === 1 ? "Delete from Cart" : "Decrease Amount"}
          </button>}
      </Form>
      {ownReview ? (
        <>
          <p className="self-start ml-32 italic text-white font-bold text-2xl">You already submitted this review:</p>
          <ReviewComponent rating={ownReview.rating} title={ownReview.title} comment={ownReview.comment} user={ownReview.user} username={ownReview.username} userId={userId} reviewId={ownReview._id} />
        </>
      ) : <button className="p-4 bg-red-300 mb-4" onClick={() => navigate(`/review/${product._id}/new`)}>Add Review</button>}
      {reviews.length > 0 && <p className="font-bold italic underline text-3xl">Reviews:</p>}
      {showMoreReviews ? reviews.map(review => (
        <ReviewComponent key={review._id} rating={review.rating} title={review.title} comment={review.comment} user={review.user} username={review.username} userId={userId} reviewId={review._id} />
      )
      ) : recentReviews.map(review => (
        <ReviewComponent key={review._id} rating={review.rating} title={review.title} comment={review.comment} user={review.user} username={review.username} userId={userId} reviewId={review._id} />
      ))}
      {reviews.length > 3 && <button className="mb-10 p-2 bg-slate-600" onClick={() => setShowMoreReviews(prev => !prev)}>{showMoreReviews ? "Show Less" : "Show More"}</button>}
    </div>
  )
}

function ReviewComponent({ rating, title, comment, user: reviewUser, username, userId, reviewId }: Omit<Review & { username: string, userId: string, reviewId: string }, '_id' | 'product'>) {
  const navigate = useNavigate()
  const ownReview = reviewUser === userId
  return (
    <div className={`ml-32 w-2/5 self-start p-5 space-y-3 border-4 border-dashed ${ownReview ? "border-yellow-400" : "border-white"}`}>
      <h1>{username}</h1>
      <h2>Rating: {rating}</h2>
      <h3>Title: {title}</h3>
      <p>Comment: {comment}</p>
      {ownReview && <button className="p-2 bg-orange-500" onClick={() => navigate(`/review/${reviewId}`)}>Edit Review</button>}
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