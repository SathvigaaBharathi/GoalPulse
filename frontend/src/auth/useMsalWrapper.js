import { useMsal as useRealMsal } from '@azure/msal-react'
import { useMsal as useMockMsal } from './MockMsalProvider'
import { IS_DEMO_MODE } from './msalConfig'

export const useMsalWrapper = IS_DEMO_MODE ? useMockMsal : useRealMsal;
