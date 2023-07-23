import { ActionArgs, LoaderArgs, Response, json } from "@remix-run/node";
import { Form, isRouteErrorResponse, useActionData, useLoaderData, useRouteError } from "@remix-run/react";
import { badRequest } from "~/utils/request.server";
import { deleteReview, getSingleReview, updateReview } from "~/utils/reviews.server";
import { getUserId, requireUserId, requireVerifiedEmail } from "~/utils/users.server";

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
  const reviewId = params.reviewId
  if (!reviewId) {
    throw new Response('Review id is not valid in params. - Loader', { status: 400 })
  }
  const review = await getSingleReview(reviewId)
  if (review.user.toString() !== userId) {
    throw new Response('Not your review to edit.', { status: 403 })
  }
  return json(review)
}

export const action = async ({ request, params }: ActionArgs) => {
  const userId = await requireUserId(request)
  const reviewId = params.reviewId
  if (!reviewId) {
    throw new Response('Review id is not valid in params. - Action', { status: 400 })
  }
  const form = await request.formData()
  const ratingString = form.get('rating')
  const rating = Number(ratingString)
  const title = form.get('title')
  const comment = form.get('comment')
  const intent = form.get('intent')
  if (typeof rating !== 'number' ||
    typeof title !== 'string' ||
    typeof comment !== 'string' ||
    typeof intent !== 'string') {
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

  if (intent === 'update') {
    return updateReview(reviewId, userId, { rating, title, comment })
  } else if (intent === 'delete') {
    return deleteReview(reviewId, userId)
  } else {
    throw new Response(`The intent ${intent} is not supported.`, { status: 400 })
  }
}

export default function Review() {
  const review = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

  console.log(actionData?.fields?.rating)
  return (
    <Form method="POST" className="p-4 flex flex-col justify-center items-center gap-5">
      <p>Previous rating: {review.rating}</p>
      <label>
        <input id="rating" name="rating" type="radio" value={1} defaultChecked={actionData?.fields?.rating ? actionData?.fields?.rating === 1 : review.rating === 1} />
        1
      </label>
      <label>
        <input id="rating" name="rating" type="radio" value={2} defaultChecked={actionData?.fields?.rating ? actionData?.fields?.rating === 2 : review.rating === 2} />
        2
      </label>
      <label>
        <input id="rating" name="rating" type="radio" value={3} defaultChecked={actionData?.fields?.rating ? actionData?.fields?.rating === 3 : review.rating === 3} />
        3
      </label>
      <label>
        <input id="rating" name="rating" type="radio" value={4} defaultChecked={actionData?.fields?.rating ? actionData?.fields?.rating === 4 : review.rating === 4} />
        4
      </label>
      <label>
        <input id="rating" name="rating" type="radio" value={5} defaultChecked={actionData?.fields?.rating ? actionData?.fields?.rating === 5 : review.rating === 5} />
        5
      </label>
      {actionData?.fieldErrors?.rating && <p className="error" role="alert">{actionData?.fieldErrors?.rating}</p>}

      <label htmlFor="title">Previous title: {review.title}</label>
      <input id="title" name="title" type="text" placeholder="Update title" defaultValue={actionData?.fields?.title ?? review.title} aria-invalid={Boolean(actionData?.fieldErrors?.title)} aria-errormessage={actionData?.fieldErrors?.title ? "title-error" : undefined} />
      {actionData?.fieldErrors?.title && <p className="error" role="alert">{actionData?.fieldErrors?.title}</p>}

      <label htmlFor="comment">Previous comment: {review.comment}</label>
      <textarea className="w-3/5" id="comment" name="comment" placeholder="Update comment" defaultValue={actionData?.fields?.comment ?? review.comment} aria-invalid={Boolean(actionData?.fieldErrors?.comment)} aria-errormessage={actionData?.fieldErrors?.comment ? "comment-error" : undefined} />
      {actionData?.fieldErrors?.comment && <p className="error" role="alert">{actionData?.fieldErrors?.comment}</p>}

      <button className="p-4 bg-blue-500 disabled:bg-slate-500" name="intent" type="submit" value="update">Update</button>
      <button className="p-4 bg-red-500 disabled:bg-slate-500" name="intent" type="submit" value="delete">Delete</button>
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