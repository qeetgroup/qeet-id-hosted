// What the server sends or accepts that its API documents leave out, keyed `METHOD path`. Each entry
// names the server code that shows it, is reported for the document, and goes once the document has
// it; `bun run contract:check` prints how many are left. Never add a field the server lacks.
//
// None today: the documents describe everything the hosted pages read and send.

/**
 * Per operation: `answer` fields its success answer also carries, `alsoAnswers` a success answer
 * the document doesn't list at all, `body` fields it accepts, and `partial` when the server takes
 * any part of a body the document lists in full. For example:
 *
 *   "DELETE /v1/auth/session": { alsoAnswers: { frontchannel_logout_uris?: string[] } };
 */
export type Undocumented = Record<never, never>;
