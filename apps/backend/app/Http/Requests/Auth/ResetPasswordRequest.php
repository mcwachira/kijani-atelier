<?php

namespace App\Http\Requests\Auth;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ResetPasswordRequest extends FormRequest
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
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [

            // 'token' comes from the link in the password reset email —
            // the frontend reads it out of the URL query string and
            // submits it back here alongside the new password.
            'token'=>['required', 'string'],
            'email'=>['required', 'email', 'exists:users,email'],
            'password'=>['required', 'string', 'min:8', 'confirmed'],

        ];
    }
}
