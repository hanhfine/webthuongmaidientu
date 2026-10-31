export class AppError extends Error {
  constructor(status, code, message, fieldErrors) {
    super(message);
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export function conflictIfDuplicate(err, message) {
  return err?.code === 11000 ? new AppError(409, 'DUPLICATE', message) : err;
}
