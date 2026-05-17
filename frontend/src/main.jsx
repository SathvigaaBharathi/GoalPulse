import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { MsalProvider } from '@azure/msal-react'
import { PublicClientApplication } from '@azure/msal-browser'
import { MockMsalProvider } from './auth/MockMsalProvider'
import { msalConfig, IS_DEMO_MODE } from './auth/msalConfig'

const msalInstance = IS_DEMO_MODE ? null : new PublicClientApplication(msalConfig);

const AuthWrapper = IS_DEMO_MODE
  ? MockMsalProvider
  : ({ children }) => <MsalProvider instance={msalInstance}>{children}</MsalProvider>;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthWrapper>
      <App />
    </AuthWrapper>
  </StrictMode>,
)
