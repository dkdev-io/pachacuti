/**
 * Web3 Smart Contract Service
 * Handles blockchain interactions for campaign contributions
 */

import { ethers } from 'ethers';

// Mock contract ABI for campaign contributions
const CAMPAIGN_CONTRACT_ABI = [
  "function contribute(bytes32 campaignId) external payable",
  "function refund(bytes32 campaignId, address contributor) external",
  "function getCampaignBalance(bytes32 campaignId) external view returns (uint256)",
  "function getContribution(bytes32 campaignId, address contributor) external view returns (uint256)",
  "event ContributionMade(bytes32 indexed campaignId, address indexed contributor, uint256 amount)",
  "event RefundProcessed(bytes32 campaignId, address indexed contributor, uint256 amount)"
];

export class Web3Service {
  constructor(config = {}) {
    this.config = {
      rpcUrl: process.env.RPC_URL || 'https://mainnet.infura.io/v3/your-api-key',
      contractAddress: process.env.CAMPAIGN_CONTRACT_ADDRESS || '0x1234567890123456789012345678901234567890',
      privateKey: process.env.PRIVATE_KEY,
      gasLimit: config.gasLimit || 21000,
      gasPrice: config.gasPrice || null, // Will use network gas price
      ...config
    };

    this.provider = null;
    this.signer = null;
    this.contract = null;
    
    this.initializeProvider();
  }

  initializeProvider() {
    try {
      // Initialize provider
      this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
      
      // Initialize signer if private key provided
      if (this.config.privateKey) {
        this.signer = new ethers.Wallet(this.config.privateKey, this.provider);
      }
      
      // Initialize contract
      this.contract = new ethers.Contract(
        this.config.contractAddress,
        CAMPAIGN_CONTRACT_ABI,
        this.signer || this.provider
      );
    } catch (error) {
      console.error('Failed to initialize Web3 provider:', error);
      throw new Error(`Web3 initialization failed: ${error.message}`);
    }
  }

  /**
   * Process a contribution on the blockchain
   */
  async processContribution(contribution) {
    if (!this.signer) {
      throw new Error('Signer not configured for transaction processing');
    }

    try {
      // Convert campaign ID to bytes32
      const campaignIdBytes = ethers.id(contribution.campaignId);
      
      // Convert amount to wei
      const amountWei = ethers.parseEther(contribution.amount.toString());
      
      // Estimate gas
      const gasEstimate = await this.contract.contribute.estimateGas(
        campaignIdBytes,
        { value: amountWei }
      );
      
      // Add 20% buffer to gas estimate
      const gasLimit = Math.floor(Number(gasEstimate) * 1.2);
      
      // Get current gas price
      const gasPrice = this.config.gasPrice || await this.provider.getFeeData().gasPrice;
      
      // Execute transaction
      const tx = await this.contract.contribute(campaignIdBytes, {
        value: amountWei,
        gasLimit,
        gasPrice
      });
      
      console.log(`Contribution transaction submitted: ${tx.hash}`);
      return tx.hash;
    } catch (error) {
      console.error('Contribution transaction failed:', error);
      throw new Error(`Blockchain contribution failed: ${error.message}`);
    }
  }

  /**
   * Process a refund on the blockchain
   */
  async processRefund(contribution) {
    if (!this.signer) {
      throw new Error('Signer not configured for transaction processing');
    }

    try {
      const campaignIdBytes = ethers.id(contribution.campaignId);
      
      // Estimate gas
      const gasEstimate = await this.contract.refund.estimateGas(
        campaignIdBytes,
        contribution.walletAddress
      );
      
      const gasLimit = Math.floor(Number(gasEstimate) * 1.2);
      const gasPrice = this.config.gasPrice || await this.provider.getFeeData().gasPrice;
      
      // Execute refund transaction
      const tx = await this.contract.refund(
        campaignIdBytes,
        contribution.walletAddress,
        {
          gasLimit,
          gasPrice
        }
      );
      
      console.log(`Refund transaction submitted: ${tx.hash}`);
      return tx.hash;
    } catch (error) {
      console.error('Refund transaction failed:', error);
      throw new Error(`Blockchain refund failed: ${error.message}`);
    }
  }

