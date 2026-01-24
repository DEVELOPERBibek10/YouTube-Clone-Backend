import type { ParamsDictionary } from "express-serve-static-core";
import type { Request } from "express";
import type { Types } from "mongoose";
import type { UserResponse } from "./response.js";

export interface IUserRequest {
  _id: Types.ObjectId;
}

export interface TypedRequest<
  TBody = any,
  TFiles = any,
  TParams = ParamsDictionary,
> extends Omit<Request, "body" | "files" | "params"> {
  body: TBody;
  params: TParams;
  files?: TFiles;
}

export interface AuthTypedRequest<
  TBody = any,
  TFile = any,
  TParams = ParamsDictionary,
  TUser = IUserRequest,
> extends Omit<Request, "body" | "files" | "params"> {
  user?: TUser;
  body: TBody;
  params: TParams;
  files?: TFile | undefined;
}

export interface UserRequest extends UserResponse {}

export interface RegisterUserBody {
  fullName: string;
  email: string;
  username: string;
  password: string;
}

export interface LoginUserBody {
  email: string;
  password: string;
}

export interface VideoRequestBody {
  title: string;
  description: string;
  owner: string;
  isPublished: boolean;
  videoUrl: string;
  videoPublicId: string;
  duration: number;
}
