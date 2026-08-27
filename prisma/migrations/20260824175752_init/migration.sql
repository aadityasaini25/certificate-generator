-- CreateTable
CREATE TABLE `admins` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'ADMIN', 'REVIEWER') NOT NULL DEFAULT 'ADMIN',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admins_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `certificate_submissions` (
    `id` VARCHAR(191) NOT NULL,
    `referenceNo` VARCHAR(191) NOT NULL,
    `applicantName` VARCHAR(191) NOT NULL,
    `applicantEmail` VARCHAR(191) NOT NULL,
    `applicantPhone` VARCHAR(191) NOT NULL,
    `applicantDesignation` VARCHAR(191) NULL,
    `companyName` VARCHAR(191) NOT NULL,
    `companyRegistrationNo` VARCHAR(191) NULL,
    `companyAddressLine1` VARCHAR(191) NOT NULL,
    `companyAddressLine2` VARCHAR(191) NULL,
    `companyCity` VARCHAR(191) NOT NULL,
    `companyState` VARCHAR(191) NULL,
    `companyPostalCode` VARCHAR(191) NULL,
    `companyCountry` VARCHAR(191) NOT NULL,
    `companyEmail` VARCHAR(191) NULL,
    `companyPhone` VARCHAR(191) NULL,
    `companyWebsite` VARCHAR(191) NULL,
    `certificateType` VARCHAR(191) NOT NULL,
    `purpose` TEXT NULL,
    `requestedValidFrom` DATETIME(3) NULL,
    `requestedValidUntil` DATETIME(3) NULL,
    `productName` VARCHAR(191) NULL,
    `productDescription` TEXT NULL,
    `productModel` VARCHAR(191) NULL,
    `hsCode` VARCHAR(191) NULL,
    `originCountry` VARCHAR(191) NULL,
    `quantity` VARCHAR(191) NULL,
    `additionalNotes` TEXT NULL,
    `additionalData` JSON NULL,
    `declarationAccepted` BOOLEAN NOT NULL DEFAULT false,
    `declaredBy` VARCHAR(191) NULL,
    `declaredAt` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewedById` VARCHAR(191) NULL,
    `submitterIp` VARCHAR(191) NULL,

    UNIQUE INDEX `certificate_submissions_referenceNo_key`(`referenceNo`),
    INDEX `certificate_submissions_status_idx`(`status`),
    INDEX `certificate_submissions_submittedAt_idx`(`submittedAt`),
    INDEX `certificate_submissions_applicantEmail_idx`(`applicantEmail`),
    INDEX `certificate_submissions_companyName_idx`(`companyName`),
    INDEX `certificate_submissions_reviewedById_idx`(`reviewedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `uploaded_documents` (
    `id` VARCHAR(191) NOT NULL,
    `submissionId` VARCHAR(191) NOT NULL,
    `documentType` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `storedName` VARCHAR(191) NOT NULL,
    `storagePath` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `uploaded_documents_submissionId_idx`(`submissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `submission_remarks` (
    `id` VARCHAR(191) NOT NULL,
    `submissionId` VARCHAR(191) NOT NULL,
    `adminId` VARCHAR(191) NULL,
    `message` TEXT NOT NULL,
    `fromStatus` ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED') NULL,
    `toStatus` ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED') NULL,
    `isInternal` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `submission_remarks_submissionId_idx`(`submissionId`),
    INDEX `submission_remarks_adminId_idx`(`adminId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `certificates` (
    `id` VARCHAR(191) NOT NULL,
    `certificateNo` VARCHAR(191) NOT NULL,
    `submissionId` VARCHAR(191) NOT NULL,
    `templateKey` VARCHAR(191) NOT NULL DEFAULT 'default',
    `snapshot` JSON NOT NULL,
    `filePath` VARCHAR(191) NULL,
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `validFrom` DATETIME(3) NULL,
    `validUntil` DATETIME(3) NULL,
    `issuedById` VARCHAR(191) NULL,
    `revokedAt` DATETIME(3) NULL,
    `revokeReason` TEXT NULL,

    UNIQUE INDEX `certificates_certificateNo_key`(`certificateNo`),
    UNIQUE INDEX `certificates_submissionId_key`(`submissionId`),
    INDEX `certificates_issuedById_idx`(`issuedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `certificate_submissions` ADD CONSTRAINT `certificate_submissions_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `uploaded_documents` ADD CONSTRAINT `uploaded_documents_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `certificate_submissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submission_remarks` ADD CONSTRAINT `submission_remarks_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `certificate_submissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submission_remarks` ADD CONSTRAINT `submission_remarks_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `certificate_submissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_issuedById_fkey` FOREIGN KEY (`issuedById`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
