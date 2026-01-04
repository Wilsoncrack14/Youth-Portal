
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAI() {
    console.log('Testing connection to mistral-chat...');
    try {
        const { data, error } = await supabase.functions.invoke('mistral-chat', {
            body: {
                messages: [
                    { role: 'user', content: 'Di "Funciona" si me escuchas' }
                ]
            }
        });

        if (error) {
            console.error('❌ Error invoking function:', error);
            if (error instanceof Error) {
                console.error('Message:', error.message);
                console.error('Cause:', error.cause);
            }
        } else {
            console.log('✅ Success! Data:', data);
        }
    } catch (e) {
        console.error('❌ Exception:', e);
    }
}

testAI();
