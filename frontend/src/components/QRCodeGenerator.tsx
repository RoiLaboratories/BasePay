import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';

interface QRFormData {
  website_url: string;
  memo: string;
  amount: string;
}

const QRCodeGenerator = () => {
  const { user } = usePrivy();
  const apiUrl = import.meta.env.VITE_API_URL;

  console.log('Current API URL:', apiUrl);

  if (!apiUrl) {
    return (
      <div className="flex-grow flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4 text-red-400">Configuration Error</h2>
          <p className="text-gray-400">
            API URL not configured. Please check your environment variables.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Current API URL: {apiUrl || 'not set'}
          </p>
        </div>
      </div>
    );
  }

  const [formData, setFormData] = useState<QRFormData>({
    website_url: '',
    memo: '',
    amount: '',
  });
  const [qrData, setQRData] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const extractWebsiteName = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '').split('.')[0];
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    } catch (err) {
      return 'Unknown';
    }
  };

  const checkExistingQRCode = async (walletAddress: string, websiteUrl: string) => {
    try {
      const response = await axios.get(
        `${apiUrl}/api/qr-codes/${walletAddress}/${encodeURIComponent(websiteUrl)}`
      );
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        return null;
      }
      throw err;
    }
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

      if (!apiUrl) {
        throw new Error('API URL not configured');
      }

      // Validate input data
      if (!formData.website_url) {
        throw new Error('Website URL is required');
      }

      try {
        new URL(formData.website_url);
      } catch (err) {
        throw new Error('Please enter a valid website URL');
      }

      if (!formData.memo.trim()) {
        throw new Error('Memo is required');
      }

      if (formData.amount && (isNaN(Number(formData.amount)) || Number(formData.amount) < 0)) {
        throw new Error('Please enter a valid amount');
      }

      console.log('Making API request to:', apiUrl);

      // Check for existing QR code
      try {
        const existingQR = await checkExistingQRCode(user.wallet.address, formData.website_url);
        if (existingQR) {
          console.log('Found existing QR:', existingQR);
          setQRData(existingQR.qr_data);
          setSuccess(true);
          setLoading(false);
          return;
        }
      } catch (checkErr: any) {
        console.error('Error checking existing QR:', checkErr);
        if (checkErr.response?.status !== 404) {
          throw checkErr;
        }
      }

      const websiteName = extractWebsiteName(formData.website_url);
      const paymentData = {
        wallet_address: user.wallet.address,
        website_url: formData.website_url,
        website_name: websiteName,
        memo: formData.memo,
        amount: formData.amount || '0',
        qr_data: user.wallet.address
      };

      // Log the exact data being sent
      console.log('Sending exact data to API:', {
        url: `${apiUrl}/api/qr-codes`,
        method: 'POST',
        data: paymentData,
        walletLength: user.wallet.address.length,
        websiteUrlLength: formData.website_url.length,
        memoLength: formData.memo.length
      });

      const maxRetries = 2;
      let retryCount = 0;
      let lastError = null;

      while (retryCount <= maxRetries) {
        try {
          const response = await axios.post(`${apiUrl}/api/qr-codes`, paymentData, {
            headers: {
              'Content-Type': 'application/json',
              'X-Client-Version': '1.0.0',
              'X-Request-Time': new Date().toISOString(),
              'Origin': window.location.origin,
              'X-Debug-Info': 'frontend-retry-' + retryCount
            },
            withCredentials: true,
            timeout: 15000 // Increased timeout to 15 seconds
          });
          
          console.log('Successful API Response:', {
            status: response.status,
            data: response.data,
            headers: response.headers
          });
          
          if (!response.data) {
            throw new Error('Empty response from server');
          }

          if (!response.data.qr_data) {
            throw new Error('Missing QR data in response');
          }

          setQRData(response.data.qr_data);
          setSuccess(true);
          return;
        } catch (err: any) {
          lastError = err;
          const errorDetails = {
            message: err.message,
            status: err.response?.status,
            statusText: err.response?.statusText,
            data: err.response?.data,
            config: {
              url: err.config?.url,
              method: err.config?.method,
              data: JSON.parse(err.config?.data || '{}'),
              headers: err.config?.headers
            }
          };
          
          console.error(`Request attempt ${retryCount + 1} failed:`, errorDetails);
          
          // Check for specific error conditions
          if (err.response?.data?.error === 'Failed to create QR code entry') {
            console.error('Database insertion failed. Checking data validity:', {
              hasWalletAddress: !!paymentData.wallet_address,
              walletAddressFormat: /^0x[a-fA-F0-9]{40}$/.test(paymentData.wallet_address),
              websiteUrlValid: paymentData.website_url.startsWith('http'),
              memoPresent: !!paymentData.memo,
              amountValid: !isNaN(Number(paymentData.amount))
            });
          }

          if (err.response?.status === 500) {
            retryCount++;
            if (retryCount <= maxRetries) {
              const delay = 1000 * retryCount;
              console.log(`Retrying in ${delay}ms... Attempt ${retryCount} of ${maxRetries}`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          }
          break;
        }
      }

      throw lastError;
    } catch (err: any) {
      console.error('All attempts failed. Final error details:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        config: err.config ? {
          url: err.config.url,
          method: err.config.method,
          data: JSON.parse(err.config.data || '{}'),
          headers: err.config.headers
        } : 'No config available'
      });
      
      let errorMessage = 'Failed to generate QR code. Please try again.';
      
      if (err.response?.data?.error === 'Failed to create QR code entry') {
        errorMessage = 'Unable to save QR code. Please check your input and try again.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error. Please try again in a few moments.';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
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
      const websiteName = extractWebsiteName(formData.website_url);
      downloadLink.download = `${websiteName.toLowerCase()}-qr.png`;
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
                  <label htmlFor="website_url" className="block text-sm font-medium text-gray-300">
                    Website URL
                  </label>
                  <input
                    type="url"
                    id="website_url"
                    name="website_url"
                    required
                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    value={formData.website_url}
                    onChange={handleInputChange}
                    placeholder="https://example.com"
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
                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
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
                    Generating...
                  </span>
                ) : (
                  'Generate QR Code'
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
                    {extractWebsiteName(formData.website_url)} USDC Payment Address
                  </div>
                  <QRCodeSVG 
                    id="qr-code-svg"
                    value={user?.wallet?.address || ''}
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