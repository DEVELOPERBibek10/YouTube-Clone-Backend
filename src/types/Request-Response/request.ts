import type { ParamsDictionary } from "express-serve-static-core";
import type { Request } from "express";
import type { UserResponse } from "./response.js";

export interface TypedRequest<
  TBody = any,
  TFiles = any,
  TParams = ParamsDictionary,
> extends Omit<Request, "body" | "files" | "params"> {
  body: TBody;
  params: TParams;
  files?: TFiles;
}

interface UserRequest extends UserResponse {}

export interface AuthTypedRequest<
  TBody = any,
  TFile = any,
  TParams = ParamsDictionary,
> extends Omit<Request, "body" | "files" | "params"> {
  body: TBody;
  params: TParams;
  user: UserRequest;
  files?: TFile | undefined;
}
