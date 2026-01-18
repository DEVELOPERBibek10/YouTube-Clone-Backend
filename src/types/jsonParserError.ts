export interface JsonParseError extends SyntaxError {
  type?: string;
  body?: string;
}
