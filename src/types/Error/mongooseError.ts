import type { Error as MongooseError } from "mongoose";

export interface ApiError extends Error {
  statusCode?: number;
  errors?: any[];
  success?: boolean;
}

export interface MongoDuplicateKeyError extends MongooseError {
  code: number;
  keyValue: Record<string, any>;
}
