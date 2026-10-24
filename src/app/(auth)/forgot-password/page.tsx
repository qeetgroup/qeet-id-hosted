import { ForgotPasswordPage } from "@/modules/recovery/components/forgot-password-page";

// Reached from sign-in, carrying the same return_to.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>;
}) {
  const { return_to } = await searchParams;
  return <ForgotPasswordPage returnTo={return_to ?? ""} />;
}
