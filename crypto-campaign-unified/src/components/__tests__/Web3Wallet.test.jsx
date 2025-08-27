import React from 'react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render, mockWeb3 } from '../../test/test-utils'
import { Web3Wallet } from '../Web3Wallet'

// Mock window.ethereum
const mockEthereum = {
  isMetaMask: true,
  request: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
  removeAllListeners: vi.fn()
}

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue()
  }
})

describe('Web3Wallet', () => {
  const defaultProps = {
    onConnect: vi.fn(),
    onDisconnect: vi.fn(),
    onTransactionComplete: vi.fn(),
    onError: vi.fn()
  }

  beforeEach(() => {
    // Mock window.ethereum
    Object.defineProperty(window, 'ethereum', {
      value: mockEthereum,
      writable: true
    })

    // Reset mocks
    vi.clearAllMocks()

    // Setup default mock responses
    mockEthereum.request.mockImplementation((params) => {
      switch (params.method) {
        case 'eth_accounts':
          return Promise.resolve(['0x1234567890123456789012345678901234567890'])
        case 'eth_requestAccounts':
          return Promise.resolve(['0x1234567890123456789012345678901234567890'])
        case 'eth_chainId':
          return Promise.resolve('0x1')
        case 'eth_getBalance':
          return Promise.resolve('0x152d02c7e14af6800000') // 100 ETH in wei
        case 'eth_sendTransaction':
          return Promise.resolve('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890')
        case 'eth_getTransactionReceipt':
          return Promise.resolve({
            status: '0x1',
            blockNumber: '0x123',
            gasUsed: '0x5208'
          })
        default:
          return Promise.resolve(null)
      }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('renders the wallet component', () => {
      render(<Web3Wallet {...defaultProps} />)
      
      expect(screen.getByTestId('web3-wallet')).toBeInTheDocument()
    })

    it('renders with custom theme class', () => {
      render(<Web3Wallet {...defaultProps} theme="dark" />)
      
      expect(screen.getByTestId('web3-wallet')).toHaveClass('dark')
    })

    it('shows MetaMask not installed message when ethereum is undefined', () => {
      // Remove ethereum object
      Object.defineProperty(window, 'ethereum', {
        value: undefined,
        writable: true
      })

      render(<Web3Wallet {...defaultProps} />)
      
      expect(screen.getByTestId('metamask-not-installed')).toBeInTheDocument()
      expect(screen.getByText('MetaMask Not Detected')).toBeInTheDocument()
      expect(screen.getByTestId('install-metamask-link')).toBeInTheDocument()
    })

    it('shows MetaMask not installed when isMetaMask is false', () => {
      Object.defineProperty(window, 'ethereum', {
        value: { ...mockEthereum, isMetaMask: false },
        writable: true
      })

      render(<Web3Wallet {...defaultProps} />)
      
      expect(screen.getByTestId('metamask-not-installed')).toBeInTheDocument()
    })
  })

  describe('Wallet Connection', () => {
    it('shows connect button when wallet is not connected', () => {
      mockEthereum.request.mockImplementation((params) => {
        if (params.method === 'eth_accounts') {
          return Promise.resolve([]) // No accounts
        }
        return Promise.resolve(null)
      })

      render(<Web3Wallet {...defaultProps} autoConnect={false} />)
      
      expect(screen.getByTestId('wallet-disconnected')).toBeInTheDocument()
      expect(screen.getByTestId('connect-button')).toBeInTheDocument()
      expect(screen.getByText('Connect MetaMask')).toBeInTheDocument()
    })

    it('connects wallet successfully', async () => {
      const user = userEvent.setup()
      
      render(<Web3Wallet {...defaultProps} autoConnect={false} />)
      
      await user.click(screen.getByTestId('connect-button'))

      await waitFor(() => {
        expect(mockEthereum.request).toHaveBeenCalledWith({
          method: 'eth_requestAccounts'
        })
      })

      expect(defaultProps.onConnect).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890',
        chainId: 1
      })
    })

    it('shows loading state during connection', async () => {
      const user = userEvent.setup()
      
      // Make request hang
      mockEthereum.request.mockImplementation((params) => {
        if (params.method === 'eth_requestAccounts') {
          return new Promise(resolve => setTimeout(resolve, 1000))
        }
        return Promise.resolve([])
      })

      render(<Web3Wallet {...defaultProps} autoConnect={false} />)
      
      await user.click(screen.getByTestId('connect-button'))

      expect(screen.getByText('Connecting...')).toBeInTheDocument()
      expect(screen.getByTestId('connect-button')).toBeDisabled()
    })

    it('handles connection rejection', async () => {
      const user = userEvent.setup()
      
      mockEthereum.request.mockImplementation((params) => {
        if (params.method === 'eth_requestAccounts') {
          throw { code: 4001, message: 'User rejected the request' }
        }
        return Promise.resolve([])
      })

      render(<Web3Wallet {...defaultProps} autoConnect={false} />)
      
      await user.click(screen.getByTestId('connect-button'))

      await waitFor(() => {
        expect(screen.getByTestId('connection-error')).toHaveTextContent('Connection rejected by user')
      })

      expect(defaultProps.onError).toHaveBeenCalledWith('Connection rejected by user')
    })

    it('prevents too many connection attempts', async () => {
      const user = userEvent.setup()
      
      mockEthereum.request.mockRejectedValue(new Error('Connection failed'))

      render(<Web3Wallet {...defaultProps} autoConnect={false} />)
      
      // Try to connect 4 times (max is 3)
      for (let i = 0; i < 4; i++) {
        await user.click(screen.getByTestId('connect-button'))
        await waitFor(() => {
          expect(screen.getByTestId('connection-error')).toBeInTheDocument()
        })
      }

      expect(screen.getByTestId('connection-error')).toHaveTextContent(
        'Too many connection attempts. Please refresh the page and try again.'
      )
    })

    it('auto-connects when autoConnect is true and accounts exist', async () => {
      render(<Web3Wallet {...defaultProps} autoConnect={true} />)

      await waitFor(() => {
        expect(mockEthereum.request).toHaveBeenCalledWith({
          method: 'eth_accounts'
        })
      })
    })
  })

  describe('Connected Wallet State', () => {
    const renderConnectedWallet = async () => {
      const { rerender } = render(<Web3Wallet {...defaultProps} autoConnect={false} />)
      
      // Trigger connection
      fireEvent.click(screen.getByTestId('connect-button'))
      
      await waitFor(() => {
        expect(screen.getByTestId('wallet-connected')).toBeInTheDocument()
      })
      
      return { rerender }
    }

    it('displays connected wallet information', async () => {
      await renderConnectedWallet()
      
      expect(screen.getByTestId('wallet-address')).toHaveTextContent('0x1234...7890')
      expect(screen.getByTestId('wallet-balance')).toHaveTextContent('100.0000 ETH')
      expect(screen.getByTestId('network-info')).toHaveTextContent('Chain ID 1')
    })

    it('copies address to clipboard', async () => {
      const user = userEvent.setup()
      await renderConnectedWallet()
      
      await user.click(screen.getByTestId('copy-address-button'))
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890'
      )
    })

    it('disconnects wallet', async () => {
      const user = userEvent.setup()
      await renderConnectedWallet()
      
      await user.click(screen.getByTestId('disconnect-button'))
      
      expect(screen.getByTestId('wallet-disconnected')).toBeInTheDocument()
      expect(defaultProps.onDisconnect).toHaveBeenCalled()
    })

    it('shows network error for unsupported chain', async () => {
      mockEthereum.request.mockImplementation((params) => {
        switch (params.method) {
          case 'eth_accounts':
            return Promise.resolve(['0x1234567890123456789012345678901234567890'])
          case 'eth_requestAccounts':
            return Promise.resolve(['0x1234567890123456789012345678901234567890'])
          case 'eth_chainId':
            return Promise.resolve('0x89') // Polygon mainnet - not in supported list
          case 'eth_getBalance':
            return Promise.resolve('0x152d02c7e14af6800000')
          default:
            return Promise.resolve(null)
        }
      })

      render(<Web3Wallet {...defaultProps} supportedChainIds={[1, 5]} autoConnect={false} />)
      
      fireEvent.click(screen.getByTestId('connect-button'))
      
      await waitFor(() => {
        expect(screen.getByTestId('network-error')).toHaveTextContent(
          'Please switch to a supported network'
        )
      })
    })

    it('provides network switching functionality', async () => {
      const user = userEvent.setup()
      
      // Start with unsupported network
      mockEthereum.request.mockImplementation((params) => {
        switch (params.method) {
          case 'eth_accounts':
            return Promise.resolve(['0x1234567890123456789012345678901234567890'])
          case 'eth_requestAccounts':
            return Promise.resolve(['0x1234567890123456789012345678901234567890'])
          case 'eth_chainId':
            return Promise.resolve('0x89')
          case 'wallet_switchEthereumChain':
            return Promise.resolve()
          default:
            return Promise.resolve('0x152d02c7e14af6800000')
        }
      })

      render(<Web3Wallet {...defaultProps} supportedChainIds={[1, 5]} autoConnect={false} />)
      
      fireEvent.click(screen.getByTestId('connect-button'))
      
      await waitFor(() => {
        expect(screen.getByTestId('network-switch')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('switch-to-1'))
      
      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x1' }]
      })
    })
  })

  describe('Event Listeners', () => {
    it('sets up event listeners on mount', () => {
      render(<Web3Wallet {...defaultProps} />)
      
      expect(mockEthereum.on).toHaveBeenCalledWith('accountsChanged', expect.any(Function))
      expect(mockEthereum.on).toHaveBeenCalledWith('chainChanged', expect.any(Function))
      expect(mockEthereum.on).toHaveBeenCalledWith('disconnect', expect.any(Function))
    })

    it('removes event listeners on unmount', () => {
      const { unmount } = render(<Web3Wallet {...defaultProps} />)
      
      unmount()
      
      expect(mockEthereum.removeListener).toHaveBeenCalledWith('accountsChanged', expect.any(Function))
      expect(mockEthereum.removeListener).toHaveBeenCalledWith('chainChanged', expect.any(Function))
      expect(mockEthereum.removeListener).toHaveBeenCalledWith('disconnect', expect.any(Function))
    })

    it('handles account changes', async () => {
      render(<Web3Wallet {...defaultProps} />)
      
      // Simulate account change
      const accountsChangedCallback = mockEthereum.on.mock.calls.find(
        call => call[0] === 'accountsChanged'
      )[1]
      
      await act(async () => {
        accountsChangedCallback(['0x9876543210987654321098765432109876543210'])
      })
      
      // Should update wallet state with new account
      expect(mockEthereum.request).toHaveBeenCalledWith({ method: 'eth_accounts' })
    })

    it('handles disconnection', async () => {
      render(<Web3Wallet {...defaultProps} />)
      
      // Simulate disconnect
      const disconnectCallback = mockEthereum.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )[1]
      
      await act(async () => {
        disconnectCallback()
      })
      
      expect(defaultProps.onDisconnect).toHaveBeenCalled()
    })
  })

  describe('Transaction Processing', () => {
    const renderConnectedWallet = async () => {
      const { rerender } = render(<Web3Wallet {...defaultProps} autoConnect={false} />)
      
      // Connect wallet first
      fireEvent.click(screen.getByTestId('connect-button'))
      
      await waitFor(() => {
        expect(screen.getByTestId('wallet-connected')).toBeInTheDocument()
      })
      
      return { rerender }
    }

    it('processes transaction successfully', async () => {
      await renderConnectedWallet()
      
      const walletComponent = screen.getByTestId('web3-wallet')
      const walletInstance = walletComponent._owner.stateNode
      
      const transactionData = {
        to: '0x9876543210987654321098765432109876543210',
        value: 0.1,
        gas: '0x5208'
      }
      
      const result = await walletInstance.sendTransaction(transactionData)
      
      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'eth_sendTransaction',
        params: [expect.objectContaining({
          from: '0x1234567890123456789012345678901234567890',
          to: transactionData.to,
          value: '0x16345785d8a0000' // 0.1 ETH in wei
        })]
      })
      
      expect(defaultProps.onTransactionComplete).toHaveBeenCalled()
      expect(result.status).toBe('success')
    })

    it('shows transaction processing state', async () => {
      await renderConnectedWallet()
      
      // Mock long-running transaction
      mockEthereum.request.mockImplementation((params) => {
        if (params.method === 'eth_sendTransaction') {
          return new Promise(resolve => 
            setTimeout(() => resolve('0xabcdef'), 1000)
          )
        }
        return Promise.resolve('0x152d02c7e14af6800000')
      })
      
      const walletComponent = screen.getByTestId('web3-wallet')
      const walletInstance = walletComponent._owner.stateNode
      
      const transactionPromise = walletInstance.sendTransaction({
        to: '0x9876543210987654321098765432109876543210',
        value: 0.1
      })
      
      // Should show processing state
      await waitFor(() => {
        expect(screen.getByTestId('transaction-processing')).toBeInTheDocument()
      })
      
      await transactionPromise
    })

    it('handles transaction rejection', async () => {
      await renderConnectedWallet()
      
      mockEthereum.request.mockImplementation((params) => {
        if (params.method === 'eth_sendTransaction') {
          throw { code: 4001, message: 'Transaction rejected by user' }
        }
        return Promise.resolve('0x152d02c7e14af6800000')
      })
      
      const walletComponent = screen.getByTestId('web3-wallet')
      const walletInstance = walletComponent._owner.stateNode
      
      await expect(walletInstance.sendTransaction({
        to: '0x9876543210987654321098765432109876543210',
        value: 0.1
      })).rejects.toThrow('Transaction rejected by user')
    })

    it('validates transaction parameters', async () => {
      await renderConnectedWallet()
      
      const walletComponent = screen.getByTestId('web3-wallet')
      const walletInstance = walletComponent._owner.stateNode
      
      // Invalid recipient address
      await expect(walletInstance.sendTransaction({
        to: 'invalid-address',
        value: 0.1
      })).rejects.toThrow('Invalid recipient address')
    })

    it('prevents concurrent transactions', async () => {
      await renderConnectedWallet()
      
      mockEthereum.request.mockImplementation((params) => {
        if (params.method === 'eth_sendTransaction') {
          return new Promise(resolve => setTimeout(resolve, 1000))
        }
        return Promise.resolve('0x152d02c7e14af6800000')
      })
      
      const walletComponent = screen.getByTestId('web3-wallet')
      const walletInstance = walletComponent._owner.stateNode
      
      const tx1Promise = walletInstance.sendTransaction({
        to: '0x9876543210987654321098765432109876543210',
        value: 0.1
      })
      
      // Second transaction should be rejected
      await expect(walletInstance.sendTransaction({
        to: '0x9876543210987654321098765432109876543210',
        value: 0.2
      })).rejects.toThrow('Transaction already in progress')
      
      await tx1Promise
    })

    it('displays transaction history', async () => {
      await renderConnectedWallet()
      
      const walletComponent = screen.getByTestId('web3-wallet')
      const walletInstance = walletComponent._owner.stateNode
      
      // Send a transaction
      await walletInstance.sendTransaction({
        to: '0x9876543210987654321098765432109876543210',
        value: 0.1
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('transaction-history')).toBeInTheDocument()
        expect(screen.getByTestId('transaction-0')).toBeInTheDocument()
      })
      
      expect(screen.getByText('0x9876...3210')).toBeInTheDocument()
      expect(screen.getByText('0.1 ETH')).toBeInTheDocument()
      expect(screen.getByText('SUCCESS')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      mockEthereum.request.mockRejectedValue(new Error('Network error'))
      
      render(<Web3Wallet {...defaultProps} autoConnect={false} />)
      
      fireEvent.click(screen.getByTestId('connect-button'))
      
      await waitFor(() => {
        expect(screen.getByTestId('connection-error')).toHaveTextContent('Failed to connect to wallet')
      })
    })

    it('handles insufficient funds error', async () => {
      mockEthereum.request.mockImplementation((params) => {
        switch (params.method) {
          case 'eth_accounts':
          case 'eth_requestAccounts':
            return Promise.resolve(['0x1234567890123456789012345678901234567890'])
          case 'eth_chainId':
            return Promise.resolve('0x1')
          case 'eth_getBalance':
            return Promise.resolve('0x0') // No balance
          case 'eth_sendTransaction':
            throw { code: -32603, message: 'insufficient funds' }
          default:
            return Promise.resolve(null)
        }
      })
      
      render(<Web3Wallet {...defaultProps} autoConnect={false} />)
      
      fireEvent.click(screen.getByTestId('connect-button'))
      
      await waitFor(() => {
        expect(screen.getByTestId('wallet-connected')).toBeInTheDocument()
      })
      
      const walletComponent = screen.getByTestId('web3-wallet')
      const walletInstance = walletComponent._owner.stateNode
      
      await expect(walletInstance.sendTransaction({
        to: '0x9876543210987654321098765432109876543210',
        value: 0.1
      })).rejects.toThrow('Insufficient funds or gas limit too low')
    })
  })

  describe('Accessibility', () => {
    it('has proper button labels and ARIA attributes', () => {
      render(<Web3Wallet {...defaultProps} autoConnect={false} />)
      
      const connectButton = screen.getByTestId('connect-button')
      expect(connectButton).toHaveAccessibleName('Connect MetaMask')
    })

    it('provides meaningful error messages', async () => {
      mockEthereum.request.mockRejectedValue(new Error('Connection failed'))
      
      render(<Web3Wallet {...defaultProps} autoConnect={false} />)
      
      fireEvent.click(screen.getByTestId('connect-button'))
      
      await waitFor(() => {
        const errorMessage = screen.getByTestId('connection-error')
        expect(errorMessage).toBeInTheDocument()
        expect(errorMessage).toHaveTextContent('Failed to connect to wallet')
      })
    })

    it('supports keyboard navigation', () => {
      render(<Web3Wallet {...defaultProps} autoConnect={false} />)
      
      const connectButton = screen.getByTestId('connect-button')
      
      connectButton.focus()
      expect(document.activeElement).toBe(connectButton)
      
      // Should be able to activate with Enter key
      fireEvent.keyDown(connectButton, { key: 'Enter' })
      expect(mockEthereum.request).toHaveBeenCalled()
    })
  })
})