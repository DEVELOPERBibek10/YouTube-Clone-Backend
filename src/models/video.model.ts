import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import type { IVideo } from "../types/Model/Video.js";

const videoSchema = new Schema<IVideo>(
  {
    videoFile: {
      url: {
        type: String,
        required: true,
      },
      publicId: {
        type: String,
        required: true,
        select: false,
      },
    },
    thumbnail: {
      url: {
        type: String,
        required: true,
      },
      publicId: {
        type: String,
        required: true,
        select: false,
      },
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
  },
  { timestamps: true }
);

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model<IVideo>("Video", videoSchema);
