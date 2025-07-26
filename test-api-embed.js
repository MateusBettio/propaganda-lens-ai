// Quick test to verify embed data is in API response
const fetch = require('node-fetch');

async function testAPI() {
  const testUrl = 'https://twitter.com/elonmusk/status/1234567890123456789';
  
  console.log('Testing API with Twitter URL:', testUrl);
  
  try {
    const response = await fetch('http://localhost:54321/functions/v1/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        content: testUrl
      })
    });

    const result = await response.json();
    
    console.log('\n=== API Response Structure ===');
    console.log('Has sourceInfo?', !!result.sourceInfo);
    console.log('Has extractedData?', !!result.sourceInfo?.extractedData);
    console.log('Has embedHtml?', !!result.sourceInfo?.extractedData?.embedHtml);
    console.log('Has embedUrl?', !!result.sourceInfo?.extractedData?.embedUrl);
    
    if (result.sourceInfo?.extractedData?.embedHtml) {
      console.log('\n=== Embed HTML ===');
      console.log(result.sourceInfo.extractedData.embedHtml);
    }
    
    console.log('\n=== Full extractedData ===');
    console.log(JSON.stringify(result.sourceInfo?.extractedData, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAPI();