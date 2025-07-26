// Test script to check what the analyze endpoint returns
const fetch = require('node-fetch');

async function testAnalyzeResponse() {
  const testUrl = 'https://twitter.com/elonmusk/status/1234567890123456789';
  
  console.log('Testing analyze endpoint with:', testUrl);
  
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

    if (!response.ok) {
      console.error('API Error:', response.status, await response.text());
      return;
    }

    const result = await response.json();
    
    console.log('\n=== Full Response ===');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n=== Embed Data Check ===');
    console.log('Has sourceInfo?', !!result.sourceInfo);
    console.log('Has extractedData?', !!result.sourceInfo?.extractedData);
    console.log('Type:', result.sourceInfo?.extractedData?.type);
    console.log('Has embedHtml?', !!result.sourceInfo?.extractedData?.embedHtml);
    console.log('embedHtml:', result.sourceInfo?.extractedData?.embedHtml);
    console.log('Has embedUrl?', !!result.sourceInfo?.extractedData?.embedUrl);
    console.log('embedUrl:', result.sourceInfo?.extractedData?.embedUrl);
    console.log('Tweet ID:', result.sourceInfo?.extractedData?.tweetId);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAnalyzeResponse();