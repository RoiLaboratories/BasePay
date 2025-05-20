import { usePrivy } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';
import { isBaseMainnet, switchToBaseMainnet } from '../utils/network';

const WalletConnect = () => {
  const { login, logout, authenticated, user } = usePrivy();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [isCheckingNetwork, setIsCheckingNetwork] = useState(false);

  useEffect(() => {
    const checkNetwork = async () => {
      if (authenticated && user?.wallet?.address) {
        setIsCheckingNetwork(true);
        const onBase = await isBaseMainnet();
        setIsCorrectNetwork(onBase);
        setIsCheckingNetwork(false);
      }
    };

    checkNetwork();

    // Listen for chain changes
    if (window.ethereum) {
      window.ethereum.on('chainChanged', checkNetwork);
      return () => {
        window.ethereum.removeListener('chainChanged', checkNetwork);
      };
    }
  }, [authenticated, user?.wallet?.address]);

  const handleNetworkSwitch = async () => {
    try {
      await switchToBaseMainnet();
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  const handleLogin = async () => {
    try {
      console.log('Attempting to login with Privy...');
      await login();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!authenticated || !user?.wallet?.address) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-white">Welcome to QRmint</h2>
          <p className="text-gray-400 max-w-md">
            Connect your wallet to generate QR codes for onchain payments
          </p>
        </div>
        <button
          onClick={handleLogin}
          className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-lg flex items-center gap-2 transition-all duration-200 transform hover:scale-105"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span>Connect Wallet</span>
        </button>
      </div>
    );
  }

  if (isCheckingNetwork) {
    return (
      <div className="bg-gray-800 text-white px-4 py-2 rounded-lg">
        Checking network...
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <button
        onClick={handleNetworkSwitch}
        className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        Switch to Base Network
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200"
      >
        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
        {formatAddress(user.wallet.address)}
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-lg shadow-xl border border-gray-800 animate-fadeIn">
          <button
            onClick={() => {
              logout();
              setShowDropdown(false);
            }}
            className="w-full text-left px-4 py-2 text-white hover:bg-gray-800 rounded-lg transition-colors duration-200"
          >
            Disconnect Wallet
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletConnect; 