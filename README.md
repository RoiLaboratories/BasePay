# Base Pay QR Generator

A full-stack application for generating secure, downloadable QR codes linked to USDC wallet addresses on the Base mainnet. Users can create unique QR codes for receiving payments, with support for custom memos and predefined amounts.

## Features

- Secure wallet connection using Privy
- QR code generation for Base USDC payments
- Unique QR codes per wallet-URL combination
- Downloadable QR codes in PNG/SVG format
- Mobile-responsive design
- Base mainnet integration
- Supabase database for QR metadata storage

## Tech Stack

### Frontend
- React + Vite
- TypeScript
- Privy for wallet connection
- QR code generation library
- Tailwind CSS for styling

### Backend
- Express.js
- Supabase
- TypeScript
- JWT for authentication

## Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn
- Supabase account
- Privy API credentials

### Installation

1. Clone the repository
2. Install frontend dependencies:
```bash
cd frontend
npm install
npm run dev
```

3. Install backend dependencies:
```bash
cd backend
npm install
npm run dev
```

4. Configure environment variables:
Create `.env` files in both frontend and backend directories with the necessary credentials.

## Environment Variables

### Frontend
```
VITE_PRIVY_APP_ID=your_privy_app_id
VITE_API_URL=http://localhost:3000
```

### Backend
```
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

## License

MIT
