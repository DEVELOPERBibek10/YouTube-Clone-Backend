import { ApiError } from "../utils/ApiError.js";

// Internal function to check the error type and convert to ApiError
const globalErrorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return err;
  }

  let statusCode = 500;
  let message = "Internal Server Error";
  let errors = [];

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation Failed";
    errors = Object.values(err.errors).map((el) => el.message);
  }

  if (err.code === 11000) {
    statusCode = 409;
    const duplicatedField = Object.keys(err.keyValue).join(", ");
    message = `Duplicate value for field(s): ${duplicatedField}.`;
  }

  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid resource identifier: ${err.path}`;
  }

  if (err.type === "entity.parse.failed" || err.message.includes("JSON")) {
    statusCode = 400;
    message = "Invalid JSON body provided.";
  }

  if (err.name && err.message) {
    message = err.message;
  }

  return res
    .status(statusCode)
    .json(new ApiError(statusCode, message, errors, err.stack || null));
};

export default globalErrorHandler;
