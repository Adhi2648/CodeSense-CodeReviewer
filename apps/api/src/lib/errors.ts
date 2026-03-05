export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  public constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}
