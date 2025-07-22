#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Simple deployment script...\n');

// Get the function file path
const functionPath = path.join(__dirname, 'supabase', 'functions', 'analyze', 'index.ts');

console.log('📁 Function file location:');
console.log(functionPath);
console.log('\n📋 For manual deployment:');
console.log('1. Go to: https://supabase.com/dashboard/project/uccitemlxlymvxfzxdsi/functions');
console.log('2. Click on the "analyze" function');
console.log('3. Copy the code from the file above');
console.log('4. Paste it in the web editor');
console.log('5. Click "Deploy"');

console.log('\n🔧 Alternative: Use Supabase CLI directly');
console.log('If your Supabase CLI is working, run:');
console.log('supabase functions deploy analyze --project-ref uccitemlxlymvxfzxdsi');

// Try to read and display the function content
const fs = require('fs');
if (fs.existsSync(functionPath)) {
  console.log('\n📄 Current function code (copy this to Supabase dashboard):');
  console.log('─'.repeat(60));
  const functionCode = fs.readFileSync(functionPath, 'utf8');
  console.log(functionCode);
  console.log('─'.repeat(60));
} else {
  console.log('\n❌ Function file not found at:', functionPath);
}