import type { NextFunction, Request, Response } from "express";
import type { GlobalError } from "../types/Error/GobalError.js";
import { Error as MongooseError } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { MulterError } from "multer";

const globalErrorHandler = (
  err: GlobalError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let errors: any[] = [];
  let code = "INTERNAL_SERVER_ERROR";

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code || code;
    errors = err.errors;
  } else if (err instanceof MongooseError.ValidationError) {
    statusCode = 400;
    message = "Validation Failed";
    code = "VALIDATION_ERROR";
    errors = Object.values(err.errors).map((el) => el.message);
  } else if ("code" in err && err.code === 11000 && "keyValue" in err) {
    statusCode = 409;
    code = "DUPLICATE_KEY_ERROR";
    const duplicatedField = Object.keys((err as any).keyValue!).join(", ");
    message = `Duplicate value for field(s): ${duplicatedField}`;
  } else if (err instanceof MulterError) {
    statusCode = 400;
    code = "MULTER_ERROR";
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "File is too large. Max limit is 10MB.";
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = "Unexpected file field.";
    } else {
      message = err.message || "File upload error.";
    }
  } else if (err instanceof MongooseError.CastError) {
    statusCode = 400;
    code = "CAST_ERROR";
    message = `Invalid resource identifier: ${err.path}`;
  } else if (
    ("type" in err && err.type === "entity.parse.failed") ||
    err.message.includes("JSON")
  ) {
    statusCode = 400;
    code = "JSON_PARSE_ERROR";
    message = "Invalid JSON body provided";
  } else if (err instanceof Error) {
    message = err.message || message;
  }

  // Send response
  return res
    .status(statusCode)
    .json(
      new ApiError(
        statusCode,
        code,
        message,
        errors,
        process.env.NODE_ENV === "development" ? err.stack : undefined
      )
    );
};

export default globalErrorHandler;
