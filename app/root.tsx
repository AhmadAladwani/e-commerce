import { json, LoaderArgs, type LinksFunction } from "@remix-run/node";
import {
  Link,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useLoaderData,
  useNavigation,
  useRouteError,
} from "@remix-run/react";
import styles from "./tailwind.css"
import ShopIcon from "./icons/Shop"
import { connect } from "./utils/db.server"
import { getUser } from "./utils/users.server";
import React, { useState } from "react";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: styles }
];

export const loader = async ({ request }: LoaderArgs) => {
  await connect()
  const user = await getUser(request)
  return json({ user })
}

function Document({ children, title }: { children: React.ReactNode, title: string }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
        <title>{title}</title>
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        {process.env.NODE_ENV === 'development' && <LiveReload />}
      </body>
    </html>
  )
}

function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useLoaderData<typeof loader>()
  const [showSidebar, setShowSidebar] = useState(false)
  return (
    <div className="flex">
      <div className={`${showSidebar ? "w-80" : "max-w-min"} bg-purple-800 min-h-screen`}>
        <div className="bg-white flex justify-around items-center p-5">
          <ShopIcon className="scale-150" onClick={() => setShowSidebar(prevShowSidebar => !prevShowSidebar)} />
          {showSidebar && <p className="text-center underline decoration-wavy underline-offset-2 font-bold text-2xl">Sidebar</p>}
        </div>
        {showSidebar &&
          <div className="flex flex-col justify-center gap-5 items-center">
            <Link to="/orders" className="mt-5">Orders</Link>
            <Link to="/cart">Cart</Link>
            <Link to="/products">All Products</Link>
            <Link to="/product/new">Add Product</Link>
          </div>}
      </div>
      <div className="w-full">
        <nav className="flex justify-end items-center p-4 bg-purple-600">
          <div className="flex justify-between items-center gap-4">
            <Link to="/orders">Orders</Link>
            <Link to="/cart">Cart</Link>
            <Link to="/product/new">Add</Link>
            <Link to="/products">Items</Link>
            {user ? <Link to="/logout">Logout</Link> :
              <Link to="/auth">Login</Link>}
          </div>
        </nav>
        {children}
      </div>
    </div>
  )
}

export default function App() {
  const navigation = useNavigation()
  return (
    <Document title="Products">
      <Layout>
        {navigation.state === 'idle' ? <Outlet /> : <div className="h-3/5 flex justify-center items-center"><p className="text-3xl font-bold">Loading Page...</p></div>}
      </Layout>
    </Document>
  );
}

export function ErrorBoundary() {
  const error = useRouteError()
  return (
    <Document title="Products">
      {isRouteErrorResponse(error) ?
        <div className="w-full h-screen flex flex-col justify-center items-center gap-10">
          <p className="error"><span>Error status:</span> {error.status}</p>
          <p className="error"><span>Error statusText:</span> {error.statusText}</p>
          <p className="error"><span>Error data:</span> {error.data}</p>
        </div>
        : error instanceof Error ?
          <div className="w-full h-screen flex flex-col justify-center items-center gap-10">
            <p className="error"><span>Error name:</span> {error.name}</p>
            <p className="error"><span>Error message:</span> {error.message}</p>
          </div> :
          <p className="mt-32 text-center error"><span>Unknown error.</span></p>
      }
    </Document>
  )
}