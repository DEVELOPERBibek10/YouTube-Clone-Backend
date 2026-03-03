import type { ParamsDictionary } from "express-serve-static-core";
import type { Request } from "express";
import type { UserResponse } from "./response.js";
import type { ParsedQs } from "qs";

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
  TFile = Express.Multer.File | Express.Multer.File[],
  TParams = ParamsDictionary,
  TQuery = ParsedQs,
> extends Omit<Request, "body" | "files" | "params" | "query"> {
  body: TBody;
  user: UserRequest;
  params: TParams;
  query: TQuery;
  files?: TFile;
}
