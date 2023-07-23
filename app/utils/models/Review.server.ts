import mongoose from "mongoose"

interface IReview {
  rating: number,
  title: string,
  comment: string,
  user: mongoose.Types.ObjectId,
  product: mongoose.Types.ObjectId
}

interface ReviewModel extends mongoose.Model<IReview> {
  calculateAverageRating(productId: mongoose.Types.ObjectId): Promise<number>
}

const ReviewSchema = new mongoose.Schema<IReview, ReviewModel>(
  {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, 'Please provide rating'],
    },
    title: {
      type: String,
      trim: true,
      required: [true, 'Please provide review title'],
      maxlength: 100,
    },
    comment: {
      type: String,
      required: [true, 'Please provide review text'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    product: {
      type: mongoose.Schema.ObjectId,
      ref: 'Product',
      required: true,
    }
  },
  { timestamps: true }
);
ReviewSchema.index({ product: 1, user: 1 }, { unique: true });

ReviewSchema.statics.calculateAverageRating = async function (productId: mongoose.Types.ObjectId) {
  const result = await this.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        numOfReviews: { $sum: 1 },
      },
    },
  ]);

  try {
    await mongoose.model('Product').findOneAndUpdate(
      { _id: productId },
      {
        averageRating: Math.ceil(result[0]?.averageRating || 0),
        numOfReviews: result[0]?.numOfReviews || 0,
      }
    );
  } catch (error) {
    console.log(error);
  }
};

ReviewSchema.virtual('author', {
  ref: 'User',
  localField: 'user',
  foreignField: '_id',
  justOne: true
})

ReviewSchema.post('save', async function () {
  await (this.constructor as ReviewModel).calculateAverageRating(this.product);
});

ReviewSchema.post('deleteOne', { document: true, query: false }, async function () {
  await (this.constructor as ReviewModel).calculateAverageRating(this.product);
});

export default mongoose.model<IReview, ReviewModel>('Review', ReviewSchema);