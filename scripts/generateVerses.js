/**
 * Script to generate highlighted verses for first 5 Bible books using AI
 * Run with: node generateVerses.js
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const GROQ_API_KEY = process.env.VITE_GROQ_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// First 5 books of the Bible (Pentateuch)
const BOOKS = [
    { name: 'Genesis', chapters: 50 },
    { name: 'Exodus', chapters: 40 },
    { name: 'Leviticus', chapters: 27 },
    { name: 'Numbers', chapters: 36 },
    { name: 'Deuteronomy', chapters: 34 }
];

// Fetch chapter content from Bible API
async function fetchChapterContent(book, chapter) {
    try {
        const response = await fetch(
            `https://bible-api.com/${encodeURIComponent(book)}+${chapter}?translation=rvr95`
        );
        const data = await response.json();
        return data.text || '';
    } catch (error) {
        console.error(`Error fetching ${book} ${chapter}:`, error);
        return '';
    }
}

// Extract highlighted verse using AI
async function extractHighlightedVerse(chapterText, reference) {
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: 'Eres un asistente que identifica el versículo más impactante y significativo de un capítulo bíblico. Responde SOLO con el texto del versículo, sin números de versículo ni explicaciones adicionales.'
                    },
                    {
                        role: 'user',
                        content: `Del siguiente capítulo bíblico (${reference}), extrae el versículo más destacado, inspirador y significativo. Responde SOLO con el texto del versículo:\n\n${chapterText.substring(0, 3000)}`
                    }
                ],
                temperature: 0.7,
                max_tokens: 200,
            }),
        });

        const data = await response.json();
        return data.choices[0]?.message?.content?.trim() || '';
    } catch (error) {
        console.error('Error extracting verse:', error);
        return '';
    }
}

// Sleep function for rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function generateAllVerses() {
    console.log('🚀 Starting verse generation for first 5 books (Pentateuch)...\n');
    console.log(`📚 Books to process: ${BOOKS.map(b => b.name).join(', ')}\n`);

    let totalChapters = 0;
    let successCount = 0;
    let errorCount = 0;

    for (const book of BOOKS) {
        console.log(`\n📖 Processing ${book.name}...`);

        for (let chapter = 1; chapter <= book.chapters; chapter++) {
            totalChapters++;
            const reference = `${book.name} ${chapter}`;

            try {
                // Check if already exists
                const { data: existing } = await supabase
                    .from('chapter_verses')
                    .select('id')
                    .eq('reference', reference)
                    .single();

                if (existing) {
                    console.log(`  ⏭️  ${reference} - Already exists, skipping`);
                    successCount++;
                    continue;
                }

                // Fetch chapter content
                console.log(`  📥 Fetching ${reference}...`);
                const chapterText = await fetchChapterContent(book.name, chapter);

                if (!chapterText) {
                    console.log(`  ❌ ${reference} - No content found`);
                    errorCount++;
                    continue;
                }

                // Extract verse with AI
                console.log(`  🤖 Extracting highlighted verse...`);
                const highlightedVerse = await extractHighlightedVerse(chapterText, reference);

                if (!highlightedVerse) {
                    console.log(`  ❌ ${reference} - AI extraction failed`);
                    errorCount++;
                    continue;
                }

                // Save to database
                const { error } = await supabase
                    .from('chapter_verses')
                    .insert({
                        book: book.name,
                        chapter: chapter,
                        reference: reference,
                        highlighted_verse: highlightedVerse
                    });

                if (error) {
                    console.log(`  ❌ ${reference} - Database error:`, error.message);
                    errorCount++;
                } else {
                    console.log(`  ✅ ${reference} - Saved successfully`);
                    console.log(`     "${highlightedVerse.substring(0, 60)}..."`);
                    successCount++;
                }

                // Rate limiting: wait 2 seconds between requests
                await sleep(2000);

            } catch (error) {
                console.log(`  ❌ ${reference} - Error:`, error.message);
                errorCount++;
            }
        }
    }

    console.log('\n\n📊 Generation Complete!');
    console.log(`Total chapters: ${totalChapters}`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
}

// Run the script
generateAllVerses().catch(console.error);
