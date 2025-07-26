// Test Portuguese language detection specifically
const SUPABASE_URL = 'https://uccitemlxlymvxfzxdsi.supabase.co';

async function testPortugueseDetection() {
  console.log('🇧🇷 Testing Portuguese Content Detection...\n');

  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjY2l0ZW1seGx5bXZ4Znp4ZHNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTQxNDIsImV4cCI6MjA2ODY3MDE0Mn0.cSXZDK0T5O-bHpU02OrK5CR9i1EctdgcDPx3qJwvJCI'; // Replace with your actual anon key
  
  if (ANON_KEY === 'YOUR_ANON_KEY_HERE') {
    console.log('❌ Please update the ANON_KEY in this script with your actual key from:');
    console.log('   https://supabase.com/dashboard/project/uccitemlxlymvxfzxdsi/settings/api\n');
    return;
  }

  // Test with clearly Portuguese content - using a real tweet with timestamp
  const testUrl = `https://x.com/jairbolsonaro/status/1234567890?t=${Date.now()}`; // Add timestamp to make unique
  
  try {
    console.log('1️⃣ Creating extraction job for Portuguese content...');
    const extractResponse = await fetch(`${SUPABASE_URL}/functions/v1/extract`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: testUrl })
    });

    const extractResult = await extractResponse.json();
    console.log('✅ Extract response:', extractResult);

    if (extractResult.job_id) {
      console.log(`📝 Job created with ID: ${extractResult.job_id}\n`);
      
      console.log('2️⃣ Processing job with worker...');
      const workerResponse = await fetch(`${SUPABASE_URL}/functions/v1/worker`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const workerResult = await workerResponse.json();
      console.log('✅ Worker response:', JSON.stringify(workerResult, null, 2));
      
      // Check if language was detected correctly
      if (workerResult.results && workerResult.results.length > 0) {
        const result = workerResult.results[0];
        if (result.status === 'completed') {
          console.log('\n🎯 ANALYSIS RESULTS:');
          console.log('- Status:', result.status);
          console.log('- Job ID:', result.job_id);
          
          // You can check the database for the full results
          console.log('\n📊 To see full results, check your Supabase database:');
          console.log('- Table: analysis');
          console.log('- Look for language column = "pt-br"');
          console.log('- The summary should be in Portuguese');
          
        } else {
          console.log('❌ Job failed:', result.error || 'Unknown error');
        }
      }
      
      console.log('\n🔍 Check the Supabase function logs for detailed language detection info:');
      console.log('https://supabase.com/dashboard/project/uccitemlxlymvxfzxdsi/functions');
      
    } else {
      console.log('❌ No job ID returned. Check the function logs.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPortugueseDetection();