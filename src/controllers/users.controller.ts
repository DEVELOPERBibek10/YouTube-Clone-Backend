import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { deleteFile, uploadFile } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose, { Types } from "mongoose";
import type {
  UserResponse,
  IUserDocument,
  LoggedInUserResponse,
  ChannelProfileResponse,
} from "../types/Model/User.js";
import type {
  AuthTypedRequest,
  LoginUserBody,
  RegisterUserBody,
  TypedRequest,
} from "../types/Request/request.js";
import type { Response, CookieOptions } from "express";
import type { DecodedToken } from "../middlewares/auth.middleware.js";

const generateAccessAndRefreshToken = async (
  userId: string | Types.ObjectId
) => {
  try {
    const user: IUserDocument | null = await User.findById(userId);
    if (!user) throw new Error("Unable to find the user");
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    if (error instanceof Error) throw new ApiError(500, error.message);
    throw new ApiError(500, "Unable to generate refresh and access token !");
  }
};

const registerUser = asyncHandler(
  async (req: TypedRequest<RegisterUserBody>, res: Response) => {
    // Get the user details from frontend.
    // Validation - empty, email format.
    // check if user already exists.
    // check for images or avatar.
    // upload them to cloudinary.
    // create user object - create a user in the db
    // remove password and refresh token field from response.
    // return response.

    let avatar = null;
    let coverImage = null;

    try {
      const { fullName, email, username, password } = req.body;
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

      if (
        [fullName, email, username, password].some(
          (feild) => feild?.trim() === ""
        )
      ) {
        throw new ApiError(400, "Field is required");
      }

      if (password.length < 8 || password.length > 16) {
        throw new ApiError(
          400,
          "Password cannot be shorter than 8 or longer than 16 characters."
        );
      }

      if (!emailRegex.test(email.toLowerCase())) {
        throw new ApiError(400, "Invalid email format");
      }

      const existingUser = await User.findOne({
        $or: [{ username: username }, { email: email }],
      });

      if (existingUser) {
        throw new ApiError(409, "User already exists");
      }

      const avatarLocalPath = req.files?.avatar?.[0]?.path;
      let coverImageLocalPath;

      if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
      ) {
        coverImageLocalPath = req.files.coverImage[0]!.path;
      }

      if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar field is required");
      }

      avatar = await uploadFile(avatarLocalPath);

      if (coverImageLocalPath) {
        coverImage = await uploadFile(coverImageLocalPath);
      }

      const user = await User.create({
        fullName,
        avatar: {
          url: avatar!.url,
          publicId: avatar!.public_id,
        },
        coverImage: {
          url: coverImage?.url || "",
          publicId: coverImage?.public_id || "",
        },
        email: email.toLowerCase(),
        password,
        username: username.toLowerCase(),
      });

      const createdUser = await User.findById(user._id).select(
        "-password -watchHistory"
      );

      if (!createdUser) {
        if (avatar?.public_id) await deleteFile(avatar.public_id);
        if (coverImage?.public_id) await deleteFile(coverImage.public_id);
        throw new ApiError(
          500,
          "Unable to register user due to internal server issues."
        );
      }

      return res
        .status(201)
        .json(
          new ApiResponse<UserResponse>(
            201,
            createdUser,
            "User registered sucessfully!"
          )
        );
    } catch (error) {
      if (avatar?.public_id) {
        await deleteFile(avatar.public_id);
      }
      if (coverImage?.public_id) {
        await deleteFile(coverImage.public_id);
      }
      throw error;
    }
  }
);

const loginUser = asyncHandler(
  async (req: TypedRequest<LoginUserBody>, res: Response) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      throw new ApiError(404, "User does not exist!");
    }

    if (password.length < 8 || password.length > 16) {
      throw new ApiError(
        400,
        "Password cannot be shorter than 8 or longer than 16 characters."
      );
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid password !");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    const loggedInUser = await User.findById(user._id).select(
      "-password -watchHistory"
    );

    const options: CookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse<LoggedInUserResponse>(
          200,
          {
            user: loggedInUser as UserResponse,
            accessToken,
          },
          "User loggedIn successfully"
        )
      );
  }
);

const logoutUser = asyncHandler(
  async (req: AuthTypedRequest, res: Response) => {
    await User.findOneAndUpdate(
      req.user!._id,
      {
        $unset: {
          refreshToken: 1,
        },
      },
      {
        new: true,
      }
    );

    const options: CookieOptions = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse<null>(200, null, "User logged out"));
  }
);

const refreshAccessToken = asyncHandler(
  async (req: TypedRequest, res: Response) => {
    if (!req.cookies) throw new ApiError(403, "Forbidden request");

    const incommingRefreshToken = req.cookies.refreshToken;

    if (!incommingRefreshToken) {
      throw new ApiError(401, "Invalid refresh token!");
    }
    try {
      const decodedToken = jwt.verify(
        incommingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET!
      ) as DecodedToken;

      const user = await User.findById(decodedToken._id);

      if (!user) {
        throw new ApiError(404, "User not found");
      }

      const { accessToken, refreshToken: newRefreshToken } =
        await generateAccessAndRefreshToken(user._id);

      const options: CookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      };

      return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(new ApiResponse<null>(200, null, "Access token refreshed"));
    } catch (error) {
      if (error instanceof ApiError) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
      }
      throw new ApiError(401, "Invalid refresh Token");
    }
  }
);

