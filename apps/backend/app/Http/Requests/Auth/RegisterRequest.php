<?php

namespace App\Http\Requests\Auth;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    /**
     * WHY a separate authorize() check exists at all: this method answers
     * "is this request allowed to even reach the endpoint," which is a
     * DIFFERENT question from "is the data valid" (handled below in
     * rules()). Registration is public — anyone, logged in or not, may
     * attempt it — so this always returns true. Compare this to something
     * like an "update my own profile" endpoint later, where authorize()
     * would check the request actually belongs to the logged-in user.
     */
    public function authorize(): bool
    {
        return true; //  this is a public route and anyone can use it
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],

            // unique:users,email — this is what actually returns a proper
            // 422 "email already taken" error instead of the DB throwing a
            // raw unique-constraint SQLException that leaks a stack trace.
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],

            // nullable — phone isn't required at signup. It gets collected
            // later, likely right before an M-Pesa payment (Phase 3), since
            // that's the first place it's actually needed.
            'phone' => ['nullable', 'string', 'max:20', 'unique:users,phone'],

            // 'confirmed' automatically requires a matching
            // `password_confirmation` field in the request body — Laravel
            // wires that check up for you, you don't validate it manually.
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }
}
