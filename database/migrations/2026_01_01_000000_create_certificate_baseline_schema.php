<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Baseline schema for the Certificate application.
 *
 * This reproduces the schema that already exists in the development database,
 * so a FRESH deployment (e.g. onto cPanel) gets an identical structure. On the
 * existing database every statement is skipped, because each table is created
 * only when it is absent — the migration is therefore safe to run anywhere and
 * never recreates or drops live data.
 *
 * The DDL is verbatim from the pre-migration database rather than rewritten in
 * the schema builder, so column types, collations, defaults, index names and
 * foreign-key rules match exactly. Later schema changes should use ordinary
 * Laravel migrations on top of this baseline.
 *
 * Note the non-Laravel conventions this schema uses, which the Eloquent models
 * account for explicitly: string (cuid) primary keys, camelCase columns, and
 * per-table timestamp names such as submittedAt / issuedAt / uploadedAt.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('admins')) {
            DB::statement('CREATE TABLE `admins` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `passwordHash` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum(\'SUPER_ADMIN\',\'ADMIN\',\'REVIEWER\') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT \'ADMIN\',
  `isActive` tinyint(1) NOT NULL DEFAULT \'1\',
  `lastLoginAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `admins_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
        }

        if (! Schema::hasTable('certificate_submissions')) {
            DB::statement('CREATE TABLE `certificate_submissions` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `referenceNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `applicantName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `applicantEmail` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `applicantPhone` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `applicantDesignation` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `companyName` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `companyRegistrationNo` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `companyAddressLine1` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `companyAddressLine2` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `companyCity` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `companyState` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `companyPostalCode` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `companyCountry` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `companyEmail` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `companyPhone` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `companyWebsite` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `certificateType` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `purpose` text COLLATE utf8mb4_unicode_ci,
  `requestedValidFrom` datetime(3) DEFAULT NULL,
  `requestedValidUntil` datetime(3) DEFAULT NULL,
  `productName` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `productDescription` text COLLATE utf8mb4_unicode_ci,
  `productModel` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hsCode` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `originCountry` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `additionalNotes` text COLLATE utf8mb4_unicode_ci,
  `additionalData` json DEFAULT NULL,
  `declarationAccepted` tinyint(1) NOT NULL DEFAULT \'0\',
  `declaredBy` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `declaredAt` datetime(3) DEFAULT NULL,
  `status` enum(\'PENDING\',\'UNDER_REVIEW\',\'APPROVED\',\'REJECTED\',\'COMPLETED\') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT \'PENDING\',
  `submittedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `reviewedAt` datetime(3) DEFAULT NULL,
  `reviewedById` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `submitterIp` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `certificate_submissions_referenceNo_key` (`referenceNo`),
  KEY `certificate_submissions_status_idx` (`status`),
  KEY `certificate_submissions_submittedAt_idx` (`submittedAt`),
  KEY `certificate_submissions_applicantEmail_idx` (`applicantEmail`),
  KEY `certificate_submissions_companyName_idx` (`companyName`),
  KEY `certificate_submissions_reviewedById_idx` (`reviewedById`),
  KEY `certificate_submissions_location_idx` (`location`),
  CONSTRAINT `certificate_submissions_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `admins` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
        }

        if (! Schema::hasTable('admin_sessions')) {
            DB::statement('CREATE TABLE `admin_sessions` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenHash` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `adminId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiresAt` datetime(3) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastUsedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `ipAddress` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `userAgent` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `admin_sessions_tokenHash_key` (`tokenHash`),
  KEY `admin_sessions_adminId_idx` (`adminId`),
  KEY `admin_sessions_expiresAt_idx` (`expiresAt`),
  CONSTRAINT `admin_sessions_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admins` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
        }

        if (! Schema::hasTable('uploaded_documents')) {
            DB::statement('CREATE TABLE `uploaded_documents` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `submissionId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `documentType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `originalName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `storedName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `storagePath` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mimeType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sizeBytes` int NOT NULL,
  `uploadedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `uploaded_documents_submissionId_idx` (`submissionId`),
  CONSTRAINT `uploaded_documents_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `certificate_submissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
        }

        if (! Schema::hasTable('submission_remarks')) {
            DB::statement('CREATE TABLE `submission_remarks` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `submissionId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `adminId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `fromStatus` enum(\'PENDING\',\'UNDER_REVIEW\',\'APPROVED\',\'REJECTED\',\'COMPLETED\') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `toStatus` enum(\'PENDING\',\'UNDER_REVIEW\',\'APPROVED\',\'REJECTED\',\'COMPLETED\') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isInternal` tinyint(1) NOT NULL DEFAULT \'1\',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `submission_remarks_submissionId_idx` (`submissionId`),
  KEY `submission_remarks_adminId_idx` (`adminId`),
  CONSTRAINT `submission_remarks_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admins` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `submission_remarks_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `certificate_submissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
        }

        if (! Schema::hasTable('certificates')) {
            DB::statement('CREATE TABLE `certificates` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `certificateNo` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `submissionId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `templateKey` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT \'default\',
  `snapshot` json NOT NULL,
  `filePath` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `issuedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `validFrom` datetime(3) DEFAULT NULL,
  `validUntil` datetime(3) DEFAULT NULL,
  `issuedById` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `revokedAt` datetime(3) DEFAULT NULL,
  `revokeReason` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `certificates_certificateNo_key` (`certificateNo`),
  UNIQUE KEY `certificates_submissionId_key` (`submissionId`),
  KEY `certificates_issuedById_idx` (`issuedById`),
  CONSTRAINT `certificates_issuedById_fkey` FOREIGN KEY (`issuedById`) REFERENCES `admins` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `certificates_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `certificate_submissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
        }
    }

    /**
     * Deliberately irreversible.
     *
     * Rolling this back would drop every submission, document and issued
     * certificate. A baseline that represents pre-existing production data
     * must not offer a one-command path to destroying it.
     */
    public function down(): void
    {
        throw new RuntimeException(
            'The baseline migration cannot be rolled back: it would drop live '
            . 'certificate data. Drop the schema manually if that is truly intended.'
        );
    }
};
