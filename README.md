# AbanRemit - Mobile Money & Remittance Platform

A modern, secure mobile money transfer and remittance platform for East Africa.

## Features

- 💰 Mobile Money Transfers (M-Pesa, Airtel Money)
- 💳 Card Payments (Stripe)
- 🌍 Multi-Currency Support
- 📱 PWA Support (Install as App)
- 🔐 Secure KYC Verification
- 📊 Real-time Transaction Tracking
- 👥 Multi-Role Support (User, Agent, Admin)
- 💸 Send Money, Buy Airtime, Withdraw
- 📈 Exchange Rate Integration
- 🔔 Real-time Notifications

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Supabase (Backend & Auth)
- Shadcn/ui Components

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Payment Integrations

- **M-Pesa**: Via proxy server on Render
- **Stripe**: Card payments
- **PesaPal**: Multiple payment methods
- **Exchange Rate API**: Real-time currency conversion

## Project Structure

```
src/
├── components/       # Reusable UI components
├── pages/           # Page components
├── services/        # API services
├── hooks/           # Custom React hooks
├── integrations/    # Third-party integrations
└── lib/            # Utility functions

supabase/
├── functions/       # Edge Functions
└── migrations/      # Database migrations
```

## License

MIT

## Support

For support, email support@abanremit.com
