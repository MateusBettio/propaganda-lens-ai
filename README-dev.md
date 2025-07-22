# Propaganda Lens - Development Workflow

## 🛠️ Local Development Setup

Now you can develop and deploy Edge Functions locally without copy-pasting!

### **Quick Commands:**

```bash
# Deploy to production (automatic linking & authentication check)
npm run deploy

# Quick deploy (if already set up)
npm run deploy:quick

# View live function logs
npm run logs

# Login to Supabase (one-time setup)
npm run login

# Check status
npm run status
```

**Note:** Uses your global Supabase CLI installed via Scoop - no need for `npx`!

## 🚀 Development Workflow

### **1. Make Changes**
Edit `supabase/functions/analyze/index.ts` in your IDE

### **2. Deploy**
```bash
npm run deploy
```

### **3. Test**
Use your Expo app to test the changes

### **4. Debug**
```bash
npm run logs
```

## 📁 **Project Structure**

```
propaganda-lens-ai/
├── supabase/
│   ├── functions/
│   │   └── analyze/
│   │       └── index.ts        # Your Edge Function code
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── config.toml
├── package.json                # NPM scripts for deployment
├── deploy.js                   # Automated deployment script
└── README-dev.md              # This file
```

## 🔧 **Environment Variables**

Set these in **Supabase Dashboard → Settings → Edge Functions**:
- `OPENAI_API_KEY`: Your OpenAI API key
- `JINA_API_KEY`: Your Jina Reader API key (optional)

## 🐛 **Debugging**

### View Function Logs:
```bash
npm run logs
```

### Common Issues:
- **Not authenticated**: Run `npm run login`
- **Project not linked**: Run `npm run link`
- **Environment variables**: Check Supabase dashboard

## 🎯 **Benefits**

✅ **No more copy-pasting** code to Supabase dashboard
✅ **Version control** your Edge Functions
✅ **Local development** with proper tooling
✅ **Automated deployment** with error checking
✅ **Live logs** for debugging

## 🔄 **Deployment Process**

The `npm run deploy` script:
1. Checks if you're authenticated
2. Links to your project (if needed)
3. Deploys the function
4. Shows the live URL

## 📊 **Function URL**

Your deployed function is available at:
```
https://uccitemlxlymvxfzxdsi.supabase.co/functions/v1/analyze
```

## ⚡ **Pro Tips**

- Use `npm run deploy:quick` for faster deploys (skips checks)
- Keep `npm run logs` open in another terminal while testing
- Edit `supabase/functions/analyze/index.ts` directly in your IDE
- Use TypeScript for better development experience