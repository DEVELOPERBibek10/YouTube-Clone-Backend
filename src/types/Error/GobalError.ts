import type { Error as MongooseError } from "mongoose";
import type { MongoDuplicateKeyError } from "./mongooseError.js";
import type { JsonParseError } from "./jsonParserError.js";
import type { MulterError } from "multer";
import type { ApiError } from "../../utils/ApiError.js";

export type GlobalError =
  | ApiError
  | MongooseError.ValidationError
  | MongoDuplicateKeyError
  | MongooseError.CastError
  | MulterError
  | JsonParseError
  | Error;
