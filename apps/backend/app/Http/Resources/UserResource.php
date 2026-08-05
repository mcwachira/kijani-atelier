<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * This is an EXPLICIT ALLOWLIST of what a User looks like over the API.
     * Notice 'password' and 'remember_token' aren't listed — even though
     * $hidden on the model already protects them, having this resource as
     * a second, independent layer means a future mistake (someone removing
     * $hidden from the model) still can't leak the password hash, because
     * this file simply never mentions it.
     */
    public function toArray(Request $request): array
    {
        return [
            'id'=>$this->id,
            'name'=>$this->name,
            'email'=> $this->email,
            'phone'=>$this->phone,
            'role' => $this->role,
            'email_verified_at' => $this->email_verified_at,
            'created_at' => $this->created_at,
        ];
    }
}
