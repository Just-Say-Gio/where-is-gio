import { NextRequest } from "next/server";
import { logApiCall } from "./analytics";

type Handler = (
  req: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<Response>;

/**
 * Wraps an API route handler to automatically log the call.
 * Usage: export const GET = withApiLogging("/api/segments", handler);
 */
export function withApiLogging(path: string, handler: Handler): Handler {
  return async (req, context) => {
    const start = Date.now();
    let statusCode: number | undefined;
    let error: string | undefined;

    try {
      const response = await handler(req, context);
      statusCode = response.status;
      return response;
    } catch (err) {
      statusCode = 500;
      error = err instanceof Error ? err.message : "Unknown error";
      throw err;
    } finally {
      logApiCall({
        method: req.method,
        path,
        statusCode,
        durationMs: Date.now() - start,
        error,
        headers: req.headers,
      });
    }
  };
}
