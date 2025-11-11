import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { baseSepolia } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'x402 Buyer',
  projectId: 'YOUR_PROJECT_ID', // Get one at https://cloud.reown.com
  chains: [baseSepolia],
  ssr: true, // If your dApp uses server side rendering (SSR)
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}

