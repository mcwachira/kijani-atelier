<?php

namespace Database\Seeders;

use App\Models\Message;
use App\Models\User;
use Illuminate\Database\Seeder;

class MessageSeeder extends Seeder
{
    /**
     * Generates 8 fake contact-form messages, cycling through 4 customer
     * names and 4 subject lines. All 8 currently share the same body text
     * (copied from the original mock) — fine for demo/dev data, but replace
     * with varied content if you ever need this to look realistic in a
     * client demo.
     */
    public function run(): void
    {

        // Same "skip if already seeded" guard as OrderSeeder — no clean
        // per-row unique key to dedupe against here either.
        if (Message::count() > 0) {
            return;
        }

        $names = ['Wanjiru Kamau','Amina Osman','Grace Njeri','Leila Hassan'];
        $subjects = ['Sizing question','Wholesale enquiry','Order KJ-2604','Custom kiondo colours'];
        $body = "Hi, I wanted to ask about the fit of the Amani slide — I'm usually between a 38 "
            . "and 39. Would you recommend sizing up? Also, do you restock the ochre kiondo often? "
            . "Thank you so much.";

        foreach (range(0, 7) as $i) {
            $name = $names[$i % count($names)];

            // Look up a real user account by name so this message links to
            // one of the customers seeded in UserSeeder. Falls back to a
            // generic email if no matching user exists (shouldn't normally
            // happen, but keeps this seeder from crashing if UserSeeder's
            // name list ever gets out of sync with this one).
            $user = User::where('name', $name)->first();
            $message = new Message();

            $message->fill([
                'user_id' => $user?->id,
                'name' => $name,
                'email' => $user->email ?? 'hello@example.com',
                'subject' => $subjects[$i % count($subjects)],
                'body' => $body,
            ]);



            // unread isn't mass-assignable (see Message model) — it should
            // only ever be flipped by an explicit "mark as read" admin
            // action, never set directly from user input when a message is
            // first created. Bypass that protection here, same reasoning
            // as `status`/`total` in OrderSeeder above.
            //
            // The first 3 messages (i < 3) are seeded as unread, so the
            // admin inbox has something to actually test against.
            $message->forceFill(['unread' => $i < 3])->save();
        }
    }
}
