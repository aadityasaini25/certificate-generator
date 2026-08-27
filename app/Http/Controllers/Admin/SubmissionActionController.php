<?php

namespace App\Http\Controllers\Admin;

use App\Enums\SubmissionStatus;
use App\Http\Controllers\Controller;
use App\Models\Certificate;
use App\Models\CertificateSubmission;
use App\Services\SubmissionWorkflow;
use App\Support\Permission;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Status changes, remarks and recovery.
 *
 * Every action re-establishes who is calling and what they may do. Nothing
 * relies on the page having hidden a button: an action posted directly, with
 * any id, still goes through the same checks.
 */
class SubmissionActionController extends Controller
{
    public function changeStatus(Request $request, string $id): RedirectResponse
    {
        // Deciding an outcome is a stronger permission than editing details.
        $this->authorize(Permission::SUBMISSION_DECIDE);

        $validated = $request->validate([
            'toStatus' => ['required', 'string'],
            'remark' => ['nullable', 'string', 'max:2000'],
        ]);

        $to = SubmissionStatus::tryFrom($validated['toStatus']);
        if ($to === null) {
            return back()->withErrors(['status' => 'Unknown status.']);
        }

        // COMPLETED is not an ordinary destination: it means "a certificate
        // exists", and only certificate generation can make that true.
        // Refused here before any lookup, so a forged or replayed request
        // cannot proceed no matter what the transition table says.
        if (SubmissionWorkflow::isManuallyUnreachable($to)) {
            return back()->withErrors(['status' => SubmissionWorkflow::manuallyUnreachableMessage($to)]);
        }

        // A rejection that gives no reason is not reviewable later.
        if ($to === SubmissionStatus::Rejected && trim((string) ($validated['remark'] ?? '')) === '') {
            return back()->withErrors(['remark' => 'A remark is required when rejecting a submission.']);
        }

        $submission = CertificateSubmission::findOrFail($id);
        $from = $submission->status;

        if ($from === $to) {
            return back()->withErrors(['status' => 'That is already the current status.']);
        }

        // The workflow table is the authority, not the buttons the page drew.
        if (! SubmissionWorkflow::canTransition($from, $to)) {
            return back()->withErrors(['status' => SubmissionWorkflow::rejectedMessage($from, $to)]);
        }

        $admin = $request->user('admin');
        $isDecision = in_array($to, [SubmissionStatus::Approved, SubmissionStatus::Rejected], true);

        DB::transaction(function () use ($submission, $from, $to, $validated, $admin, $isDecision) {
            $submission->update(array_merge(
                ['status' => $to],
                $isDecision ? ['reviewedAt' => now(), 'reviewedById' => $admin->getKey()] : []
            ));

            $submission->remarks()->create([
                'adminId' => $admin->getKey(),
                'message' => $validated['remark'] ?: "Status changed to {$to->value}.",
                'fromStatus' => $from->value,
                'toStatus' => $to->value,
                'isInternal' => true,
            ]);
        });

        return back()->with('status', "Status updated to {$to->label()}.");
    }

    public function addRemark(Request $request, string $id): RedirectResponse
    {
        $this->authorize(Permission::SUBMISSION_EDIT);

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
            'isInternal' => ['nullable'],
        ]);

        $submission = CertificateSubmission::findOrFail($id);

        $submission->remarks()->create([
            'adminId' => $request->user('admin')->getKey(),
            'message' => $validated['message'],
            // Remarks default to internal; marking one visible is deliberate,
            // so an internal note cannot be exposed by accident.
            'isInternal' => (bool) $request->boolean('isInternal', true),
        ]);

        return back()->with('status', 'Remark added.');
    }

    /**
     * Returns a COMPLETED submission that has no certificate to APPROVED.
     *
     * COMPLETED is supposed to mean "a certificate was issued". A submission in
     * that state without one is invalid — historically reachable through a
     * manual status change that is now blocked. This is the supervised way
     * out: it does not create a certificate, it puts the submission back where
     * a normal Generate Certificate can be performed deliberately.
     */
    public function recover(Request $request, string $id): RedirectResponse
    {
        $this->authorize(Permission::CERTIFICATE_GENERATE);

        $submission = CertificateSubmission::with('certificate')->findOrFail($id);

        if ($submission->status !== SubmissionStatus::Completed) {
            return back()->withErrors(['recovery' => 'Only a completed submission with no certificate can be recovered.']);
        }

        if ($submission->certificate !== null) {
            return back()->withErrors(['recovery' =>
                "This submission has certificate {$submission->certificate->certificateNo} and is not in an invalid state."]);
        }

        $admin = $request->user('admin');

        try {
            DB::transaction(function () use ($submission, $admin) {
                // Re-check INSIDE the transaction: a certificate may have been
                // issued between the read above and here.
                if (Certificate::where('submissionId', $submission->getKey())->exists()) {
                    throw new \RuntimeException('CERTIFICATE_EXISTS');
                }

                // Conditional update, so a concurrent change is not overwritten.
                $moved = CertificateSubmission::query()
                    ->whereKey($submission->getKey())
                    ->where('status', SubmissionStatus::Completed->value)
                    ->update(['status' => SubmissionStatus::Approved->value]);

                if ($moved === 0) {
                    throw new \RuntimeException('STATUS_CHANGED');
                }

                $submission->remarks()->create([
                    'adminId' => $admin->getKey(),
                    'message' => 'Recovery: submission was marked Completed with no certificate and has been '
                        . "returned to Approved by {$admin->name} so a certificate can be generated.",
                    'fromStatus' => SubmissionStatus::Completed->value,
                    'toStatus' => SubmissionStatus::Approved->value,
                    'isInternal' => true,
                ]);
            });
        } catch (\Throwable $e) {
            $reason = $e->getMessage();
            if ($reason === 'CERTIFICATE_EXISTS') {
                return back()->withErrors(['recovery' => 'A certificate was issued for this submission. Nothing to recover.']);
            }
            if ($reason === 'STATUS_CHANGED') {
                return back()->withErrors(['recovery' => 'The submission changed. Reload and try again.']);
            }
            Log::error('[submissions] recovery failed: ' . $reason);

            return back()->withErrors(['recovery' => 'Recovery failed. Please try again.']);
        }

        return back()->with('status', 'Submission returned to Approved. You can now generate a certificate.');
    }
}
