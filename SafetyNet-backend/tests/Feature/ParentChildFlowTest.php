<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Guardian;
use App\Models\ParentChildLink;
use App\Models\SosAlert;
use App\Models\LocationHistory;
use App\Models\Geofence;
use App\Models\Notification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Laravel\Sanctum\Sanctum;

class ParentChildFlowTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected $parent;
    protected $child;
    protected $parentToken;
    protected $childToken;

    protected function setUp(): void
    {
        parent::setUp();

        // Create parent user
        $this->parent = Guardian::factory()->create([
            'name' => 'Test Parent',
            'email' => 'parent_test@example.com',
            'password' => bcrypt('ParentPass123!'),
            'phone' => '+8801700000000',
        ]);

        // Create child user
        $this->child = User::factory()->create([
            'full_name' => 'Test Child',
            'email' => 'child_test@example.com',
            'password' => bcrypt('ChildPass123!'),
        ]);

        // Authenticate and get tokens
        $parentLoginResponse = $this->postJson('/api/parent/login', [
            'email' => 'parent_test@example.com',
            'password' => 'ParentPass123!',
        ]);
        $this->parentToken = $parentLoginResponse->json('data.token');

        $childLoginResponse = $this->postJson('/api/login', [
            'email' => 'child_test@example.com',
            'password' => 'ChildPass123!',
        ]);
        $this->childToken = $childLoginResponse->json('data.token');
    }

    /**
     * Test complete parent-child linking flow
     */
    public function test_parent_child_linking_flow(): void
    {
        // 1. Parent sends link request
        $linkResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->parentToken,
        ])->postJson('/api/parent/link/request', [
            'child_email' => 'child_test@example.com',
        ]);

        $linkResponse->assertStatus(200)
            ->assertJson(['success' => true]);

        $linkId = $linkResponse->json('data.id');

        // 2. Child gets link requests
        $requestsResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->childToken,
        ])->getJson('/api/child/link-requests');

        $requestsResponse->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonPath('data.0.id', $linkId);

        // 3. Child accepts link
        $acceptResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->childToken,
        ])->postJson("/api/child/link-requests/{$linkId}/accept");

        $acceptResponse->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonPath('data.status', 'active');

        // 4. Parent gets children list
        $childrenResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->parentToken,
        ])->getJson('/api/parent/children');

        $childrenResponse->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'active');

        $childId = $childrenResponse->json('data.0.child_id');

        // 5. Parent unlinks child
        $unlinkResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->parentToken,
        ])->deleteJson("/api/parent/children/{$childId}");

        $unlinkResponse->assertStatus(200)
            ->assertJson(['success' => true]);

        // Verify child is unlinked
        $childrenAfterUnlink = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->parentToken,
        ])->getJson('/api/parent/children');

        $childrenAfterUnlink->assertJsonCount(0, 'data');
    }

    /**
     * Test location tracking flow
     */
    public function test_location_tracking_flow(): void
    {
        // Link parent and child first
        $link = ParentChildLink::create([
            'parent_id' => $this->parent->id,
            'child_id' => $this->child->id,
            'status' => 'active',
            'location_sharing_enabled' => true,
        ]);

        // 1. Child updates location
        $locationResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->childToken,
        ])->postJson('/api/child/location/update', [
            'latitude' => 23.8103,
            'longitude' => 90.4125,
            'battery_level' => 85,
        ]);

        $locationResponse->assertStatus(200)
            ->assertJson(['success' => true]);

        // Verify location history was created
        $this->assertDatabaseHas('location_history', [
            'child_id' => $this->child->id,
            'latitude' => 23.8103,
            'longitude' => 90.4125,
            'battery_level' => 85,
        ]);

        // 2. Parent gets child location
        $getLocationResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->parentToken,
        ])->getJson("/api/parent/children/{$this->child->id}/location");

        $getLocationResponse->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonPath('data.latitude', 23.8103)
            ->assertJsonPath('data.longitude', 90.4125)
            ->assertJsonPath('data.battery_level', 85);

        // 3. Parent gets location history
        $historyResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->parentToken,
        ])->getJson("/api/parent/children/{$this->child->id}/location/history");

        $historyResponse->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonCount(1, 'data');
    }

    /**
     * Test SOS alert flow
     */
    public function test_sos_alert_flow(): void
    {
        // Link parent and child first
        $link = ParentChildLink::create([
            'parent_id' => $this->parent->id,
            'child_id' => $this->child->id,
            'status' => 'active',
            'location_sharing_enabled' => true,
        ]);

        // 1. Child triggers SOS
        $sosResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->childToken,
        ])->postJson('/api/child/sos/trigger', [
            'latitude' => 23.8103,
            'longitude' => 90.4125,
            'message' => 'Test SOS alert',
        ]);

        $sosResponse->assertStatus(200)
            ->assertJson(['success' => true]);

        $alertId = $sosResponse->json('data.id');

        // Verify SOS alert was created
        $this->assertDatabaseHas('sos_alerts', [
            'id' => $alertId,
            'child_id' => $this->child->id,
            'parent_id' => $this->parent->id,
            'status' => 'active',
        ]);

        // Verify notification was created for parent
        $this->assertDatabaseHas('notifications', [
            'parent_id' => $this->parent->id,
            'child_id' => $this->child->id,
            'type' => 'sos',
            'is_read' => false,
        ]);

        // 2. Parent gets SOS alerts
        $alertsResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->parentToken,
        ])->getJson('/api/parent/sos/alerts?status=active');

        $alertsResponse->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $alertId)
            ->assertJsonPath('data.0.status', 'active');

        // 3. Parent gets alert details
        $alertDetailResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->parentToken,
        ])->getJson("/api/parent/sos/alerts/{$alertId}");

        $alertDetailResponse->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonPath('data.id', $alertId)
            ->assertJsonPath('data.child_id', $this->child->id);

        // 4. Parent acknowledges alert
        $acknowledgeResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->parentToken,
        ])->postJson("/api/parent/sos/alerts/{$alertId}/acknowledge");

        $acknowledgeResponse->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('sos_alerts', [
            'id' => $alertId,
            'status' => 'acknowledged',
        ]);

        // 5. Child cancels SOS
        $cancelResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->childToken,
        ])->postJson('/api/child/sos/cancel', [
            'alert_id' => $alertId,
        ]);

        $cancelResponse->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('sos_alerts', [
            'id' => $alertId,
            'status' => 'resolved',
        ]);
    }

    /**
     * Test geofencing flow
     */
    public function test_geofencing_flow(): void
    {
        // Link parent and child first
        $link = ParentChildLink::create([
            'parent_id' => $this->parent->id,
            'child_id' => $this->child->id,
            'status' => 'active',
            'location_sharing_enabled' => true,
        ]);

        // 1. Parent creates geofence
        $createGeofenceResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->parentToken,
        ])->postJson('/api/parent/geofences', [
            'child_id' => $this->child->id,
            'name' => 'Home',
            'latitude' => 23.8103,
            'longitude' => 90.4125,
            'radius' => 150,
        ]);

        $createGeofenceResponse->assertStatus(200)
            ->assertJson(['success' => true]);

        $geofenceId = $createGeofenceResponse->json('data.id');

        // Verify geofence was created
        $this->assertDatabaseHas('geofences', [
            'id' => $geofenceId,
            'parent_id' => $this->parent->id,
            'child_id' => $this->child->id,
            'name' => 'Home',
            'is_active' => true,
        ]);

        // 2. Parent gets geofences
        $geofencesResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->parentToken,
        ])->getJson("/api/parent/geofences?child_id={$this->child->id}");

        $geofencesResponse->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $geofenceId);

        // 3. Parent updates geofence
        $updateGeofenceResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->parentToken,
        ])->putJson("/api/parent/geofences/{$geofenceId}", [
            'name' => 'Home Updated',
            'radius' => 200,
            'is_active' => true,
        ]);

        $updateGeofenceResponse->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonPath('data.name', 'Home Updated')
            ->assertJsonPath('data.radius', 200);

        // 4. Parent deletes geofence
        $deleteGeofenceResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->parentToken,
        ])->deleteJson("/api/parent/geofences/{$geofenceId}");

        $deleteGeofenceResponse->assertStatus(200)
            ->assertJson(['success' => true]);

        // Verify geofence was deleted
        $this->assertDatabaseMissing('geofences', [
            'id' => $geofenceId,
        ]);
    }

    /**
     * Test notification flow
     */
    public function test_notification_flow(): void
    {
        // Link parent and child first
        $link = ParentChildLink::create([
            'parent_id' => $this->parent->id,
            'child_id' => $this->child->id,
            'status' => 'active',
            'location_sharing_enabled' => true,
        ]);

        // Create a notification manually (simulating SOS trigger)
        $notification = Notification::create([
            'parent_id' => $this->parent->id,
            'child_id' => $this->child->id,
            'type' => 'sos',
            'title' => 'SOS Alert',
            'message' => 'Test child triggered SOS',
            'is_read' => false,
        ]);

        // 1. Parent gets notifications
        $notificationsResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->parentToken,
        ])->getJson('/api/parent/notifications');

        $notificationsResponse->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $notification->id)
            ->assertJsonPath('data.0.is_read', false);

        // 2. Parent marks notification as read
        $markReadResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->parentToken,
        ])->putJson("/api/parent/notifications/{$notification->id}/read");

        $markReadResponse->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('notifications', [
            'id' => $notification->id,
            'is_read' => true,
        ]);

        // 3. Parent gets unread count
        $unreadCountResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->parentToken,
        ])->getJson('/api/parent/notifications/unread-count');

        $unreadCountResponse->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonPath('data.count', 0);
    }

    /**
     * Test complete end-to-end flow
     */
    public function test_complete_e2e_flow(): void
    {
        // 1. Parent registers and logs in (already done in setUp)

        // 2. Parent sends link request
        $linkResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->parentToken,
        ])->postJson('/api/parent/link/request', [
            'child_email' => 'child_test@example.com',
        ]);

        $linkId = $linkResponse->json('data.id');

        // 3. Child accepts link
        $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->childToken,
        ])->postJson("/api/child/link-requests/{$linkId}/accept");

        // 4. Child updates location
        $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->childToken,
        ])->postJson('/api/child/location/update', [
            'latitude' => 23.8103,
            'longitude' => 90.4125,
            'battery_level' => 85,
        ]);

        // 5. Parent sees child location
        $locationResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->parentToken,
        ])->getJson("/api/parent/children/{$this->child->id}/location");

        $locationResponse->assertStatus(200)
            ->assertJsonPath('data.latitude', 23.8103);

        // 6. Child triggers SOS
        $sosResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->childToken,
        ])->postJson('/api/child/sos/trigger', [
            'latitude' => 23.8103,
            'longitude' => 90.4125,
            'message' => 'Emergency SOS',
        ]);

        $alertId = $sosResponse->json('data.id');

        // 7. Parent receives notification
        $notificationsResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->parentToken,
        ])->getJson('/api/parent/notifications');

        $notificationsResponse->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.type', 'sos');

        // 8. Parent creates geofence
        $geofenceResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->parentToken,
        ])->postJson('/api/parent/geofences', [
            'child_id' => $this->child->id,
            'name' => 'School',
            'latitude' => 23.8200,
            'longitude' => 90.4200,
            'radius' => 100,
        ]);

        $geofenceId = $geofenceResponse->json('data.id');

        // 9. Child resolves SOS
        $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->childToken,
        ])->postJson('/api/child/sos/cancel', [
            'alert_id' => $alertId,
        ]);

        // Verify final state
        $this->assertDatabaseHas('sos_alerts', [
            'id' => $alertId,
            'status' => 'resolved',
        ]);

        $this->assertDatabaseHas('geofences', [
            'id' => $geofenceId,
            'is_active' => true,
        ]);
    }
}

