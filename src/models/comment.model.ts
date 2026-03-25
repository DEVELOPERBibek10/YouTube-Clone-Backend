import mongoose, { Schema } from "mongoose";
import uniqueValidator from "mongoose-unique-validator";

const commentSchema = new Schema(
  {
    content: {
      type: String,
      required: true,
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

commentSchema.plugin(uniqueValidator);

export const Comment = mongoose.model("Comment", commentSchema);
