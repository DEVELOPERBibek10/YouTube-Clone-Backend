import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import type { NextFunction, Response } from "express";
import type { DecodedToken } from "../types/Auth/auth.js";
import type { AuthTypedRequest } from "../types/Auth/auth.js";

export const verifyJWT = asyncHandler(
  async (req: AuthTypedRequest, res: Response, next: NextFunction) => {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET!
    ) as DecodedToken;

    const user = await User.findById(decodedToken._id);

    if (!user) {
      throw new ApiError(401, "Invalid Access Token!");
    }

    req.user = user;

    next();
  }
);