  /**
   * Get transaction details from blockchain
   */
  async getTransactionDetails(txHash) {
    try {
      const [tx, receipt] = await Promise.all([
        this.provider.getTransaction(txHash),
        this.provider.getTransactionReceipt(txHash)
      ]);

      return {
        hash: txHash,
        blockNumber: receipt?.blockNumber,
        blockHash: receipt?.blockHash,
        confirmations: receipt?.confirmations || 0,
        gasUsed: receipt?.gasUsed?.toString(),
        gasPrice: tx?.gasPrice?.toString(),
        status: receipt?.status === 1 ? 'success' : 'failed',
        timestamp: tx?.timestamp,
        from: tx?.from,
        to: tx?.to,
        value: tx?.value?.toString()
      };
    } catch (error) {
      console.error('Failed to get transaction details:', error);
      throw new Error(`Transaction details fetch failed: ${error.message}`);
    }
  }

  /**
   * Get campaign balance from smart contract
   */
  async getCampaignBalance(campaignId) {
    try {
      const campaignIdBytes = ethers.id(campaignId);
      const balance = await this.contract.getCampaignBalance(campaignIdBytes);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get campaign balance:', error);
      throw new Error(`Campaign balance fetch failed: ${error.message}`);
    }
  }

  /**
   * Get user's contribution to a campaign
   */
  async getUserContribution(campaignId, userAddress) {
    try {
      const campaignIdBytes = ethers.id(campaignId);
      const contribution = await this.contract.getContribution(
        campaignIdBytes,
        userAddress
      );
      return ethers.formatEther(contribution);
    } catch (error) {
      console.error('Failed to get user contribution:', error);
      throw new Error(`User contribution fetch failed: ${error.message}`);
    }
  }

  /**
   * Listen for contract events
   */
  setupEventListeners(callback) {
    try {
      // Listen for contribution events
      this.contract.on('ContributionMade', (campaignId, contributor, amount, event) => {
        callback('contribution', {
          campaignId: campaignId,
          contributor,
          amount: ethers.formatEther(amount),
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber
        });
      });

      // Listen for refund events
      this.contract.on('RefundProcessed', (campaignId, contributor, amount, event) => {
        callback('refund', {
          campaignId: campaignId,
          contributor,
          amount: ethers.formatEther(amount),
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber
        });
      });

      console.log('Event listeners set up successfully');
    } catch (error) {
      console.error('Failed to set up event listeners:', error);
      throw new Error(`Event listener setup failed: ${error.message}`);
    }
  }

  /**
   * Validate wallet address
   */
  validateAddress(address) {
    return ethers.isAddress(address);
  }

  /**
   * Get current network information
   */
  async getNetworkInfo() {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      const gasPrice = await this.provider.getFeeData();

      return {
        chainId: Number(network.chainId),
        name: network.name,
        blockNumber,
        gasPrice: gasPrice.gasPrice?.toString(),
        maxFeePerGas: gasPrice.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas?.toString()
      };
    } catch (error) {
      console.error('Failed to get network info:', error);
      throw new Error(`Network info fetch failed: ${error.message}`);
    }
  }

  /**
   * Check if connected to correct network
   */
  async validateNetwork(expectedChainId) {
    const networkInfo = await this.getNetworkInfo();
    return networkInfo.chainId === expectedChainId;
  }
}

/**
 * Create Web3 service instance with environment configuration
 */
export function createWeb3Service(config = {}) {
  return new Web3Service(config);
}

/**
 * Utility functions for Web3 operations
 */
export const Web3Utils = {
  /**
   * Convert ETH to Wei
   */
  toWei(eth) {
    return ethers.parseEther(eth.toString());
  },

  /**
   * Convert Wei to ETH
   */
  fromWei(wei) {
    return ethers.formatEther(wei);
  },

  /**
   * Generate random wallet
   */
  createRandomWallet() {
    return ethers.Wallet.createRandom();
  },

  /**
   * Create wallet from private key
   */
  createWallet(privateKey, provider = null) {
    return new ethers.Wallet(privateKey, provider);
  },

  /**
   * Hash string to bytes32
   */
  hashString(str) {
    return ethers.id(str);
  }
};