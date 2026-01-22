import { v2 as cloudinary } from "cloudinary";
import { asyncHandler } from "../utils/asyncHandler.js";
import { type Response } from "express";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import type {
  AuthTypedRequest,
  VideoRequestBody,
} from "../types/Request/request.js";
import { Video } from "../models/video.model.js";
import { deleteFile, uploadFile } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";

const getUploadVideoSignature = asyncHandler(async (req, res: Response) => {
  const folder = "vidtube/videos";
  const timestamp = Math.round(new Date().getTime() / 1000);

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET!
  );

  if (signature.length === 0) {
    throw new ApiError(500, "Failed to generate the video signature");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        signature,
        timestamp,
        folder,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
      },
      "Video signature generated sucessfully"
    )
  );
});

const uploadVideo = asyncHandler(
  async (req: AuthTypedRequest<VideoRequestBody>, res: Response) => {
    const {
      title,
      description,
      owner,
      isPublished,
      videoUrl,
      videoPublicId,
      duration,
    } = req.body;

    if (!videoUrl || !videoPublicId)
      throw new ApiError(400, "Video Url and publicId are required");
    const thumbnailLocalPath = req.file?.path;

    if (!thumbnailLocalPath) throw new ApiError(400, "Thumbnail is required");

    const user = await User.exists({ _id: owner });

    if (!user) throw new ApiError(400, "Owner does not exists");

    const thumbnail = await uploadFile(thumbnailLocalPath);

    if (!thumbnail) {
      throw new ApiError(500, "Error occured while uploading thumbnail");
    }

    const video = await Video.create({
      title,
      description,
      owner: user._id,
      isPublished,
      videoFile: {
        url: videoUrl,
        publicId: videoPublicId,
      },
      thumbnail: {
        url: thumbnail.url,
        publicId: thumbnail.public_id,
      },
      duration,
    });

    const createdVideo = await Video.findById(video._id);
    if (!createdVideo) {
      if (thumbnail.public_id) await deleteFile(thumbnail.public_id);
      if (videoPublicId) await deleteFile(videoPublicId);
      throw new ApiError(500, "Failed to register the Video");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, "Video uploaded Sucessfully."));
  }
);

export { getUploadVideoSignature, uploadVideo };
