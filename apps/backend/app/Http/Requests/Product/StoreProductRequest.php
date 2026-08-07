<?php

namespace App\Http\Requests\Product;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
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
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:products,slug'],
            'description' => ['nullable', 'string'],
            'craft_note' => ['nullable', 'string'],
            'price' => ['required', 'integer', 'min:0'],
            // Deliberately allows compare_at_price to be OMITTED (no sale
            // price) but validates it against the DB's own check
            // constraint's intent when present: it must exceed 'price',
            // or the "was X, now Y" display would show a nonsensical
            // negative discount.
            'compare_at_price' => ['nullable', 'integer', 'gt:price'],
            'stock' => ['nullable', 'integer', 'min:0'],
            'is_new' => ['nullable', 'boolean'],

            // Arrays of EXISTING ids — this endpoint attaches to materials/
            // sizes that already exist (seeded via MaterialSeeder/SizeSeeder
            // or created via their own admin endpoints), it doesn't create
            // new ones inline. Keeps "what materials exist" a single
            // source of truth rather than letting product creation spawn
            // duplicate/near-duplicate material rows.
            'materials' => ['nullable', 'array'],
            'materials.*' => ['integer', 'exists:materials,id'],
            'sizes' => ['nullable', 'array'],
            'sizes.*' => ['integer', 'exists:sizes,id'],

        ];
    }
}
