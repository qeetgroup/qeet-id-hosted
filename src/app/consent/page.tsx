import { ConsentScreen } from "./consent-screen";

// The API sends the browser here with only the id of the authorization request
// it recorded. Everything shown and decided (the application, its branding,
// the scopes, where the browser goes next) comes from that recorded request,
// never from anything else in this address.
export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  return <ConsentScreen requestId={sp.request_id ?? ""} />;
}
