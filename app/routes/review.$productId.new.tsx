import { ActionArgs, LoaderArgs, Response, json } from "@remix-run/node"
import { Form, isRouteErrorResponse, useActionData, useLoaderData, useRouteError } from "@remix-run/react"
import { badRequest } from "~/utils/request.server"
import { checkUserReviewForProduct, createReview } from "~/utils/reviews.server"
import { getUserId, requireUserId, requireVerifiedEmail } from "~/utils/users.server"

function validateRating(rating: number) {
  if (rating < 1 || rating > 5) {
    return 'Please rate the product.'
  }
}

function validateTitle(title: string) {
  if (title.length < 1) {
    return 'Please provide a title.'
  } else if (title.length > 100) {
    return 'Title must not be more than 100 characters.'
  }
}

function validateComment(comment: string) {
  if (comment.length < 1) {
    return 'Please provide a comment.'
  }
}

export const loader = async ({ request, params }: LoaderArgs) => {
  const userId = await getUserId(request)
  if (!userId) {
    throw new Response('Unauthorized', { status: 401 })
  }
  await requireVerifiedEmail(userId)
  const productId = params.productId
  if (!productId) {
    throw new Response('Product id is not valid in params. - Loader', { status: 400 })
  }
  await checkUserReviewForProduct(userId, productId)
  return json({ productId })
}

export const action = async ({ request }: ActionArgs) => {
  const userId = await requireUserId(request)
  const form = await request.formData()
  const productId = form.get('productId')
  const ratingString = form.get('rating')
  const rating = Number(ratingString)
  const title = form.get('title')
  const comment = form.get('comment')

  if (typeof productId !== 'string' ||
    typeof rating !== 'number' ||
    typeof title !== 'string' ||
    typeof comment !== 'string') {
    return badRequest({
      fieldErrors: null,
      fields: null,
      formError: 'Form not submitted correctly.'
    })
  }

  const fieldErrors = {
    rating: validateRating(rating),
    title: validateTitle(title),
    comment: validateComment(comment)
  }
  const fields = { rating, title, comment }
  if (Object.values(fieldErrors).some(Boolean)) {
    return badRequest({
      fieldErrors,
      fields,
      formError: null
    })
  }

  return createReview({ rating, title, comment, user: userId, product: productId })
}

export default function ReviewNew() {
  const { productId } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

  return (
    <Form method="POST" className="p-4 flex flex-col justify-center items-center gap-5">
      <input type="hidden" name="productId" value={productId} />
      <p>Rating</p>
      <label>
        <input id="rating" name="rating" type="radio" value={1} defaultChecked={actionData?.fields?.rating === 1} />
        1
      </label>
      <label>
        <input id="rating" name="rating" type="radio" value={2} defaultChecked={actionData?.fields?.rating === 2} />
        2
      </label>
      <label>
        <input id="rating" name="rating" type="radio" value={3} defaultChecked={actionData?.fields?.rating === 3} />
        3
      </label>
      <label>
        <input id="rating" name="rating" type="radio" value={4} defaultChecked={actionData?.fields?.rating === 4} />
        4
      </label>
      <label>
        <input id="rating" name="rating" type="radio" value={5} defaultChecked={actionData?.fields?.rating === 5} />
        5
      </label>
      {actionData?.fieldErrors?.rating && <p className="error" role="alert">{actionData?.fieldErrors?.rating}</p>}

      <label htmlFor="title">Enter title</label>
      <input id="title" name="title" type="text" placeholder="Title" defaultValue={actionData?.fields?.title} aria-invalid={Boolean(actionData?.fieldErrors?.title)} aria-errormessage={actionData?.fieldErrors?.title ? "title-error" : undefined} />
      {actionData?.fieldErrors?.title && <p className="error" role="alert">{actionData?.fieldErrors?.title}</p>}

      <label htmlFor="comment">Enter your comment</label>
      <textarea className="w-3/5" id="comment" name="comment" placeholder="Comment" defaultValue={actionData?.fields?.comment} aria-invalid={Boolean(actionData?.fieldErrors?.comment)} aria-errormessage={actionData?.fieldErrors?.comment ? "comment-error" : undefined} />
      {actionData?.fieldErrors?.comment && <p className="error" role="alert">{actionData?.fieldErrors?.comment}</p>}

      <button className="p-4 bg-green-400">Submit</button>
      {actionData?.formError && <p className="error" role="alert">{actionData?.formError}</p>}
    </Form>
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