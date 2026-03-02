<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class UpdateParentProfileRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|nullable|string|max:20',
            'profile_image' => 'sometimes|image|mimes:jpeg,png,jpg,gif|max:2048', // Max 2MB
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.string' => 'Name must be a valid string.',
            'name.max' => 'Name must not exceed 255 characters.',
            'phone.string' => 'Phone must be a valid string.',
            'phone.max' => 'Phone must not exceed 20 characters.',
            'profile_image.image' => 'Profile image must be an image file.',
            'profile_image.mimes' => 'Profile image must be a jpeg, png, jpg, or gif file.',
            'profile_image.max' => 'Profile image must not exceed 2MB.',
        ];
    }
}

