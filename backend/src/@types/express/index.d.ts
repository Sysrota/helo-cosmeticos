declare namespace Express {
  export interface Request {
    rawBody?: string;

    user: {
      id: number;
      role: string;
    };
  }
}
