import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IBookmark extends Document {
  userId: Types.ObjectId;
  opportunityId: Types.ObjectId;
  savedAt: Date;
}

const bookmarkSchema = new Schema<IBookmark>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    opportunityId: {
      type: Schema.Types.ObjectId,
      ref: 'Opportunity',
      required: true,
    },
    savedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

bookmarkSchema.index({ userId: 1, opportunityId: 1 }, { unique: true });

export const BookmarkModel =
  mongoose.models.Bookmark || mongoose.model<IBookmark>('Bookmark', bookmarkSchema);
