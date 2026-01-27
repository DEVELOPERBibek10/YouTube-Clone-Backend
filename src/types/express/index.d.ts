import type { UserRequest } from "../Request-Response/request.ts";

declare global {
  namespace Express {
    interface Request {
      user: UserRequest;
    }
  }
}
