
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

const supabase = createClient(supabaseUrl, supabaseKey);

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

async function listWeeks() {
    console.log('Fetching quarters...');
    const { data: quarters, error: qError } = await supabase
        .from('quarters')
        .select('*')
        .order('start_date', { ascending: false });

    if (qError) {
        console.error('Error fetching quarters:', qError);
        return;
    }

    // Find the quarter that starts on Dec 27, 2025
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

    console.log(`Found ${weeks.length} weeks.`);

    // Initialize SQL file
    const sqlFile = path.resolve(__dirname, 'update.sql');
    fs.writeFileSync(sqlFile, '');

    let currentDate = new Date('2025-12-27T12:00:00Z');

    for (let i = 0; i < 13; i++) {
        const weekNum = i + 1;
        const startDate = formatDate(currentDate);
        const endDate = formatDate(addDays(currentDate, 6));

        const existingWeek = weeks.find(w => w.week_number === weekNum);

        const status = existingWeek
            ? (existingWeek.start_date === startDate ? 'MATCH' : 'MISMATCH')
            : 'MISSING';

        console.log(`Week ${weekNum}: Expected ${startDate} | Found: ${existingWeek ? existingWeek.start_date : 'None'} [${status}]`);

        if (existingWeek && status === 'MISMATCH') {
            const sql = `UPDATE weeks SET start_date = '${startDate}', end_date = '${endDate}' WHERE id = '${existingWeek.id}';\n`;
            fs.appendFileSync(sqlFile, sql);
        }

        currentDate = addDays(currentDate, 7);
    }
}

listWeeks();
