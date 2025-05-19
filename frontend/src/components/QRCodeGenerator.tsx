import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import { ethers } from 'ethers';

const USDC_CONTRACT_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base Mainnet USDC
const USDC_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)"
];

interface QRFormData {
  email: string;
  memo: string;
  amount: string;
}

const QRCodeGenerator = () => {
  const { user } = usePrivy();
  const apiUrl = 'https://basepay-api.vercel.app'; // Hardcode the correct API URL
  const adminWallet = import.meta.env.VITE_ADMIN_WALLET_ADDRESS;

  console.log('Environment Variables:', {
    apiUrl,
    adminWallet,
    envKeys: Object.keys(import.meta.env)
  });

  const [formData, setFormData] = useState<QRFormData>({
    email: '',
    memo: '',
    amount: '',
  });
  const [qrData, setQRData] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
    setSuccess(false);
  };

  const generateQRCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSuccess(false);

    try {
      if (!user?.wallet?.address) {
        throw new Error('Please connect your wallet first');
      }

      if (!adminWallet || adminWallet.trim() === '') {
        console.error('Admin wallet is missing or empty:', adminWallet);
        throw new Error('Admin wallet not configured properly');
      }

      if (!ethers.isAddress(adminWallet)) {
        console.error('Invalid admin wallet address:', adminWallet);
        throw new Error('Invalid admin wallet address format');
      }

      if (!validateEmail(formData.email)) {
        throw new Error('Please enter a valid email address');
      }

      if (!formData.memo.trim()) {
        throw new Error('Memo is required');
      }

      if (formData.memo.length > 100) {
        throw new Error('Memo must be less than 100 characters');
      }

      if (formData.amount && (isNaN(Number(formData.amount)) || Number(formData.amount) < 0)) {
        throw new Error('Please enter a valid amount');
      }

      // Initialize ethers provider and USDC contract
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, USDC_ABI, signer);

      // Convert 0.0001 USDC to the correct decimal places (USDC has 6 decimals)
      const amount = ethers.parseUnits("0.0001", 6);

      // Send USDC payment
      setPaymentStatus('processing');
      const tx = await usdcContract.transfer(adminWallet, amount, {
        gasLimit: 100000 // Add explicit gas limit
      });
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      if (!receipt.status) {
        throw new Error('Transaction failed');
      }
      setPaymentStatus('completed');

      const emailName = formData.email.split('@')[0];
      const qrData = {
        wallet: user.wallet.address,
        scanUrl: `${apiUrl}/api/qr-scan/${encodeURIComponent(formData.email)}`
      };

      const paymentData = {
        wallet_address: user.wallet.address,
        email: formData.email,
        email_name: emailName,
        memo: formData.memo.trim(),
        amount: formData.amount || '0',
        qr_data: JSON.stringify(qrData)
      };

      console.log('Sending request to:', `${apiUrl}/api/qr-codes`);
      console.log('Payment data:', paymentData);

      const response = await axios.post(`${apiUrl}/api/qr-codes`, paymentData, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.data) {
        throw new Error('Empty response from server');
      }

      // Set QR data directly from the response
      setQRData(response.data.qr_data);
      setSuccess(true);
    } catch (err: any) {
      console.error('Error:', err);
      setPaymentStatus('failed');
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response data:', err.response.data);
        console.error('Response status:', err.response.status);
        setError(err.response.data?.error || 'Failed to generate QR code');
      } else if (err.request) {
        // The request was made but no response was received
        console.error('No response received:', err.request);
        setError('No response from server. Please try again.');
      } else {
        // Something happened in setting up the request that triggered an Error
        setError(err.message || 'Failed to generate QR code');
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      const emailName = formData.email.split('@')[0];
      downloadLink.download = `${emailName}-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="flex-grow flex flex-col w-full h-full items-center justify-center">
      <div className="w-full max-w-5xl mx-auto bg-gray-800 rounded-xl p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <form onSubmit={generateQRCode} className="space-y-6 w-full">
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="your.email@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="memo" className="block text-sm font-medium text-gray-300">
                    Memo
                  </label>
                  <input
                    type="text"
                    id="memo"
                    name="memo"
                    required
                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                    value={formData.memo}
                    onChange={handleInputChange}
                    placeholder="Payment for services"
                  />
                </div>

                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-300">
                    Amount (USDC) Optional
                  </label>
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    step="0.01"
                    min="0"
                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 ${
                  loading
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-700 text-white'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    {paymentStatus === 'processing' ? 'Processing Payment...' : 'Generating...'}
                  </span>
                ) : (
                  'Generate QR Code (0.0001 USDC)'
                )}
              </button>

              {error && (
                <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg animate-fadeIn">
                  {error}
                </div>
              )}

              {success && (
                <div className="text-green-400 text-sm bg-green-900/20 p-3 rounded-lg animate-fadeIn">
                  QR Code generated successfully!
                </div>
              )}
            </form>
          </div>

          <div className="flex-1 flex items-center justify-center">
            {qrData ? (
              <div className="text-center animate-fadeIn">
                <div className="bg-white p-6 rounded-lg shadow-lg inline-block mb-4">
                  <div className="text-gray-800 font-medium mb-2">
                    {formData.email.split('@')[0]} USDC Payment Address
                  </div>
                  <QRCodeSVG 
                    id="qr-code-svg"
                    value={qrData}
                    size={256} 
                    level="H"
                    includeMargin={true}
                  />
                  <div className="text-gray-600 text-sm mt-2">
                    Scan to pay with USDC on Base
                  </div>
                </div>
                <div className="mb-4 text-gray-300">
                  <p className="font-medium mb-1">USDC Payment Address:</p>
                  <p className="font-mono select-all cursor-pointer break-all" title="Click to select address">
                    {user?.wallet?.address || ''}
                  </p>
                </div>
                <button
                  onClick={downloadQR}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-all duration-200 transform hover:scale-105"
                >
                  Download QR Code
                </button>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <svg className="w-32 h-32 mx-auto mb-4 opacity-50" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zm-8 6h6v6H7v-6zm2 2v2h2v-2H9zm-6 4h4v2H3v-2zm14-4h2v4h-2v-4zm0 6h4v2h-4v-2zM19 7h2v2h-2V7zm-6 8h2v2h-2v-2zm2 4h2v2h-2v-2z"/>
                </svg>
                <p className="text-lg">Generate a QR code to see it here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeGenerator; 