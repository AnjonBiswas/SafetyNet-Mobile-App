<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Configure authentication to return JSON for API routes
        $middleware->redirectGuestsTo(function ($request) {
            // Always return null for API routes to prevent redirect and let exception handler deal with it
            if ($request->expectsJson() || $request->is('api/*') || $request->wantsJson() || str_starts_with($request->path(), 'api/')) {
                return null;
            }
            return null; // For web routes only, return null (no login route exists)
        });
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Return JSON for unauthenticated API requests instead of redirecting
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, \Illuminate\Http\Request $request) {
            if ($request->expectsJson() || $request->is('api/*') || $request->wantsJson()) {
                return response()->json([
                    'error' => 'Unauthenticated',
                    'message' => 'User must be authenticated to access this resource',
                ], 401);
            }
        });
    })->create();
