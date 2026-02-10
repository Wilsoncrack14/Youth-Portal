
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env manually
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = envContent.split('\n').reduce((acc, line) => {
    const [key, value] = line.split('=');
    if (key && value) {
        acc[key.trim()] = value.trim();
    }
    return acc;
}, {});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

// Create client with service role key if possible, or just anon key.
// But anon usually can't update unless RLS allows.
// The user is authenticated in the app, but here I am running a script.
// If I use ANON KEY, I might get RLS error if I'm not signed in.
// However, I observed earlier that `SabbathSchool.tsx` uses `useAdmin`.
// I might need a Service Role Key to bypass RLS, OR I need to login as a user.
// But I don't have the user's password.
// I can try to use the ANON key and see if RLS allows update on `weeks`.
// If not, I'll need to ask the user to provide a service role key OR I can use the SQL tool if available.
// Wait, I DO have `mcp_supabase-mcp-server_execute_sql`.
// I should use THAT instead of a script if I hit permission issues.
// But let's look at `check-weeks.js` output again. It fetched data fine.
// Fetching is usually public or authenticated-read.
// Updating might be restricted.

// Let's try to update ONE week first.

const supabase = createClient(supabaseUrl, supabaseKey);

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

async function updateWeeks() {
    console.log('Fetching quarters...');
    const { data: quarters, error: qError } = await supabase
        .from('quarters')
        .select('*')
        .order('start_date', { ascending: false });

    if (qError) {
        console.error('Error fetching quarters:', qError);
        return;
    }

    const targetQuarter = quarters.find(q => q.start_date === '2025-12-27');

    if (!targetQuarter) {
        console.log("No matching quarter found for 2025-12-27.");
        return;
    }

    console.log('Target Quarter Found:', targetQuarter.title);

    const { data: weeks, error: wError } = await supabase
        .from('weeks')
        .select('*')
        .eq('quarter_id', targetQuarter.id)
        .order('week_number', { ascending: true });

    if (wError) {
        console.error('Error fetching weeks:', wError);
        return;
    }

    console.log(`Found ${weeks.length} weeks. Updating dates...`);

    let currentDate = new Date('2025-12-27T12:00:00Z');

    for (let i = 0; i < 13; i++) {
        const weekNum = i + 1;
        const startDate = formatDate(currentDate);
        const endDate = formatDate(addDays(currentDate, 6)); // End on Friday

        const existingWeek = weeks.find(w => w.week_number === weekNum);

        if (existingWeek) {
            console.log(`Updating Week ${weekNum} (${existingWeek.id}) to ${startDate} - ${endDate}`);

            const { error: uError } = await supabase
                .from('weeks')
                .update({ start_date: startDate, end_date: endDate })
                .eq('id', existingWeek.id);

            if (uError) {
                console.error(`Failed to update week ${weekNum}:`, uError);
            } else {
                console.log(`Current Week ${weekNum} Updated.`);
            }
        }

        currentDate = addDays(currentDate, 7);
    }
}

updateWeeks();
