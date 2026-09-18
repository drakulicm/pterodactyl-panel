<?php

return [
    /*
    |--------------------------------------------------------------------------
    | New Client Interface
    |--------------------------------------------------------------------------
    |
    | When enabled the client area and authentication pages are served by the
    | Vite powered application in resources/app rather than the bundled webpack
    | application in resources/scripts.
    */

    'new_ui' => (bool) env('APP_NEW_UI', false),

    /*
    |--------------------------------------------------------------------------
    | New Admin Interface
    |--------------------------------------------------------------------------
    |
    | When enabled the admin area is served by the same application rather
    | than the Blade templates in resources/views/admin.
    */

    'new_admin' => (bool) env('APP_NEW_ADMIN', false),
];
