import { LoaderArgs, json } from "@remix-run/node"
import { isRouteErrorResponse, useLoaderData, useNavigate, useRouteError } from "@remix-run/react"
import { getAllProducts } from "~/utils/products.server"
import { requireVerifiedEmail, getUserId } from "~/utils/users.server"

export const loader = async ({ request }: LoaderArgs) => {
  const userId = await getUserId(request)
  if (!userId) {
    throw new Response('Unauthorized', { status: 401 })
  }
  await requireVerifiedEmail(userId)
  const products = await getAllProducts()
  const url = new URL(request.url)
  const message = url.searchParams.get('message')
  return json({ products, message })
}

export default function Products() {
  const { products, message } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  return (
    <>
      {message && <p className="p-2 text-center font-bold text-red-700 italic">{message}</p>}
      <div className="grid grid-cols-3 gap-20 p-4 justify-center justify-items-center items-center">
        {products.map((product) => {
          return (
            <div key={product._id} className="p-4 shadow-md shadow-black h-auto w-5/6 rounded-lg bg-slate-500" onClick={() => navigate(`/product/${product._id}`)}>
              <img className="h-40 mx-auto" src={product.image} alt={product.name} />
              <h3>{product.name}</h3>
              <div className="flex justify-between items-center flex-wrap">
                <p>{`${product.price}$`}</p>
                <p>{`Category: ${product.category}`}</p>
              </div>
              <h2>{product.company}</h2>
            </div>
          )
        })}
      </div>
    </>
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