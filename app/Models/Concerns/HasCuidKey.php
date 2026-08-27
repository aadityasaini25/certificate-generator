<?php

namespace App\Models\Concerns;

/**
 * String primary keys in the cuid shape the existing data uses.
 *
 * The database was created by Prisma, whose ids look like
 * `cmt7jhbvw0000xwx5shhphfau` — lowercase alphanumeric, no separators. New
 * records must keep that shape: the public and admin routes validate ids
 * against ^[a-z0-9]+$, so a UUID (which contains hyphens) would be rejected
 * before it ever reached the database.
 */
trait HasCuidKey
{
    /**
     * NOTE: `$incrementing` and `$keyType` are declared on each model rather
     * than here. PHP rejects a trait that redeclares a property the parent
     * class already defines with a different default, and Model declares
     * `$incrementing = true`.
     */
    protected static function bootHasCuidKey(): void
    {
        static::creating(function ($model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = static::newCuid();
            }
        });
    }

    /**
     * Generates a collision-resistant, sortable, hyphen-free id.
     *
     * Structure mirrors cuid: a leading letter, a base-36 timestamp for rough
     * ordering, a per-process counter to separate ids created in the same
     * millisecond, and 8 random base-36 characters for entropy.
     */
    public static function newCuid(): string
    {
        static $counter = 0;

        $timestamp = base_convert((string) (int) (microtime(true) * 1000), 10, 36);
        $count = str_pad(base_convert((string) (++$counter % 1679616), 10, 36), 4, '0', STR_PAD_LEFT);

        $random = '';
        for ($i = 0; $i < 8; $i++) {
            $random .= base_convert((string) random_int(0, 35), 10, 36);
        }

        return strtolower('c' . $timestamp . $count . $random);
    }
}
