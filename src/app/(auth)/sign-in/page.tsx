import { SignInPage } from "@/modules/authentication/components/sign-in/sign-in-page";

// The authorize flow sends a person here with the URL to return to; a social
// sign-in that failed comes back with an error code.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string; error?: string }>;
}) {
  const { return_to, error } = await searchParams;
  return <SignInPage returnTo={return_to ?? ""} errorCode={error ?? ""} />;
}
