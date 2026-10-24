import { SignUpPage } from "@/modules/authentication/components/sign-up/sign-up-page";

// Reached from sign-in, carrying the same return_to.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>;
}) {
  const { return_to } = await searchParams;
  return <SignUpPage returnTo={return_to ?? ""} />;
}
