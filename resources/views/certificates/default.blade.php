{{--
    Default certificate design.

    Deliberately unbranded: no logo, no client wording, no claim of
    accreditation. It states what the submission actually contained and who
    issued it, and nothing more. When the client confirms their branding, add a
    NEW template and point new certificates at its key, so certificates already
    issued under `default` keep rendering as they were.

    Everything shown comes from the frozen snapshot passed in — this template
    never reads the database, the filesystem or the environment. That is what
    makes re-rendering an old certificate reproduce the original document.
--}}
@php
    $s = $snapshot['submission'];
    $org = $snapshot['organisation'];
    $name = trim(($s['firstName'] ?? '') . ' ' . ($s['lastName'] ?? '')) ?: ($s['applicantName'] ?? '—');
    $dash = fn ($v) => trim((string) $v) !== '' ? $v : '—';
@endphp
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    @page { margin: 28pt; }
    body { font-family: sans-serif; color: #101828; font-size: 10pt; }
    .frame { border: 1.5pt solid #d0d5dd; padding: 20pt 26pt; }
    .org { color: #1d43f5; font-size: 9pt; font-weight: bold; letter-spacing: 1.4pt; text-align: center; }
    h1 { font-size: 26pt; font-weight: normal; text-align: center; margin: 12pt 0 6pt; }
    .lede { color: #475467; font-size: 10pt; text-align: center; margin: 0 0 14pt; }
    .certno { color: #1d43f5; font-size: 15pt; font-weight: bold; letter-spacing: 1.2pt; text-align: center; margin-bottom: 14pt; }
    hr { border: none; border-top: 0.75pt solid #d0d5dd; margin: 0 0 16pt; }
    .label { color: #667085; font-size: 7.5pt; letter-spacing: 0.6pt; text-transform: uppercase; }
    .value { color: #101828; font-size: 10.5pt; font-weight: bold; margin-bottom: 11pt; }
    td { vertical-align: top; }
    .qr { text-align: center; }
    .qr img { width: 92pt; height: 92pt; }  /* attributes below are what mPDF actually uses */
    .qr-caption { color: #667085; font-size: 7pt; margin-top: 4pt; }
    .footer { margin-top: 14pt; }
    .contact { color: #667085; font-size: 7pt; text-align: center; margin-top: 8pt; }
</style>
</head>
<body>
<div class="frame">

    <div class="org">{{ mb_strtoupper($org['name'] ?? '') }}</div>
    <h1>Certificate of Submission</h1>
    <p class="lede">This certifies that the document submission described below was received and verified.</p>
    <div class="certno">{{ $snapshot['certificateNo'] }}</div>
    <hr>

    {{-- Details in two columns; the QR sits in its own column so it can never
         overlap the text. --}}
    <table width="100%">
        <tr>
            <td width="42%">
                <div class="label">Applicant name</div><div class="value">{{ $dash($name) }}</div>
                <div class="label">Email</div><div class="value">{{ $dash($s['email'] ?? null) }}</div>
                <div class="label">Company</div><div class="value">{{ $dash($s['companyName'] ?? null) }}</div>
            </td>
            <td width="34%">
                <div class="label">Job title</div><div class="value">{{ $dash($s['jobTitle'] ?? null) }}</div>
                <div class="label">Location</div><div class="value">{{ $dash($s['location'] ?? null) }}</div>
                <div class="label">Reference number</div><div class="value">{{ $dash($s['referenceNo'] ?? null) }}</div>
            </td>
            <td width="24%" class="qr">
                <img src="{{ $qrDataUri }}" width="122" height="122" alt="">
                <div class="qr-caption">Scan to verify certificate</div>
            </td>
        </tr>
    </table>

    @if (trim((string) ($s['comments'] ?? '')) !== '')
        <div class="label">Request details</div>
        <div class="value">{{ \Illuminate\Support\Str::limit(trim($s['comments']), 400) }}</div>
    @endif

    @if (! empty($s['documents']))
        <div class="label">Documents submitted</div>
        <div class="value">{{ collect($s['documents'])->pluck('originalName')->implode(', ') }}</div>
    @endif

    <div class="footer">
        <hr>
        <table width="100%">
            <tr>
                <td width="50%">
                    <div class="label">Date of issue</div>
                    <div class="value">{{ $issueDate }}</div>
                </td>
                <td width="50%">
                    <div class="label">Issued by</div>
                    <div class="value">{{ ($snapshot['issuedBy']['name'] ?? '—') . ', ' . ($org['name'] ?? '') }}</div>
                </td>
            </tr>
        </table>
        @php
            $contact = collect([$org['address'] ?? '', $org['website'] ?? ''])
                ->map(fn ($p) => trim((string) $p))->filter()->implode('  ·  ');
        @endphp
        @if ($contact)
            <div class="contact">{{ $contact }}</div>
        @endif
    </div>

</div>

{{-- The unconfigured-deployment stamp is applied by the renderer using mPDF's
     native watermark: CSS rotation and opacity are not supported here, and a
     solid overlay would obscure the certificate data. --}}
</body>
</html>
