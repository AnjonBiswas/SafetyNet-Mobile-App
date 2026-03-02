<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Guardian;
use App\Models\LinkRequest;
use App\Models\ParentChildLink;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ChildLinkController extends Controller
{
    protected $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Send link request to parent via email
     * POST /api/child/link-request/send
     */
    public function sendLinkRequest(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'parent_email' => 'required|email',
                'message' => 'nullable|string|max:500',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => $validator->errors()
                ], 422);
            }

            $child = $request->user();

            // Check if parent email exists
            $parent = Guardian::where('email', $request->parent_email)->first();
            if (!$parent) {
                return response()->json([
                    'success' => false,
                    'message' => 'No parent account found with this email address.',
                ], 404);
            }

            // Check if already linked
            $existingLink = ParentChildLink::where('parent_id', $parent->id)
                ->where('child_id', $child->id)
                ->where('status', 'active')
                ->first();

            if ($existingLink) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are already linked with this parent.',
                ], 400);
            }

            // Check for duplicate pending request
            $existingRequest = LinkRequest::where('requester_type', 'child')
                ->where('requester_id', $child->id)
                ->where('target_type', 'parent')
                ->where('target_id', $parent->id)
                ->where('status', 'pending')
                ->first();

            if ($existingRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'You already have a pending request to this parent.',
                    'data' => [
                        'request_id' => $existingRequest->id,
                        'requested_at' => $existingRequest->requested_at,
                    ]
                ], 400);
            }

            // Create link request
            $linkRequest = LinkRequest::create([
                'requester_type' => 'child',
                'requester_id' => $child->id,
                'target_type' => 'parent',
                'target_id' => $parent->id,
                'target_email' => $parent->email,
                'status' => 'pending',
                'message' => $request->message,
                'requested_at' => now(),
            ]);

            // Create notification for parent
            $this->notificationService->createLinkRequestNotification(
                'parent',
                $parent->id,
                'child',
                $child->id,
                $linkRequest->id,
                $child->full_name . ' wants to link with you.',
                $request->message
            );

            return response()->json([
                'success' => true,
                'message' => 'Link request sent successfully.',
                'data' => [
                    'request' => [
                        'id' => $linkRequest->id,
                        'parent' => [
                            'id' => $parent->id,
                            'name' => $parent->name,
                            'email' => $parent->email,
                        ],
                        'status' => $linkRequest->status,
                        'requested_at' => $linkRequest->requested_at,
                    ]
                ]
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to send link request.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get sent link requests
     * GET /api/child/link-requests/sent
     */
    public function getSentRequests(Request $request)
    {
        try {
            $child = $request->user();

            $requests = LinkRequest::where('requester_type', 'child')
                ->where('requester_id', $child->id)
                ->with('target:id,name,email,profile_image')
                ->orderBy('requested_at', 'desc')
                ->get();

            $data = $requests->map(function ($req) {
                return [
                    'id' => $req->id,
                    'parent' => $req->target ? [
                        'id' => $req->target->id,
                        'name' => $req->target->name,
                        'email' => $req->target->email,
                        'profile_image' => $req->target->profile_image,
                    ] : [
                        'email' => $req->target_email,
                    ],
                    'status' => $req->status,
                    'message' => $req->message,
                    'requested_at' => $req->requested_at,
                    'responded_at' => $req->responded_at,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'requests' => $data,
                    'count' => $data->count(),
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve sent requests.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Cancel sent link request
     * DELETE /api/child/link-requests/{id}/cancel
     */
    public function cancelRequest(Request $request, $id)
    {
        try {
            $child = $request->user();

            $linkRequest = LinkRequest::where('id', $id)
                ->where('requester_type', 'child')
                ->where('requester_id', $child->id)
                ->where('status', 'pending')
                ->first();

            if (!$linkRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'Request not found or cannot be cancelled.',
                ], 404);
            }

            $linkRequest->cancel();

            return response()->json([
                'success' => true,
                'message' => 'Link request cancelled successfully.',
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel request.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get received link requests (from parents)
     * GET /api/child/link-requests/received
     */
    public function getReceivedRequests(Request $request)
    {
        try {
            $child = $request->user();

            $requests = LinkRequest::where('target_type', 'child')
                ->where('target_id', $child->id)
                ->where('status', 'pending')
                ->with('requester:id,name,email,profile_image')
                ->orderBy('requested_at', 'desc')
                ->get();

            $data = $requests->map(function ($req) {
                return [
                    'id' => $req->id,
                    'parent' => $req->requester ? [
                        'id' => $req->requester->id,
                        'name' => $req->requester->name,
                        'email' => $req->requester->email,
                        'profile_image' => $req->requester->profile_image,
                    ] : [
                        'email' => $req->target_email,
                    ],
                    'message' => $req->message,
                    'requested_at' => $req->requested_at,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'requests' => $data,
                    'count' => $data->count(),
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve received requests.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Accept link request from parent
     * POST /api/child/link-requests/{id}/accept
     */
    public function acceptRequest(Request $request, $id)
    {
        try {
            $child = $request->user();

            $linkRequest = LinkRequest::where('id', $id)
                ->where('target_type', 'child')
                ->where('target_id', $child->id)
                ->where('status', 'pending')
                ->first();

            if (!$linkRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'Request not found or already processed.',
                ], 404);
            }

            // Check if already linked
            $existingLink = ParentChildLink::where('parent_id', $linkRequest->requester_id)
                ->where('child_id', $child->id)
                ->where('status', 'active')
                ->first();

            if ($existingLink) {
                $linkRequest->accept();
                return response()->json([
                    'success' => false,
                    'message' => 'You are already linked with this parent.',
                ], 400);
            }

            DB::beginTransaction();

            try {
                // Accept the request
                $linkRequest->accept();

                // Create parent-child link
                $linkCode = strtoupper(Str::random(6));
                $parentChildLink = ParentChildLink::create([
                    'parent_id' => $linkRequest->requester_id,
                    'child_id' => $child->id,
                    'link_code' => $linkCode,
                    'status' => 'active',
                    'linked_at' => now(),
                    'linked_via' => 'parent_request',
                    'link_request_id' => $linkRequest->id,
                    'location_sharing_enabled' => true, // Enable location sharing by default
                ]);

                // Cancel any other pending requests between these two
                LinkRequest::where(function ($query) use ($linkRequest, $child) {
                    $query->where(function ($q) use ($linkRequest, $child) {
                        $q->where('requester_type', 'parent')
                            ->where('requester_id', $linkRequest->requester_id)
                            ->where('target_type', 'child')
                            ->where('target_id', $child->id);
                    })->orWhere(function ($q) use ($linkRequest, $child) {
                        $q->where('requester_type', 'child')
                            ->where('requester_id', $child->id)
                            ->where('target_type', 'parent')
                            ->where('target_id', $linkRequest->requester_id);
                    });
                })
                ->where('id', '!=', $linkRequest->id)
                ->where('status', 'pending')
                ->update(['status' => 'cancelled', 'responded_at' => now()]);

                // Notify parent
                $parent = Guardian::find($linkRequest->requester_id);
                if ($parent) {
                    $this->notificationService->createLinkAcceptedNotification(
                        'parent',
                        $parent->id,
                        'child',
                        $child->id,
                        $linkRequest->id,
                        $child->full_name . ' has accepted your link request.'
                    );
                }

                DB::commit();

                $parent->refresh();
                return response()->json([
                    'success' => true,
                    'message' => 'Link request accepted successfully.',
                    'data' => [
                        'link' => [
                            'id' => $parentChildLink->id,
                            'link_code' => $parentChildLink->link_code,
                            'status' => $parentChildLink->status,
                            'linked_at' => $parentChildLink->linked_at,
                            'parent' => [
                                'id' => $parent->id,
                                'name' => $parent->name,
                                'email' => $parent->email,
                                'profile_image' => $parent->profile_image,
                            ],
                        ]
                    ]
                ], 200);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to accept link request.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Reject link request from parent
     * POST /api/child/link-requests/{id}/reject
     */
    public function rejectRequest(Request $request, $id)
    {
        try {
            $child = $request->user();

            $linkRequest = LinkRequest::where('id', $id)
                ->where('target_type', 'child')
                ->where('target_id', $child->id)
                ->where('status', 'pending')
                ->first();

            if (!$linkRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'Request not found or already processed.',
                ], 404);
            }

            $linkRequest->reject();

            // Notify parent
            $parent = Guardian::find($linkRequest->requester_id);
            if ($parent) {
                $this->notificationService->createLinkRejectedNotification(
                    'parent',
                    $parent->id,
                    'child',
                    $child->id,
                    $linkRequest->id,
                    $child->full_name . ' has rejected your link request.'
                );
            }

            return response()->json([
                'success' => true,
                'message' => 'Link request rejected successfully.',
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to reject link request.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get count of received requests
     * GET /api/child/link-requests/received/count
     */
    public function getReceivedCount(Request $request)
    {
        try {
            $child = $request->user();

            $count = LinkRequest::where('target_type', 'child')
                ->where('target_id', $child->id)
                ->where('status', 'pending')
                ->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'count' => $count,
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get request count.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get all linked parents
     * GET /api/child/parents
     */
    public function getParents(Request $request)
    {
        try {
            $child = $request->user();

            $links = ParentChildLink::where('child_id', $child->id)
                ->where('status', 'active')
                ->with('parent:id,name,email,phone,profile_image')
                ->orderBy('linked_at', 'desc')
                ->get();

            $parents = $links->map(function ($link) {
                return [
                    'link_id' => $link->id,
                    'link_code' => $link->link_code,
                    'linked_at' => $link->linked_at,
                    'linked_via' => $link->linked_via,
                    'parent' => [
                        'id' => $link->parent->id,
                        'name' => $link->parent->name,
                        'email' => $link->parent->email,
                        'phone' => $link->parent->phone,
                        'profile_image' => $link->parent->profile_image,
                    ],
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'parents' => $parents,
                    'count' => $parents->count(),
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve parents.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Create a direct link with a parent (e.g., via QR code scan)
     * POST /api/child/parents/link-direct
     */
    public function linkDirect(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'parent_email' => 'required|email',
                'parent_id' => 'required|integer|exists:parents,id',
                'parent_name' => 'nullable|string|max:255',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => $validator->errors()
                ], 422);
            }

            $child = $request->user();
            $parentId = $request->parent_id;
            $parentEmail = $request->parent_email;
            $parentName = $request->parent_name;

            // Check if parent exists
            $parent = Guardian::find($parentId);
            if (!$parent || $parent->email !== $parentEmail) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid parent information provided.',
                ], 404);
            }

            // Check if already linked (check for ANY existing link, regardless of status)
            $existingLink = ParentChildLink::where('parent_id', $parentId)
                ->where('child_id', $child->id)
                ->first();

            if ($existingLink) {
                // If link exists but is not active, reactivate it
                if ($existingLink->status !== 'active') {
                    DB::beginTransaction();
                    try {
                        $existingLink->update([
                            'status' => 'active',
                            'linked_at' => now(),
                            'linked_via' => 'child_request',
                            'location_sharing_enabled' => true,
                        ]);

                        // Cancel any pending requests
                        LinkRequest::where(function ($query) use ($parentId, $child) {
                            $query->where(function ($q) use ($parentId, $child) {
                                $q->where('requester_type', 'parent')
                                    ->where('requester_id', $parentId)
                                    ->where('target_type', 'child')
                                    ->where('target_id', $child->id);
                            })->orWhere(function ($q) use ($parentId, $child) {
                                $q->where('requester_type', 'child')
                                    ->where('requester_id', $child->id)
                                    ->where('target_type', 'parent')
                                    ->where('target_id', $parentId);
                            });
                        })
                        ->where('status', 'pending')
                        ->update(['status' => 'cancelled', 'responded_at' => now()]);

                        // Notify parent
                        $this->notificationService->createLinkAcceptedNotification(
                            'parent',
                            $parentId,
                            'child',
                            $child->id,
                            null,
                            $child->full_name . ' has re-linked with you via QR code.'
                        );

                        DB::commit();

                        return response()->json([
                            'success' => true,
                            'message' => 'Successfully re-linked with parent.',
                            'data' => [
                                'link' => [
                                    'id' => $existingLink->id,
                                    'link_code' => $existingLink->link_code,
                                    'status' => $existingLink->status,
                                    'linked_at' => $existingLink->linked_at,
                                    'parent' => [
                                        'id' => $parent->id,
                                        'name' => $parent->name,
                                        'email' => $parent->email,
                                    ],
                                ]
                            ]
                        ], 200);
                    } catch (\Exception $e) {
                        DB::rollBack();
                        throw $e;
                    }
                } else {
                    // Link already exists and is active
                    return response()->json([
                        'success' => false,
                        'message' => 'You are already linked with this parent.',
                        'data' => [
                            'link_id' => $existingLink->id,
                        ]
                    ], 400);
                }
            }

            DB::beginTransaction();

            try {
                // Create parent-child link directly
                $linkCode = strtoupper(Str::random(6));
                $parentChildLink = ParentChildLink::create([
                    'parent_id' => $parentId,
                    'child_id' => $child->id,
                    'link_code' => $linkCode,
                    'status' => 'active',
                    'linked_at' => now(),
                    'linked_via' => 'child_request', // Initiated by child scanning QR
                    'link_request_id' => null, // No explicit link request
                    'location_sharing_enabled' => true, // Enable location sharing by default
                ]);

                // Cancel any pending requests between these two
                LinkRequest::where(function ($query) use ($parentId, $child) {
                    $query->where(function ($q) use ($parentId, $child) {
                        $q->where('requester_type', 'parent')
                            ->where('requester_id', $parentId)
                            ->where('target_type', 'child')
                            ->where('target_id', $child->id);
                    })->orWhere(function ($q) use ($parentId, $child) {
                        $q->where('requester_type', 'child')
                            ->where('requester_id', $child->id)
                            ->where('target_type', 'parent')
                            ->where('target_id', $parentId);
                    });
                })
                ->where('status', 'pending')
                ->update(['status' => 'cancelled', 'responded_at' => now()]);

                // Notify parent
                $this->notificationService->createLinkAcceptedNotification(
                    'parent',
                    $parentId,
                    'child',
                    $child->id,
                    null, // No link_request_id for direct link
                    $child->full_name . ' has linked with you via QR code.'
                );

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Successfully linked with parent.',
                    'data' => [
                        'link' => [
                            'id' => $parentChildLink->id,
                            'link_code' => $parentChildLink->link_code,
                            'status' => $parentChildLink->status,
                            'linked_at' => $parentChildLink->linked_at,
                            'parent' => [
                                'id' => $parent->id,
                                'name' => $parent->name,
                                'email' => $parent->email,
                            ],
                        ]
                    ]
                ], 201);

            } catch (\Exception $e) {
                DB::rollBack();
                \Log::error('Failed to create direct link: ' . $e->getMessage(), [
                    'trace' => $e->getTraceAsString(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to create direct link.',
                    'error' => config('app.debug') ? $e->getMessage() : null
                ], 500);
            }

        } catch (\Exception $e) {
            \Log::error('Error in linkDirect method: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to process direct link.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Remove/unlink parent
     * DELETE /api/child/parents/{id}
     */
    public function removeParent(Request $request, $id)
    {
        try {
            $child = $request->user();

            $link = ParentChildLink::where('child_id', $child->id)
                ->where('parent_id', $id)
                ->where('status', 'active')
                ->first();

            if (!$link) {
                return response()->json([
                    'success' => false,
                    'message' => 'Link not found.',
                ], 404);
            }

            $parent = Guardian::find($id);
            $link->revoke();

            // Notify parent
            if ($parent) {
                $this->notificationService->createLinkRevokedNotification(
                    'parent',
                    $parent->id,
                    'child',
                    $child->id,
                    $child->full_name . ' has removed your access to their account.'
                );
            }

            return response()->json([
                'success' => true,
                'message' => 'Parent access removed successfully.',
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to remove parent access.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }
}
