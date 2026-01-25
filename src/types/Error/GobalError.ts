import type { Error as MongooseError } from "mongoose";
import type { apiError } from "./apiError.js";
import type { MongoDuplicateKeyError } from "./mongooseError.js";
import type { JsonParseError } from "./jsonParserError.js";
import type { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

export type GlobalError =
  | apiError
  | MongooseError.ValidationError
  | MongoDuplicateKeyError
  | MongooseError.CastError
  | JsonParseError
  | TokenExpiredError
  | JsonWebTokenError
  | Error;
