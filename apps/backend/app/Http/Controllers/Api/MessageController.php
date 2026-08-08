<?php

namespace App\Http\Controllers\Api;


use App\Http\Controllers\Controller;
use App\Http\Requests\Message\ReplyMessageRequest;
use App\Http\Requests\Message\StoreMessageRequest;
use App\Http\Resources\MessageResource;
use App\Models\Message;
use App\Models\MessageReply;

/**
 * @group Messages
 *
 * The contact form. Submitting is public; reading/managing is admin-only.
 */
class MessageController extends Controller
{
    /**
     * Submit a contact message
     *
     * @unauthenticated
     * @bodyParam name string required Example: Wanjiru Kamau
     * @bodyParam email string required Example: wanjiru@example.com
     * @bodyParam subject string required Example: Sizing question
     * @bodyParam body string required Example: I wanted to ask about the fit of the Amani slide.
     */

    public function store(StoreMessageRequest $request)
    {
        $data = $request->validated();

        $message = new Message();
        $message->fill($data);

        // user_id links to a real account only if the sender happens to
        // be logged in (the form itself never requires it). unread isn't
        // mass-assignable on Message (see the model), so it's set
        // explicitly here via forceFill, not passed through $data.
        $message->user_id = $request->user()?->id;
        $message->forceFill(['unread' => true]);
        $message->save();

        return (new MessageResource($message))->response()->setStatusCode(201);
    }

    /**
     * List all messages (admin)
     *
     * @authenticated
     */
    public function index()
    {
        $messages = Message::with('replies')->latest()->paginate(20);

        return MessageResource::collection($messages);
    }

    /**
     * Get a single message with its replies (admin)
     *
     * @authenticated
     */
    public function show(Message $message)
    {
        $message->load('replies');

        return new MessageResource($message);
    }

    /**
     * Reply to a message (admin)
     *
     * @authenticated
     */
    public function reply(ReplyMessageRequest $request, Message $message)
    {
        MessageReply::create([
            'message_id' => $message->id,
            'actor_id' => $request->user()->id,
            'actor' => $request->user()->name,
            'body' => $request->validated()['body'],
        ]);

        $message->load('replies');

        return (new MessageResource($message))->response()->setStatusCode(201);
    }

    /**
     * Mark a message as read (admin)
     *
     * @authenticated
     */
    public function markRead(Message $message)
    {
        $message->forceFill(['unread' => false])->save();

        return new MessageResource($message);
    }

}
