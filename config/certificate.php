<?php

/**
 * Application configuration for the certificate platform.
 *
 * Everything an operator may need to change lives here or in .env — no view,
 * controller or service hard-codes a brand name, a domain or an upload rule.
 */
return [
    'app_name' => env('APP_NAME', 'Certificate'),
    'tagline' => 'Certificate & document submission portal',
    'support_email' => env('SUPPORT_EMAIL', 'support@certificate.local'),

    /*
     * Organisation printed on generated certificates. Nothing is branded by
     * default: while the name is empty, certificates are stamped as
     * unconfigured so a placeholder cannot be mistaken for a real document.
     */
    'organisation' => [
        'name' => env('ORGANISATION_NAME', ''),
        'address' => env('ORGANISATION_ADDRESS', ''),
        'website' => env('ORGANISATION_WEBSITE', ''),
    ],

    /*
     * Named in the privacy-consent sentence. Left neutral until the client
     * confirms which brand may be displayed.
     */
    'privacy' => [
        'organisation_name' => env('PRIVACY_ORGANISATION_NAME', 'our organisation'),
        'policy_url' => env('PRIVACY_POLICY_URL', ''),
    ],

    /*
     * Uploads: one PDF, or several documents in one ZIP.
     *
     * The extension list and the magic-byte check are authoritative; the MIME
     * type a browser reports is only a first-pass filter, because both the
     * filename and the declared type are attacker-controlled.
     */
    'uploads' => [
        'max_bytes' => (int) env('MAX_UPLOAD_SIZE_BYTES', 20 * 1024 * 1024),
        'extensions' => ['pdf', 'zip'],
        'accept_attribute' => '.pdf,.zip,application/pdf,application/zip',
        'help_text' => 'Single documents as pdf files, multiple documents in a single zip file, '
            . 'maximum file size 20MB. For files exceeding 20MB, complete and submit the form '
            . 'without an attachment, and we will contact you.',
    ],

    /*
     * How much of the applicant's name the public status page reveals.
     * masked (default) -> "MAMTA S."   full -> "MAMTA SAINI"   hidden -> omitted
     */
    'status_applicant_name' => env('STATUS_APPLICANT_NAME', 'masked'),

    /*
     * Locations offered by the request form. Static because there is no
     * requirement to manage them at runtime; moving this to a table later
     * would not affect anything that reads it.
     */
    'locations' => [
        'Australia', 'Bangladesh', 'Brazil', 'Canada', 'China', 'France',
        'Germany', 'Hong Kong SAR, China', 'India', 'Indonesia', 'Italy',
        'Japan', 'Malaysia', 'Mexico', 'Netherlands', 'Pakistan',
        'Philippines', 'Poland', 'Singapore', 'South Africa', 'South Korea',
        'Spain', 'Sri Lanka', 'Switzerland', 'Taiwan, China', 'Thailand',
        'Turkey', 'United Arab Emirates', 'United Kingdom', 'United States',
        'Vietnam', 'Other',
    ],

    /* Message shown when a record says complete but no certificate exists. */
    'awaiting_certificate_message' =>
        'Your request has been approved and your certificate is being prepared. '
        . 'Please check back shortly.',
];
