import { ActionArgs, LoaderArgs, json, redirect } from "@remix-run/node";
import { Form, isRouteErrorResponse, useActionData, useLoaderData, useRouteError } from "@remix-run/react";
import { getSingleProduct, updateProduct } from "~/utils/products.server";
import { badRequest } from "~/utils/request.server";
import { getUserId, requireUserId, requireVerifiedEmail } from "~/utils/users.server";

function validateName(name: string) {
  if (name.length > 100) {
    return 'Name must not be more than 100 characters.'
  }
}

function validatePrice(price: number) {
  if (!/^[0-9]*$/.test(price.toString())) {
    return 'Price must be zero or a positive number.'
  }
}

function validateDescription(description: string) {
  if (description.length > 1000) {
    return 'Description must not be more than 1000 characters.'
  }
}

export const loader = async ({ request, params }: LoaderArgs) => {
  const userId = await getUserId(request)
  if (!userId) {
    throw new Response('Unauthorized', { status: 401 })
  }
  await requireVerifiedEmail(userId)
  if (!params.id) {
    throw new Response('Id not valid in params. - Loader', { status: 400 })
  }
  const product = await getSingleProduct(params.id)
  if (!product) {
    throw new Response('Product not found', { status: 404 })
  }
  if (product.user.toString() !== userId) {
    throw new Response("Pssh, nice try. That's not your product.", { status: 403 })
  }
  return json({ product })
}

export const action = async ({ request }: ActionArgs) => {
  const userId = await requireUserId(request)

  const form = await request.formData()
  const productId = form.get('productId')
  const productUser = form.get('productUser')
  const name = form.get('name')
  const priceString = form.get('price')
  const price = Number(priceString)
  const description = form.get('description')
  const category = form.get('category')
  const company = form.get('company')

  if (
    typeof productId !== 'string' ||
    typeof name !== 'string' ||
    typeof price !== 'number' ||
    typeof description !== 'string' ||
    (category !== 'office' && category !== 'kitchen' && category !== 'bedroom') ||
    (company !== 'ikea' && company !== 'liddy' && company !== 'marcos')
  ) {
    return badRequest({
      fieldErrors: null,
      fields: null,
      formError: 'Form not submitted correctly.'
    })
  }

  const fieldErrors = {
    name: validateName(name),
    price: validatePrice(price),
    description: validateDescription(description)
  }
  const fields = { name, price, description, category, company }
  if (Object.values(fieldErrors).some(Boolean)) {
    return badRequest({
      fieldErrors,
      fields,
      formError: null
    })
  }

  if (productUser !== userId) {
    throw new Response("Pssh, nice try. That's not your product.", { status: 403 })
  }

  const updatedProduct = await updateProduct({ name, price, description, category, company }, productId, userId)
  return redirect('/')
}

export default function ProductUpdate() {
  const { product } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

  return (
    <Form method="POST" className="flex flex-col justify-center items-center gap-5 p-5">
      <input type="hidden" name="productId" value={product._id} />
      <input type="hidden" name="productUser" value={product.user} />
      <img className="max-w-lg" src={product.image} />
      <label htmlFor="name">Previous name: {product.name}</label>
      <input id="name" name="name" type="text" placeholder="Update name" defaultValue={actionData?.fields?.name ?? product.name} aria-invalid={Boolean(actionData?.fieldErrors?.name)} aria-errormessage={actionData?.fieldErrors?.name ? "name-error" : undefined} />
      {actionData?.fieldErrors?.name && <p className="error" role="alert">{actionData?.fieldErrors?.name}</p>}

      <label htmlFor="price">Previous price: {product.price}</label>
      <input id="price" name="price" type="number" placeholder="Update price" min={0} defaultValue={actionData?.fields?.price ?? product.price} aria-invalid={Boolean(actionData?.fieldErrors?.price)} aria-errormessage={actionData?.fieldErrors?.price ? "price-error" : undefined} />
      {actionData?.fieldErrors?.price && <p className="error" role="alert">{actionData?.fieldErrors?.price}</p>}

      <label htmlFor="description">Previous description: {product.description}</label>
      <textarea className="w-3/5" id="description" name="description" placeholder="Update description" defaultValue={actionData?.fields?.description ?? product.description} aria-invalid={Boolean(actionData?.fieldErrors?.description)} aria-errormessage={actionData?.fieldErrors?.description ? "description-error" : undefined} />
      {actionData?.fieldErrors?.description && <p className="error" role="alert">{actionData?.fieldErrors?.description}</p>}

      <select id="category" name="category" defaultValue={actionData?.fields?.category ?? product.category}>
        <option value="office">Office</option>
        <option value="kitchen">Kitchen</option>
        <option value="bedroom">Bedroom</option>
      </select>

      <select id="company" name="company" defaultValue={actionData?.fields?.company ?? product.company}>
        <option value="ikea">Ikea</option>
        <option value="liddy">Liddy</option>
        <option value="marcos">Marcos</option>
      </select>
      <button className="bg-slate-100 p-4 disabled:bg-slate-500">Submit</button>
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