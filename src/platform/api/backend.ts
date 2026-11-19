// The hosted app's typed calls to Qeet ID. Each names a path as the contract writes it, with its
// placeholders filled from `path`, so a path, method, parameter, body or answer field the server's
// documents don't have fails the typecheck. Every call leaves through request() in client.ts.

import { type Method, type RequestOptions, request } from "@/platform/api/client";
import type {
  CallArgs,
  CallResult,
  Extra,
  HttpMethod,
  Operation,
  PathsFor,
} from "@/platform/api/contract";

type Query = Record<string, string | number | boolean | undefined | null>;

type RawOptions = Omit<RequestOptions, "query"> & {
  path?: Record<string, string | number>;
  query?: Query;
};

/** Returns the path with each `{name}` replaced by its encoded value; throws when one is missing. */
export function fillPath(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{([^{}]+)\}/g, (_, name: string) => {
    const value = values[name];
    if (value === undefined || value === "") {
      throw new Error(`No value for {${name}} in ${template}`);
    }
    return encodeURIComponent(String(value));
  });
}

// The query as the server parses it: absent values left out, a boolean as its word.
function queryOf(query: Query | undefined): Record<string, string> | undefined {
  if (!query) return undefined;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    out[key] = String(value);
  }
  return out;
}

function send(method: HttpMethod, template: string, options: RawOptions = {}) {
  const { path, query, ...rest } = options;
  return request(method.toUpperCase() as Method, fillPath(template, path), {
    ...rest,
    query: queryOf(query),
  });
}

type Caller<M extends HttpMethod> = <P extends PathsFor<M>>(
  path: P,
  ...args: CallArgs<Operation<P, M>, Extra<P, M>>
) => Promise<CallResult<Operation<P, M>, Extra<P, M>>>;

function caller<M extends HttpMethod>(method: M): Caller<M> {
  return ((path: string, options?: RawOptions) => send(method, path, options)) as Caller<M>;
}

/** Calls Qeet ID by its contract: `backend.post("/v1/auth/session", { body: { … } })`. */
export const backend = {
  get: caller("get"),
  post: caller("post"),
  put: caller("put"),
  patch: caller("patch"),
  delete: caller("delete"),
};
