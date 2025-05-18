import { useEffect, useState } from 'react';

interface NetworkCheckProps {
  onNetworkValid: () => void;
  onNetworkInvalid: () => void;
}

const NetworkCheck: React.FC<NetworkCheckProps> = ({ onNetworkValid, onNetworkInvalid }) => {
  const [isCheckingNetwork, setIsCheckingNetwork] = useState(true);

  useEffect(() => {
    const checkNetwork = async () => {
      try {
        // Check if ethereum is available
        if (typeof window.ethereum === 'undefined') {
          onNetworkInvalid();
          return;
        }

        // Get the current chain ID
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        
        // Base mainnet chain ID is 0x2105 (8453 in decimal)
        if (chainId !== '0x2105') {
          // Wrong network, prompt to switch
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x2105' }], // Base mainnet chain ID
            });
            onNetworkValid();
          } catch (switchError: any) {
            // This error code indicates that the chain has not been added to MetaMask
            if (switchError.code === 4902) {
              try {
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [
                    {
                      chainId: '0x2105',
                      chainName: 'Base Mainnet',
                      nativeCurrency: {
                        name: 'ETH',
                        symbol: 'ETH',
                        decimals: 18,
                      },
                      rpcUrls: ['https://mainnet.base.org'],
                      blockExplorerUrls: ['https://basescan.org'],
                    },
                  ],
                });
                onNetworkValid();
              } catch (addError) {
                console.error('Error adding Base network:', addError);
                onNetworkInvalid();
              }
            } else {
              console.error('Error switching to Base network:', switchError);
              onNetworkInvalid();
            }
          }
        } else {
          // Already on Base mainnet
          onNetworkValid();
        }
      } catch (error) {
        console.error('Error checking network:', error);
        onNetworkInvalid();
      } finally {
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
  }, [onNetworkValid, onNetworkInvalid]);

  if (isCheckingNetwork) {
    return (
      <div className="text-center p-4 bg-gray-800 rounded-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
        <p className="text-gray-300">Checking network...</p>
      </div>
    );
  }

  return null;
};

export default NetworkCheck; 