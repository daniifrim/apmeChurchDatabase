import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Next.js API Request interface (compatibility layer)
 */
export interface NextApiRequest extends IncomingMessage {
  query: {
    [key: string]: string | string[];
  };
  cookies: {
    [key: string]: string;
  };
  body: any;
  method?: string;
  headers: IncomingMessage['headers'];
}

/**
 * Next.js API Response interface (compatibility layer)
 */
export interface NextApiResponse<T = any> extends ServerResponse {
  status(statusCode: number): NextApiResponse<T>;
  json(body: T): NextApiResponse<T>;
  send(body: T): NextApiResponse<T>;
  end(chunk?: any): NextApiResponse<T>;
  setHeader(name: string, value: string | number | readonly string[]): NextApiResponse<T>;
}

/**
 * API Handler type for serverless functions
 */
export type ApiHandler<T = any> = (
  req: NextApiRequest,
  res: NextApiResponse<T>
) => void | Promise<void>;

/**
 * Authenticated API Handler type
 */
export type AuthenticatedApiHandler<T = any> = (
  req: NextApiRequest & { user: import('./auth').JWTPayload },
  res: NextApiResponse<T>
) => void | Promise<void>;