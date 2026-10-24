import { ResetPasswordPage } from "@/modules/recovery/components/reset-password-page";

// The emailed reset link carries the opaque token and, when the reset started
// on the way into an application, that application's return_to.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; return_to?: string }>;
}) {
  const { token, return_to } = await searchParams;
  return <ResetPasswordPage token={token ?? ""} returnTo={return_to ?? ""} />;
}
