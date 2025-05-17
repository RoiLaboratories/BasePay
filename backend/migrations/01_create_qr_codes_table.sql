-- Create QR codes table
CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  website_url TEXT NOT NULL,
  memo TEXT NOT NULL,
  amount TEXT,
  qr_data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(wallet_address, website_url)
); 