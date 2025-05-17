import express, { Router, RequestHandler, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import winston from 'winston';

dotenv.config();

// Initialize Winston logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

const app = express();
const router = Router();
const port = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',     // Local development
  'http://localhost:3000',     // Local backend
  'https://basepay-psi.vercel.app',  // Production frontend
  'https://basepay-api.vercel.app' // Production backend
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(allowed => origin.includes(allowed))) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked origin:', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  logger.error('Supabase credentials not configured');
  process.exit(1);
}

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

    logger.info('Creating QR code', { wallet_address, website_url, website_name });

    // Validate website name
    if (!website_name) {
      logger.warn('Website name missing in request');
      return res.status(400).json({ error: 'Website name is required' });
    }

    // Validate that qr_data matches wallet_address
    if (qr_data !== wallet_address) {
      logger.warn('QR data mismatch with wallet address');
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
      logger.error('Supabase search error:', { error: searchError });
      return res.status(500).json({ error: 'Database search error' });
    }

    if (existingQR) {
      logger.info('Duplicate QR code request', { wallet_address, website_url });
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
      logger.error('URL check error:', { error: urlError });
      return res.status(500).json({ error: 'Database check error' });
    }

    if (urlCheck) {
      logger.info('Website URL already has QR code', { website_url });
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
      logger.error('Supabase insert error:', { error: insertError });
      return res.status(500).json({ error: 'Failed to create QR code entry' });
    }

    if (!newQR) {
      logger.error('Failed to retrieve created QR code');
      return res.status(500).json({ error: 'Failed to retrieve created QR code' });
    }

    logger.info('QR code created successfully', { id: newQR.id });
    res.status(201).json(newQR as QRCodeData);
  } catch (error) {
    logger.error('Error creating QR code:', { error });
    res.status(500).json({ 
      error: process.env.NODE_ENV === 'production' 
        ? 'Failed to create QR code' 
        : (error as Error).message 
    });
  }
};

const getQRCode: RequestHandler<QRCodeParams, QRCodeData | { error: string }> = async (req, res) => {
  try {
    const { wallet_address, website_url } = req.params;
    const decodedUrl = decodeURIComponent(website_url);

    logger.info('Fetching QR code', { wallet_address, website_url: decodedUrl });

    const { data: qrCode, error } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('wallet_address', wallet_address)
      .eq('website_url', decodedUrl)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        logger.info('QR code not found', { wallet_address, website_url: decodedUrl });
        res.status(404).json({ error: 'QR code not found' });
        return;
      }
      throw error;
    }

    logger.info('QR code retrieved successfully', { id: qrCode.id });
    res.status(200).json(qrCode as QRCodeData);
  } catch (error) {
    logger.error('Error fetching QR code:', { error });
    res.status(500).json({ 
      error: process.env.NODE_ENV === 'production' 
        ? 'Failed to fetch QR code' 
        : (error as Error).message 
    });
  }
};

// Health check endpoint for Render
router.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Routes
router.post('/api/qr-codes', createQRCode);
router.get('/api/qr-codes/:wallet_address/:website_url', getQRCode);

// Use router
app.use(router);

// Global error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: NextFunction) => {
  logger.error('Unhandled error:', { error: err });
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
}); 