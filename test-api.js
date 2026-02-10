
import https from 'https';

const data = JSON.stringify({
    book: 'Genesis',
    chapter: 1
});

const options = {
    hostname: 'hvtrkzhxdmuhuscyagdl.supabase.co',
    port: 443,
    path: '/functions/v1/bible-api',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2dHJremh4ZG11aHVzY3lhZ2RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NTU2MDksImV4cCI6MjA4MjUzMTYwOX0.o0eyETVpmZaD4nCdokBWeNwgkazWSnD1bvEBaZhoOlk',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
