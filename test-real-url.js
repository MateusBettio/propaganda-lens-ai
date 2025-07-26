// Test with a real Twitter URL to see if auto-analysis works
const SUPABASE_URL = 'https://uccitemlxlymvxfzxdsi.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjY2l0ZW1seGx5bXZ4Znp4ZHNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTQxNDIsImV4cCI6MjA2ODY3MDE0Mn0.cSXZDK0T5O-bHpU02OrK5CR9i1EctdgcDPx3qJwvJCI';

async function testRealURL() {
  console.log('🔗 Testing Real URL Analysis...\n');
  
  // Use a real Twitter URL (this one should exist)
  const testUrl = 'https://x.com/elonmusk/status/1';
  
  try {
    console.log('1️⃣ Creating extraction job...');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/extract`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: testUrl })
    });

    const result = await response.json();
    console.log('✅ Extract response:', result);
    
    if (result.job_id) {
      console.log('\n2️⃣ Processing with worker...');
      const workerResponse = await fetch(`${SUPABASE_URL}/functions/v1/worker`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const workerResult = await workerResponse.json();
      console.log('✅ Worker response:', JSON.stringify(workerResult, null, 2));
      
      if (workerResult.results && workerResult.results.length > 0) {
        const jobResult = workerResult.results[0];
        console.log('\n📊 Job Result:');
        console.log('- Status:', jobResult.status);
        console.log('- Error:', jobResult.error || 'None');
        
        if (jobResult.status === 'failed') {
          if (jobResult.error.includes('rate limit')) {
            console.log('✅ Rate limit error message is user-friendly!');
          } else {
            console.log('ℹ️  Different error type:', jobResult.error);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRealURL();