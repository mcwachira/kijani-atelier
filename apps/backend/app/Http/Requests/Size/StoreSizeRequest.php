<?php

namespace App\Http\Requests\Size;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreSizeRequest extends FormRequest
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

            // 'value' stays a string in validation too — matches the
            // migration's string column, so "36", "37"... or eventually
            // "S"/"M"/"L" all pass the same rule without changes.
            'value' => ['required', 'string', 'max:20', 'unique:sizes,value'],
        ];
    }
}
