// Extend Express Request to include userId from auth middleware
declare namespace Express {
  interface Request {
    userId?: string;
  }
}
