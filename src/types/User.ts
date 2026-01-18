import type mongoose from "mongoose";
import { Document, Model } from "mongoose";

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
  _id: string;
  username: string;
  email: string;
  fullName: string;
  avatar: {
    url: string;
  };
  coverImage?: {
    url: string;
  };
  watchHistory: string[] | [];
  createdAt: Date;
  updatedAt: Date;
}

export type UserModel = Model<IUserDocument, {}, IUserMethods>;
