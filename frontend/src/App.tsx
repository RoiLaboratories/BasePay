import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import QRCodeGenerator from './components/QRCodeGenerator';
import WalletConnect from './components/WalletConnect';
import './App.css';

function App() {
  return (
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID}
      config={{
        loginMethods: ['wallet'],
        defaultChain: {
          id: 8453,
          name: 'Base',
          network: 'base',
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18
          },
          rpcUrls: {
            public: { http: ['https://mainnet.base.org'] },
            default: { http: ['https://mainnet.base.org'] }
          }
        },
        supportedChains: [
          {
            id: 8453,
            name: 'Base',
            network: 'base',
            nativeCurrency: {
              name: 'Ether',
              symbol: 'ETH',
              decimals: 18
            },
            rpcUrls: {
              public: { http: ['https://mainnet.base.org'] },
              default: { http: ['https://mainnet.base.org'] }
            }
          }
        ],
        appearance: {
          theme: 'dark',
          accentColor: '#0052FF',
          showWalletLoginFirst: true,
        }
      }}
    >
      <AppContent />
    </PrivyProvider>
  );
}

function AppContent() {
  const { authenticated } = usePrivy();

  return (
    <div className="min-h-screen h-screen flex flex-col bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21.0281 4.96582C19.9593 4.96582 19.0312 4.03769 19.0312 2.96894C19.0312 1.90019 19.9593 0.972061 21.0281 0.972061C22.0968 0.972061 23.025 1.90019 23.025 2.96894C23.025 4.03769 22.0968 4.96582 21.0281 4.96582Z" fill="#0052FF"/>
              <path d="M12.0156 24C5.43281 24 0 18.5672 0 11.9844C0 5.40156 5.43281 0 12.0156 0C15.975 0 19.5656 1.95 21.8344 5.1L19.8844 6.3C18.0281 3.7125 15.1219 2.1 12.0156 2.1C6.58594 2.1 2.1 6.55312 2.1 11.9844C2.1 17.4156 6.55312 21.9 12.0156 21.9C17.4469 21.9 21.9 17.4469 21.9 12.0156H24C24 18.5672 18.5672 24 12.0156 24Z" fill="#0052FF"/>
            </svg>
            BasePay
          </h1>
          {authenticated && <WalletConnect />}
        </div>
      </header>

      <main className="flex-1 flex bg-gray-900 overflow-hidden">
        <div className="w-full h-full flex flex-col">
          {!authenticated ? (
            <div className="flex items-center justify-center h-full">
              <WalletConnect />
            </div>
          ) : (
            <div className="h-full flex flex-col animate-fadeIn">
              <QRCodeGenerator />
            </div>
          )}
        </div>
      </main>

      <footer className="bg-gray-800 border-t border-gray-700 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 text-center text-gray-400 text-sm sm:text-base">
          Powered by Base
        </div>
      </footer>
    </div>
  );
}

export default App;
