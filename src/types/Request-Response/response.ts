import type { Types } from "mongoose";

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
