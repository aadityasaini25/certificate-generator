<?php

namespace App\Services;

use App\Enums\SubmissionStatus;

/**
 * Status workflow rules.
 *
 * A single table of allowed transitions, so the same rules apply to the UI
 * (which buttons appear) and to the controller (which changes are accepted).
 * The UI never decides what is legal — it only reflects this table.
 */
class SubmissionWorkflow
{
    /**
     * Statuses an administrator may never select directly.
     *
     * COMPLETED means "a certificate has been issued", which is a consequence
     * of certificate generation rather than a decision someone makes. Allowing
     * it to be chosen manually once produced submissions marked complete with
     * no certificate behind them — a bug that was found and fixed, and must
     * not return. Certificate generation performs the transition itself, in
     * the same transaction that creates the Certificate row.
     */
    public const MANUALLY_UNREACHABLE = [SubmissionStatus::Completed];

    /** @return array<string, list<SubmissionStatus>> */
    public static function transitions(): array
    {
        return [
            // A new request is either picked up for review or rejected.
            SubmissionStatus::Pending->value => [
                SubmissionStatus::UnderReview, SubmissionStatus::Rejected,
            ],
            // Under review it can be decided either way, or put back.
            SubmissionStatus::UnderReview->value => [
                SubmissionStatus::Approved, SubmissionStatus::Rejected, SubmissionStatus::Pending,
            ],
            // An approved request leaves this state either by certificate
            // generation or by going back to review. COMPLETED is deliberately
            // absent — see MANUALLY_UNREACHABLE.
            SubmissionStatus::Approved->value => [
                SubmissionStatus::UnderReview, SubmissionStatus::Rejected,
            ],
            // A rejection can be reopened if the applicant supplies more detail.
            SubmissionStatus::Rejected->value => [SubmissionStatus::UnderReview],
            // Terminal: a completed request has an issued certificate behind it.
            SubmissionStatus::Completed->value => [],
        ];
    }

    public static function isManuallyUnreachable(SubmissionStatus $status): bool
    {
        return in_array($status, self::MANUALLY_UNREACHABLE, true);
    }

    /** @return list<SubmissionStatus> */
    public static function nextStatuses(SubmissionStatus $from): array
    {
        return self::transitions()[$from->value] ?? [];
    }

    /**
     * Whether an ordinary admin status change may move $from -> $to.
     *
     * Always false for a manually unreachable status, independently of the
     * table above, so the rule holds even if a destination list is edited
     * carelessly later.
     */
    public static function canTransition(SubmissionStatus $from, SubmissionStatus $to): bool
    {
        if (self::isManuallyUnreachable($to)) {
            return false;
        }

        return in_array($to, self::nextStatuses($from), true);
    }

    public static function manuallyUnreachableMessage(SubmissionStatus $status): string
    {
        return "{$status->label()} cannot be set manually. A submission becomes "
            . "{$status->label()} only when a certificate is generated for it.";
    }

    public static function rejectedMessage(SubmissionStatus $from, SubmissionStatus $to): string
    {
        if (self::isManuallyUnreachable($to)) {
            return self::manuallyUnreachableMessage($to);
        }

        $allowed = self::nextStatuses($from);
        if ($allowed === []) {
            return "{$from->label()} is a final status and cannot be changed.";
        }

        $labels = implode(' or ', array_map(fn ($s) => $s->label(), $allowed));

        return "Cannot move from {$from->label()} to {$to->label()}. Allowed: {$labels}.";
    }

    /**
     * A submission's details stop being editable once it is finished, so an
     * issued certificate can never disagree with the record behind it.
     */
    public static function isEditable(SubmissionStatus $status): bool
    {
        return $status !== SubmissionStatus::Completed;
    }
}
