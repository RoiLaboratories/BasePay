export const BASE_CHAIN_ID = 8453;

export const switchToBaseMainnet = async () => {
  if (!window.ethereum) {
    throw new Error('No ethereum provider found');
  }

  try {
    // Try to switch to Base
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${BASE_CHAIN_ID.toString(16)}` }],
    });
  } catch (error: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (error.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${BASE_CHAIN_ID.toString(16)}`,
              chainName: 'Base Mainnet',
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org'],
            },
          ],
        });
      } catch (addError) {
        throw new Error('Failed to add Base network to wallet');
      }
    } else {
      throw new Error('Failed to switch to Base network');
    }
  }
};

export const getCurrentChainId = async () => {
  if (!window.ethereum) {
    throw new Error('No ethereum provider found');
  }

  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
  return parseInt(chainId, 16);
};

export const isBaseMainnet = async () => {
  try {
    const chainId = await getCurrentChainId();
    return chainId === BASE_CHAIN_ID;
  } catch (error) {
    return false;
  }
}; 