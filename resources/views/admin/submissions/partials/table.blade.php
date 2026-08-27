@php $canEdit = auth('admin')->user()->can(\App\Support\Permission::SUBMISSION_EDIT); @endphp

@if (count($submissions) === 0)
    <div class="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
        <p class="text-sm font-semibold text-ink">{{ $emptyTitle ?? 'No submissions yet' }}</p>
        <p class="mx-auto max-w-sm text-sm text-ink-muted">
            {{ $emptyDescription ?? 'Requests submitted through the public form will appear here.' }}
        </p>
    </div>
@else
    {{-- Desktop --}}
    <div class="hidden overflow-x-auto md:block">
        <table class="w-full border-collapse text-sm">
            <caption class="sr-only">Certificate submissions</caption>
            <thead>
                <tr class="border-b border-line text-left">
                    @foreach (['Applicant','Company','Location','Submitted','Status'] as $h)
                        <th scope="col" class="px-4 py-3 font-medium text-ink-muted">{{ $h }}</th>
                    @endforeach
                    <th scope="col" class="px-4 py-3 text-right font-medium text-ink-muted">Actions</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($submissions as $s)
                    <tr class="border-b border-line last:border-0 hover:bg-surface-muted">
                        <td class="px-4 py-3 align-top">
                            <div class="font-medium text-ink">{{ $s->applicantName }}</div>
                            <div class="text-ink-muted">{{ $s->applicantEmail }}</div>
                            <div class="mt-0.5 font-mono text-xs text-ink-muted">{{ $s->referenceNo }}</div>
                        </td>
                        <td class="px-4 py-3 align-top text-ink-soft">{{ $s->companyName ?: '—' }}</td>
                        <td class="px-4 py-3 align-top text-ink-soft">{{ $s->location ?: '—' }}</td>
                        <td class="px-4 py-3 align-top whitespace-nowrap text-ink-soft">{{ $s->submittedAt?->format('d M Y') }}</td>
                        <td class="px-4 py-3 align-top"><x-ui.status-badge :status="$s->status" /></td>
                        <td class="px-4 py-3 align-top">
                            <div class="flex items-center justify-end gap-1">
                                <a href="{{ route('admin.submissions.show', $s->getKey()) }}"
                                   class="rounded-control px-2.5 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50">View</a>
                                @if ($canEdit && \App\Services\SubmissionWorkflow::isEditable($s->status))
                                    <a href="{{ route('admin.submissions.edit', $s->getKey()) }}"
                                       class="rounded-control px-2.5 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-muted hover:text-ink">Edit</a>
                                @endif
                            </div>
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    {{-- Mobile --}}
    <ul class="divide-y divide-line md:hidden">
        @foreach ($submissions as $s)
            <li class="px-4 py-4">
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <p class="font-medium text-ink">{{ $s->applicantName }}</p>
                        <p class="truncate text-sm text-ink-muted">{{ $s->applicantEmail }}</p>
                    </div>
                    <x-ui.status-badge :status="$s->status" />
                </div>
                <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div><dt class="text-xs text-ink-muted">Company</dt><dd class="text-ink-soft">{{ $s->companyName ?: '—' }}</dd></div>
                    <div><dt class="text-xs text-ink-muted">Location</dt><dd class="text-ink-soft">{{ $s->location ?: '—' }}</dd></div>
                    <div><dt class="text-xs text-ink-muted">Submitted</dt><dd class="text-ink-soft">{{ $s->submittedAt?->format('d M Y') }}</dd></div>
                </dl>
                <p class="mt-2 font-mono text-xs text-ink-muted">{{ $s->referenceNo }}</p>
                <div class="mt-2 flex justify-end gap-1">
                    <a href="{{ route('admin.submissions.show', $s->getKey()) }}"
                       class="rounded-control px-2.5 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50">View</a>
                    @if ($canEdit && \App\Services\SubmissionWorkflow::isEditable($s->status))
                        <a href="{{ route('admin.submissions.edit', $s->getKey()) }}"
                           class="rounded-control px-2.5 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-muted hover:text-ink">Edit</a>
                    @endif
                </div>
            </li>
        @endforeach
    </ul>
@endif
