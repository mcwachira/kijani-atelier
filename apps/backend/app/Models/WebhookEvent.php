<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WebhookEvent extends Model
{
    use HasFactory;

    protected $fillable = ['provider', 'event_id', 'payload', 'status', 'error'];

    protected function casts(): array
    {
        return ['payload' => 'array'];
    }

    /**
     * Record an incoming webhook exactly once. Returns [event, created]:
     * created=false means this is a replay — the caller should ack it
     * without doing any business logic.
     *
     * Note: this keeps the FIRST delivery's payload per (provider,
     * event_id). Pesapal re-uses one tracking ID across status changes
     * (INVALID → COMPLETED), so later deliveries don't overwrite the
     * stored payload — payment processing never depends on it anyway.
     * The job always re-fetches the authoritative status from the
     * provider before transitioning anything.
     */
    public static function recordOnce(string $provider, string $eventId, array $payload): array
    {
        try {
            $event = self::firstOrCreate(
                ['provider' => $provider, 'event_id' => $eventId],
                ['payload' => $payload, 'status' => 'received']
            );

            return [$event, $event->wasRecentlyCreated];
        } catch (\Illuminate\Database\QueryException $e) {
            // Two deliveries raced: both SELECTed, both INSERTed, and the
            // unique (provider, event_id) key rejected the loser. The
            // winner's row is the record — treat this as a replay.
            // SQLSTATE 23505 = Postgres unique_violation, 23000 = SQLite.
            if (! in_array($e->getCode(), ['23000', '23505'], true)) {
                throw $e;
            }

            $event = self::where('provider', $provider)->where('event_id', $eventId)->first();

            if (! $event) {
                throw $e;
            }

            return [$event, false];
        }
    }

    public function mark(string $status, ?string $error = null): void
    {
        $this->forceFill(['status' => $status, 'error' => $error])->save();
    }
}
