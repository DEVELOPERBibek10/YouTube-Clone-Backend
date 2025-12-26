import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { deleteFile, uploadFile } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Unable to generate refresh and access token !");
  }
};

const registerUser = asyncHandler(async (req, res) => {
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
      coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar field is required");
    }

    avatar = await uploadFile(avatarLocalPath);
    coverImage = await uploadFile(coverImageLocalPath);

    if (!avatar) {
      throw new ApiError(400, "Avatar field is required");
    }

    const user = await User.create({
      fullName,
      avatar: {
        url: avatar.url,
        publicId: avatar.public_id,
      },
      coverImage: {
        url: coverImage?.url || "",
        publicId: coverImage?.public_id || "",
      },
      email: email.toLowerCase(),
      password,
      username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select("-password");

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
      .json(new ApiResponse(201, createdUser, "User registered sucessfully!"));
  } catch (error) {
    if (avatar?.public_id) {
      await deleteFile(avatar.public_id);
    }
    if (coverImage?.public_id) {
      await deleteFile(coverImage.public_id);
    }
    throw error;
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User does not exist!");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password !");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select("-password");

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
        },
        "User loggedIn successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findOneAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incommingRefreshToken =
    req.cookie.refreshToken || req.body.refreshToken;

  if (!incommingRefreshToken) {
    throw new ApiError(401, "Invalid refresh token!");
  }
  try {
    const decodedToken = jwt.verify(
      incommingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token!");
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
          },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const {
    _id,
    avatar,
    coverImage,
    fullName,
    username,
    email,
    createdAt,
    updatedAt,
    watchHistory,
  } = req.user;
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        _id,
        avatar,
        coverImage,
        fullName,
        username,
        email,
        watchHistory,
        createdAt,
        updatedAt,
      },
      "Current user fetched successfully"
    )
  );
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?.id);

  if (!user) throw new ApiError(400, "User doesn't exist.");

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) throw new ApiError(400, "Invalid old password");

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully!"));
});

const updateDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated sucessfully"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalFile = req.file?.path;

  if (!avatarLocalFile) throw new ApiError(400, "Avatar image is required.");

  const user = await User.findById(req.user?._id).select("+avatar.publicId");

  if (!user) throw new ApiError(404, "User not found");

  const avatar = await uploadFile(avatarLocalFile, user.avatar.publicId);

  if (!avatar.url) {
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
  );

  if (!updatedUser) throw new ApiError(404, "User not found");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Avatar updated successfully"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalFile = req.file?.path;

  if (!coverImageLocalFile) throw new ApiError(400, "Cover image is required.");

  const user = await User.findById(req.user?._id).select(
    "+coverImage.publicId"
  );

  if (!user) throw new ApiError(404, "User not found");

  const coverImage = await uploadFile(
    coverImageLocalFile,
    user.coverImage.publicId
  );

  if (!coverImage.url) {
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
  );

  if (!updatedUser) throw new ApiError(404, "User not found");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Cover Imae updated successfully"));
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
};
