<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MessageResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'subject' => $this->subject,
            'preview' => $this->preview, // computed accessor on the model
            'body' => $this->body,
            'unread' => $this->unread,
            'replies' => MessageReplyResource::collection($this->whenLoaded('replies')),
            'created_at' => $this->created_at,
        ];
    }
}
