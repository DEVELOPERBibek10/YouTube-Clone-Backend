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
import mongoose from "mongoose";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { Subscription } from "../models/subscription.model.js";
import getVectorEmbedding from "../utils/vectorEmbedding.js";

const getVideoSignature = asyncHandler(
  async (req: AuthTypedRequest, res: Response) => {
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
  }
);

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
        .status(201)
        .json(new ApiResponse(201, video, "Video uploaded Sucessfully."));
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
    req: AuthTypedRequest<UpdateVideoDetailsBody, null, { videoId: string }>,
    res: Response
  ) => {
    const { title, description } = req.body;
    const { videoId } = req.params;
    const updateData: any = {};

    if (!videoId) throw new ApiError(400, "Video id is required");
    if (title !== undefined) {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        throw new ApiError(400, "Title cannot be empty");
      }
      updateData.title = trimmedTitle;
    }
    if (description !== undefined) updateData.description = description.trim();

    if (Object.keys(updateData).length === 0) {
      throw new ApiError(400, "Provide at least one field to update");
    }

    const updatedVideoDetail = await Video.findOneAndUpdate(
      { _id: videoId, owner: req.user?._id },
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
  async (
    req: AuthTypedRequest<null, any, { videoId: string }>,
    res: Response
  ) => {
    const { videoId } = req.params;
    if (!videoId) throw new ApiError(400, "Video id is required");

    const thumbnailLocalPath = req.file?.path;

    if (!thumbnailLocalPath) {
      throw new ApiError(400, "Thumbnial is a required field");
    }

    const video = await Video.findById(videoId)
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
        _id: videoId,
        owner: req.user!._id,
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
  async (
    req: AuthTypedRequest<null, null, { videoId: string }>,
    res: Response
  ) => {
    const { videoId } = req.params;
    if (!videoId) throw new ApiError(400, "Video id is required");

    const video = await Video.findOneAndDelete({
      _id: videoId,
      owner: req.user!._id,
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
      throw new ApiError(404, "Failed to locate the video on cloud.");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Video deleted Sucessfully"));
  }
);

export const getVideo = asyncHandler(
  async (
    req: AuthTypedRequest<null, null, { videoId: string }>,
    res: Response
  ) => {
    const { videoId } = req.params;
    if (!videoId) throw new ApiError(400, "Video id is required");

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, "Malformed video id!");
    }

    const videoResult = await Video.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(videoId) } },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
          pipeline: [
            {
              $project: {
                username: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          owner: { $arrayElemAt: ["$owner", 0] },
        },
      },
      {
        $project: {
          videoFile: 1,
          title: 1,
          description: 1,
          duration: 1,
          views: 1,
          owner: 1,
        },
      },
    ]);

    if (!videoResult) throw new ApiError(404, "Video not found");

    const video = videoResult[0];

    const likesPromise = Like.countDocuments({ video: videoId });
    const commentsPromise = Comment.countDocuments({ video: videoId });
    const subscribersPromise = Subscription.countDocuments({
      channel: video.owner._id,
    });

    const isLikedPromise = Like.exists({
      likedBy: req.user?._id,
      video: videoId,
    });
    const isSubscribedPromise = Subscription.exists({
      channel: Array.isArray(video),
      subscriber: req.user?._id,
    });

    const [likes, comments, subscribers, isLiked, isSubscribed] =
      await Promise.all([
        likesPromise,
        commentsPromise,
        subscribersPromise,
        isLikedPromise,
        isSubscribedPromise,
      ]);

    const videoResponse = {
      ...video,
      likesCount: likes,
      commentsCount: comments,
      subscriberCount: subscribers,
      isLiked: !!isLiked,
      isSubscribed: !!isSubscribed,
    };

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          videoResponse,
          "Video details fetched successfully"
        )
      );
  }
);

export const getAllVideos = asyncHandler(
  async (req: AuthTypedRequest, res: Response) => {
    const { page = 1, limit = 15, sortBy, sortType, searchText } = req.query;
    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const skip = (pageNumber - 1) * limitNumber;
    const pipeline: any[] = [];
    const queryVector = await getVectorEmbedding(searchText as string);

    if (searchText) {
      pipeline.push(
        { $match: { isPublished: true } },
        {
          $vectorSearch: {
            index: "video_title_index",
            path: "title_embedding",
            queryVector: queryVector,
            numCandidates: 100,
            limit: 10,
          },
        }
      );
    } else {
      pipeline.push(
        { $match: { isPublished: true } },
        { $sort: { createdAt: -1 } }
      );
    }

    const sortDirection = sortType == "asc" ? 1 : -1;
    if (sortBy) {
      pipeline.push({ $sort: { [sortBy as string]: sortDirection } });
    }

    pipeline.push({
      $facet: {
        videos: [
          { $skip: skip },
          { $limit: limitNumber },
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    _id: 0,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
        ],
        totalCount: [{ $count: "count" }],
      },
    });

    const result = await Video.aggregate(pipeline);

    if (!result) throw new ApiError(404, "No videos found or unauthorized");

    const videos = result[0].videos;
    const totalVideos = result[0].totalCount[0]?.count || 0;

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { videos, totalVideos, page: pageNumber, limit: limitNumber },
          "Videos fetched successfully"
        )
      );
  }
);

const getSuggestions = asyncHandler(
  async (req: AuthTypedRequest, res: Response) => {
    const searchQuery = req.query.q || "";

    if (!searchQuery) {
      return res.status(200).json([]);
    }

    const suggestions = await Video.aggregate([
      { $match: { isPublished: true } },
      {
        $search: {
          index: "default",
          autocomplete: {
            query: searchQuery,
            path: "title",
            tokenOrder: "sequential",
            fuzzy: {
              maxEdits: 3,
            },
          },
        },
      },
      {
        $limit: 10,
      },
      {
        $project: {
          _id: 0,
          title: 1,
        },
      },
    ]);

    if (!suggestions) {
      return res.send(200).json([]);
    }

    const titles = suggestions.map((v) => v.title);

    return res.status(200).json(titles);
  }
);

export {
  getVideoSignature,
  uploadVideo,
  updateVideoDetails,
  updateThumbnail,
  deleteVideo,
  getSuggestions,
};
