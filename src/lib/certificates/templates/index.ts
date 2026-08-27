import { defaultCertificateTemplate } from "./default";
import type { CertificateTemplate } from "./types";

/**
 * Template registry.
 *
 * `Certificate.templateKey` records which design produced a certificate, so an
 * old certificate always re-renders with the design it was issued under, even
 * after a new default is introduced.
 *
 * To add a design: create the module, import it, add it here. Nothing in the
 * generation service or the API routes needs to change.
 */

export const CERTIFICATE_TEMPLATES: Record<string, CertificateTemplate> = {
  [defaultCertificateTemplate.key]: defaultCertificateTemplate,
};

export const DEFAULT_TEMPLATE_KEY = defaultCertificateTemplate.key;

/** Returns null for an unknown key rather than silently substituting a design. */
export function getCertificateTemplate(
  key: string,
): CertificateTemplate | null {
  return CERTIFICATE_TEMPLATES[key] ?? null;
}

export type {
  CertificateRenderContext,
  CertificateTemplate,
} from "./types";
