import { Document, Types } from "mongoose";

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
  watchHistory: Types.ObjectId[] | [];
  password: string;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserRequest extends Omit<
  IUser,
  "watchHistory" | "avatar.publicId" | "coverImage.publicId"
> {
  _id: Types.ObjectId;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface LoggedInUserResponse {
  user: UserResponse;
  accessToken: string;
}

export interface ChannelProfileResponse extends UserResponse {
  subscribersCount: number;
  channelsSubscribedToCount: number;
  isSubscribed: boolean;
}
