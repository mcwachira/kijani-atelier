<?php

namespace App\Http\Requests\Product;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
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

        $productId = $this->route('product')?->id;
        return [
            'category_id' => ['sometimes', 'required', 'integer', 'exists:categories,id'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'nullable', 'string', 'max:255', Rule::unique('products', 'slug')->ignore($productId)],
            'description' => ['sometimes', 'nullable', 'string'],
            'craft_note' => ['sometimes', 'nullable', 'string'],
            'price' => ['sometimes', 'required', 'integer', 'min:0'],
            'compare_at_price' => ['sometimes', 'nullable', 'integer', 'gt:price'],
            'stock' => ['sometimes', 'integer', 'min:0'],
            'is_new' => ['sometimes', 'boolean'],
            'materials' => ['sometimes', 'array'],
            'materials.*' => ['integer', 'exists:materials,id'],
            'sizes' => ['sometimes', 'array'],
            'sizes.*' => ['integer', 'exists:sizes,id'],
        ];
    }
}
