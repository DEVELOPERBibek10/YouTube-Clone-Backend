import type { JwtPayload } from "jsonwebtoken";
import type { IUser, IUserDocument, IUserRequest } from "../Model/User.js";
import type { ParamsDictionary } from "express-serve-static-core";
import type { Request } from "express";

export interface DecodedToken extends JwtPayload {
  _id: string;
  email: string;
  username: string;
  fullName: string;
}

export interface AuthFileRequest extends Request {
  user?: IUserDocument;
  file?: Express.Multer.File;
  files?: Express.Multer.File[];
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
> extends Omit<Request, "body" | "files" | "params"> {
  user?: IUserRequest;
  body: TBody;
  params: TParams;
  files?: TFile | undefined;
}

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

export interface VideoRequestBody {}
