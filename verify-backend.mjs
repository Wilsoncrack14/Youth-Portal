
const verify = async () => {
    const URL = "https://hvtrkzhxdmuhuscyagdl.supabase.co/functions/v1/get-daily-verse";
    const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2dHJremh4ZG11aHVzY3lhZ2RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NTU2MDksImV4cCI6MjA4MjUzMTYwOX0.o0eyETVpmZaD4nCdokBWeNwgkazWSnD1bvEBaZhoOlk";

    console.log("Testing Backend Function...");
    try {
        const response = await fetch(URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${KEY}`
            },
            body: JSON.stringify({ book: 'Genesis', chapter: 1, bookId: 'GEN' })
        });

        if (!response.ok) {
            console.log(`Error Status: ${response.status}`);
            console.log(await response.text());
            return;
        }

        const data = await response.json();
        console.log("Success!");
        console.log("Reference:", data.reference);
        console.log("Text snippet:", data.text.substring(0, 50) + "...");
    } catch (e) {
        console.error("Fetch failed:", e);
    }
};

verify();
