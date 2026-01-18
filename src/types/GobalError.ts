import type { Error as MongooseError } from "mongoose";
import type { apiError } from "./apiError.js";
import type { MongoDuplicateKeyError } from "./mongooseError.js";
import type { JsonParseError } from "./jsonParserError.js";

export type GlobalError =
  | apiError
  | MongooseError.ValidationError
  | MongoDuplicateKeyError
  | MongooseError.CastError
  | JsonParseError
  | Error;
