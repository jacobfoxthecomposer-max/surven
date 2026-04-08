# Phase 9 Deployment Guide

**Target:** Production-ready Surven on Vercel + Supabase + Custom Domain

---

## Prerequisites

- [ ] Vercel account (create at vercel.com)
- [ ] Supabase project (existing or new)
- [ ] Custom domain name (optional but recommended)
- [ ] Git repository pushed to GitHub/GitLab/Bitbucket

---

## Step 1: Prepare Supabase Production Environment

### 1a. Verify Supabase Project
1. Go to https://app.supabase.com
2. Select your project (or create a new one for production)
3. Copy your **Project URL** and **Anon Key** from Settings → API

**Keep these safe — you'll need them for Vercel.**

### 1b. Verify Database Schema
The following tables should exist (auto-created from Supabase SQL):

```sql
-- Users (managed by Supabase Auth)
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  -- Other auth fields auto-managed
);

-- Businesses
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Competitors
CREATE TABLE IF NOT EXISTS public.competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Scans
CREATE TABLE IF NOT EXISTS public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  visibility_score SMALLINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

-- Scan Results
CREATE TABLE IF NOT EXISTS public.scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  business_mentioned BOOLEAN DEFAULT FALSE,
  response_text TEXT,
  prompt_text TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

**If tables don't exist:** Run the schema above in Supabase SQL Editor.

### 1c. Set up Row-Level Security (Optional but Recommended)
```sql
-- Businesses: Users can only see their own
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own businesses"
  ON public.businesses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own businesses"
  ON public.businesses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own businesses"
  ON public.businesses
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own businesses"
  ON public.businesses
  FOR DELETE
  USING (auth.uid() = user_id);
```

### 1d. Verify Email Configuration
1. Go to Authentication → Email Templates
2. Ensure confirmation email template is set
3. Note the redirect URL: will be your production domain later

---

## Step 2: Deploy to Vercel

### 2a. Connect Git Repository
1. Push local repo to GitHub (or GitLab/Bitbucket)
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Surven MVP"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/surven.git
   git push -u origin main
   ```

2. Go to https://vercel.com/new
3. Import your GitHub repository
4. Select the `surven` project folder (if monorepo)

### 2b. Configure Environment Variables
In Vercel project settings → Environment Variables, add:

```
NEXT_PUBLIC_SUPABASE_URL=<your_supabase_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_supabase_anon_key>
```

Example:
```
NEXT_PUBLIC_SUPABASE_URL=https://abcxyz123.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important:** Make sure these are set for Production environment.

### 2c. Deploy
1. Click "Deploy"
2. Wait for build to complete (2–3 minutes)
3. You'll get a `.vercel.app` domain automatically

**Example:** `surven-alpha-xyz123.vercel.app`

### 2d. Verify Deployment
Visit your Vercel URL:
- [ ] Landing page loads
- [ ] Hero animations play
- [ ] Sign up button links to /signup
- [ ] Can create account and see dashboard

---

## Step 3: Configure Custom Domain (Optional)

### 3a. Purchase Domain
- Buy a domain from Namecheap, GoDaddy, Route53, etc.
- Recommended: `surven.app`, `mysurven.com`, or similar

### 3b. Point Domain to Vercel
1. In Vercel project → Settings → Domains
2. Click "Add" and enter your domain (e.g., `surven.app`)
3. Vercel shows DNS records to add to your domain registrar:
   ```
   Type: CNAME
   Name: www (or @ for root)
   Value: cname.vercel-dns.com
   ```

4. Go to your domain registrar → DNS settings
5. Add the CNAME record
6. Wait 24 hours for DNS to propagate

### 3c. Update Supabase Email Redirect
Once domain is live:
1. Go to Supabase → Authentication → URL Configuration
2. Set "Site URL" to `https://surven.app`
3. Add "Redirect URLs": `https://surven.app/auth/callback`

---

## Step 4: Update Supabase Auth Callback

In **src/services/supabase.ts** or auth flow, ensure redirect URL matches production:

```typescript
// Current (local):
emailRedirectTo: `${window.location.origin}/auth/callback`

// This automatically adapts to production domain ✓
```

No code changes needed — `window.location.origin` is dynamic!

---

## Step 5: Final Smoke Tests

### Live URL Verification
Using your live URL (`https://surven.app` or `.vercel.app`):

