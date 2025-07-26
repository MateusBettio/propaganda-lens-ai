// Simple test script for the Twitter/X handler
const SUPABASE_URL = 'https://uccitemlxlymvxfzxdsi.supabase.co';

async function testTwitterHandler() {
  console.log('🧪 Testing Twitter/X Handler...\n');

  // You'll need to get your anon key from: 
  // https://supabase.com/dashboard/project/uccitemlxlymvxfzxdsi/settings/api
  const ANON_KEY = 'YOUR_ANON_KEY_HERE'; // Replace with your actual anon key
  
  if (ANON_KEY === 'YOUR_ANON_KEY_HERE') {
    console.log('❌ Please update the ANON_KEY in this script with your actual key from:');
    console.log('   https://supabase.com/dashboard/project/uccitemlxlymvxfzxdsi/settings/api\n');
    return;
  }

  try {
    // Test 1: Create extraction job
    console.log('1️⃣ Creating extraction job...');
    const extractResponse = await fetch(`${SUPABASE_URL}/functions/v1/extract`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: 'https://x.com/elonmusk/status/1737920817846411556' // Real tweet
      })
    });

    const extractResult = await extractResponse.json();
    console.log('✅ Extract response:', extractResult);

    if (extractResult.job_id) {
      console.log(`📝 Job created with ID: ${extractResult.job_id}\n`);
      
      // Test 2: Process the job
      console.log('2️⃣ Processing jobs with worker...');
      const workerResponse = await fetch(`${SUPABASE_URL}/functions/v1/worker`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const workerResult = await workerResponse.json();
      console.log('✅ Worker response:', workerResult);
      
      console.log('\n🎉 Twitter/X Handler Test Complete!');
      console.log('\nNext steps:');
      console.log('- Check your Supabase database for the extraction_jobs and analysis tables');
      console.log('- The tweet should be processed with thread reconstruction and video transcription');
      
    } else {
      console.log('❌ No job ID returned. Check the function logs.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testTwitterHandler();