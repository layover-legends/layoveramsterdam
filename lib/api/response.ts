/** Standard v1 API response envelope used by all /api/v1/* routes. */
export type ApiResponse<T = unknown> =
  | { data: T; error: null; status: number }
  | { data: null; error: string; status: number };

export function ok<T>(data: T, status = 200): ApiResponse<T> {
  return { data, error: null, status };
}

export function err(error: string, status = 400): ApiResponse<never> {
  return { data: null, error, status };
}

export function jsonOk<T>(data: T, status = 200): Response {
  return Response.json(ok(data, status), { status });
}

export function jsonErr(error: string, status = 400): Response {
  return Response.json(err(error, status), { status });
}
