<?php

namespace App\Http\Requests\Category;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

class StoreCategoryRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // The 'admin' middleware on the route already blocks non-admins
        // before this class is even resolved — this just documents that
        // there's no ADDITIONAL per-request authorization logic needed
        // (e.g. "can this specific admin edit this specific category").
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
            'name'=> ['required', 'string', 'max:255'],
            // Slug is optional on input — if omitted, we generate it from
            // 'name' in the controller. If provided, it must still be
            // unique so two categories can't collide on the same URL.
            'slug' => ['nullable', 'string', 'max:255', 'unique:categories,slug'],
            'description' => ['nullable', 'string'],
            'image' => ['nullable', 'string', 'max:255'],

        ];
    }

    /**
     * Convenience accessor the controller uses to get a guaranteed-present
     * slug — either what was submitted, or one generated from the name.
     * Keeping this here (not duplicated in the controller) means the
     * "how do we derive a slug" rule lives in exactly one place.
     */
    public function resolvedSlug(): string
    {
        return $this->input('slug') ?: Str::slug($this->input('name'));
    }
}
