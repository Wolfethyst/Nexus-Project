# GitHub Actions Secrets

Add these to your GitHub repository settings under **Settings → Secrets and variables → Actions**:

```
CLOUDFLARE_API_TOKEN=      # Your Cloudflare API token
CLOUDFLARE_ACCOUNT_ID=     # Your Cloudflare Account ID
```

## Getting Your API Token

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use the "Edit Cloudflare Workers" template
4. Grant permissions for:
   - Workers Scripts (Edit)
   - Cloudflare Pages (Edit)
5. Copy the token and add it to GitHub Secrets

## Getting Your Account ID

1. Go to https://dash.cloudflare.com/
2. The Account ID is in the URL: `https://dash.cloudflare.com/{ACCOUNT_ID}`
