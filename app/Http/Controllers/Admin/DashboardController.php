<?php

namespace App\Http\Controllers\Admin;

use App\Enums\SubmissionStatus;
use App\Http\Controllers\Controller;
use App\Models\CertificateSubmission;
use App\Support\Permission;
use Illuminate\View\View;

/**
 * Admin dashboard.
 *
 * Every number comes from a MySQL aggregate — nothing is hard-coded, and
 * counting happens in the database rather than by loading rows.
 */
class DashboardController extends Controller
{
    public function __invoke(): View
    {
        $this->authorize(Permission::SUBMISSION_READ);

        $counts = CertificateSubmission::query()
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $byStatus = [];
        foreach (SubmissionStatus::displayOrder() as $status) {
            $byStatus[$status->value] = (int) ($counts[$status->value] ?? 0);
        }

        return view('admin.dashboard', [
            'total' => array_sum($byStatus),
            'byStatus' => $byStatus,
            'recent' => CertificateSubmission::query()
                ->withCount('documents')
                ->orderByDesc('submittedAt')
                ->limit(5)
                ->get(),
        ]);
    }
}
