import React, { useState, useEffect, useCallback, useRef } from 'react'
import { validateAddress } from '../utils/validation'
import { formatBalance, formatTxHash } from '../utils/formatting'

/**
 * Web3Wallet - MetaMask integration and wallet management component
 * Handles wallet connection, transaction processing, and Web3 interactions
 */
export const Web3Wallet = ({
  onConnect,
  onDisconnect,
  onTransactionComplete,
  onError,
  autoConnect = true,
  supportedChainIds = [1, 5, 11155111], // mainnet, goerli, sepolia
  theme = 'light'
}) => {
  const [walletState, setWalletState] = useState({
    isConnected: false,
    isConnecting: false,
    address: null,
    balance: null,
    chainId: null,
    provider: null
  })

  const [transactionState, setTransactionState] = useState({
    isProcessing: false,
    currentTx: null,
    history: []
  })

  const [errors, setErrors] = useState({})
  const connectAttempts = useRef(0)
  const maxConnectAttempts = 3

  // Check if MetaMask is installed
  const isMetaMaskInstalled = useCallback(() => {
    return typeof window !== 'undefined' && 
           typeof window.ethereum !== 'undefined' &&
           window.ethereum.isMetaMask
  }, [])

  // Get Web3 provider
  const getProvider = useCallback(() => {
    if (!isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed')
    }
    return window.ethereum
  }, [isMetaMaskInstalled])

  // Format address for display
  const formatAddress = useCallback((address) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }, [])

  // Check if chain is supported
  const isSupportedChain = useCallback((chainId) => {
    const numericChainId = typeof chainId === 'string' ? 
      parseInt(chainId, 16) : chainId
    return supportedChainIds.includes(numericChainId)
  }, [supportedChainIds])

  // Get balance
  const getBalance = useCallback(async (address) => {
    try {
      if (!walletState.provider || !address) return null

      const balanceWei = await walletState.provider.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      })

      // Convert from wei to ETH
      const balanceEth = parseInt(balanceWei, 16) / Math.pow(10, 18)
      return balanceEth.toFixed(4)
    } catch (error) {
      console.error('Error fetching balance:', error)
      return null
    }
  }, [walletState.provider])

  // Update wallet state
  const updateWalletState = useCallback(async (provider) => {
    try {
      const accounts = await provider.request({ method: 'eth_accounts' })
      const chainId = await provider.request({ method: 'eth_chainId' })
      
      if (accounts.length > 0) {
        const address = accounts[0]
        const balance = await getBalance(address)
        
        setWalletState(prev => ({
          ...prev,
          isConnected: true,
          address,
          balance,
          chainId: parseInt(chainId, 16),
          provider
        }))

        // Check if chain is supported
        if (!isSupportedChain(chainId)) {
          setErrors(prev => ({
            ...prev,
            network: 'Please switch to a supported network'
          }))
        } else {
          setErrors(prev => ({ ...prev, network: null }))
        }

        return { address, chainId: parseInt(chainId, 16) }
      } else {
        setWalletState(prev => ({
          ...prev,
          isConnected: false,
          address: null,
          balance: null,
          chainId: null,
          provider: null
        }))
        return null
      }
    } catch (error) {
      console.error('Error updating wallet state:', error)
      throw error
    }
  }, [getBalance, isSupportedChain])

  // Connect to MetaMask
  const connectWallet = useCallback(async () => {
    if (walletState.isConnecting) return
    
    if (!isMetaMaskInstalled()) {
      const error = 'MetaMask is not installed. Please install MetaMask to continue.'
      setErrors(prev => ({ ...prev, connection: error }))
      onError?.(error)
      return
    }

    if (connectAttempts.current >= maxConnectAttempts) {
      const error = 'Too many connection attempts. Please refresh the page and try again.'
      setErrors(prev => ({ ...prev, connection: error }))
      onError?.(error)
      return
    }

    setWalletState(prev => ({ ...prev, isConnecting: true }))
    setErrors(prev => ({ ...prev, connection: null }))
    connectAttempts.current += 1

    try {
      const provider = getProvider()
      
      // Request account access
      await provider.request({ method: 'eth_requestAccounts' })
      
      const result = await updateWalletState(provider)
      
      if (result) {
        connectAttempts.current = 0 // Reset on success
        onConnect?.(result)
      }
    } catch (error) {
      console.error('Connection error:', error)
      
      let errorMessage = 'Failed to connect to wallet'
      if (error.code === 4001) {
        errorMessage = 'Connection rejected by user'
      } else if (error.code === -32002) {
        errorMessage = 'Connection request already pending'
      }
      
      setErrors(prev => ({ ...prev, connection: errorMessage }))
      onError?.(errorMessage)
    } finally {
      setWalletState(prev => ({ ...prev, isConnecting: false }))
    }
  }, [walletState.isConnecting, isMetaMaskInstalled, getProvider, updateWalletState, onConnect, onError])

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setWalletState({
      isConnected: false,
      isConnecting: false,
      address: null,
      balance: null,
      chainId: null,
      provider: null
    })
    
    setTransactionState({
      isProcessing: false,
      currentTx: null,
      history: []
    })
    
    setErrors({})
    connectAttempts.current = 0
    
    onDisconnect?.()
  }, [onDisconnect])

  // Switch network
  const switchNetwork = useCallback(async (chainId) => {
    if (!walletState.provider) return

    try {
      await walletState.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }]
      })
    } catch (error) {
      console.error('Error switching network:', error)
      
      if (error.code === 4902) {
        // Network not added to MetaMask
        throw new Error('Network not added to MetaMask. Please add the network manually.')
      }
      
      throw error
    }
  }, [walletState.provider])

  // Send transaction
  const sendTransaction = useCallback(async (transactionData) => {
    if (!walletState.isConnected || !walletState.provider) {
      throw new Error('Wallet not connected')
    }

    if (transactionState.isProcessing) {
      throw new Error('Transaction already in progress')
    }

    if (!validateAddress(transactionData.to)) {
      throw new Error('Invalid recipient address')
    }

    setTransactionState(prev => ({
      ...prev,
      isProcessing: true,
      currentTx: { ...transactionData, status: 'pending' }
    }))

    try {
      // Prepare transaction
      const transaction = {
        from: walletState.address,
        to: transactionData.to,
        value: `0x${(transactionData.value * Math.pow(10, 18)).toString(16)}`, // Convert to wei
        data: transactionData.data || '0x',
        gas: transactionData.gas || '0x5208', // Default gas limit
        gasPrice: transactionData.gasPrice || undefined
      }

      // Send transaction
      const txHash = await walletState.provider.request({
        method: 'eth_sendTransaction',
        params: [transaction]
      })

      // Update transaction state
      const txRecord = {
        hash: txHash,
        to: transactionData.to,
        value: transactionData.value,
        timestamp: Date.now(),
        status: 'pending'
      }

      setTransactionState(prev => ({
        ...prev,
        currentTx: txRecord,
        history: [txRecord, ...prev.history]
      }))

      // Wait for transaction confirmation
      const receipt = await waitForTransaction(txHash)
      
      const completedTx = {
        ...txRecord,
        status: receipt.status === '0x1' ? 'success' : 'failed',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed
      }

      setTransactionState(prev => ({
        ...prev,
        isProcessing: false,
        currentTx: completedTx,
        history: prev.history.map(tx => 
          tx.hash === txHash ? completedTx : tx
        )
      }))

      // Update balance after transaction
      const newBalance = await getBalance(walletState.address)
      setWalletState(prev => ({ ...prev, balance: newBalance }))

      onTransactionComplete?.(completedTx)
      return completedTx
      
    } catch (error) {
      console.error('Transaction error:', error)
      
      let errorMessage = 'Transaction failed'
      if (error.code === 4001) {
        errorMessage = 'Transaction rejected by user'
      } else if (error.code === -32603) {
        errorMessage = 'Insufficient funds or gas limit too low'
      }

      const failedTx = {
        ...transactionState.currentTx,
        status: 'failed',
        error: errorMessage
      }

      setTransactionState(prev => ({
        ...prev,
        isProcessing: false,
        currentTx: failedTx,
        history: prev.history.map(tx => 
          tx.hash === transactionState.currentTx?.hash ? failedTx : tx
        )
      }))

      throw new Error(errorMessage)
    }
  }, [walletState, transactionState.isProcessing, getBalance, onTransactionComplete])

  // Wait for transaction confirmation
  const waitForTransaction = useCallback(async (txHash, timeout = 60000) => {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      try {
        const receipt = await walletState.provider.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash]
        })
        
        if (receipt) {
          return receipt
        }
        
        // Wait 2 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error('Error checking transaction receipt:', error)
      }
    }
    
    throw new Error('Transaction confirmation timeout')
  }, [walletState.provider])

  // Setup event listeners
  useEffect(() => {
    if (!isMetaMaskInstalled()) return

    const provider = window.ethereum

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet()
      } else {
        await updateWalletState(provider)
      }
    }

    const handleChainChanged = async (chainId) => {
      await updateWalletState(provider)
    }

    const handleDisconnect = () => {
      disconnectWallet()
    }

    provider.on('accountsChanged', handleAccountsChanged)
    provider.on('chainChanged', handleChainChanged)
    provider.on('disconnect', handleDisconnect)

    return () => {
      provider.removeListener('accountsChanged', handleAccountsChanged)
      provider.removeListener('chainChanged', handleChainChanged)
      provider.removeListener('disconnect', handleDisconnect)
    }
  }, [isMetaMaskInstalled, updateWalletState, disconnectWallet])

  // Auto-connect on component mount
  useEffect(() => {
    if (autoConnect && isMetaMaskInstalled() && !walletState.isConnected) {
      const provider = window.ethereum
      
      // Check if already connected
      provider.request({ method: 'eth_accounts' })
        .then(accounts => {
          if (accounts.length > 0) {
            updateWalletState(provider)
          }
        })
        .catch(console.error)
    }
  }, [autoConnect, isMetaMaskInstalled, walletState.isConnected, updateWalletState])

  return (
    <div className={`web3-wallet ${theme}`} data-testid="web3-wallet">
      {/* Connection Status */}
      <div className="wallet-status">
        {!isMetaMaskInstalled() ? (
          <div className="wallet-error" data-testid="metamask-not-installed">
            <h3>MetaMask Not Detected</h3>
            <p>Please install MetaMask to use this feature.</p>
            <a 
              href="https://metamask.io/download.html" 
              target="_blank" 
              rel="noopener noreferrer"
              className="install-button"
              data-testid="install-metamask-link"
            >
              Install MetaMask
            </a>
          </div>
        ) : walletState.isConnected ? (
          <div className="wallet-connected" data-testid="wallet-connected">
            <div className="wallet-info">
              <div className="address">
                <strong>Address:</strong>
                <span data-testid="wallet-address">
                  {formatAddress(walletState.address)}
                </span>
                <button 
                  onClick={() => navigator.clipboard.writeText(walletState.address)}
                  className="copy-button"
                  data-testid="copy-address-button"
                  title="Copy full address"
                >
                  📋
                </button>
              </div>
              
              <div className="balance">
                <strong>Balance:</strong>
                <span data-testid="wallet-balance">
                  {formatBalance(walletState.balance)} ETH
                </span>
              </div>
              
              <div className="network">
                <strong>Network:</strong>
                <span data-testid="network-info">
                  Chain ID {walletState.chainId}
                </span>
                {errors.network && (
                  <div className="error-message" data-testid="network-error">
                    {errors.network}
                  </div>
                )}
              </div>
            </div>
            
            <button 
              onClick={disconnectWallet}
              className="disconnect-button"
              data-testid="disconnect-button"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="wallet-disconnected" data-testid="wallet-disconnected">
            <h3>Connect Your Wallet</h3>
            <p>Connect your MetaMask wallet to continue.</p>
            
            <button 
              onClick={connectWallet}
              disabled={walletState.isConnecting}
              className="connect-button"
              data-testid="connect-button"
            >
              {walletState.isConnecting ? (
                <>
                  <span className="spinner" />
                  Connecting...
                </>
              ) : (
                'Connect MetaMask'
              )}
            </button>
            
            {errors.connection && (
              <div className="error-message" data-testid="connection-error">
                {errors.connection}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transaction Status */}
      {walletState.isConnected && (
        <div className="transaction-status">
          {transactionState.isProcessing && (
            <div className="processing-transaction" data-testid="transaction-processing">
              <h4>Transaction in Progress</h4>
              <div className="tx-details">
                <div>To: {formatAddress(transactionState.currentTx?.to)}</div>
                <div>Amount: {transactionState.currentTx?.value} ETH</div>
                {transactionState.currentTx?.hash && (
                  <div>
                    Hash: 
                    <span data-testid="transaction-hash">
                      {formatTxHash(transactionState.currentTx.hash)}
                    </span>
                  </div>
                )}
              </div>
              <div className="spinner" />
            </div>
          )}

          {/* Transaction History */}
          {transactionState.history.length > 0 && (
            <div className="transaction-history" data-testid="transaction-history">
              <h4>Recent Transactions</h4>
              <div className="tx-list">
                {transactionState.history.slice(0, 5).map((tx, index) => (
                  <div key={tx.hash} className={`tx-item ${tx.status}`} data-testid={`transaction-${index}`}>
                    <div className="tx-info">
                      <div>To: {formatAddress(tx.to)}</div>
                      <div>Amount: {tx.value} ETH</div>
                      <div>Status: 
                        <span className={`status ${tx.status}`}>
                          {tx.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="tx-hash">
                      {formatTxHash(tx.hash)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Network Switch Helper */}
      {walletState.isConnected && errors.network && (
        <div className="network-switch" data-testid="network-switch">
          <h4>Switch Network</h4>
          <p>Please switch to a supported network to continue.</p>
          <div className="network-buttons">
            {supportedChainIds.map(chainId => (
              <button 
                key={chainId}
                onClick={() => switchNetwork(chainId)}
                className="network-button"
                data-testid={`switch-to-${chainId}`}
              >
                Chain {chainId}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to expose sendTransaction method
Web3Wallet.displayName = 'Web3Wallet'

export default Web3Wallet