// Fields a page relies on that the contract leaves optional although the server always sends them
// (its Go struct has no `omitempty`). Naming them here checks them at runtime, failing closed with
// `client.schema_mismatch` if one is missing, and makes them required in the type. Each use is
// server evidence for the document: once it marks the field required, the call can go.

import { ApiError } from "./client";

/** T with the fields K always there and never null. */
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: NonNullable<T[P]> };

function mismatch(): ApiError {
  return new ApiError(502, "client.schema_mismatch", "The server's answer was incomplete.");
}

/** Returns the record with `fields` checked present; throws `client.schema_mismatch` otherwise. */
export function assured<T extends object, K extends keyof T>(
  record: T,
  ...fields: K[]
): WithRequired<T, K> {
  for (const field of fields) {
    if (record[field] === undefined || record[field] === null) throw mismatch();
  }
  return record as WithRequired<T, K>;
}

/** Returns each record of a list with `fields` checked present, as `assured` does. */
export function assuredItems<T extends object, K extends keyof T>(
  list: readonly T[] | undefined,
  ...fields: K[]
): WithRequired<T, K>[] {
  return (list ?? []).map((record) => assured(record, ...fields));
}
