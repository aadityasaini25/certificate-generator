@extends('layouts.admin')
@section('title', 'Submissions')

@section('content')
<div class="space-y-6">
    <div>
        <h1 class="text-2xl font-semibold tracking-tight text-ink">Submissions</h1>
        <p class="mt-1.5 text-sm text-ink-soft">
            {{ $submissions->total() }} {{ Str::plural('request', $submissions->total()) }}
            {{ ($search || $activeStatus) ? 'matching your filters' : 'in total' }}.
        </p>
    </div>

    {{-- Filters live in the URL, so a filtered view is bookmarkable and the
         server does the actual filtering from the same parameters. --}}
    <div class="space-y-3">
        <form method="GET" action="{{ route('admin.submissions.index') }}" class="flex flex-wrap gap-2">
            @if ($activeStatus)
                <input type="hidden" name="status" value="{{ $activeStatus->value }}">
            @endif
            <input type="search" name="q" value="{{ $search }}"
                   placeholder="Search name, email, company or reference"
                   aria-label="Search submissions" class="field-control min-w-0 flex-1">
            <x-ui.button type="submit">Search</x-ui.button>
            @if ($search || $activeStatus)
                <x-ui.button href="{{ route('admin.submissions.index') }}" variant="ghost">Clear</x-ui.button>
            @endif
        </form>

        <div class="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
            @php $base = $search ? ['q' => $search] : []; @endphp
            <a href="{{ route('admin.submissions.index', $base) }}"
               @if (! $activeStatus) aria-current="true" @endif
               class="rounded-full border px-3 py-1.5 text-sm font-medium transition-colors {{ ! $activeStatus ? 'border-brand-600 bg-brand-600 text-white' : 'border-line-strong bg-surface text-ink-soft hover:bg-surface-muted hover:text-ink' }}">All</a>
            @foreach (\App\Enums\SubmissionStatus::displayOrder() as $status)
                @php $on = $activeStatus === $status; @endphp
                <a href="{{ route('admin.submissions.index', array_merge($base, ['status' => $status->value])) }}"
                   @if ($on) aria-current="true" @endif
                   class="rounded-full border px-3 py-1.5 text-sm font-medium transition-colors {{ $on ? 'border-brand-600 bg-brand-600 text-white' : 'border-line-strong bg-surface text-ink-soft hover:bg-surface-muted hover:text-ink' }}">
                    {{ $status->label() }}
                </a>
            @endforeach
        </div>
    </div>

    <x-ui.card>
        <x-ui.card-body class="px-0 py-0 sm:px-0">
            @include('admin.submissions.partials.table', [
                'submissions' => $submissions,
                'emptyTitle' => ($search || $activeStatus) ? 'No matching submissions' : 'No submissions yet',
                'emptyDescription' => ($search || $activeStatus)
                    ? 'Try a different search term or clear the filters.'
                    : 'Requests submitted through the public form will appear here.',
            ])

            @if ($submissions->hasPages())
                <div class="border-t border-line px-4 py-3">{{ $submissions->links() }}</div>
            @endif
        </x-ui.card-body>
    </x-ui.card>
</div>
@endsection
