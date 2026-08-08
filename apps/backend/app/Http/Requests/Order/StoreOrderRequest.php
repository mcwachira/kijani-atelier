<?php

namespace App\Http\Requests\Order;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreOrderRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // guest checkout is allowed — no auth required
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
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:20'],
            'county' => ['required', 'string', 'max:255'],
            'town' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string', 'max:500'],
            'payment_method' => ['required', 'in:mpesa,card'],

            // Items are read from the request body, not re-derived from
            // server-side cart state — decouples checkout from cart
            // implementation. The CONTROLLER re-reads price/stock from
            // the database regardless, so a tampered client-side price
            // can never be trusted, even though it's never sent here at all.
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:20'],
            'items.*.size' => ['nullable', 'string', 'max:20'],
        ];
    }
}
