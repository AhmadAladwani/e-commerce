import mongoose from "mongoose"
import bcrypt from "bcryptjs"

interface IUser {
  username: string,
  email: string,
  password: string,
  verified: boolean,
  role: 'admin' | 'user',
}

interface IUserMethods {
  comparePassword: (candidatePassword: string) => Promise<boolean>
}

type UserModel = mongoose.Model<IUser, {}, IUserMethods>

const UserSchema = new mongoose.Schema<IUser, UserModel, IUserMethods>({
  username: {
    type: String,
    required: [true, 'Please provide name'],
    minlength: 3,
    maxlength: 50,
  },
  email: {
    type: String,
    unique: true,
    required: [true, 'Please provide email'],
    match: [
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      'Please provide a valid email',
    ],
  },
  password: {
    type: String,
    required: [true, 'Please provide password'],
    minlength: 6,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user',
  },
})

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

UserSchema.methods.comparePassword = async function (canditatePassword: string) {
  const isMatch = await bcrypt.compare(canditatePassword, this.password);
  return isMatch;
}

export default mongoose.model<IUser, UserModel>('User', UserSchema)