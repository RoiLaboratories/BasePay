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
dotenv_1.default.config();
const app = (0, express_1.default)();
const router = (0, express_1.Router)();
const port = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
// Route handlers
const createQRCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const { data: existingQR, error: searchError } = yield supabase
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
        const { data: urlCheck, error: urlError } = yield supabase
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
            console.error('Supabase insert error:', insertError);
            return res.status(500).json({ error: 'Failed to create QR code entry' });
        }
        if (!newQR) {
            return res.status(500).json({ error: 'Failed to retrieve created QR code' });
        }
        res.status(201).json(newQR);
    }
    catch (error) {
        console.error('Error creating QR code:', error);
        res.status(500).json({ error: 'Failed to create QR code' });
    }
});
const getQRCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { wallet_address, website_url } = req.params;
        const decodedUrl = decodeURIComponent(website_url);
        const { data: qrCode, error } = yield supabase
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
        res.status(200).json(qrCode);
    }
    catch (error) {
        console.error('Error fetching QR code:', error);
        res.status(500).json({ error: 'Failed to fetch QR code' });
    }
});
// Routes
router.post('/api/qr-codes', createQRCode);
router.get('/api/qr-codes/:wallet_address/:website_url', getQRCode);
// Use router
app.use(router);
// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
