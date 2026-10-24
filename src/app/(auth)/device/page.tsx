import { DevicePage } from "@/modules/oauth/components/device-page";

// A TV or CLI shows the person this page and a user code to enter; a link may
// carry the code already.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  return <DevicePage userCode={sp.user_code ?? ""} />;
}
