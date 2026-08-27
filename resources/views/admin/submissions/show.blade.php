@extends('layouts.admin')
@section('title', 'Submission ' . $submission->referenceNo)

@section('content')
@php
    $admin = auth('admin')->user();
    $canEdit = $admin->can(\App\Support\Permission::SUBMISSION_EDIT);
    $canDecide = $admin->can(\App\Support\Permission::SUBMISSION_DECIDE);
    $canGenerate = $admin->can(\App\Support\Permission::CERTIFICATE_GENERATE);
    $parts = $submission->nameParts();
    $cert = $submission->certificate;
    $dash = fn ($v) => trim((string) $v) !== '' ? $v : '—';
@endphp

<div class="space-y-6">
    <nav aria-label="Breadcrumb" class="text-sm">
        <ol class="flex flex-wrap items-center gap-1 text-ink-muted">
            <li><a href="{{ route('admin.dashboard') }}" class="hover:text-ink">Dashboard</a></li>
            <li aria-hidden="true">›</li>
            <li><a href="{{ route('admin.submissions.index') }}" class="hover:text-ink">Submissions</a></li>
            <li aria-hidden="true">›</li>
            <li aria-current="page" class="font-mono text-ink">{{ $submission->referenceNo }}</li>
        </ol>
    </nav>

    <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
            <div class="flex flex-wrap items-center gap-3">
                <h1 class="text-2xl font-semibold tracking-tight text-ink">{{ $submission->applicantName }}</h1>
                <x-ui.status-badge :status="$submission->status" />
            </div>
            <p class="mt-1.5 font-mono text-sm text-ink-muted">{{ $submission->referenceNo }}</p>
        </div>
        @if ($canEdit && $editable)
            <x-ui.button href="{{ route('admin.submissions.edit', $submission->getKey()) }}" variant="secondary">Edit submission</x-ui.button>
        @endif
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
        <div class="space-y-6 lg:col-span-2">
            <x-ui.card>
                <x-ui.card-header title="Applicant Information" />
                <x-ui.card-body>
                    <dl class="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                        @foreach ([
                            'First Name' => $parts['firstName'], 'Last Name' => $parts['lastName'],
                            'Email' => $submission->applicantEmail, 'Phone' => $submission->applicantPhone,
                        ] as $label => $value)
                            <div>
                                <dt class="text-xs font-medium uppercase tracking-wide text-ink-muted">{{ $label }}</dt>
                                <dd class="mt-1 text-sm text-ink">{{ $dash($value) }}</dd>
                            </div>
                        @endforeach
                    </dl>
                </x-ui.card-body>
            </x-ui.card>

            <x-ui.card>
                <x-ui.card-header title="Professional Information" />
                <x-ui.card-body>
                    <dl class="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                        <div>
                            <dt class="text-xs font-medium uppercase tracking-wide text-ink-muted">Company Name</dt>
                            <dd class="mt-1 text-sm text-ink">{{ $dash($submission->companyName) }}</dd>
                        </div>
                        <div>
                            <dt class="text-xs font-medium uppercase tracking-wide text-ink-muted">Job Title</dt>
                            <dd class="mt-1 text-sm text-ink">{{ $dash($submission->applicantDesignation) }}</dd>
                        </div>
                    </dl>
                </x-ui.card-body>
            </x-ui.card>

            <x-ui.card>
                <x-ui.card-header title="Request Information" />
                <x-ui.card-body>
                    <dl class="space-y-4">
                        <div>
                            <dt class="text-xs font-medium uppercase tracking-wide text-ink-muted">Location</dt>
                            <dd class="mt-1 text-sm text-ink">{{ $dash($submission->location) }}</dd>
                        </div>
                        <div>
                            <dt class="text-xs font-medium uppercase tracking-wide text-ink-muted">Comments</dt>
                            <dd class="mt-1 whitespace-pre-line text-sm text-ink">{{ $dash($submission->additionalNotes) }}</dd>
                        </div>
                    </dl>
                </x-ui.card-body>
            </x-ui.card>

            <x-ui.card>
                <x-ui.card-header title="Documents"
                    :description="$submission->documents->count() . ' file' . ($submission->documents->count() === 1 ? '' : 's') . ' attached.'" />
                <x-ui.card-body class="px-0 py-0 sm:px-0">
                    @forelse ($submission->documents as $doc)
                        <div class="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4 last:border-0 sm:px-6">
                            <div class="min-w-0 flex-1">
                                <p class="truncate text-sm font-medium text-ink">{{ $doc->originalName }}</p>
                                <p class="text-xs text-ink-muted">
                                    {{ $doc->mimeType === 'application/pdf' ? 'PDF' : 'ZIP archive' }}
                                    · {{ number_format($doc->sizeBytes / 1024, 1) }} KB
                                    · Uploaded {{ $doc->uploadedAt?->format('d M Y H:i') }}
                                </p>
                            </div>
                            <div class="flex items-center gap-1">
                                @if ($doc->mimeType === 'application/pdf')
                                    <a href="{{ route('admin.documents.show', $doc->getKey()) }}" target="_blank" rel="noopener noreferrer"
                                       class="rounded-control px-2.5 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50">View</a>
                                @endif
                                <a href="{{ route('admin.documents.show', $doc->getKey()) }}?download=1"
                                   class="rounded-control px-2.5 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-muted hover:text-ink">Download</a>
                            </div>
                        </div>
                    @empty
                        <p class="px-5 py-10 text-center text-sm text-ink-muted sm:px-6">This submission has no attached documents.</p>
                    @endforelse
                </x-ui.card-body>
            </x-ui.card>

            <x-ui.card>
                <x-ui.card-header title="History" description="Status changes and remarks, oldest first." />
                <x-ui.card-body class="px-0 py-0 sm:px-0">
                    @forelse ($submission->remarks as $remark)
                        <div class="border-b border-line px-5 py-4 last:border-0 sm:px-6">
                            @if ($remark->isStatusChange())
                                <div class="flex flex-wrap items-center gap-2">
                                    @if ($remark->fromStatus)
                                        <x-ui.status-badge :status="$remark->fromStatus" />
                                        <span aria-hidden="true" class="text-ink-muted">→</span>
                                    @endif
                                    <x-ui.status-badge :status="$remark->toStatus" />
                                </div>
                            @else
                                <p class="text-sm font-medium text-ink">Remark</p>
                            @endif
                            <p class="mt-1.5 whitespace-pre-line text-sm text-ink-soft">{{ $remark->message }}</p>
                            <p class="mt-1.5 text-xs text-ink-muted">
                                {{ $remark->admin?->name ?? 'System' }} ·
                                {{ $remark->createdAt?->format('d M Y H:i') }} ·
                                {{ $remark->isInternal ? 'Internal' : 'Visible to applicant' }}
                            </p>
                        </div>
                    @empty
                        <p class="px-5 py-10 text-center text-sm text-ink-muted sm:px-6">Status changes and remarks will appear here.</p>
                    @endforelse
                </x-ui.card-body>
            </x-ui.card>

            @if ($canEdit)
                <x-ui.card>
                    <x-ui.card-header title="Add Remark" />
                    <x-ui.card-body>
                        <form method="POST" action="{{ route('admin.submissions.remark', $submission->getKey()) }}" class="space-y-4">
                            @csrf
                            <textarea name="message" rows="4" required placeholder="Notes about this submission…"
                                      class="field-control resize-y"></textarea>
                            <div class="flex flex-wrap items-center justify-between gap-3">
                                <label class="flex items-start gap-2.5 text-sm text-ink-soft">
                                    {{-- Unchecked checkboxes submit nothing, so a hidden
                                         "0" carries the visible-to-applicant case. --}}
                                    <input type="hidden" name="isInternal" value="0">
                                    <input type="checkbox" name="isInternal" value="1" checked
                                           class="mt-0.5 size-4 rounded border-line-strong accent-brand-600">
                                    Internal note (not shown to the applicant)
                                </label>
                                <x-ui.button type="submit">Add remark</x-ui.button>
                            </div>
                        </form>
                    </x-ui.card-body>
                </x-ui.card>
            @endif
        </div>

        <div class="space-y-6">
            {{-- Certificate --}}
            <x-ui.card>
                <x-ui.card-header title="Certificate" />
                <x-ui.card-body>
                    @if ($cert)
                        <p class="font-mono text-sm font-semibold text-ink">{{ $cert->certificateNo }}</p>
                        <p class="mt-1 text-xs text-ink-muted">
                            {{ $cert->isRevoked() ? 'Revoked' : 'Issued' }} · {{ $cert->issuedAt?->format('d M Y H:i') }}
                        </p>
                        <dl class="mt-4 space-y-3 border-t border-line pt-4">
                            <div>
                                <dt class="text-xs font-medium uppercase tracking-wide text-ink-muted">Issued by</dt>
                                <dd class="mt-1 text-sm text-ink">{{ $cert->issuedBy?->name ?? '—' }}</dd>
                            </div>
                        </dl>
                        @if ($cert->filePath)
                            <div class="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                                <a href="{{ route('admin.certificates.show', $cert->getKey()) }}" target="_blank" rel="noopener noreferrer"
                                   class="rounded-control px-2.5 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50">View certificate</a>
                                <a href="{{ route('admin.certificates.show', $cert->getKey()) }}?download=1"
                                   class="rounded-control px-2.5 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-muted hover:text-ink">Download</a>
                                <a href="{{ route('verify.show', $cert->certificateNo) }}" target="_blank" rel="noopener noreferrer"
                                   class="rounded-control px-2.5 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-muted hover:text-ink">Public page</a>
                            </div>
                        @endif
                        <div class="mt-4 border-t border-line pt-4">
                            <p class="text-xs font-medium uppercase tracking-wide text-ink-muted">Verification URL</p>
                            <p class="mt-1 select-all break-all font-mono text-xs text-ink-soft">
                                {{ rtrim(config('app.url'), '/') }}/verify/{{ $cert->certificateNo }}
                            </p>
                        </div>

                    @elseif ($submission->status === \App\Enums\SubmissionStatus::Completed)
                        {{-- Completed with no certificate is an INVALID state and
                             must not be presented as a success. --}}
                        <div class="rounded-control border border-status-danger bg-status-danger-bg px-3.5 py-3">
                            <p class="text-sm font-medium text-status-danger">Certificate record missing</p>
                            <p class="mt-1 text-sm text-status-danger">
                                This submission is marked Completed but no certificate exists. It requires recovery.
                            </p>
                        </div>
                        @if ($canGenerate)
                            <form method="POST" action="{{ route('admin.submissions.recover', $submission->getKey()) }}" class="mt-4">
                                @csrf
                                <x-ui.button type="submit" variant="secondary">Recover Submission</x-ui.button>
                            </form>
                        @else
                            <p class="mt-4 text-sm text-ink-muted">Your role cannot recover this submission.</p>
                        @endif

                    @elseif ($submission->status !== \App\Enums\SubmissionStatus::Approved)
                        <p class="text-sm text-ink-muted">A certificate can only be generated once the submission is approved.</p>

                    @elseif (! $canGenerate)
                        <p class="text-sm text-ink-muted">Your role cannot generate certificates.</p>

                    @else
                        <p class="text-sm text-ink-soft">This submission is approved and has no certificate yet.</p>
                        <form method="POST" action="{{ route('admin.submissions.certificate', $submission->getKey()) }}" class="mt-3"
                              onsubmit="return confirm('Generate a certificate? The submitted details will be frozen into the document and the submission becomes Completed, which is final.');">
                            @csrf
                            <x-ui.button type="submit">Generate Certificate</x-ui.button>
                        </form>
                    @endif
                </x-ui.card-body>
            </x-ui.card>

            {{-- Status --}}
            <x-ui.card>
                <x-ui.card-header title="Status" />
                <x-ui.card-body>
                    @if (! $canDecide)
                        <p class="text-sm text-ink-muted">Your role cannot change submission status.</p>
                    @elseif (count($nextStatuses) === 0)
                        <p class="text-sm text-ink-muted">
                            {{ $submission->status->label() }} is a final status and cannot be changed.
                        </p>
                    @else
                        <form method="POST" action="{{ route('admin.submissions.status', $submission->getKey()) }}" class="space-y-3">
                            @csrf
                            <div class="space-y-1.5">
                                <label for="toStatus" class="block text-sm font-medium text-ink">Move to</label>
                                <select id="toStatus" name="toStatus" class="field-control">
                                    @foreach ($nextStatuses as $status)
                                        <option value="{{ $status->value }}">{{ $status->label() }}</option>
                                    @endforeach
                                </select>
                            </div>
                            <div class="space-y-1.5">
                                <label for="remark" class="block text-sm font-medium text-ink">Remark</label>
                                <textarea id="remark" name="remark" rows="3" class="field-control resize-y"
                                          placeholder="Required when rejecting."></textarea>
                            </div>
                            <x-ui.button type="submit" size="sm">Update status</x-ui.button>
                        </form>
                    @endif
                </x-ui.card-body>
            </x-ui.card>

            {{-- Metadata --}}
            <x-ui.card>
                <x-ui.card-header title="Submission Metadata" />
                <x-ui.card-body>
                    <dl class="space-y-4">
                        @foreach ([
                            'Reference' => $submission->referenceNo,
                            'Submission ID' => $submission->getKey(),
                            'Submitted' => $submission->submittedAt?->format('d M Y H:i'),
                            'Last updated' => $submission->updatedAt?->format('d M Y H:i'),
                            'Reviewed' => $submission->reviewedAt?->format('d M Y H:i'),
                            'Reviewed by' => $submission->reviewedBy?->name,
                            'Submitted from' => $submission->submitterIp,
                        ] as $label => $value)
                            <div>
                                <dt class="text-xs font-medium uppercase tracking-wide text-ink-muted">{{ $label }}</dt>
                                <dd class="mt-1 break-all text-sm text-ink">{{ $dash($value) }}</dd>
                            </div>
                        @endforeach
                    </dl>
                </x-ui.card-body>
            </x-ui.card>
        </div>
    </div>
</div>
@endsection
