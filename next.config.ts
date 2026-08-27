import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * pdfkit loads its built-in font metrics (.afm files) from its own package
   * directory at runtime. Bundling it would break those reads, so it is kept
   * external and required from node_modules on the server instead.
   */
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
