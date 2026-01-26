import { v2 as cloudinary } from "cloudinary";
import { asyncHandler } from "../utils/asyncHandler.js";
import { type Response } from "express";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import type {
  AuthTypedRequest,
  UpdateVideoDetailsBody,
  VideoRequestBody,
} from "../types/Request-Response/request.js";
import { Video } from "../models/video.model.js";
import { deleteFile, uploadFile } from "../utils/cloudinary.js";

const getVideoSignature = asyncHandler(async (req, res: Response) => {
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
      isPublished,
      videoUrl,
      videoPublicId,
      duration,
    } = req.body;

    if (!videoUrl || !videoPublicId)
      throw new ApiError(400, "Video Url and publicId are required");
    const thumbnailLocalPath = req.file?.path;

    if (!thumbnailLocalPath) throw new ApiError(400, "Thumbnail is required");

    const thumbnail = await uploadFile(thumbnailLocalPath);

    if (!thumbnail || !thumbnail.public_id) {
      throw new ApiError(500, "Thumbnail uploading failed");
    }

    try {
      const video = await Video.create({
        title,
        description,
        owner: req.user!._id,
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

      const createdVideo = await Video.exists({ _id: video._id });

      if (!createdVideo?._id) throw new ApiError(500, "Error uploading video");

      return res
        .status(200)
        .json(new ApiResponse(200, video, "Video uploaded Sucessfully."));
    } catch (error: any) {
      const thumbnailDeletion = await deleteFile(thumbnail.public_id);
      if (!thumbnailDeletion) {
        throw new ApiError(
          500,
          "Thumbnail deletion failed. The asset might be orphan"
        );
      }
      if (thumbnailDeletion.result !== "ok") {
        throw new ApiError(404, "Failed to locate the thumbnail on cloud.");
      }
      const videoDeletion = await deleteFile(videoPublicId, "video");
      if (!videoDeletion)
        throw new ApiError(
          500,
          "Video deletion failed. The asset might be orphan"
        );
      if (videoDeletion.result !== "ok") {
        throw new ApiError(404, "Failed to locate the video on cloud.");
      }
      console.error("Database Registration Error:", error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        500,
        error?.message || "Database registration failed. Assets cleared.",
        error?.errors || []
      );
    }
  }
);

const updateVideoDetails = asyncHandler(
  async (
    req: AuthTypedRequest<UpdateVideoDetailsBody, null, { id: string }>,
    res: Response
  ) => {
    const { title, description } = req.body;
    const { id } = req.params;
    const updateData: any = {};

    if (!id) throw new ApiError(400, "Video id is required");
    if (title !== undefined) {
      const trimmedTitle = title.trim();
      if (trimmedTitle) {
        throw new ApiError(400, "Title cannot be empty");
      }
      updateData.title = trimmedTitle;
    }
    if (description !== undefined) updateData.description = description.trim();

    if (Object.keys(updateData).length === 0) {
      throw new ApiError(400, "Provide at least one field to update");
    }

    const updatedVideoDetail = await Video.findOneAndUpdate(
      { _id: id, owner: req.user?._id },
      {
        $set: updateData,
      },
      { new: true }
    );

    if (!updatedVideoDetail || !updatedVideoDetail._id) {
      throw new ApiError(404, "Video not found or unauthorized");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedVideoDetail, "Details updated sucessfully")
      );
  }
);

const updateThumbnail = asyncHandler(
  async (req: AuthTypedRequest<null, any, { id: string }>, res: Response) => {
    const { id } = req.params;
    if (!id) throw new ApiError(400, "Video id is required");

    const thumbnailLocalPath = req.files?.path;

    if (!thumbnailLocalPath) {
      throw new ApiError(400, "Thumbnial is a required field");
    }

    const video = await Video.findById(id)
      .select("thumbnail.publicId thumbnail.url")
      .lean();

    if (!video?.thumbnail?.publicId) {
      throw new ApiError(
        404,
        "Thumbnail not found to update or already deleted"
      );
    }

    const thumbnail = await uploadFile(
      video.thumbnail.url,
      video.thumbnail.publicId
    );

    if (!thumbnail || !thumbnail.url) {
      throw new ApiError(500, "Failed to upload thumbnail");
    }

    const updatedVideo = await Video.findOneAndUpdate(
      {
        _id: id,
        owner: req.user._id,
      },
      {
        $set: {
          "thumbnail.url": thumbnail.url,
          "thumbnail.publicId": thumbnail.public_id,
        },
      },
      { new: true }
    );

    if (!updatedVideo) {
      throw new ApiError(404, "Video not found or unauthorized");
    }

    return res
      .send(200)
      .json(
        new ApiResponse(200, updatedVideo, "Thumbnail updated sucessfully")
      );
  }
);

const deleteVideo = asyncHandler(
  async (req: AuthTypedRequest<null, null, { id: string }>, res: Response) => {
    const { id } = req.params;
    if (!id) throw new ApiError(400, "Video id is required");

    const video = await Video.findOneAndDelete({
      _id: id,
      owner: req.user._id,
    });

    if (!video) {
      throw new ApiError(404, "Video not found or unauthorized");
    }

    const deleteThumbnailOnCloudinary = await deleteFile(
      video.thumbnail.publicId
    );

    if (!deleteThumbnailOnCloudinary) {
      throw new ApiError(500, "Error while deteting the thumbnail");
    }

    if (deleteThumbnailOnCloudinary.result !== "ok") {
      throw new ApiError(404, "Failed to locate the thumbnail on cloud.");
    }

    const deleteVideoOnCloudinary = await deleteFile(
      video.videoFile.publicId,
      "video"
    );

    if (!deleteVideoOnCloudinary) {
      throw new ApiError(500, "Error while deteting the thumbnail");
    }

    if (deleteVideoOnCloudinary.result !== "ok") {
      throw new ApiError(404, "Failed to locate the thumbnail on cloud.");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Video deleted Sucessfully"));
  }
);

export {
  getVideoSignature,
  uploadVideo,
  updateVideoDetails,
  updateThumbnail,
  deleteVideo,
};
