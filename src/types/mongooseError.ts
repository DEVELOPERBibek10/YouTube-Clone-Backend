import type { Error as MongooseError } from "mongoose";

export interface ApiError extends Error {
  statusCode?: number;
  errors?: any[];
  success?: boolean;
}

export interface MongoDuplicateKeyError extends Error {
  code: number;
  keyValue: Record<string, any>;
}

export interface MongooseCastError extends MongooseError.CastError {
  path: string;
}
