import { useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import HomePage from './components/HomePage';
import ServerRunningPage from './components/ServerRunningPage';
import CreateWalletPage from './components/CreateWalletPage';
import SettingsPage from './components/SettingsPage';
import { GlobalProvider } from './contexts/GlobalContext';

function AppRouter() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check server status only on initial mount to show correct page
    // Don't poll - let user actions (start/stop) handle navigation
    const checkServerStatus = async () => {
      // Skip if user is on create-wallet page
      if (location.pathname === '/create-wallet') {
        return;
      }

      const isRunning = await window.electronAPI.getServerStatus();
      const targetPath = isRunning ? '/server-running' : '/';
      
      // Only navigate on initial load if we're not on the correct page
      if (location.pathname !== targetPath) {
        navigate(targetPath, { replace: true });
      }
    };

    checkServerStatus();
  }, []); // Only run on mount

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/server-running" element={<ServerRunningPage />} />
      <Route path="/create-wallet" element={<CreateWalletPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <GlobalProvider>
      <HashRouter>
        <AppRouter />
      </HashRouter>
    </GlobalProvider>
  );
}

