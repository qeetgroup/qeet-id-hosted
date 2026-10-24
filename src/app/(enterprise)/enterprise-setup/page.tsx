import { EnterpriseSetupPage } from "@/modules/enterprise-setup/components/enterprise-setup-page";

// An external IT administrator, invited without a Qeet ID account, configures
// their organisation's SAML or SCIM here. The link carries a one-time token in
// its fragment, which only the browser reads (see EnterpriseSetupPage).
export default function Page() {
  return <EnterpriseSetupPage />;
}
