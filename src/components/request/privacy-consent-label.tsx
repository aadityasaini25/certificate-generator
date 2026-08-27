import { publicConfig } from "@/lib/public-config";

/**
 * Privacy-consent sentence.
 *
 * The organisation name and the policy URL both come from configuration — no
 * brand name is hard-coded, and no policy URL is invented. When the URL is not
 * yet known, the statement renders as plain text rather than a dead link.
 */
export function PrivacyConsentLabel() {
  const { organisationName, privacyPolicyUrl } = publicConfig;

  const statement = `${organisationName} Online Privacy Statement`;

  return (
    <>
      I agree that {organisationName} can use my data for the purposes of
      dealing with my request, in accordance with the{" "}
      {privacyPolicyUrl ? (
        <a
          href={privacyPolicyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800"
        >
          {statement}
        </a>
      ) : (
        <span className="font-medium text-ink">{statement}</span>
      )}
      .
    </>
  );
}
