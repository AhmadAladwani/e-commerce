import { ActionArgs, LoaderArgs, json } from "@remix-run/node"
import { Form, isRouteErrorResponse, useActionData, useLoaderData, useRouteError } from "@remix-run/react"
import { useState } from "react"
import { createProduct } from "~/utils/products.server"
import { badRequest } from "~/utils/request.server"
import { getUserId, requireUserId, requireVerifiedEmail } from "~/utils/users.server"

function validateName(name: string) {
  if (name.length < 1) {
    return 'Please provide a name.'
  } else if (name.length > 100) {
    return 'Name must not be more than 100 characters.'
  }
}

function validatePrice(price: number) {
  if (!/^[0-9]*$/.test(price.toString())) {
    return 'Price must be zero or a positive number.'
  }
}

function validateDescription(description: string) {
  if (description.length < 1) {
    return 'Please provide a description.'
  } else if (description.length > 1000) {
    return 'Description must not be more than 1000 characters.'
  }
}

function validateImage(image: string) {
  if (image.length < 1) {
    return 'Please provide an image.'
  }
}

export const loader = async ({ request }: LoaderArgs) => {
  const userId = await getUserId(request)
  if (!userId) {
    throw new Response('Unauthorized', { status: 401 })
  }
  await requireVerifiedEmail(userId)
  return json({ userId })
}

export const action = async ({ request }: ActionArgs) => {
  await requireUserId(request)
  const form = await request.formData()
  const name = form.get('name')
  const priceString = form.get('price')
  const price = Number(priceString)
  const description = form.get('description')
  const image = form.get('image')
  const category = form.get('category')
  const company = form.get('company')
  const userId = form.get('userId')

  if (typeof name !== 'string' ||
    typeof price !== 'number' ||
    typeof description !== 'string' ||
    typeof image !== 'string' ||
    (category !== 'office' && category !== 'kitchen' && category !== 'bedroom') ||
    (company !== 'ikea' && company !== 'liddy' && company !== 'marcos') ||
    typeof userId !== 'string') {
    return badRequest({
      fieldErrors: null,
      fields: null,
      formError: 'Form not submitted correctly.'
    })
  }

  const fieldErrors = {
    name: validateName(name),
    price: validatePrice(price),
    description: validateDescription(description),
    image: validateImage(image)
  }
  const fields = { name, price, description, image, category, company }
  if (Object.values(fieldErrors).some(Boolean)) {
    return badRequest({
      fieldErrors,
      fields,
      formError: null
    })
  }

  return createProduct({ name, price, description, image, category, company, userId })
}

export default function ProductNew() {
  const { userId } = useLoaderData<typeof loader>()
  const [image, setImage] = useState<string | ArrayBuffer | null>(null)
  const actionData = useActionData<typeof action>()

  function convertToBase64(e: React.ChangeEvent<HTMLInputElement>) {
    console.log(e)
    const reader = new FileReader()
    if (e.target.files !== null) {
      reader.readAsDataURL(e.target.files[0])
    }
    reader.onload = () => {
      console.log(reader.result) //base64encoded string
      setImage(reader.result)
    }
    reader.onerror = error => {
      console.log("Error: " + error)
    }
  }

  return (
    <Form method="POST" className="p-5 flex flex-col justify-center items-center gap-5">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="image" value={image as string} />

      <label htmlFor="name">Enter name.</label>
      <input id="name" name="name" type="text" placeholder="Name" defaultValue={actionData?.fields?.name} aria-invalid={Boolean(actionData?.fieldErrors?.name)} aria-errormessage={actionData?.fieldErrors?.name ? "name-error" : undefined} />
      {actionData?.fieldErrors?.name && <p className="error" role="alert">{actionData?.fieldErrors?.name}</p>}

      <label htmlFor="price">Enter price.</label>
      <input id="price" name="price" type="number" placeholder="Price" min={0} defaultValue={actionData?.fields?.price} aria-invalid={Boolean(actionData?.fieldErrors?.price)} aria-errormessage={actionData?.fieldErrors?.price ? "price-error" : undefined} />
      {actionData?.fieldErrors?.price && <p className="error" role="alert">{actionData?.fieldErrors?.price}</p>}

      <label htmlFor="description">Enter description.</label>
      <textarea className="w-3/5" id="description" name="description" placeholder="Description" defaultValue={actionData?.fields?.description} aria-invalid={Boolean(actionData?.fieldErrors?.description)} aria-errormessage={actionData?.fieldErrors?.description ? "description-error" : undefined} />
      {actionData?.fieldErrors?.description && <p className="error" role="alert">{actionData?.fieldErrors?.description}</p>}

      <label htmlFor="file">Pick image file.</label>
      <input type="file" id="file" name="file" accept="image/*" multiple onChange={convertToBase64} aria-invalid={Boolean(actionData?.fieldErrors?.image)} aria-errormessage={actionData?.fieldErrors?.image ? "image-error" : undefined} />

      {image === null || image === "" ? "" : <img width={100} height={100} src={image as string} />}

      {actionData?.fieldErrors?.image && <p className="error" role="alert">{actionData?.fieldErrors?.image}</p>}

      <select id="category" name="category" defaultValue={actionData?.fields?.category}>
        <option value="office">Office</option>
        <option value="kitchen">Kitchen</option>
        <option value="bedroom">Bedroom</option>
      </select>

      <select id="company" name="company" defaultValue={actionData?.fields?.company}>
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