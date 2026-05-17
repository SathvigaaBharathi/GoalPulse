import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import MockLoginOverlay from './MockLoginOverlay'

const MockMsalContext = createContext(null)

export function MockMsalProvider({ children }) {
  const [activeAccount, setActiveAccount] = useState(null)
  const [showMockLogin, setShowMockLogin] = useState(false)
  const [demoAccounts, setDemoAccounts] = useState([])

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'

  useEffect(() => {
    // Fetch seeded users dynamically for demo realism
    axios.get(`${apiUrl}/api/auth/demo-users`)
      .then(res => {
        const mapped = res.data.map(u => ({
          localAccountId: `mock-${u.role}-${u.id}`,
          username: u.email,
          name: u.name,
          idTokenClaims: {
            roles: [u.role.charAt(0).toUpperCase() + u.role.slice(1)],
            jobTitle: u.role === 'admin' ? 'HR Admin' : u.role === 'manager' ? 'L1 Manager' : 'Executive'
          }
        }))
        setDemoAccounts(mapped)
      })
      .catch(err => {
        console.error('Failed to fetch demo users for MSAL:', err)
      })
  }, [])

  const instance = {
    loginRedirect: () => {
      setShowMockLogin(true);
      return Promise.resolve();
    },
    loginPopup: () => {
      setShowMockLogin(true);
      return Promise.resolve();
    },
    logout: () => { 
      setActiveAccount(null);
      setShowMockLogin(false);
      return Promise.resolve();
    },
    getActiveAccount: () => activeAccount,
    setActiveAccount,
    acquireTokenSilent: async () => ({
      accessToken: 'mock-access-token',
      account: activeAccount,
    }),
  }

  const selectAccount = (account) => {
    setActiveAccount(account)
    setShowMockLogin(false)
  }

  return (
    <MockMsalContext.Provider value={{ instance, accounts: activeAccount ? [activeAccount] : [], inProgress: 'none' }}>
      {showMockLogin && (
        <MockLoginOverlay accounts={demoAccounts} onSelect={selectAccount} onClose={() => setShowMockLogin(false)} />
      )}
      {children}
    </MockMsalContext.Provider>
  )
}

export const useMsal = () => useContext(MockMsalContext)
export const useIsAuthenticated = () => {
  const { accounts } = useMsal()
  return accounts.length > 0
}
