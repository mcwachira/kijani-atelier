<?php

namespace App\Http\Requests\Cart;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class AddCartItemRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {

        // Public — both guests and logged-in users can add to cart.
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
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:20'],
            'size' => ['nullable', 'string', 'max:20'],
        ];
    }


    /**
     * Validates the X-Cart-Token header's format BEFORE resolveCart()
     * ever tries to use it — catches a malformed guest token as a clean
     * 422 with a clear message, instead of letting Postgres reject it
     * with a raw, less friendly database-level exception.
     */
    protected function prepareForValidation(): void
    {
        $token = $this->header('X-Cart-Token');

        if ($token && ! \Illuminate\Support\Str::isUuid($token)) {
            abort(422, 'X-Cart-Token must be a valid UUID.');
        }
    }
}
