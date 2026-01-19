export interface apiError extends Error {
  statusCode?: number;
  errors?: any[];
  success?: boolean;
}
