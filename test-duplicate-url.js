// Test duplicate URL handling
const SUPABASE_URL = 'https://uccitemlxlymvxfzxdsi.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjY2l0ZW1seGx5bXZ4Znp4ZHNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTQxNDIsImV4cCI6MjA2ODY3MDE0Mn0.cSXZDK0T5O-bHpU02OrK5CR9i1EctdgcDPx3qJwvJCI';

async function testDuplicateURL() {
  console.log('🔄 Testing Duplicate URL Handling...\n');
  
  // Use a fixed URL without timestamp
  const testUrl = 'https://x.com/test/status/1234567890';
  
  try {
    console.log('1️⃣ First request for URL...');
    const response1 = await fetch(`${SUPABASE_URL}/functions/v1/extract`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: testUrl })
    });

    const result1 = await response1.json();
    console.log('✅ First response:', result1);
    
    console.log('\n2️⃣ Second request for same URL (should handle duplicate)...');
    const response2 = await fetch(`${SUPABASE_URL}/functions/v1/extract`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: testUrl })
    });

    const result2 = await response2.json();
    console.log('✅ Second response:', result2);
    
    console.log('\n📊 Analysis:');
    if (result1.job_id === result2.job_id) {
      console.log('✅ PASS: Same job ID returned - duplicate handling working!');
    } else {
      console.log('❌ FAIL: Different job IDs - duplicate handling may not be working');
    }
    
    if (result2.message.includes('already') || result2.message.includes('exists')) {
      console.log('✅ PASS: Appropriate message for duplicate URL');
    } else {
      console.log('❌ INFO: No duplicate-specific message (may be expected depending on timing)');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDuplicateURL();