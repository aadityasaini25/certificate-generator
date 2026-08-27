<?php

namespace App\Enums;

/**
 * Submission workflow statuses.
 *
 * Values match the MySQL ENUM exactly, so existing rows cast cleanly.
 */
enum SubmissionStatus: string
{
    case Pending = 'PENDING';
    case UnderReview = 'UNDER_REVIEW';
    case Approved = 'APPROVED';
    case Rejected = 'REJECTED';
    case Completed = 'COMPLETED';

    /** Admin-facing label. */
    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::UnderReview => 'Under review',
            self::Approved => 'Approved',
            self::Rejected => 'Rejected',
            self::Completed => 'Completed',
        };
    }

    /** Applicant-facing explanation shown on the public status page. */
    public function publicMessage(): string
    {
        return match ($this) {
            self::Pending => 'Your request has been received and is waiting for review.',
            self::UnderReview => 'Your request is currently being reviewed by our team.',
            self::Approved => 'Your request has been approved.',
            self::Rejected => 'Your request has been rejected. Please contact us if you require further information.',
            self::Completed => 'Your request has been completed.',
        };
    }

    /** Drives the colour of the status badge. */
    public function tone(): string
    {
        return match ($this) {
            self::Pending => 'neutral',
            self::UnderReview => 'info',
            self::Approved => 'success',
            self::Rejected => 'danger',
            self::Completed => 'accent',
        };
    }

    /** Display order for filters, dashboards and tabs. */
    public static function displayOrder(): array
    {
        return [self::Pending, self::UnderReview, self::Approved, self::Rejected, self::Completed];
    }
}
