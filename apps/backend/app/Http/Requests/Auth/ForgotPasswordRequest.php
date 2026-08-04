<?php

namespace App\Http\Requests\Auth;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ForgotPasswordRequest extends FormRequest
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
     * @return array<string, ValidationRule|array<mixed>|string>s
     */
    public function rules(): array
    {
        // Same reasoning as LoginRequest: no 'exists:users,email' check.
        // The controller returns an identical success message whether or
        // not the email is registered — see PasswordResetController below.
        return ['email' => ['required', 'email']];
    }
}
