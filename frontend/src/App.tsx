import { useState } from 'react';
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import WalletConnect from './components/WalletConnect';
import QRCodeGenerator from './components/QRCodeGenerator';
import QRCodeRetrieval from './components/QRCodeRetrieval';
import './App.css';

const AppContent = () => {
  const [activeTab, setActiveTab] = useState<'generate' | 'retrieve'>('generate');
  const { authenticated } = usePrivy();

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
        <WalletConnect />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21.0281 4.96582C19.9593 4.96582 19.0312 4.03769 19.0312 2.96894C19.0312 1.90019 19.9593 0.972061 21.0281 0.972061C22.0968 0.972061 23.025 1.90019 23.025 2.96894C23.025 4.03769 22.0968 4.96582 21.0281 4.96582Z" fill="#0052FF"/>
                <path d="M12.0156 24C5.43281 24 0 18.5672 0 11.9844C0 5.40156 5.43281 0 12.0156 0C15.975 0 19.5656 1.95 21.8344 5.1L19.8844 6.3C18.0281 3.7125 15.1219 2.1 12.0156 2.1C6.58594 2.1 2.1 6.55312 2.1 11.9844C2.1 17.4156 6.55312 21.9 12.0156 21.9C17.4469 21.9 21.9 17.4469 21.9 12.0156H24C24 18.5672 18.5672 24 12.0156 24Z" fill="#0052FF"/>
              </svg>
              <h1 className="text-2xl font-bold text-white">BasePay</h1>
            </div>
            <WalletConnect />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <nav className="flex space-x-6 mb-2">
            <button
              onClick={() => setActiveTab('generate')}
              className={`${
                activeTab === 'generate'
                  ? 'text-blue-500'
                  : 'text-gray-400 hover:text-gray-300'
              } whitespace-nowrap text-sm font-medium transition-all duration-200`}
            >
              Generate
            </button>
            <button
              onClick={() => setActiveTab('retrieve')}
              className={`${
                activeTab === 'retrieve'
                  ? 'text-blue-500'
                  : 'text-gray-400 hover:text-gray-300'
              } whitespace-nowrap text-sm font-medium transition-all duration-200`}
            >
              Retrieve
            </button>
          </nav>
          <div className="border-b border-gray-700"></div>
        </div>

        {activeTab === 'generate' ? <QRCodeGenerator /> : <QRCodeRetrieval />}
      </main>

      <footer className="bg-gray-800 border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <p className="text-center text-sm text-gray-400">
            Powered by Base
          </p>
        </div>
      </footer>
    </div>
  );
};

const App = () => {
  return (
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID || ''}
      config={{
        loginMethods: ['wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#3B82F6',
        },
      }}
    >
      <AppContent />
    </PrivyProvider>
  );
};

export default App;
