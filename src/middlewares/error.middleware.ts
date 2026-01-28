import type { NextFunction, Request, Response } from "express";
import type { GlobalError } from "../types/Error/GobalError.js";
import type { Error as MongooseError } from "mongoose";

const globalErrorHandler = (
  err: GlobalError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let errors: any[] = [];

  if ("statusCode" in err && err.statusCode) {
    statusCode = err.statusCode;
    message = err.message;
    errors = "errors" in err && err.errors ? err.errors : [];
  }

  if (err.name === "ValidationError" && "errors" in err) {
    statusCode = 400;
    message = "Validation Failed";
    const validationErrors =
      err.errors as MongooseError.ValidationError["errors"];
    errors = Object.values(validationErrors).map((el) => el.message);
  }

  if ("code" in err && err.code === 11000 && "keyValue" in err) {
    statusCode = 409;
    const duplicatedField = Object.keys(err.keyValue).join(", ");
    message = `Duplicate value for field(s): ${duplicatedField}`;
  }

  if (err.name === "JsonWebTokenError") {
    message = "Invalid token. Please log in again.";
    statusCode = 401;
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Your session has expired. Please log in again.";
  }

  if (err.name === "CastError" && "path" in err) {
    statusCode = 400;
    message = `Invalid resource identifier: ${err.path}`;
  }

  if (
    ("type" in err && err.type === "entity.parse.failed") ||
    err.message.includes("JSON")
  ) {
    statusCode = 400;
    message = "Invalid JSON body provided";
  }

  return res.status(statusCode).json({
    success: false,
    message: message,
    errors: errors,
    data: null,
    stack: process.env.NODE_ENV === "development" ? err.stack : null,
  });
};

export default globalErrorHandler;
