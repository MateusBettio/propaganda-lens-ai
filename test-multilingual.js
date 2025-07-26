// Test script for multilingual analysis
const SUPABASE_URL = 'https://uccitemlxlymvxfzxdsi.supabase.co';

// Test URLs in different languages
const testUrls = {
  english: 'https://x.com/potus/status/1234567890', // English content
  portuguese: 'https://x.com/jairbolsonaro/status/1234567890', // Portuguese content  
  spanish: 'https://x.com/sanchezcastejon/status/1234567890' // Spanish content
};

async function testMultilingualAnalysis() {
  console.log('🌍 Testing Multilingual Propaganda Analysis...\n');

  const ANON_KEY = 'YOUR_ANON_KEY_HERE'; // Replace with your actual anon key
  
  if (ANON_KEY === 'YOUR_ANON_KEY_HERE') {
    console.log('❌ Please update the ANON_KEY in this script with your actual key from:');
    console.log('   https://supabase.com/dashboard/project/uccitemlxlymvxfzxdsi/settings/api\n');
    return;
  }

  for (const [language, url] of Object.entries(testUrls)) {
    try {
      console.log(`🔍 Testing ${language.toUpperCase()} content...`);
      
      // Create extraction job
      const extractResponse = await fetch(`${SUPABASE_URL}/functions/v1/extract`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });

      const extractResult = await extractResponse.json();
      console.log(`✅ Job created: ${extractResult.job_id || 'No ID'}`);

      // Process the job
      const workerResponse = await fetch(`${SUPABASE_URL}/functions/v1/worker`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const workerResult = await workerResponse.json();
      console.log(`🔄 Worker processed: ${workerResult.results?.length || 0} jobs`);
      
      if (workerResult.results?.[0]?.status === 'completed') {
        console.log(`✅ ${language} analysis completed successfully`);
      } else {
        console.log(`⚠️ ${language} analysis status:`, workerResult.results?.[0]?.status || 'unknown');
      }
      
      console.log('---');
      
    } catch (error) {
      console.error(`❌ Error testing ${language}:`, error.message);
    }
  }

  console.log('\n🎉 Multilingual testing complete!');
  console.log('\nExpected behavior:');
  console.log('- English content → Analysis in English');
  console.log('- Portuguese content → Análise em Português');  
  console.log('- Spanish content → Análisis en Español');
  console.log('\nCheck your Supabase database to see the language detection results!');
}

testMultilingualAnalysis();