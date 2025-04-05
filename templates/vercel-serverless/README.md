# Vercel Serverless Calculator Agent

A serverless calculator API powered by SpinAI that performs mathematical operations using a natural language interface.

## Project Structure

- `api/` - Contains serverless function endpoints
- `actions/` - Contains calculator operations (sum, minus, multiply, divide)
- `dev-server.ts` - Local development server that mimics Vercel's serverless environment

## Development

### Local Development Options

#### Option 1: Custom Dev Server (Recommended)

Our custom development server mimics Vercel's serverless environment but with better debugging capabilities and no timeout issues:

```bash
npm run dev
```

This starts a server at http://localhost:3000 that:
- Automatically discovers all API endpoints in the `api/` directory
- Maps `/api/endpoint` and `/endpoint` to the corresponding handlers
- Provides detailed error messages for debugging

#### Option 2: Vercel Dev

You can also use Vercel's official development environment:

```bash
npm run vercel-dev
# or
vercel dev
```

### Testing Your API

Send a POST request to your API endpoint:

```bash
curl -X POST http://localhost:3000/api -H "Content-Type: application/json" -d '{"input": "5+7"}'
```

Example request body:
```json
{
  "input": "5+7"
}
```

Example response:
```json
{
  "response": {
    "finalNumber": 12
  },
  "messages": [...]
}
```

## Deployment

### Configuration

Before deploying, ensure your `vercel.json` file is properly configured:

```json
{
  "version": 2,
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 60
    }
  }
}
```

> **IMPORTANT**: The `maxDuration` setting is crucial for preventing logging timeouts. The default 10-second timeout is often not enough for SpinAI agents to complete execution and send logs properly.

### Environment Variables

Set these environment variables in your Vercel project:

- `SPINAI_API_KEY` - Your SpinAI API key

### Deploy to Vercel

```bash
vercel deploy
# or for production
vercel deploy --prod
```

Your API will be accessible at:
```
https://your-project-name.vercel.app/api
```

## Troubleshooting

### Empty Log Bodies

If you're experiencing empty log bodies in your logging endpoint:

1. **Increase function timeout**: Ensure `maxDuration` is set to at least 60 seconds in `vercel.json`
2. **Check connection closure**: Vercel may close connections before logs are fully transmitted (see issue: https://github.com/denoland/deno/issues/27132)
3. **Error handling**: The code includes special handling for `BadResource` errors that occur when connections close prematurely

### Testing Locally vs Production

If your function works locally but fails in production:

1. Check environment variables in Vercel dashboard
2. Ensure `maxDuration` is properly set in `vercel.json`
3. Look for timeout errors in Vercel function logs 