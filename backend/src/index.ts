import express, { Router, RequestHandler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const router = Router();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Types
interface QRDisplayData {
  address: string;
  amount: string;
  currency: string;
  website: string;
  memo: string;
}

interface QRCodeData {
  id: number;
  wallet_address: string;
  website_url: string;
  website_name: string;
  memo: string;
  amount?: string;
  qr_data: string;
  created_at: Date;
}

interface QRCodeRequest {
  wallet_address: string;
  website_url: string;
  website_name: string;
  memo: string;
  amount?: string;
  qr_data: string;
}

interface QRCodeParams {
  wallet_address: string;
  website_url: string;
}

// Route handlers
const createQRCode: RequestHandler<{}, QRCodeData | { error: string }, QRCodeRequest> = async (req, res) => {
  try {
    const { wallet_address, website_url, website_name, memo, amount, qr_data } = req.body;

    // Validate website name
    if (!website_name) {
      return res.status(400).json({ error: 'Website name is required' });
    }

    // Validate that qr_data matches wallet_address
    if (qr_data !== wallet_address) {
      return res.status(400).json({ error: 'QR data must match wallet address' });
    }

    // Check for existing QR code with same wallet and URL combination
    const { data: existingQR, error: searchError } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('wallet_address', wallet_address)
      .eq('website_url', website_url)
      .single();

    if (searchError && searchError.code !== 'PGRST116') {
      console.error('Supabase search error:', searchError);
      return res.status(500).json({ error: 'Database search error' });
    }

    if (existingQR) {
      return res.status(409).json({
        error: 'QR code already exists for this combination of wallet address and website URL'
      });
    }

    // Check if website URL already has a QR code
    const { data: urlCheck, error: urlError } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('website_url', website_url)
      .single();

    if (urlError && urlError.code !== 'PGRST116') {
      console.error('URL check error:', urlError);
      return res.status(500).json({ error: 'Database check error' });
    }

    if (urlCheck) {
      return res.status(409).json({
        error: 'This website URL already has a QR code generated'
      });
    }

    // Create new QR code entry
    const { data: newQR, error: insertError } = await supabase
      .from('qr_codes')
      .insert([
        {
          wallet_address,
          website_url,
          website_name,
          memo,
          amount: amount || '0',
          qr_data,
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return res.status(500).json({ error: 'Failed to create QR code entry' });
    }

    if (!newQR) {
      return res.status(500).json({ error: 'Failed to retrieve created QR code' });
    }

    res.status(201).json(newQR as QRCodeData);
  } catch (error) {
    console.error('Error creating QR code:', error);
    res.status(500).json({ error: 'Failed to create QR code' });
  }
};

const getQRCode: RequestHandler<QRCodeParams, QRCodeData | { error: string }> = async (req, res) => {
  try {
    const { wallet_address, website_url } = req.params;
    const decodedUrl = decodeURIComponent(website_url);

    const { data: qrCode, error } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('wallet_address', wallet_address)
      .eq('website_url', decodedUrl)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'QR code not found' });
        return;
      }
      throw error;
    }

    res.status(200).json(qrCode as QRCodeData);
  } catch (error) {
    console.error('Error fetching QR code:', error);
    res.status(500).json({ error: 'Failed to fetch QR code' });
  }
};

// Routes
router.post('/api/qr-codes', createQRCode);
router.get('/api/qr-codes/:wallet_address/:website_url', getQRCode);

// Use router
app.use(router);

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 