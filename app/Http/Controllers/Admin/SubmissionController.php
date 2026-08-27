<?php

namespace App\Http\Controllers\Admin;

use App\Enums\SubmissionStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateSubmissionRequest;
use App\Models\CertificateSubmission;
use App\Services\SubmissionWorkflow;
use App\Support\Permission;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

/**
 * Submission listing, detail and editing.
 *
 * All searching, filtering and paging happens in MySQL, so the browser only
 * ever receives the page it is displaying.
 */
class SubmissionController extends Controller
{
    public function index(Request $request): View
    {
        $this->authorize(Permission::SUBMISSION_READ);

        $search = trim((string) $request->query('q', ''));
        $status = $this->parseStatus($request->query('status'));

        $submissions = CertificateSubmission::query()
            ->withCount('documents')
            ->when($status, fn ($q) => $q->where('status', $status->value))
            ->when($search !== '', function ($q) use ($search) {
                // The database collation is case-insensitive, so `like`
                // matches regardless of case.
                $q->where(function ($inner) use ($search) {
                    foreach (['applicantName', 'applicantEmail', 'companyName', 'referenceNo'] as $column) {
                        $inner->orWhere($column, 'like', '%' . $search . '%');
                    }
                });
            })
            ->orderByDesc('submittedAt')
            ->paginate(20)
            ->withQueryString();

        return view('admin.submissions.index', [
            'submissions' => $submissions,
            'search' => $search,
            'activeStatus' => $status,
        ]);
    }

    public function show(string $id): View
    {
        $this->authorize(Permission::SUBMISSION_READ);

        $submission = CertificateSubmission::query()
            ->with([
                'documents' => fn ($q) => $q->orderBy('uploadedAt'),
                'remarks' => fn ($q) => $q->with('admin:id,name,email')->orderBy('createdAt'),
                'certificate.issuedBy:id,name',
                'reviewedBy:id,name,email',
            ])
            ->findOrFail($id);

        return view('admin.submissions.show', [
            'submission' => $submission,
            'nextStatuses' => SubmissionWorkflow::nextStatuses($submission->status),
            'editable' => SubmissionWorkflow::isEditable($submission->status),
        ]);
    }

    public function edit(string $id): View|RedirectResponse
    {
        // Reaching the edit page needs the edit permission, not just read.
        $this->authorize(Permission::SUBMISSION_EDIT);

        $submission = CertificateSubmission::findOrFail($id);

        // A completed submission is locked; send the admin back to detail.
        if (! SubmissionWorkflow::isEditable($submission->status)) {
            return redirect()->route('admin.submissions.show', $submission->getKey());
        }

        return view('admin.submissions.edit', [
            'submission' => $submission,
            'parts' => $submission->nameParts(),
            'locations' => config('certificate.locations'),
        ]);
    }

    public function update(UpdateSubmissionRequest $request, string $id): RedirectResponse
    {
        $this->authorize(Permission::SUBMISSION_EDIT);

        $submission = CertificateSubmission::findOrFail($id);

        if (! SubmissionWorkflow::isEditable($submission->status)) {
            return back()->withErrors(['form' => 'Completed submissions can no longer be edited.']);
        }

        $values = $request->validated();
        $admin = $request->user('admin');

        DB::transaction(function () use ($submission, $values, $admin) {
            // Preserve anything already in additionalData; only the name parts
            // and the edit trail change.
            $extra = $submission->additionalData ?? [];

            $submission->update([
                'applicantName' => trim($values['firstName'] . ' ' . $values['lastName']),
                'applicantEmail' => strtolower($values['email']),
                'applicantDesignation' => $values['jobTitle'] ?? null,
                'companyName' => $values['companyName'] ?? null,
                'location' => $values['location'],
                'additionalNotes' => $values['comments'] ?? null,
                'additionalData' => array_merge($extra, [
                    'firstName' => $values['firstName'],
                    'lastName' => $values['lastName'],
                    'lastEditedBy' => $admin->email,
                    'lastEditedAt' => now()->toIso8601String(),
                ]),
            ]);

            // Recorded, so the audit trail explains why a stored value differs
            // from what was originally submitted.
            $submission->remarks()->create([
                'adminId' => $admin->getKey(),
                'message' => "Submission details edited by {$admin->name}.",
                'isInternal' => true,
            ]);
        });

        return redirect()
            ->route('admin.submissions.show', $submission->getKey())
            ->with('status', 'Submission updated.');
    }

    private function parseStatus(?string $value): ?SubmissionStatus
    {
        return $value ? SubmissionStatus::tryFrom($value) : null;
    }
}
