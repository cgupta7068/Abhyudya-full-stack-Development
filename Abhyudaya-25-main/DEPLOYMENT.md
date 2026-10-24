# Deploying on Vercel

This repository contains two separately deployable apps. Create two Vercel projects from the same Git repository:

1. **API project:** set the Root Directory to `Backend`. Vercel detects the Express app in `index.js`.
2. **Website project:** set the Root Directory to `Frontend`. Use the Vite framework preset and keep the build command as `npm run build` and output directory as `dist`.

Deploy the API first and note its production URL. Then set the following environment variables in the Vercel project settings for each environment you use.

## API project (`Backend`)

- `MONGO_URL` — MongoDB connection URI.
- `USERNAME_SECRET` — long, random secret used to sign authentication tokens.
- `USERMAIL` — email address used to send verification emails.
- `USERPASS` — email app password or SMTP credential.
- `APPLICATION_URL` — production website URL, such as `https://your-website.vercel.app`.
- `DEPLOYED_URL` and `ADMIN_URL` — optional additional allowed browser origins; leave unset if unused.
- `NODE_ENV` — set to `production`.

## Website project (`Frontend`)

- `VITE_BACKEND_API_URL` — API project's production URL, with a trailing slash, such as `https://your-api.vercel.app/`.
- `VITE_SUPABASE_URL` — Supabase project URL.
- `VITE_SUPABASE_KEY` — Supabase publishable key used by the browser for profile picture uploads.

`VITE_` variables are included in the website bundle, so only use publishable/public values there. Keep MongoDB credentials and `USERNAME_SECRET` in the API project only.

The local `.env` files are ignored by Git. Add the same values in Vercel's Environment Variables settings; do not commit credentials.
