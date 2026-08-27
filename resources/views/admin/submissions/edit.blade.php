@extends('layouts.admin')
@section('title', 'Edit submission')

@section('content')
<div class="mx-auto max-w-3xl space-y-6">
    <nav aria-label="Breadcrumb" class="text-sm">
        <ol class="flex flex-wrap items-center gap-1 text-ink-muted">
            <li><a href="{{ route('admin.submissions.index') }}" class="hover:text-ink">Submissions</a></li>
            <li aria-hidden="true">›</li>
            <li><a href="{{ route('admin.submissions.show', $submission->getKey()) }}"
                   class="font-mono hover:text-ink">{{ $submission->referenceNo }}</a></li>
            <li aria-hidden="true">›</li>
            <li aria-current="page" class="text-ink">Edit</li>
        </ol>
    </nav>

    <div>
        <h1 class="text-2xl font-semibold tracking-tight text-ink">Edit submission</h1>
        <p class="mt-1.5 text-sm text-ink-soft">
            Correct applicant details before a decision is made. Uploaded documents are not affected.
        </p>
    </div>

    <x-ui.card>
        <x-ui.card-header title="Submitted information" description="Changes are recorded in the submission history." />
        <x-ui.card-body class="sm:px-8 sm:py-7">
            <form method="POST" action="{{ route('admin.submissions.update', $submission->getKey()) }}"
                  class="space-y-6" novalidate>
                @csrf
                @method('PUT')

                <div class="grid gap-5 sm:grid-cols-2">
                    <x-ui.field name="firstName" label="First Name" required :value="$parts['firstName']" />
                    <x-ui.field name="lastName" label="Last Name" required :value="$parts['lastName']" />
                </div>

                <x-ui.field name="email" label="Email" type="email" required :value="$submission->applicantEmail" />

                <div class="grid gap-5 sm:grid-cols-2">
                    <x-ui.field name="companyName" label="Company Name" :value="$submission->companyName" />
                    <x-ui.field name="jobTitle" label="Job Title" :value="$submission->applicantDesignation" />
                </div>

                <div class="space-y-1.5">
                    <label for="location" class="block text-sm font-medium text-ink">
                        Location<span class="ml-0.5 text-status-danger" aria-hidden="true">*</span>
                    </label>
                    <select id="location" name="location" class="field-control">
                        <option value="">Please select</option>
                        @foreach ($locations as $location)
                            <option value="{{ $location }}" @selected(old('location', $submission->location) === $location)>{{ $location }}</option>
                        @endforeach
                    </select>
                    @error('location')<p class="text-sm text-status-danger">{{ $message }}</p>@enderror
                </div>

                <div class="space-y-1.5">
                    <label for="comments" class="block text-sm font-medium text-ink">Comments</label>
                    <textarea id="comments" name="comments" rows="6" class="field-control resize-y">{{ old('comments', $submission->additionalNotes) }}</textarea>
                    @error('comments')<p class="text-sm text-status-danger">{{ $message }}</p>@enderror
                </div>

                <div class="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-5">
                    <x-ui.button href="{{ route('admin.submissions.show', $submission->getKey()) }}" variant="secondary">Cancel</x-ui.button>
                    <x-ui.button type="submit">Save changes</x-ui.button>
                </div>
            </form>
        </x-ui.card-body>
    </x-ui.card>
</div>
@endsection
