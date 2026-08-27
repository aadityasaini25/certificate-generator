<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

/**
 * Base controller.
 *
 * `AuthorizesRequests` is included so controllers can call `$this->authorize()`
 * against the permission gates registered in AuthServiceProvider. Laravel 11+
 * leaves this out of the default skeleton.
 */
abstract class Controller
{
    use AuthorizesRequests;
}
