import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import { ethers } from 'ethers';

// USDC contract ABI (only transfer function needed)
const USDC_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)"
];

// Base Mainnet USDC contract address
const USDC_CONTRACT_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

interface RetrievalFormData {
  email: string;
}

const QRCodeRetrieval = () => {
  const { user } = usePrivy();
  const apiUrl = import.meta.env.VITE_API_URL;
  const adminWallet = import.meta.env.VITE_ADMIN_WALLET_ADDRESS;
  const [formData, setFormData] = useState<RetrievalFormData>({ email: '' });
  const [qrData, setQRData] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const payFeeAndRetrieveQR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.wallet?.address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!adminWallet) {
      setError('Admin wallet not configured');
      return;
    }

    setLoading(true);
    setError('');
    setPaymentStatus('processing');

    try {
      if (!validateEmail(formData.email)) {
        throw new Error('Please enter a valid email address');
      }

      // Initialize ethers provider and USDC contract
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, USDC_ABI, signer);

      // Convert 1 USDC to the correct decimal places (USDC has 6 decimals)
      const amount = ethers.parseUnits("1.0", 6);

      // Send 1 USDC payment
      const tx = await usdcContract.transfer(adminWallet, amount);
      await tx.wait(); // Wait for transaction confirmation

      setPaymentStatus('completed');

      // After payment confirmation, retrieve the QR code
      const response = await axios.get(
        `${apiUrl}/api/qr-codes/${encodeURIComponent(formData.email)}`,
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (response.data) {
        setQRData(response.data);
      } else {
        throw new Error('No QR code found');
      }
    } catch (err: any) {
      console.error('Error:', err);
      setPaymentStatus('failed');
      setError(err.response?.data?.error || err.message || 'Failed to retrieve QR code');
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    if (!qrData) return;

    const svg = document.getElementById('retrieved-qr-code-svg');
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
      downloadLink.download = `${qrData.email_name}-qr.png`;
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
            <h2 className="text-2xl font-bold text-white mb-6">Retrieve Your QR Code</h2>
            <p className="text-gray-400 mb-6">
              Enter the email address to retrieve your existing QR code. A fee of 1 USDC will be charged.
            </p>
            
            <form onSubmit={payFeeAndRetrieveQR} className="space-y-6 w-full">
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
              </div>

              <button
                type="submit"
                disabled={loading || !validateEmail(formData.email)}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 ${
                  loading || !validateEmail(formData.email)
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
                    {paymentStatus === 'processing' ? 'Processing Payment...' : 'Retrieving...'}
                  </span>
                ) : (
                  'Retrieve QR Code (1 USDC)'
                )}
              </button>

              {error && (
                <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg animate-fadeIn">
                  {error}
                </div>
              )}
            </form>
          </div>

          <div className="flex-1 flex items-center justify-center">
            {qrData ? (
              <div className="text-center animate-fadeIn">
                <div className="bg-white p-6 rounded-lg shadow-lg inline-block mb-4">
                  <div className="text-gray-800 font-medium mb-2">
                    {qrData.email_name} USDC Payment Address
                  </div>
                  <QRCodeSVG
                    id="retrieved-qr-code-svg"
                    value={qrData.qr_data}
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
                    {qrData.wallet_address}
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
                <p className="text-lg">Enter an email address to retrieve a QR code</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeRetrieval; 