const getCurrentUser = asyncHandler(
  async (req: AuthTypedRequest, res: Response) => {
    const {
      _id,
      avatar,
      coverImage,
      fullName,
      username,
      email,
      createdAt,
      updatedAt,
    } = req.user!;

    return res.status(200).json(
      new ApiResponse<UserResponse>(
        200,
        {
          _id,
          avatar,
          coverImage,
          fullName,
          username,
          email,
          createdAt,
          updatedAt,
        },
        "Current user fetched successfully"
      )
    );
  }
);

const changeCurrentPassword = asyncHandler(
  async (
    req: AuthTypedRequest<{ oldPassword: string; newPassword: string }>,
    res: Response
  ) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);

    if (!user) throw new ApiError(400, "User doesn't exist.");

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) throw new ApiError(400, "Invalid old password");

    if (newPassword.length < 8 || newPassword.length > 16) {
      throw new ApiError(
        400,
        "Password cannot be shorter than 8 or longer than 16 characters."
      );
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
      .status(200)
      .json(new ApiResponse<{}>(200, {}, "Password changed successfully!"));
  }
);

const updateDetails = asyncHandler(
  async (req: AuthTypedRequest<{ fullName: string }>, res) => {
    const { fullName } = req.body;

    if (!fullName) {
      throw new ApiError(400, "All fields are required");
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          fullName,
        },
      },
      { new: true }
    ).select("-password -watchHistory");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return res
      .status(200)
      .json(
        new ApiResponse<UserResponse>(
          200,
          user,
          "Account details updated sucessfully"
        )
      );
  }
);

const updateAvatar = asyncHandler(
  async (req: AuthTypedRequest, res: Response) => {
    const avatarLocalFile = req.file?.path;

    if (!avatarLocalFile) throw new ApiError(400, "Avatar image is required.");

    const user = await User.findById(req.user?._id).select(
      "+avatar.publicId -password -watchHistory"
    );

    if (!user) throw new ApiError(404, "User not found");

    const avatar = await uploadFile(avatarLocalFile, user.avatar.publicId);

    if (!avatar || !avatar.url) {
      throw new ApiError(500, "Error while uploading avatar image");
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          "avatar.url": avatar.url,
          "avatar.publicId": avatar.public_id,
        },
      },
      { new: true }
    ).select("-password -watchHistory");

    if (!updatedUser) throw new ApiError(404, "User not found");

    return res
      .status(200)
      .json(
        new ApiResponse<UserResponse>(
          200,
          updatedUser,
          "Avatar updated successfully"
        )
      );
  }
);

const updateCoverImage = asyncHandler(
  async (req: AuthTypedRequest, res: Response) => {
    const coverImageLocalFile = req.file?.path;

    if (!coverImageLocalFile)
      throw new ApiError(400, "Cover image is required.");

    const user = await User.findById(req.user?._id).select(
      "+coverImage.publicId -password"
    );

    if (!user) throw new ApiError(404, "User not found");

    const coverImage = await uploadFile(
      coverImageLocalFile,
      user.coverImage!.publicId
    );

    if (!coverImage || !coverImage.url) {
      throw new ApiError(500, "Error while uploading cover image");
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          "coverImage.url": coverImage.url,
          "coverImage.publicId": coverImage.public_id,
        },
      },
      { new: true }
    ).select("-password -watchHistory");

    if (!updatedUser) throw new ApiError(404, "User not found");

    return res
      .status(200)
      .json(
        new ApiResponse<UserResponse>(
          200,
          updatedUser,
          "Cover Imae updated successfully"
        )
      );
  }
);

const getUserChannelProfile = asyncHandler(
  async (req: AuthTypedRequest<null, null, { username: string }>, res) => {
    const { username } = req.params;

    if (!username?.trim()) throw new ApiError(400, "Not a valid username");

    const channel = await User.aggregate([
      {
        $match: { username: username?.toLowerCase() },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "channel",
          as: "subscribers",
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "subscriber",
          as: "subscribedTo",
        },
      },
      {
        $addFields: {
          subscribersCount: {
            $size: "$subscribers",
          },
          channelsSubscribedToCount: {
            $size: "$subscribedTo",
          },
          isSubscribed: {
            $cond: {
              if: {
                $in: [
                  req.user?._id
                    ? new mongoose.Types.ObjectId(req.user._id)
                    : null,
                  "$subscribers.subscriber",
                ],
              },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $project: {
          fullName: 1,
          username: 1,
          subscribersCount: 1,
          channelsSubscribedToCount: 1,
          isSubscribed: 1,
          avatar: 1,
          coverImage: 1,
          email: 1,
        },
      },
    ]);

    if (!channel?.length) throw new ApiError(404, "Channel does not exists!");

    return res
      .status(200)
      .json(
        new ApiResponse<ChannelProfileResponse>(
          200,
          channel[0],
          "User channel fetched sucessfully!"
        )
      );
  }
);

const getWatchHistory = asyncHandler(async (req: AuthTypedRequest, res) => {
  const user = await User.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(req.user!._id) },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
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
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  if (!user || !user[0].watchHistory) {
    throw new ApiError(
      500,
      "OOPS! Something went wrong while fetching watch history."
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched sucessfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  changeCurrentPassword,
  updateDetails,
  updateAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
