// An identity provider's SAML metadata, read in the browser (as the console does): its entity ID,
// the sign-in address it takes requests at and its signing certificate, so nothing is copied by
// hand. Nothing is sent anywhere until the person saves the connection.

export type IdpMetadata = { entityId: string; ssoUrl: string; certificate: string };

const MD = "urn:oasis:names:tc:SAML:2.0:metadata";
const DS = "http://www.w3.org/2000/09/xmldsig#";
// The HTTP-Redirect binding first, as Qeet ID sends its requests that way; then HTTP-POST.
const BINDINGS = [
  "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
  "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
];

/** Reads an IdP metadata document; null when it isn't one. */
export function parseIdpMetadata(xml: string): IdpMetadata | null {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) return null;
  const entity = doc.getElementsByTagNameNS(MD, "EntityDescriptor")[0];
  const idp = doc.getElementsByTagNameNS(MD, "IDPSSODescriptor")[0];
  if (!entity || !idp) return null;
  const services = [...idp.getElementsByTagNameNS(MD, "SingleSignOnService")];
  const service =
    BINDINGS.map((b) => services.find((s) => s.getAttribute("Binding") === b)).find(Boolean) ??
    services[0];
  const keys = [...idp.getElementsByTagNameNS(MD, "KeyDescriptor")];
  const signing = keys.find((k) => (k.getAttribute("use") ?? "signing") === "signing") ?? keys[0];
  const certificate = signing?.getElementsByTagNameNS(DS, "X509Certificate")[0]?.textContent ?? "";
  const entityId = entity.getAttribute("entityID") ?? "";
  const ssoUrl = service?.getAttribute("Location") ?? "";
  if (!entityId || !ssoUrl || !certificate.trim()) return null;
  return { entityId, ssoUrl, certificate: certificate.replace(/\s+/g, "") };
}
