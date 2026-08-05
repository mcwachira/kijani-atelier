<?php

namespace App\Http\Requests\Auth;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
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

            // Deliberately NO 'exists:users,email' rule here. If we
            // validated "does this email exist," a wrong email would
            // return a different error than a wrong password — which
            // tells an attacker which emails are registered. Auth::attempt
            // in the controller handles both cases identically instead.
            'email'=>['required', 'email'],
            'password'=>['required', 'string'],
        ];
    }
}
