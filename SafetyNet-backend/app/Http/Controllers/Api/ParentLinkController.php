<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Guardian;
use App\Models\User;
use App\Models\LinkRequest;
use App\Models\ParentChildLink;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ParentLinkController extends Controller
{
    protected $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Send link request to child via email
     * POST /api/parent/link-request/send
     */
    public function sendLinkRequest(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'child_email' => 'required|email',
                'message' => 'nullable|string|max:500',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => $validator->errors()
                ], 422);
            }

            $parent = $request->user();

            // Check if child email exists
            $child = User::where('email', $request->child_email)->first();
            if (!$child) {
                return response()->json([
                    'success' => false,
                    'message' => 'No child account found with this email address.',
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
                    'message' => 'You are already linked with this child.',
                ], 400);
            }

            // Check for duplicate pending request
            $existingRequest = LinkRequest::where('requester_type', 'parent')
                ->where('requester_id', $parent->id)
                ->where('target_type', 'child')
                ->where('target_id', $child->id)
                ->where('status', 'pending')
                ->first();

            if ($existingRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'You already have a pending request to this child.',
                    'data' => [
                        'request_id' => $existingRequest->id,
                        'requested_at' => $existingRequest->requested_at,
                    ]
                ], 400);
            }

            // Create link request
            $linkRequest = LinkRequest::create([
                'requester_type' => 'parent',
                'requester_id' => $parent->id,
                'target_type' => 'child',
                'target_id' => $child->id,
                'target_email' => $child->email,
                'status' => 'pending',
                'message' => $request->message,
                'requested_at' => now(),
            ]);

            // Create notification for child
            $this->notificationService->createLinkRequestNotification(
                'child',
                $child->id,
                'parent',
                $parent->id,
                $linkRequest->id,
                $parent->name . ' wants to link with you.',
                $request->message
            );

            return response()->json([
                'success' => true,
                'message' => 'Link request sent successfully.',
                'data' => [
                    'request' => [
                        'id' => $linkRequest->id,
                        'child' => [
                            'id' => $child->id,
                            'name' => $child->full_name,
                            'email' => $child->email,
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
     * GET /api/parent/link-requests/sent
     */
    public function getSentRequests(Request $request)
    {
        try {
            $parent = $request->user();

            $requests = LinkRequest::where('requester_type', 'parent')
                ->where('requester_id', $parent->id)
                ->with('target:id,full_name,email')
                ->orderBy('requested_at', 'desc')
                ->get();

            $data = $requests->map(function ($req) {
                return [
                    'id' => $req->id,
                    'child' => $req->target ? [
                        'id' => $req->target->id,
                        'name' => $req->target->full_name,
                        'email' => $req->target->email,
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
     * DELETE /api/parent/link-requests/{id}/cancel
     */
    public function cancelRequest(Request $request, $id)
    {
        try {
            $parent = $request->user();

            $linkRequest = LinkRequest::where('id', $id)
                ->where('requester_type', 'parent')
                ->where('requester_id', $parent->id)
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
     * Get received link requests (from children)
     * GET /api/parent/link-requests/received
     */
    public function getReceivedRequests(Request $request)
    {
        try {
            $parent = $request->user();

            $requests = LinkRequest::where('target_type', 'parent')
                ->where('target_id', $parent->id)
                ->where('status', 'pending')
                ->with('requester:id,full_name,email')
                ->orderBy('requested_at', 'desc')
                ->get();

            $data = $requests->map(function ($req) {
                return [
                    'id' => $req->id,
                    'child' => $req->requester ? [
                        'id' => $req->requester->id,
                        'name' => $req->requester->full_name,
                        'email' => $req->requester->email,
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
     * Accept link request from child
     * POST /api/parent/link-requests/{id}/accept
     */
    public function acceptRequest(Request $request, $id)
    {
        try {
            $parent = $request->user();

            $linkRequest = LinkRequest::where('id', $id)
                ->where('target_type', 'parent')
                ->where('target_id', $parent->id)
                ->where('status', 'pending')
                ->first();

            if (!$linkRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'Request not found or already processed.',
                ], 404);
            }

            // Check if already linked
            $existingLink = ParentChildLink::where('parent_id', $parent->id)
                ->where('child_id', $linkRequest->requester_id)
                ->where('status', 'active')
                ->first();

            if ($existingLink) {
                $linkRequest->accept();
                return response()->json([
                    'success' => false,
                    'message' => 'You are already linked with this child.',
                ], 400);
            }

            DB::beginTransaction();

            try {
                // Accept the request
                $linkRequest->accept();

                // Create parent-child link
                $linkCode = strtoupper(Str::random(6));
                $parentChildLink = ParentChildLink::create([
                    'parent_id' => $parent->id,
                    'child_id' => $linkRequest->requester_id,
                    'link_code' => $linkCode,
                    'status' => 'active',
                    'linked_at' => now(),
                    'linked_via' => 'child_request',
                    'link_request_id' => $linkRequest->id,
                    'location_sharing_enabled' => true, // Enable location sharing by default
                ]);

                // Cancel any other pending requests between these two
                LinkRequest::where(function ($query) use ($linkRequest, $parent) {
                    $query->where(function ($q) use ($linkRequest, $parent) {
                        $q->where('requester_type', 'parent')
                            ->where('requester_id', $parent->id)
                            ->where('target_type', 'child')
                            ->where('target_id', $linkRequest->requester_id);
                    })->orWhere(function ($q) use ($linkRequest, $parent) {
                        $q->where('requester_type', 'child')
                            ->where('requester_id', $linkRequest->requester_id)
                            ->where('target_type', 'parent')
                            ->where('target_id', $parent->id);
                    });
                })
                    ->where('id', '!=', $linkRequest->id)
                    ->where('status', 'pending')
                    ->update(['status' => 'cancelled', 'responded_at' => now()]);

                // Notify child
                $child = User::find($linkRequest->requester_id);
                if ($child) {
                    $this->notificationService->createLinkAcceptedNotification(
                        'child',
                        $child->id,
                        'parent',
                        $parent->id,
                        $linkRequest->id,
                        $parent->name . ' has accepted your link request.'
                    );
                }

                DB::commit();

                $child->refresh();
                return response()->json([
                    'success' => true,
                    'message' => 'Link request accepted successfully.',
                    'data' => [
                        'link' => [
                            'id' => $parentChildLink->id,
                            'link_code' => $parentChildLink->link_code,
                            'status' => $parentChildLink->status,
                            'linked_at' => $parentChildLink->linked_at,
                            'child' => [
                                'id' => $child->id,
                                'name' => $child->full_name,
                                'email' => $child->email,
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
     * Reject link request from child
     * POST /api/parent/link-requests/{id}/reject
     */
    public function rejectRequest(Request $request, $id)
    {
        try {
            $parent = $request->user();

            $linkRequest = LinkRequest::where('id', $id)
                ->where('target_type', 'parent')
                ->where('target_id', $parent->id)
                ->where('status', 'pending')
                ->first();

            if (!$linkRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'Request not found or already processed.',
                ], 404);
            }

            $linkRequest->reject();

            // Notify child
            $child = User::find($linkRequest->requester_id);
            if ($child) {
                $this->notificationService->createLinkRejectedNotification(
                    'child',
                    $child->id,
                    'parent',
                    $parent->id,
                    $linkRequest->id,
                    $parent->name . ' has rejected your link request.'
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
     * GET /api/parent/link-requests/received/count
     */
    public function getReceivedCount(Request $request)
    {
        try {
            $parent = $request->user();

            $count = LinkRequest::where('target_type', 'parent')
                ->where('target_id', $parent->id)
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
     * Get all linked children
     * GET /api/parent/children
     */
    public function getChildren(Request $request)
    {
        try {
            $parent = $request->user();

            $links = ParentChildLink::where('parent_id', $parent->id)
                ->where('status', 'active')
                ->with('child:id,full_name,email,is_active')
                ->orderBy('linked_at', 'desc')
                ->get();

            $children = $links->map(function ($link) {
                return [
                    'link_id' => $link->id,
                    'link_code' => $link->link_code,
                    'linked_at' => $link->linked_at,
                    'linked_via' => $link->linked_via,
                    'child' => [
                        'id' => $link->child->id,
                        'name' => $link->child->full_name,
                        'email' => $link->child->email,
                        'is_active' => $link->child->is_active,
                    ],
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'children' => $children,
                    'count' => $children->count(),
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve children.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Remove/unlink child
     * DELETE /api/parent/children/{id}
     */
    public function unlinkChild(Request $request, $id)
    {
        try {
            $parent = $request->user();

            $link = ParentChildLink::where('parent_id', $parent->id)
                ->where('child_id', $id)
                ->where('status', 'active')
                ->first();

            if (!$link) {
                return response()->json([
                    'success' => false,
                    'message' => 'Link not found.',
                ], 404);
            }

            $child = User::find($id);
            $link->revoke();

            // Notify child
            if ($child) {
                $this->notificationService->createLinkRevokedNotification(
                    'child',
                    $child->id,
                    'parent',
                    $parent->id,
                    $parent->name . ' has removed access to your account.'
                );
            }

            return response()->json([
                'success' => true,
                'message' => 'Child unlinked successfully.',
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to unlink child.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }
}
