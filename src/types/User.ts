import type mongoose from "mongoose";
import { Document, Model, Types, type ObjectId } from "mongoose";
import type { UserInfo } from "os";

export interface IUser {
  username: string;
  email: string;
  fullName: string;
  avatar: {
    url: string;
    publicId: string;
  };
  coverImage?: {
    url: string;
    publicId: string;
  };
  watchHistory: mongoose.Types.ObjectId[] | [];
  password: string;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, IUserMethods, Document {}

export interface IUserMethods {
  isPasswordCorrect(password: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

export interface UserResponse {
  _id: string | Types.ObjectId;
  username: string;
  email: string;
  fullName: string;
  avatar: {
    url: string;
  };
  coverImage?: {
    url: string;
  };
  watchHistory: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LoggedInUserResponse {
  user: UserResponse;
  accessToken: String;
}

export interface ChannelProfileResponse extends UserResponse {
  subscribersCount: number;
  channelsSubscribedToCount: number;
  isSubscribed: boolean;
}

export type UserModel = Model<IUserDocument, {}, IUserMethods>;
