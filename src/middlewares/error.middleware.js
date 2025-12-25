import { ApiError } from "../utils/ApiError.js";

// Internal function to check the error type and convert to ApiError
const globalErrorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = err.errors || [];

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

  if (err.message) {
    message = err.message;
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
