import mongoose from "mongoose"

let db: mongoose.Mongoose

declare global {
  var __db: mongoose.Mongoose | undefined
}

export async function connect() {
  if (db) return db

  if (process.env.NODE_ENV === 'production') {
    db = await mongoose.connect(process.env.MONGO_URI as string)
  } else {
    if (!global.__db) {
      global.__db = await mongoose.connect(process.env.MONGO_URI as string)
    }
    db = global.__db
  }
  return db
}