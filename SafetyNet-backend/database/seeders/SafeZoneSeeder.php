<?php

namespace Database\Seeders;

use App\Models\SafeZone;
use Illuminate\Database\Seeder;

class SafeZoneSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Seeds safe zones with Dhaka area data.
     */
    public function run(): void
    {
        // Dhaka area coordinates and data
        // Coordinates are approximate center points for each area
        $zones = [
            // High risk areas (red) - > 250 incidents
            ['area_name' => 'New Market', 'latitude' => 23.7298, 'longitude' => 90.3954, 'radius' => 500, 'risk_level' => 'red', 'incident_count' => 324, 'incident_details' => ['Physical harassment', 'Eve-teasing']],
            ['area_name' => 'Farmgate', 'latitude' => 23.7549, 'longitude' => 90.3842, 'radius' => 400, 'risk_level' => 'red', 'incident_count' => 312, 'incident_details' => ['Physical harassment', 'Eve-teasing']],
            ['area_name' => 'TSC Area', 'latitude' => 23.7333, 'longitude' => 90.3933, 'radius' => 400, 'risk_level' => 'red', 'incident_count' => 289, 'incident_details' => ['Eve-teasing', 'Verbal harassment']],
            ['area_name' => 'Mirpur', 'latitude' => 23.8050, 'longitude' => 90.3667, 'radius' => 600, 'risk_level' => 'red', 'incident_count' => 289, 'incident_details' => ['Eve-teasing', 'Physical harassment', 'Stalking']],
            ['area_name' => 'Nilkhet', 'latitude' => 23.7300, 'longitude' => 90.3900, 'radius' => 350, 'risk_level' => 'red', 'incident_count' => 267, 'incident_details' => ['Physical harassment', 'Eve-teasing']],
            ['area_name' => 'Motijheel', 'latitude' => 23.7300, 'longitude' => 90.4200, 'radius' => 500, 'risk_level' => 'red', 'incident_count' => 267, 'incident_details' => ['Eve-teasing', 'Physical harassment']],
            ['area_name' => 'Mohakhali', 'latitude' => 23.7800, 'longitude' => 90.4100, 'radius' => 450, 'risk_level' => 'red', 'incident_count' => 267, 'incident_details' => ['Eve-teasing', 'Physical harassment']],
            ['area_name' => 'Shahbagh', 'latitude' => 23.7361, 'longitude' => 90.3956, 'radius' => 400, 'risk_level' => 'red', 'incident_count' => 298, 'incident_details' => ['Eve-teasing', 'Verbal harassment']],
            ['area_name' => 'Elephant Road', 'latitude' => 23.7300, 'longitude' => 90.4000, 'radius' => 400, 'risk_level' => 'red', 'incident_count' => 276, 'incident_details' => ['Eve-teasing', 'Physical harassment']],
            ['area_name' => 'Jatrabari', 'latitude' => 23.7100, 'longitude' => 90.4300, 'radius' => 500, 'risk_level' => 'red', 'incident_count' => 278, 'incident_details' => ['Physical harassment', 'Eve-teasing']],
            ['area_name' => 'Banglamotor', 'latitude' => 23.7500, 'longitude' => 90.3900, 'radius' => 400, 'risk_level' => 'red', 'incident_count' => 278, 'incident_details' => ['Eve-teasing', 'Physical harassment']],
            ['area_name' => 'Moghbazar', 'latitude' => 23.7600, 'longitude' => 90.4000, 'radius' => 400, 'risk_level' => 'red', 'incident_count' => 256, 'incident_details' => ['Physical harassment', 'Eve-teasing']],
            ['area_name' => 'Tejgaon', 'latitude' => 23.7600, 'longitude' => 90.4100, 'radius' => 500, 'risk_level' => 'red', 'incident_count' => 256, 'incident_details' => ['Physical harassment', 'Eve-teasing']],

            // Medium risk areas (orange) - 150-250 incidents
            ['area_name' => 'Gulshan', 'latitude' => 23.7900, 'longitude' => 90.4100, 'radius' => 600, 'risk_level' => 'orange', 'incident_count' => 245, 'incident_details' => ['Eve-teasing', 'Stalking', 'Verbal harassment']],
            ['area_name' => 'Dhanmondi', 'latitude' => 23.7461, 'longitude' => 90.3742, 'radius' => 600, 'risk_level' => 'orange', 'incident_count' => 232, 'incident_details' => ['Eve-teasing', 'Stalking', 'Physical harassment']],
            ['area_name' => 'Dhanmondi Lake', 'latitude' => 23.7500, 'longitude' => 90.3700, 'radius' => 400, 'risk_level' => 'orange', 'incident_count' => 234, 'incident_details' => ['Eve-teasing', 'Stalking']],
            ['area_name' => 'Badda', 'latitude' => 23.7800, 'longitude' => 90.4200, 'radius' => 500, 'risk_level' => 'orange', 'incident_count' => 234, 'incident_details' => ['Verbal harassment', 'Eve-teasing']],
            ['area_name' => 'Malibagh', 'latitude' => 23.7500, 'longitude' => 90.4200, 'radius' => 400, 'risk_level' => 'orange', 'incident_count' => 245, 'incident_details' => ['Eve-teasing', 'Physical harassment']],
            ['area_name' => 'Science Lab', 'latitude' => 23.7400, 'longitude' => 90.3800, 'radius' => 400, 'risk_level' => 'orange', 'incident_count' => 245, 'incident_details' => ['Eve-teasing', 'Physical harassment']],
            ['area_name' => 'Kalabagan', 'latitude' => 23.7500, 'longitude' => 90.3800, 'radius' => 400, 'risk_level' => 'orange', 'incident_count' => 189, 'incident_details' => ['Eve-teasing', 'Verbal harassment']],
            ['area_name' => 'Mohammadpur', 'latitude' => 23.7600, 'longitude' => 90.3600, 'radius' => 500, 'risk_level' => 'orange', 'incident_count' => 178, 'incident_details' => ['Verbal harassment', 'Eve-teasing']],
            ['area_name' => 'Azimpur', 'latitude' => 23.7200, 'longitude' => 90.3800, 'radius' => 400, 'risk_level' => 'orange', 'incident_count' => 178, 'incident_details' => ['Verbal harassment', 'Eve-teasing']],
            ['area_name' => 'Banasree', 'latitude' => 23.7700, 'longitude' => 90.4300, 'radius' => 500, 'risk_level' => 'orange', 'incident_count' => 189, 'incident_details' => ['Eve-teasing', 'Verbal harassment']],
            ['area_name' => 'Bashundhara', 'latitude' => 23.8100, 'longitude' => 90.4300, 'radius' => 600, 'risk_level' => 'orange', 'incident_count' => 178, 'incident_details' => ['Verbal harassment', 'Stalking']],
            ['area_name' => 'Pallabi', 'latitude' => 23.8200, 'longitude' => 90.3600, 'radius' => 500, 'risk_level' => 'orange', 'incident_count' => 178, 'incident_details' => ['Verbal harassment', 'Eve-teasing']],
            ['area_name' => 'Uttara', 'latitude' => 23.8700, 'longitude' => 90.3900, 'radius' => 800, 'risk_level' => 'orange', 'incident_count' => 156, 'incident_details' => ['Verbal harassment', 'Stalking']],
            ['area_name' => 'Rampura', 'latitude' => 23.7600, 'longitude' => 90.4300, 'radius' => 500, 'risk_level' => 'orange', 'incident_count' => 167, 'incident_details' => ['Verbal harassment', 'Stalking']],
            ['area_name' => 'Khilgaon', 'latitude' => 23.7500, 'longitude' => 90.4400, 'radius' => 500, 'risk_level' => 'orange', 'incident_count' => 189, 'incident_details' => ['Verbal harassment', 'Eve-teasing']],
            ['area_name' => 'Hazaribagh', 'latitude' => 23.7400, 'longitude' => 90.3600, 'radius' => 400, 'risk_level' => 'orange', 'incident_count' => 167, 'incident_details' => ['Eve-teasing', 'Verbal harassment']],
            ['area_name' => 'Khilkhet', 'latitude' => 23.8300, 'longitude' => 90.4200, 'radius' => 500, 'risk_level' => 'orange', 'incident_count' => 167, 'incident_details' => ['Verbal harassment', 'Eve-teasing']],
            ['area_name' => 'Kafrul', 'latitude' => 23.7800, 'longitude' => 90.3800, 'radius' => 400, 'risk_level' => 'orange', 'incident_count' => 156, 'incident_details' => ['Verbal harassment', 'Stalking']],
            ['area_name' => 'Shantinagar', 'latitude' => 23.7400, 'longitude' => 90.4100, 'radius' => 400, 'risk_level' => 'orange', 'incident_count' => 167, 'incident_details' => ['Eve-teasing', 'Verbal harassment']],
            ['area_name' => 'Green Road', 'latitude' => 23.7500, 'longitude' => 90.3900, 'radius' => 400, 'risk_level' => 'orange', 'incident_count' => 167, 'incident_details' => ['Verbal harassment', 'Eve-teasing']],
            ['area_name' => 'Panthapath', 'latitude' => 23.7600, 'longitude' => 90.3800, 'radius' => 400, 'risk_level' => 'orange', 'incident_count' => 156, 'incident_details' => ['Verbal harassment', 'Stalking']],
            ['area_name' => 'Bailey Road', 'latitude' => 23.7500, 'longitude' => 90.4000, 'radius' => 400, 'risk_level' => 'orange', 'incident_count' => 156, 'incident_details' => ['Verbal harassment', 'Stalking']],
            ['area_name' => 'Purana Paltan', 'latitude' => 23.7300, 'longitude' => 90.4100, 'radius' => 400, 'risk_level' => 'orange', 'incident_count' => 167, 'incident_details' => ['Eve-teasing', 'Verbal harassment']],

            // Low risk areas (green) - < 150 incidents
            ['area_name' => 'Banani', 'latitude' => 23.7900, 'longitude' => 90.4000, 'radius' => 500, 'risk_level' => 'green', 'incident_count' => 128, 'incident_details' => ['Stalking', 'Verbal harassment', 'Eve-teasing']],
            ['area_name' => 'Baridhara', 'latitude' => 23.8000, 'longitude' => 90.4200, 'radius' => 500, 'risk_level' => 'green', 'incident_count' => 104, 'incident_details' => ['Verbal harassment', 'Stalking']],
            ['area_name' => 'Karwan Bazar', 'latitude' => 23.7500, 'longitude' => 90.3900, 'radius' => 400, 'risk_level' => 'green', 'incident_count' => 128, 'incident_details' => ['Physical harassment', 'Eve-teasing']],
            ['area_name' => 'Cantonment', 'latitude' => 23.8400, 'longitude' => 90.4000, 'radius' => 600, 'risk_level' => 'green', 'incident_count' => 89, 'incident_details' => ['Verbal harassment']],
            ['area_name' => 'Wari', 'latitude' => 23.7100, 'longitude' => 90.4100, 'radius' => 400, 'risk_level' => 'green', 'incident_count' => 145, 'incident_details' => ['Verbal harassment', 'Eve-teasing']],
            ['area_name' => 'Old Dhaka', 'latitude' => 23.7100, 'longitude' => 90.4000, 'radius' => 600, 'risk_level' => 'green', 'incident_count' => 156, 'incident_details' => ['Eve-teasing', 'Verbal harassment']],
            ['area_name' => 'Lalbagh', 'latitude' => 23.7200, 'longitude' => 90.3900, 'radius' => 400, 'risk_level' => 'green', 'incident_count' => 134, 'incident_details' => ['Verbal harassment', 'Eve-teasing']],
            ['area_name' => 'Kamrangirchar', 'latitude' => 23.7000, 'longitude' => 90.3800, 'radius' => 400, 'risk_level' => 'green', 'incident_count' => 145, 'incident_details' => ['Verbal harassment', 'Eve-teasing']],
            ['area_name' => 'Kakrail', 'latitude' => 23.7400, 'longitude' => 90.4000, 'radius' => 400, 'risk_level' => 'green', 'incident_count' => 145, 'incident_details' => ['Verbal harassment', 'Eve-teasing']],
            ['area_name' => 'Ramna', 'latitude' => 23.7300, 'longitude' => 90.4000, 'radius' => 400, 'risk_level' => 'green', 'incident_count' => 134, 'incident_details' => ['Verbal harassment', 'Stalking']],
            ['area_name' => 'Paltan', 'latitude' => 23.7300, 'longitude' => 90.4100, 'radius' => 400, 'risk_level' => 'green', 'incident_count' => 156, 'incident_details' => ['Verbal harassment', 'Eve-teasing']],
            ['area_name' => 'Eskaton', 'latitude' => 23.7400, 'longitude' => 90.4000, 'radius' => 400, 'risk_level' => 'green', 'incident_count' => 145, 'incident_details' => ['Verbal harassment', 'Eve-teasing']],
            ['area_name' => 'Segunbagicha', 'latitude' => 23.7400, 'longitude' => 90.4100, 'radius' => 400, 'risk_level' => 'green', 'incident_count' => 134, 'incident_details' => ['Verbal harassment', 'Eve-teasing']],
        ];

        foreach ($zones as $zone) {
            SafeZone::create($zone);
        }

        $this->command->info('Safe zones seeded successfully!');
    }
}
