import { MagicLinkPage } from "@/modules/authentication/components/magic-link/magic-link-page";

// The emailed sign-in link carries the one-time token and the return_to of the
// journey it was asked for from.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; return_to?: string }>;
}) {
  const { token, return_to } = await searchParams;
  return <MagicLinkPage token={token ?? ""} returnTo={return_to ?? ""} />;
}