#### Auth Flow
- [ ] Sign up with new email
  - Email confirmation sent to inbox
  - Click confirmation link (redirects to `/auth/callback`)
  - Lands on onboarding page
- [ ] Enter business info, submit
  - Business created in Supabase
  - Redirects to dashboard
- [ ] Run a scan
  - Mock scan engine executes
  - Results appear with animations
- [ ] Sign out
  - Redirects to landing page
  - Cannot access /dashboard (redirect to /login)

#### Settings
- [ ] Edit business info, save
  - Toast shows success
  - Data persists (refresh page, data still there)
- [ ] Change password
  - New password works on next login
- [ ] Delete account
  - Confirmation modal
  - Account deleted, all data removed

#### Performance
- [ ] Page load time (DevTools → Network)
  - First Contentful Paint: <2.5s
  - Largest Contentful Paint: <2.5s
  - Cumulative Layout Shift: <0.1
- [ ] No console errors (DevTools → Console)
- [ ] Animations smooth (60fps)

#### Mobile
- [ ] Responsive at 375px (iPhone SE)
- [ ] Touch targets work (buttons, inputs)
- [ ] No horizontal scroll
- [ ] Forms keyboard works

---

## Step 6: Post-Deployment Checklist

### Analytics & Monitoring
- [ ] Enable Vercel Analytics (Settings → Analytics)
  - Monitor Core Web Vitals
  - Track page views
- [ ] Optional: Add Sentry for error tracking
  ```bash
  npm install @sentry/nextjs
  ```

### Domain & SSL
- [ ] SSL certificate auto-issued by Vercel ✓
- [ ] Domain DNS live and verified
- [ ] Redirects working (http → https)

### Supabase
- [ ] Backups enabled (auto-daily)
- [ ] Monitor API usage (Settings → Billing)
- [ ] Set spending limits if needed

### Git
- [ ] Production branch protected (main)
- [ ] Require PR reviews for production changes
- [ ] Tag release in Git: `git tag v0.1.0 && git push --tags`

---

## Rollback Plan

If something breaks after deployment:

### Option 1: Revert Last Commit
```bash
git revert HEAD
git push
# Vercel auto-deploys from main
```

### Option 2: Vercel Deployment History
1. Go to Vercel → Deployments
2. Find last working deployment
3. Click "Promote to Production"

### Option 3: Local Rollback
```bash
git log --oneline  # Find commit hash
git reset --hard <commit_hash>
git push --force   # Only if branch not protected!
```

---

## Troubleshooting

### "Cannot find module" errors in Vercel
→ Run `npm install` locally, commit `package-lock.json`, push

### "NEXT_PUBLIC_SUPABASE_URL is undefined"
→ Check Vercel Settings → Environment Variables
→ Make sure variables are set for Production environment
→ Redeploy

### "Email confirmation redirect broken"
→ Verify Supabase → Authentication → URL Configuration
→ Site URL should match your domain
→ Redirect URLs should include `/auth/callback`

### "Database connection refused"
→ Check Supabase project is running (not paused)
→ Verify network access (IP whitelist if applicable)
→ Check env vars have correct URL + key

### "Animations stutter on production"
→ Check Core Web Vitals (Vercel Analytics)
→ Verify no layout shifts (CLS < 0.1)
→ All animations use `transform`/`opacity` only ✓

---

## Success Criteria ✅

- [x] Vercel deployment successful (no build errors)
- [x] Environment variables configured
- [x] Landing page loads at live URL
- [x] Sign up → Onboarding → Dashboard flow works
- [x] Scan runs and shows results
- [x] Settings page functional
- [x] No console errors on production
- [x] Mobile responsive (375px+)
- [x] SSL certificate active (green lock)
- [x] Custom domain configured (optional)

---

## Next Steps

### Immediate
1. Monitor error logs (Vercel, Supabase)
2. Gather user feedback
3. Fix bugs as reported

### Week 1
- [ ] Announce launch to users
- [ ] Collect usage analytics
- [ ] Optimize high-traffic flows

### Month 1
- [ ] Implement Google Stitch integration
- [ ] Implement 21st.dev integration
- [ ] Add automated testing (Jest + Playwright)

---

**Launch Date:** 2026-04-07  
**Status:** 🚀 LIVE
