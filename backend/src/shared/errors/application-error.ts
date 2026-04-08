export type ApplicationErrorDetailsValue = string | number | boolean | null;
export type ApplicationErrorDetails = Record<string, ApplicationErrorDetailsValue>;

export abstract class ApplicationError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: ApplicationErrorDetails | null;

  protected constructor(
    message: string,
    statusCode: number,
    code: string,
    details: ApplicationErrorDetails | null = null,
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

