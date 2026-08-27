-- AlterTable
ALTER TABLE `certificate_submissions` ADD COLUMN `location` VARCHAR(191) NULL,
    MODIFY `applicantPhone` VARCHAR(191) NULL,
    MODIFY `companyName` VARCHAR(191) NULL,
    MODIFY `companyAddressLine1` VARCHAR(191) NULL,
    MODIFY `companyCity` VARCHAR(191) NULL,
    MODIFY `companyCountry` VARCHAR(191) NULL,
    MODIFY `certificateType` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `certificate_submissions_location_idx` ON `certificate_submissions`(`location`);
