import { v2 as cloudinary } from "cloudinary";
import type {
  UploadApiResponse,
  UploadApiOptions,
  DeleteApiResponse,
} from "cloudinary";
import fs from "fs";
import { ApiError } from "./ApiError.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadFile = async (
  localFilePath: string,
  publicId: string | null = null
): Promise<UploadApiResponse> => {
  const options: UploadApiOptions = {
    invalidate: true,
    secure: true,
    resource_type: "image",
    overwrite: false,
  };

  if (publicId) {
    options.public_id = publicId;
    options.overwrite = true;
  }

  if (!localFilePath) {
    console.error("CLOUDINARY ERROR: Local file path is required");
    throw new ApiError(
      400,
      "MISSING_FILE_PATH",
      "File path is required for upload"
    );
  }
  try {
    const response = await cloudinary.uploader.upload(localFilePath, options);

    if (!response || !response.public_id) {
      throw new ApiError(
        500,
        "STORAGE_LOGIC_ERROR",
        "Cloudinary upload failed: Missing response data"
      );
    }

    return response as UploadApiResponse;
  } catch (error: any) {
    console.error("CLOUDINARY ERROR:", error);

    if (error instanceof ApiError) throw error;
    if (!error.http_code) {
      throw new ApiError(
        503,
        "NETWORK_ERROR",
        "Could not connect to Cloudinary. Check your network."
      );
    }

    if (error.http_code === 401 || error.http_code === 403) {
      throw new ApiError(
        500,
        "Cloudinary authentication failed. Check API keys.",
        "AUTH_ERROR"
      );
    }

    if (error.http_code === 400) {
      throw new ApiError(
        400,
        `Cloudinary Upload Rejected: ${error.message}`,
        "INVALID_UPLOAD_PARAMS"
      );
    }
    if (error.http_code >= 500) {
      throw new ApiError(
        502,
        "Cloudinary servers are experiencing issues.",
        "EXT_STORAGE_DOWN"
      );
    }
    throw new ApiError(
      error.http_code || 500,
      "INTERNAL_SERVER_ERROR",
      error.message || "Unknown Upload Error"
    );
  } finally {
    if (fs.existsSync(localFilePath)) {
      try {
        await fs.promises.unlink(localFilePath);
      } catch (err) {
        console.error("Cleanup Error (Local file removal failed):", err);
      }
    }
  }
};

const deleteFile = async (publicId: string, resourceType: string = "image") => {
  try {
    const response = (await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    })) as any;

    return response;
  } catch (error: any) {
    if (!error.http_code || error.http_code >= 500) {
      throw new ApiError(
        502,
        "STORAGE_SERVICE_UNAVAILABLE",
        "Cloudinary is unreachable. Deletion aborted."
      );
    }
    if (error.http_code === 400 || error.http_code === 401) {
      throw new ApiError(
        400,
        "INVALID_DELETE_REQ",
        `Cloudinary Delete Failed: ${error.message}`
      );
    }
    throw new ApiError(
      500,
      "INTERNAL_SERVER_ERROR",
      error.message || "Unknown Deletion Error"
    );
  }
};

export { uploadFile, deleteFile };
