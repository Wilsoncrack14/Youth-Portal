
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Get users who have NOT completed a reading today
        // We'll define "today" based on server time (UTC) or specific timezone offset if needed.
        // For simplicity, we check if they have NO entry in daily_readings for the current UTC day.

        const today = new Date().toISOString().split('T')[0]

        // Get all users
        const { data: allUsers, error: usersError } = await supabaseClient
            .from('profiles')
            .select('id, username')

        if (usersError) throw usersError

        // Get users who completed reading today
        const { data: completedReadings, error: readingsError } = await supabaseClient
            .from('daily_readings')
            .select('user_id')
            .gte('created_at', today) // Assumes created_at is timestamptz

        if (readingsError) throw readingsError

        const completedUserIds = new Set(completedReadings.map(r => r.user_id))

        // Find missing users
        const usersToRemind = allUsers.filter(u => !completedUserIds.has(u.id))

        console.log(`[Daily Reminder] Found ${usersToRemind.length} users to remind out of ${allUsers.length} total.`)

        // 3. Birthday Notifications
        // Get today's birthdays (month and day match)
        // Note: supabase filter for date parts is tricky, usually better with RPC or raw SQL.
        // For MVP, we'll fetch all profiles with birthdays and filter in JS (assuming small userbase < 1000).
        // A better approach for scale: create a 'get_birthdays_today' RPC.

        const { data: birthdayUsers, error: birthdayError } = await supabaseClient
            .from('profiles')
            .select('id, username, birth_date')
            .not('birth_date', 'is', null)

        if (birthdayError) throw birthdayError

        // 3. Birthday Logic Adjustment
        // Problem: Deno Deploy is UTC. Users are likely in Americas (UTC-5/6). 
        // If it's 01:25 AM EST (06:25 UTC), it's the 14th in both.
        // However, if the function runs at 8PM UTC (previous day 3PM EST), it might execute too early or late.
        // We'll fix the "Today" definition to be explicit.
        // Let's use a fixed offset for "Client Time" roughly e.g. UTC-5 (Colombia/Peru/East US).

        const now = new Date();
        const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
        const timeOffset = -5; // EST/Colombia/Peru
        const clientDate = new Date(utcTime + (3600000 * timeOffset));

        const currentMonth = clientDate.getMonth() + 1;
        const currentDay = clientDate.getDate();

        console.log(`[Daily Reminder] Server Time (UTC): ${now.toISOString()}`);
        console.log(`[Daily Reminder] Client Time (UTC-5): ${clientDate.toISOString()}`);
        console.log(`[Daily Reminder] Checking birthdays for Month: ${currentMonth}, Day: ${currentDay}`);

        const celebrants = birthdayUsers.filter(u => {
            if (!u.birth_date) return false
            // Parse birth_date (YYYY-MM-DD) as UTC to avoid timezone shifts on simple date
            // e.g. "2000-02-14" -> UTC midnight. getUTCMonth() is 1 (Feb), getUTCDate is 14.
            const bparts = u.birth_date.split('-');
            if (bparts.length !== 3) return false;

            const bMonth = parseInt(bparts[1]);
            const bDay = parseInt(bparts[2]);

            return bMonth === currentMonth && bDay === currentDay;
        })

        if (celebrants.length > 0) {
            console.log(`[Daily Reminder] Found ${celebrants.length} birthdays today: ${celebrants.map(c => c.username).join(', ')}`)

            // Create notifications for ALL users about these birthdays
            const notificationsToInsert = []

            for (const celebrant of celebrants) {
                for (const user of allUsers) {
                    // Don't notify the celebrant about themselves (optional, maybe say Happy Birthday to them instead?)
                    // Let's notify everyone including celebrant for simplicity, or customize message

                    let title = '¡Cumpleaños de Hoy! 🎂'
                    let message = `Hoy es el cumpleaños de ${celebrant.username}. ¡Ve a Comunidad y déjale un saludo!`

                    if (user.id === celebrant.id) {
                        title = '¡Feliz Cumpleaños! 🎉'
                        message = 'Que Dios te bendiga grandemente en tu día especial.'
                    }

                    notificationsToInsert.push({
                        user_id: user.id,
                        title: title,
                        message: message,
                        type: 'birthday',
                        is_read: false,
                        metadata: { birthday_user_id: celebrant.id }
                    })
                }
            }

            if (notificationsToInsert.length > 0) {
                const { error: notifError } = await supabaseClient
                    .from('notifications')
                    .insert(notificationsToInsert)

                if (notifError) console.error('Error inserting birthday notifications', notifError)
                else console.log(`[Daily Reminder] Inserted ${notificationsToInsert.length} birthday notifications.`)
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: `Processed reminders. ${usersToRemind.length} users flagged. ${celebrants.length} birthdays found.`,
                users_flagged: usersToRemind.length,
                birthdays_found: celebrants.length
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        )
    }
})
