// Test fetching by condition ID
const CONDITION_ID = '0x22f55a53080ad6628a62393dd913988f59f892717702b0eb216a649d04a6502b';
const TOKEN_UP = '29179682863761521016082178592399193498846352652561679090411973415155380704849';
const TOKEN_DOWN = '50520386590547934609673421632777513229878979044663953487435135055904598282658';

async function test() {
    // Method 1: CLOB markets by condition ID
    console.log('=== Method 1: CLOB /markets/{condition_id} ===');
    try {
        const res = await fetch(`https://clob.polymarket.com/markets/${CONDITION_ID}`);
        const data = await res.json();
        console.log('Success!');
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.log('Failed:', e.message);
    }

    // Method 2: CLOB book by token
    console.log('\n=== Method 2: CLOB /book?token_id ===');
    try {
        const res = await fetch(`https://clob.polymarket.com/book?token_id=${TOKEN_UP}`);
        const data = await res.json();
        console.log('Book data:');
        console.log('Bids:', data.bids?.slice(0, 3));
        console.log('Asks:', data.asks?.slice(0, 3));
    } catch (e) {
        console.log('Failed:', e.message);
    }

    // Method 3: Gamma events with series
    console.log('\n=== Method 3: Gamma events by series ===');
    try {
        const slugs = ['btc-up-or-down-15m', 'bitcoin-up-or-down'];
        for (const slug of slugs) {
            const res = await fetch(`https://gamma-api.polymarket.com/events?series_slug=${slug}&closed=false&limit=5`);
            const events = await res.json();
            console.log(`Series ${slug}:`, events.length, 'events');
            if (events.length > 0) {
                console.log('Sample:', events[0].title, '|', events[0].slug);
            }
        }
    } catch (e) {
        console.log('Failed:', e.message);
    }

    // Method 4: Get ALL open events and filter locally
    console.log('\n=== Method 4: All events filtered locally ===');
    try {
        const res = await fetch('https://gamma-api.polymarket.com/events?closed=false&active=true&limit=200');
        const events = await res.json();
        console.log('Total active events:', events.length);

        const updown = events.filter(e => {
            const t = (e.title || '').toLowerCase();
            const s = (e.slug || '').toLowerCase();
            return (t.includes('up or down') || s.includes('updown')) &&
                (t.includes('btc') || t.includes('bitcoin') || t.includes('eth') || t.includes('sol'));
        });

        console.log('15m Up/Down crypto events:', updown.length);
        updown.forEach(e => {
            console.log('\n---');
            console.log('Title:', e.title);
            console.log('Slug:', e.slug);
            console.log('Markets:', e.markets?.length);
            if (e.markets?.[0]) {
                console.log('Sample market:', e.markets[0].question);
                console.log('clobTokenIds:', e.markets[0].clobTokenIds);
            }
        });
    } catch (e) {
        console.log('Failed:', e.message);
    }
}

test();
