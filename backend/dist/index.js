"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importStar(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const supabase_js_1 = require("@supabase/supabase-js");
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const winston_1 = __importDefault(require("winston"));
dotenv_1.default.config();
// Initialize Winston logger
const logger = winston_1.default.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.File({ filename: 'error.log', level: 'error' }),
        new winston_1.default.transports.File({ filename: 'combined.log' })
    ]
});
// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.simple()
    }));
}
const app = (0, express_1.default)();
const router = (0, express_1.Router)();
const port = process.env.PORT || 3000;
// Security middleware
app.use((0, helmet_1.default)());
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);
// CORS configuration
const allowedOrigins = [
    'http://localhost:5173', // Local development
    'http://localhost:3000', // Local backend
    'https://basepayqr.vercel.app', // Production frontend
    'https://basepay-api.vercel.app' // Production backend
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.some(allowed => origin.includes(allowed))) {
            callback(null, true);
        }
        else {
            logger.warn('CORS blocked origin:', { origin });
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express_1.default.json());
// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
if (!supabaseUrl || !supabaseKey) {
    logger.error('Supabase credentials not configured');
    process.exit(1);
}
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
// Route handlers
const createQRCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const { data: existingQR, error: searchError } = yield supabase
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
        const { data: urlCheck, error: urlError } = yield supabase
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
        const { data: newQR, error: insertError } = yield supabase
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
        res.status(201).json(newQR);
    }
    catch (error) {
        logger.error('Error creating QR code:', { error });
        res.status(500).json({
            error: process.env.NODE_ENV === 'production'
                ? 'Failed to create QR code'
                : error.message
        });
    }
});
const getQRCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { wallet_address, website_url } = req.params;
        const decodedUrl = decodeURIComponent(website_url);
        logger.info('Fetching QR code', { wallet_address, website_url: decodedUrl });
        const { data: qrCode, error } = yield supabase
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
        res.status(200).json(qrCode);
    }
    catch (error) {
        logger.error('Error fetching QR code:', { error });
        res.status(500).json({
            error: process.env.NODE_ENV === 'production'
                ? 'Failed to fetch QR code'
                : error.message
        });
    }
});
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
app.use((err, req, res, next) => {
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
