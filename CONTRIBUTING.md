# Contributing to Open-Source Job & Internship Tracker

Thank you for helping improve this open-source career platform.

## Development Workflow

1. **Fork & Clone** the repository.
2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. **Install dependencies & configure `.env`** using `.env.example`.
4. **Verify types and build** before committing:
   ```bash
   npm run lint
   npm run build
   ```

## Code Standards

- Use TypeScript with strict typing across both `src/` and `server/`.
- Never commit `.env` files, database credentials, or JWT secrets.
- Never allow client requests to elevate user privileges (`role: 'admin'` must remain restricted to backend admin endpoints).
- Keep UI metadata clean, accessible (WCAG AA contrast, keyboard focus rings), and responsive across desktop, tablet, and mobile viewports.

## Pull Request Checklist

- [ ] Tested locally against MongoDB Atlas or local store.
- [ ] `npm run lint` passes with zero errors.
- [ ] `npm run build` succeeds cleanly.
- [ ] Updated `docs/API.md` if any REST endpoints changed.
