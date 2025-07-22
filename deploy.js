#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Deploying Supabase Edge Functions...\n');

// Check if we're authenticated

try {
  execSync('supabase projects list', { stdio: 'pipe' });
  console.log('✅ Already authenticated with Supabase');
} catch (error) {
  console.log('❌ Not authenticated with Supabase');
  console.log('Please run: npm run login');
  process.exit(1);
}

// Check if project is linked
const configFile = path.join(__dirname, '.supabase', 'config.toml');
if (!fs.existsSync(configFile)) {
  console.log('🔗 Linking to Supabase project...');
  try {
    execSync('supabase link --project-ref uccitemlxlymvxfzxdsi', { stdio: 'inherit' });
    console.log('✅ Project linked successfully');
  } catch (error) {
    console.log('❌ Failed to link project');
    process.exit(1);
  }
}

// Deploy the function
console.log('📦 Deploying analyze function...');
try {
  execSync('supabase functions deploy analyze --project-ref uccitemlxlymvxfzxdsi', { stdio: 'inherit' });
  console.log('\n✅ Function deployed successfully!');
  console.log('🌐 Your function is live at:');
  console.log('https://uccitemlxlymvxfzxdsi.supabase.co/functions/v1/analyze');
} catch (error) {
  console.log('❌ Deployment failed');
  process.exit(1);
}