/**
 * Web3 Smart Contract Service Tests
 * Tests blockchain interactions and Web3 service functionality
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { Web3Service, Web3Utils } from '../../web3/contractService.js';

// Mock ethers library
vi.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: vi.fn().mockImplementation(() => ({
      getNetwork: vi.fn(),
      getBlockNumber: vi.fn(),
      getFeeData: vi.fn(),
      getTransaction: vi.fn(),
      getTransactionReceipt: vi.fn()
    })),
    Wallet: vi.fn().mockImplementation(() => ({
      address: '0x1234567890123456789012345678901234567890',
      connect: vi.fn()
    })),
    Contract: vi.fn().mockImplementation(() => ({
      contribute: {
        estimateGas: vi.fn(),
        populateTransaction: vi.fn()
      },
      refund: {
        estimateGas: vi.fn(),
        populateTransaction: vi.fn()
      },
      getCampaignBalance: vi.fn(),
      getContribution: vi.fn(),
      on: vi.fn()
    })),
    parseEther: vi.fn((value) => `${value}000000000000000000`),
    formatEther: vi.fn((value) => (parseInt(value) / 1000000000000000000).toString()),
    isAddress: vi.fn((addr) => /^0x[a-fA-F0-9]{40}$/.test(addr)),
    id: vi.fn((str) => `0x${Buffer.from(str).toString('hex').padEnd(64, '0')}`),
    createRandom: vi.fn(() => ({
      address: '0xabcdef1234567890abcdef1234567890abcdef12',
      privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    }))
  }
}));

describe('Web3Service', () => {
  let web3Service;
  let mockProvider;
  let mockSigner;
  let mockContract;

  beforeAll(() => {
    // Mock environment variables
    process.env.RPC_URL = 'https://mocknet.example.com';
    process.env.CAMPAIGN_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
    process.env.PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  });

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create fresh service instance
    web3Service = new Web3Service();
    mockProvider = web3Service.provider;
    mockSigner = web3Service.signer;
    mockContract = web3Service.contract;
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const service = new Web3Service();
      
      expect(service.config.rpcUrl).toBeDefined();
      expect(service.config.contractAddress).toBeDefined();
      expect(service.config.gasLimit).toBe(21000);
    });

    it('should initialize with custom configuration', () => {
      const config = {
        gasLimit: 50000,
        gasPrice: '20000000000'
      };

      const service = new Web3Service(config);
      
      expect(service.config.gasLimit).toBe(50000);
      expect(service.config.gasPrice).toBe('20000000000');
    });

    it('should throw error on provider initialization failure', () => {
      const { ethers } = vi.mocked(await import('ethers'));
      ethers.JsonRpcProvider.mockImplementationOnce(() => {
        throw new Error('Invalid RPC URL');
      });

      expect(() => new Web3Service()).toThrow('Web3 initialization failed: Invalid RPC URL');
    });
  });

  describe('processContribution', () => {
    const mockContribution = {
      id: 'contribution-123',
      campaignId: 'campaign-456',
      amount: 1.5,
      walletAddress: '0x1234567890123456789012345678901234567890'
    };

    beforeEach(() => {
      // Mock gas estimation and transaction
      mockContract.contribute.estimateGas.mockResolvedValue(BigInt(100000));
      mockProvider.getFeeData.mockResolvedValue({
        gasPrice: BigInt('20000000000')
      });
      
      // Mock successful transaction
      mockContract.contribute.mockResolvedValue({
        hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        wait: vi.fn().mockResolvedValue({ status: 1 })
      });
    });

    it('should process contribution successfully', async () => {
      const txHash = await web3Service.processContribution(mockContribution);

      expect(txHash).toBe('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
      expect(mockContract.contribute.estimateGas).toHaveBeenCalled();
      expect(mockContract.contribute).toHaveBeenCalled();
    });

    it('should handle gas estimation errors', async () => {
      mockContract.contribute.estimateGas.mockRejectedValue(new Error('Gas estimation failed'));

      await expect(web3Service.processContribution(mockContribution))
        .rejects.toThrow('Blockchain contribution failed: Gas estimation failed');
    });

    it('should handle transaction failures', async () => {
      mockContract.contribute.mockRejectedValue(new Error('Insufficient funds'));

      await expect(web3Service.processContribution(mockContribution))
        .rejects.toThrow('Blockchain contribution failed: Insufficient funds');
    });

    it('should throw error when no signer configured', async () => {
      web3Service.signer = null;

      await expect(web3Service.processContribution(mockContribution))
        .rejects.toThrow('Signer not configured for transaction processing');
    });

    it('should apply gas limit buffer', async () => {
      const gasEstimate = BigInt(100000);
      mockContract.contribute.estimateGas.mockResolvedValue(gasEstimate);

      await web3Service.processContribution(mockContribution);

      // Should use 120% of estimated gas (100000 * 1.2 = 120000)
      expect(mockContract.contribute).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          gasLimit: 120000
        })
      );
    });
  });

  describe('processRefund', () => {
    const mockContribution = {
      campaignId: 'campaign-456',
      walletAddress: '0x1234567890123456789012345678901234567890'
    };

    beforeEach(() => {
      mockContract.refund.estimateGas.mockResolvedValue(BigInt(80000));
      mockProvider.getFeeData.mockResolvedValue({
        gasPrice: BigInt('20000000000')
      });
      
      mockContract.refund.mockResolvedValue({
        hash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321'
      });
    });

    it('should process refund successfully', async () => {
      const txHash = await web3Service.processRefund(mockContribution);

      expect(txHash).toBe('0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321');
      expect(mockContract.refund.estimateGas).toHaveBeenCalled();
      expect(mockContract.refund).toHaveBeenCalled();
    });

    it('should handle refund transaction failures', async () => {
      mockContract.refund.mockRejectedValue(new Error('Refund not allowed'));

      await expect(web3Service.processRefund(mockContribution))
        .rejects.toThrow('Blockchain refund failed: Refund not allowed');
    });

    it('should throw error when no signer configured', async () => {
      web3Service.signer = null;

      await expect(web3Service.processRefund(mockContribution))
        .rejects.toThrow('Signer not configured for transaction processing');
    });
  });

  describe('getTransactionDetails', () => {
    const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    beforeEach(() => {
      mockProvider.getTransaction.mockResolvedValue({
        hash: txHash,
        from: '0x1111111111111111111111111111111111111111',
        to: '0x2222222222222222222222222222222222222222',
        value: BigInt('1500000000000000000'),
        gasPrice: BigInt('20000000000'),
        timestamp: 1640995200
      });

      mockProvider.getTransactionReceipt.mockResolvedValue({
        status: 1,
        blockNumber: 12345678,
        blockHash: '0xblock123',
        gasUsed: BigInt(85000),
        confirmations: 12
      });
    });

    it('should fetch transaction details successfully', async () => {
      const details = await web3Service.getTransactionDetails(txHash);

      expect(details).toEqual({
        hash: txHash,
        blockNumber: 12345678,
        blockHash: '0xblock123',
        confirmations: 12,
        gasUsed: '85000',
        gasPrice: '20000000000',
        status: 'success',
        timestamp: 1640995200,
        from: '0x1111111111111111111111111111111111111111',
        to: '0x2222222222222222222222222222222222222222',
        value: '1500000000000000000'
      });
    });

    it('should handle failed transactions', async () => {
      mockProvider.getTransactionReceipt.mockResolvedValue({
        status: 0, // Failed transaction
        blockNumber: 12345678,
        gasUsed: BigInt(21000)
      });

      const details = await web3Service.getTransactionDetails(txHash);

      expect(details.status).toBe('failed');
    });

    it('should handle transaction fetch errors', async () => {
      mockProvider.getTransaction.mockRejectedValue(new Error('Transaction not found'));

      await expect(web3Service.getTransactionDetails(txHash))
        .rejects.toThrow('Transaction details fetch failed: Transaction not found');
    });
  });

  describe('getCampaignBalance', () => {
    it('should fetch campaign balance successfully', async () => {
      const campaignId = 'campaign-123';
      const balanceWei = BigInt('2500000000000000000'); // 2.5 ETH

      mockContract.getCampaignBalance.mockResolvedValue(balanceWei);

      const balance = await web3Service.getCampaignBalance(campaignId);

      expect(balance).toBe('2.5');
      expect(mockContract.getCampaignBalance).toHaveBeenCalledWith(
        expect.stringContaining('0x') // campaignId converted to bytes32
      );
    });

    it('should handle balance fetch errors', async () => {
      mockContract.getCampaignBalance.mockRejectedValue(new Error('Campaign not found'));

      await expect(web3Service.getCampaignBalance('invalid-id'))
        .rejects.toThrow('Campaign balance fetch failed: Campaign not found');
    });
  });

  describe('getUserContribution', () => {
    it('should fetch user contribution successfully', async () => {
      const campaignId = 'campaign-123';
      const userAddress = '0x1234567890123456789012345678901234567890';
      const contributionWei = BigInt('1000000000000000000'); // 1 ETH

      mockContract.getContribution.mockResolvedValue(contributionWei);

      const contribution = await web3Service.getUserContribution(campaignId, userAddress);

      expect(contribution).toBe('1');
      expect(mockContract.getContribution).toHaveBeenCalledWith(
        expect.stringContaining('0x'),
        userAddress
      );
    });
  });

  describe('setupEventListeners', () => {
    it('should set up event listeners successfully', () => {
      const callback = vi.fn();

      web3Service.setupEventListeners(callback);

      expect(mockContract.on).toHaveBeenCalledWith('ContributionMade', expect.any(Function));
      expect(mockContract.on).toHaveBeenCalledWith('RefundProcessed', expect.any(Function));
    });

    it('should handle event listener setup errors', () => {
      mockContract.on.mockImplementation(() => {
        throw new Error('Provider not connected');
      });

      expect(() => web3Service.setupEventListeners(vi.fn()))
        .toThrow('Event listener setup failed: Provider not connected');
    });

    it('should call callback when events are received', () => {
      const callback = vi.fn();
      let contributionHandler;
      let refundHandler;

      mockContract.on.mockImplementation((event, handler) => {
        if (event === 'ContributionMade') {
          contributionHandler = handler;
        } else if (event === 'RefundProcessed') {
          refundHandler = handler;
        }
      });

      web3Service.setupEventListeners(callback);

      // Simulate contribution event
      const mockEvent = {
        transactionHash: '0x123',
        blockNumber: 123456
      };

      contributionHandler('0xcampaign', '0xuser', '1000000000000000000', mockEvent);

      expect(callback).toHaveBeenCalledWith('contribution', {
        campaignId: '0xcampaign',
        contributor: '0xuser',
        amount: '1',
        transactionHash: '0x123',
        blockNumber: 123456
      });

      // Simulate refund event
      refundHandler('0xcampaign', '0xuser', '500000000000000000', mockEvent);

      expect(callback).toHaveBeenCalledWith('refund', {
        campaignId: '0xcampaign',
        contributor: '0xuser',
        amount: '0.5',
        transactionHash: '0x123',
        blockNumber: 123456
      });
    });
  });

  describe('validateAddress', () => {
    it('should validate correct Ethereum addresses', () => {
      const validAddress = '0x1234567890123456789012345678901234567890';
      
      const isValid = web3Service.validateAddress(validAddress);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid addresses', () => {
      const invalidAddress = 'not-an-address';
      
      const { ethers } = vi.mocked(await import('ethers'));
      ethers.isAddress.mockReturnValue(false);
      
      const isValid = web3Service.validateAddress(invalidAddress);
      
      expect(isValid).toBe(false);
    });
  });

  describe('getNetworkInfo', () => {
    beforeEach(() => {
      mockProvider.getNetwork.mockResolvedValue({
        chainId: BigInt(1),
        name: 'mainnet'
      });
      
      mockProvider.getBlockNumber.mockResolvedValue(12345678);
      
      mockProvider.getFeeData.mockResolvedValue({
        gasPrice: BigInt('20000000000'),
        maxFeePerGas: BigInt('25000000000'),
        maxPriorityFeePerGas: BigInt('2000000000')
      });
    });

    it('should fetch network info successfully', async () => {
      const networkInfo = await web3Service.getNetworkInfo();

      expect(networkInfo).toEqual({
        chainId: 1,
        name: 'mainnet',
        blockNumber: 12345678,
        gasPrice: '20000000000',
        maxFeePerGas: '25000000000',
        maxPriorityFeePerGas: '2000000000'
      });
    });

    it('should handle network info fetch errors', async () => {
      mockProvider.getNetwork.mockRejectedValue(new Error('Network unreachable'));

      await expect(web3Service.getNetworkInfo())
        .rejects.toThrow('Network info fetch failed: Network unreachable');
    });
  });

  describe('validateNetwork', () => {
    it('should validate correct network', async () => {
      mockProvider.getNetwork.mockResolvedValue({
        chainId: BigInt(1),
        name: 'mainnet'
      });
      mockProvider.getBlockNumber.mockResolvedValue(12345678);
      mockProvider.getFeeData.mockResolvedValue({
        gasPrice: BigInt('20000000000')
      });

      const isValid = await web3Service.validateNetwork(1);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect network', async () => {
      mockProvider.getNetwork.mockResolvedValue({
        chainId: BigInt(4),
        name: 'rinkeby'
      });
      mockProvider.getBlockNumber.mockResolvedValue(12345678);
      mockProvider.getFeeData.mockResolvedValue({
        gasPrice: BigInt('20000000000')
      });

      const isValid = await web3Service.validateNetwork(1);

      expect(isValid).toBe(false);
    });
  });
});

describe('Web3Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('toWei', () => {
    it('should convert ETH to Wei', () => {
      const wei = Web3Utils.toWei(1.5);
      
      const { ethers } = vi.mocked(await import('ethers'));
      expect(ethers.parseEther).toHaveBeenCalledWith('1.5');
    });
  });

  describe('fromWei', () => {
    it('should convert Wei to ETH', () => {
      const eth = Web3Utils.fromWei('1500000000000000000');
      
      const { ethers } = vi.mocked(await import('ethers'));
      expect(ethers.formatEther).toHaveBeenCalledWith('1500000000000000000');
    });
  });

  describe('createRandomWallet', () => {
    it('should create random wallet', () => {
      const wallet = Web3Utils.createRandomWallet();
      
      const { ethers } = vi.mocked(await import('ethers'));
      expect(ethers.createRandom).toHaveBeenCalled();
    });
  });

  describe('createWallet', () => {
    it('should create wallet from private key', () => {
      const privateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      const wallet = Web3Utils.createWallet(privateKey);
      
      const { ethers } = vi.mocked(await import('ethers'));
      expect(ethers.Wallet).toHaveBeenCalledWith(privateKey, null);
    });

    it('should create wallet with provider', () => {
      const privateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const provider = 'mock-provider';
      
      const wallet = Web3Utils.createWallet(privateKey, provider);
      
      const { ethers } = vi.mocked(await import('ethers'));
      expect(ethers.Wallet).toHaveBeenCalledWith(privateKey, provider);
    });
  });

  describe('hashString', () => {
    it('should hash string to bytes32', () => {
      const hash = Web3Utils.hashString('test-string');
      
      const { ethers } = vi.mocked(await import('ethers'));
      expect(ethers.id).toHaveBeenCalledWith('test-string');
    });
  });
});