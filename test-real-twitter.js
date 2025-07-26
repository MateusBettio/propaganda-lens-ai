// Test with a real Twitter URL to see multilingual analysis
const SUPABASE_URL = 'https://uccitemlxlymvxfzxdsi.supabase.co';

async function testRealTwitterAnalysis() {
  console.log('🌍 Testing Real Twitter Content Analysis...\n');

  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjY2l0ZW1seGx5bXZ4Znp4ZHNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTQxNDIsImV4cCI6MjA2ODY3MDE0Mn0.cSXZDK0T5O-bHpU02OrK5CR9i1EctdgcDPx3qJwvJCI';
  
  // Test with a well-known Twitter/X account
  const testUrl = 'https://x.com/elonmusk/status/1234567890'; // This will fail but show us the error handling
  
  try {
    console.log('1️⃣ Creating extraction job...');
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
      console.log('2️⃣ Processing job...');
      const workerResponse = await fetch(`${SUPABASE_URL}/functions/v1/worker`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const workerResult = await workerResponse.json();
      console.log('✅ Worker response:', JSON.stringify(workerResult, null, 2));
      
      // Check database for results
      console.log('3️⃣ Checking database for analysis results...');
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL, ANON_KEY);
      
      const { data: analysisResults, error } = await supabase
        .from('analysis')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (error) {
        console.error('Database error:', error);
      } else {
        console.log('📊 Recent analysis results:');
        analysisResults?.forEach((result, index) => {
          console.log(`\n${index + 1}. URL: ${result.url}`);
          console.log(`   Language: ${result.language || 'unknown'} (${Math.round((result.language_confidence || 0) * 100)}% confidence)`);
          console.log(`   Content preview: ${(result.content || '').substring(0, 100)}...`);
          console.log(`   Summary preview: ${(result.summary || '').substring(0, 100)}...`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRealTwitterAnalysis();