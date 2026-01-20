import { v2 as cloudinary } from "cloudinary";
import { asyncHandler } from "../utils/asyncHandler.js";
import { type Response } from "express";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import type { AuthTypedRequest } from "../types/Auth/auth.js";
import { Video } from "../models/video.model.js";

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
  async (
    req: AuthTypedRequest<{ secureUrl: string; publicId: string }>,
    res: Response
  ) => {
    const { secureUrl, publicId } = req.body;

    if (!secureUrl || !publicId)
      throw new ApiError(400, "Video Url and publicId required");

    const thumbnailLocalPath = req.file?.path;

    if (!thumbnailLocalPath) throw new ApiError(400, "Thumbnail is required");
  }
);

export { getUploadVideoSignature };
