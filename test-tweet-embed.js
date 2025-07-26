// Test script for Twitter embed functionality
const fetch = require('node-fetch');

async function testTweetEmbed() {
  const testUrl = 'https://twitter.com/elonmusk/status/1234567890123456789'; // Example tweet URL
  
  try {
    console.log('Testing tweet embed for:', testUrl);
    
    // Test the analyze endpoint with a Twitter URL
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
    
    console.log('\n=== Tweet Embed Information ===');
    console.log('Tweet ID:', result.sourceInfo?.extractedData?.tweetId);
    console.log('Embed URL:', result.sourceInfo?.extractedData?.embedUrl);
    console.log('\nEmbed HTML:');
    console.log(result.sourceInfo?.extractedData?.embedHtml);
    
    // Save embed HTML to test file
    const fs = require('fs');
    const embedHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Tweet Embed Test</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: 50px auto;
      padding: 20px;
    }
    h1 {
      color: #333;
    }
    .tweet-container {
      margin: 20px 0;
      border: 1px solid #ddd;
      padding: 20px;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <h1>Tweet Embed Test</h1>
  <div class="tweet-container">
    <h2>Embedded Tweet:</h2>
    ${result.sourceInfo?.extractedData?.embedHtml || '<p>No embed HTML generated</p>'}
  </div>
  <div class="tweet-container">
    <h2>Tweet Information:</h2>
    <p><strong>URL:</strong> ${testUrl}</p>
    <p><strong>Tweet ID:</strong> ${result.sourceInfo?.extractedData?.tweetId || 'Not found'}</p>
    <p><strong>Embed URL:</strong> ${result.sourceInfo?.extractedData?.embedUrl || 'Not generated'}</p>
  </div>
</body>
</html>
    `;
    
    fs.writeFileSync('tweet-embed-test.html', embedHtml);
    console.log('\nTest HTML saved to tweet-embed-test.html');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testTweetEmbed();