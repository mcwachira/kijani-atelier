<?php

namespace App\Http\Requests\Message;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreMessageRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // public contact form
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            // Kenyan mobile (0712…, +254712…) or any international
            // E.164-ish number. Allows spaces/dashes/parens for human
            // input; must start with a digit or + and contain at least
            // 7 digits so '123' or 'abc' can never be stored.
            'phone' => ['required', 'string', 'max:20', 'regex:/^\+?[0-9][0-9\s\-()]{5,19}$/'],
            'subject' => ['required', 'string', 'min:3', 'max:255'],
            'body' => ['required', 'string', 'min:10', 'max:1000'],
        ];
    }
}
