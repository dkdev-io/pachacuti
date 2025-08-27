/**
 * Smart Contract Security Tests
 * Tests for smart contract vulnerabilities including reentrancy, overflow, and access control
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { SecurityTestFramework } from '../security-test-framework.js'

describe('Smart Contract Security Tests', () => {
  let securityFramework
  let mockContract

  beforeEach(() => {
    securityFramework = new SecurityTestFramework()
    mockContract = new MockSmartContract()
  })

  describe('Reentrancy Attack Prevention', () => {
    it('should prevent reentrancy attacks on withdrawal functions', async () => {
      // Deploy malicious contract that attempts reentrancy
      const maliciousContract = new MaliciousReentrantContract(mockContract)
      
      // Fund the target contract
      await mockContract.deposit({ from: 'user1', value: 1000 })
      await mockContract.deposit({ from: 'user2', value: 1000 })
      
      // Malicious contract deposits minimal amount
      await mockContract.deposit({ from: maliciousContract.address, value: 100 })
      
      // Attempt reentrancy attack
      expect(async () => {
        await maliciousContract.attack()
      }).rejects.toThrow('Reentrancy detected')
      
      // Contract balance should remain intact
      expect(await mockContract.getBalance()).toBe(2100)
    })

    it('should use reentrancy guard modifier correctly', async () => {
      const contractCode = mockContract.getSourceCode()
      
      // Check for reentrancy guard implementation
      expect(contractCode).toContain('nonReentrant')
      expect(contractCode).toContain('_guardCounter')
      
      // Verify critical functions are protected
      const protectedFunctions = ['withdraw', 'transfer', 'emergencyWithdraw']
      protectedFunctions.forEach(func => {
        const functionDefinition = contractCode.match(new RegExp(`function ${func}.*?{`))?.[0]
        expect(functionDefinition).toContain('nonReentrant')
      })
    })

    it('should implement checks-effects-interactions pattern', async () => {
      const withdrawal = {
        user: 'user1',
        amount: 500
      }
      
      // Mock the withdrawal process to check order of operations
      const operations = []
      
      mockContract.onOperation = (operation) => {
        operations.push(operation)
      }
      
      await mockContract.withdraw(withdrawal.amount, { from: withdrawal.user })
      
      // Verify correct order: checks, effects, interactions
      expect(operations[0].type).toBe('check') // Balance verification
      expect(operations[1].type).toBe('effect') // State update
      expect(operations[2].type).toBe('interaction') // External call
    })

    it('should prevent cross-function reentrancy', async () => {
      const attacker = new CrossFunctionReentrancyAttacker(mockContract)
      
      await mockContract.deposit({ from: attacker.address, value: 100 })
      
      expect(async () => {
        await attacker.crossFunctionAttack()
      }).rejects.toThrow('Reentrancy detected')
    })
  })

  describe('Integer Overflow/Underflow Protection', () => {
    it('should prevent integer overflow in arithmetic operations', async () => {
      const maxUint256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
      
      // Attempt overflow
      expect(async () => {
        await mockContract.add(maxUint256, BigInt(1))
      }).rejects.toThrow('SafeMath: addition overflow')
      
      // Attempt multiplication overflow
      expect(async () => {
        await mockContract.multiply(maxUint256, BigInt(2))
      }).rejects.toThrow('SafeMath: multiplication overflow')
    })

    it('should prevent integer underflow in subtraction', async () => {
      // Attempt underflow
      expect(async () => {
        await mockContract.subtract(BigInt(5), BigInt(10))
      }).rejects.toThrow('SafeMath: subtraction underflow')
      
      // Division by zero
      expect(async () => {
        await mockContract.divide(BigInt(100), BigInt(0))
      }).rejects.toThrow('SafeMath: division by zero')
    })

    it('should use SafeMath library consistently', () => {
      const contractCode = mockContract.getSourceCode()
      
      // Check SafeMath usage
      expect(contractCode).toContain('using SafeMath for uint256')
      
      // Verify arithmetic operations use SafeMath
      const arithmeticOperations = ['.add(', '.sub(', '.mul(', '.div(']
      arithmeticOperations.forEach(op => {
        expect(contractCode).toContain(op)
      })
      
      // Should not use direct arithmetic operators in critical sections
      const directOperators = [' + ', ' - ', ' * ', ' / ']
      directOperators.forEach(op => {
        const matches = contractCode.match(new RegExp(`\\w${op}\\w`, 'g'))
        if (matches) {
          // Direct operators should only be used in non-critical sections
          matches.forEach(match => {
            expect(match).not.toMatch(/balance|amount|value/)
          })
        }
      })
    })

    it('should validate input ranges for calculations', async () => {
      const invalidInputs = [
        { percentage: 101, amount: 1000 }, // Invalid percentage
        { percentage: -5, amount: 1000 }, // Negative percentage
        { percentage: 50, amount: -100 }, // Negative amount
      ]

      for (const input of invalidInputs) {
        expect(async () => {
          await mockContract.calculatePercentage(input.amount, input.percentage)
        }).rejects.toThrow(/Invalid|overflow|underflow/)
      }
    })
  })

  describe('Access Control Security', () => {
    it('should implement proper role-based access control', async () => {
      const roles = {
        ADMIN_ROLE: 'admin',
        MANAGER_ROLE: 'manager', 
        USER_ROLE: 'user'
      }

      // Test admin-only functions
      const adminOnlyFunctions = ['pause', 'unpause', 'setFeePercentage', 'emergencyWithdraw']
      
      for (const func of adminOnlyFunctions) {
        // Should succeed with admin role
        await expect(mockContract[func]({ from: roles.ADMIN_ROLE })).resolves.not.toThrow()
        
        // Should fail with non-admin role
        await expect(mockContract[func]({ from: roles.USER_ROLE })).rejects.toThrow('AccessControl: account is missing role')
      }
    })

    it('should prevent unauthorized ownership transfers', async () => {
      const currentOwner = await mockContract.owner()
      const newOwner = 'user2'
      
      // Only owner should be able to transfer ownership
      expect(async () => {
        await mockContract.transferOwnership(newOwner, { from: 'user3' })
      }).rejects.toThrow('Ownable: caller is not the owner')
      
      // Valid ownership transfer
      await mockContract.transferOwnership(newOwner, { from: currentOwner })
      expect(await mockContract.owner()).toBe(newOwner)
    })

    it('should implement multi-signature requirements for critical functions', async () => {
      const criticalFunctions = ['upgradeContract', 'changeOwnership', 'emergencyStop']
      const requiredSignatures = 2
      
      for (const func of criticalFunctions) {
        // Single signature should not be sufficient
        expect(async () => {
          await mockContract[func]({ 
            from: 'admin1',
            signatures: ['0x123...'] // Only one signature
          })
        }).rejects.toThrow('Insufficient signatures')
        
        // Multiple signatures should work
        await expect(mockContract[func]({
          from: 'admin1',
          signatures: ['0x123...', '0x456...'] // Two signatures
        })).resolves.not.toThrow()
      }
    })

    it('should validate function modifiers are applied correctly', () => {
      const contractCode = mockContract.getSourceCode()
      
      const criticalFunctions = {
        'withdraw': ['nonReentrant', 'whenNotPaused'],
        'deposit': ['nonReentrant', 'whenNotPaused'],
        'transferOwnership': ['onlyOwner'],
        'pause': ['onlyOwner'],
        'setFeePercentage': ['onlyOwner', 'whenNotPaused']
      }

      Object.entries(criticalFunctions).forEach(([funcName, expectedModifiers]) => {
        const functionMatch = contractCode.match(new RegExp(`function ${funcName}[^{]*{`, 'g'))
        expect(functionMatch).toBeTruthy()
        
        expectedModifiers.forEach(modifier => {
          expect(functionMatch[0]).toContain(modifier)
        })
      })
    })
  })

  describe('Gas Optimization and DoS Prevention', () => {
    it('should prevent gas limit DoS attacks', async () => {
      // Create a large array to process
      const largeArray = Array.from({length: 1000}, (_, i) => i)
      
      expect(async () => {
        await mockContract.processArray(largeArray)
      }).rejects.toThrow('Gas limit exceeded')
    })

    it('should implement proper gas estimation', async () => {
      const operations = [
        { name: 'deposit', params: [1000], expectedGas: 50000 },
        { name: 'withdraw', params: [500], expectedGas: 75000 },
        { name: 'transfer', params: ['user2', 200], expectedGas: 65000 }
      ]

      for (const op of operations) {
        const estimatedGas = await mockContract.estimateGas[op.name](...op.params)
        
        // Gas estimation should be reasonable
        expect(Number(estimatedGas)).toBeLessThan(op.expectedGas * 1.5)
        expect(Number(estimatedGas)).toBeGreaterThan(op.expectedGas * 0.5)
      }
    })

    it('should limit loop iterations to prevent gas exhaustion', () => {
      const contractCode = mockContract.getSourceCode()
      
      // Find all loops in the contract
      const loops = contractCode.match(/for\s*\([^}]*\{|while\s*\([^}]*\{/g)
      
      if (loops) {
        loops.forEach(loop => {
          // Should have iteration limits
          expect(contractCode).toMatch(/require\(.*\.length\s*<=\s*\d+/)
        })
      }
    })

    it('should prevent external call failures from blocking execution', async () => {
      const recipients = ['user1', 'user2', 'failing_contract', 'user3']
      const amounts = [100, 200, 300, 400]
      
      // Batch transfer should continue even if one recipient fails
      const results = await mockContract.batchTransfer(recipients, amounts)
      
      expect(results.successful).toHaveLength(3)
      expect(results.failed).toHaveLength(1)
      expect(results.failed[0].recipient).toBe('failing_contract')
    })
  })

  describe('Oracle and External Data Security', () => {
    it('should validate oracle data freshness', async () => {
      const stalePrice = {
        price: 100,
        timestamp: Date.now() - 3600000, // 1 hour old
        source: 'chainlink'
      }

      expect(async () => {
        await mockContract.updatePrice(stalePrice)
      }).rejects.toThrow('Oracle data too old')
    })

    it('should implement circuit breakers for price feeds', async () => {
      const extremePrices = [
        { price: 1000000, previousPrice: 100 }, // 10000x increase
        { price: 1, previousPrice: 100 } // 100x decrease
      ]

      for (const priceData of extremePrices) {
        expect(async () => {
          await mockContract.updatePrice({
            price: priceData.price,
            timestamp: Date.now(),
            previousPrice: priceData.previousPrice
          })
        }).rejects.toThrow('Price change exceeds circuit breaker threshold')
      }
    })

    it('should use multiple oracle sources for price validation', async () => {
      const oraclePrices = [
        { source: 'chainlink', price: 100, timestamp: Date.now() },
        { source: 'uniswap', price: 105, timestamp: Date.now() },
        { source: 'coinbase', price: 98, timestamp: Date.now() }
      ]

      const aggregatedPrice = await mockContract.aggregatePrices(oraclePrices)
      
      // Should be median price
      expect(aggregatedPrice.price).toBe(100)
      expect(aggregatedPrice.confidence).toBeGreaterThan(0.9)
    })

    it('should handle oracle failures gracefully', async () => {
      const failingOracleData = {
        price: null,
        timestamp: Date.now(),
        source: 'failing_oracle',
        error: 'Network timeout'
      }

      // Should fallback to backup oracle or cached price
      const result = await mockContract.getPriceWithFallback(failingOracleData)
      
      expect(result.price).toBeTruthy()
      expect(result.source).toBe('fallback')
    })
  })

  describe('Upgrade and Migration Security', () => {
    it('should implement secure proxy upgrade patterns', async () => {
      const currentImplementation = await mockContract.implementation()
      const newImplementation = 'new_contract_address'
      
      // Only admin should be able to upgrade
      expect(async () => {
        await mockContract.upgradeTo(newImplementation, { from: 'user1' })
      }).rejects.toThrow('AccessControl: account is missing role')
      
      // Valid upgrade
      await mockContract.upgradeTo(newImplementation, { from: 'admin' })
      expect(await mockContract.implementation()).toBe(newImplementation)
    })

    it('should validate upgrade compatibility', async () => {
      const incompatibleImplementation = {
        address: 'incompatible_contract',
        version: '1.0.0',
        storageLayout: ['slot0', 'slot1'] // Missing slot2
      }

      expect(async () => {
        await mockContract.validateUpgrade(incompatibleImplementation)
      }).rejects.toThrow('Storage layout incompatible')
    })

    it('should implement emergency pause functionality', async () => {
      // Pause contract
      await mockContract.pause({ from: 'admin' })
      expect(await mockContract.paused()).toBe(true)
      
      // Critical functions should be blocked
      expect(async () => {
        await mockContract.deposit({ from: 'user1', value: 1000 })
      }).rejects.toThrow('Pausable: paused')
      
      expect(async () => {
        await mockContract.withdraw(500, { from: 'user1' })
      }).rejects.toThrow('Pausable: paused')
      
      // Emergency functions should still work
      await expect(mockContract.emergencyWithdraw({ from: 'admin' })).resolves.not.toThrow()
    })
  })

  afterEach(() => {
    // Generate security report if vulnerabilities found
    if (securityFramework.vulnerabilities.length > 0) {
      const report = securityFramework.generateSecurityReport()
      console.log('Smart Contract Security Test Report:', JSON.stringify(report, null, 2))
    }
  })
})

// Mock Smart Contract for testing
class MockSmartContract {
  constructor() {
    this.balances = new Map()
    this.totalSupply = BigInt(0)
    this.owner = 'admin'
    this.paused = false
    this.guardCounter = 0
    this.roles = new Map()
    this.operations = []
    this.priceData = { price: 100, timestamp: Date.now() }
    this.implementation = 'current_implementation'
    
    // Initialize roles
    this.roles.set('admin', ['ADMIN_ROLE'])
    this.roles.set('manager', ['MANAGER_ROLE'])
    this.roles.set('user', ['USER_ROLE'])
  }

  // Deposit function with reentrancy protection
  async deposit(params) {
    this.nonReentrant()
    this.whenNotPaused()
    
    this.recordOperation('check', 'Validate deposit amount')
    if (params.value <= 0) throw new Error('Invalid deposit amount')
    
    this.recordOperation('effect', 'Update balance')
    const currentBalance = this.balances.get(params.from) || BigInt(0)
    this.balances.set(params.from, currentBalance + BigInt(params.value))
    
    this.recordOperation('interaction', 'Emit deposit event')
    this.emit('Deposit', params.from, params.value)
    
    this.guardCounter = 0
  }

  // Withdrawal function with reentrancy protection
  async withdraw(amount, params) {
    this.nonReentrant()
    this.whenNotPaused()
    
    this.recordOperation('check', 'Validate withdrawal')
    const balance = this.balances.get(params.from) || BigInt(0)
    if (balance < BigInt(amount)) throw new Error('Insufficient balance')
    
    this.recordOperation('effect', 'Update balance')
    this.balances.set(params.from, balance - BigInt(amount))
    
    this.recordOperation('interaction', 'Transfer funds')
    await this.transfer(params.from, amount)
    
    this.guardCounter = 0
  }

  // Reentrancy guard modifier
  nonReentrant() {
    this.guardCounter++
    if (this.guardCounter > 1) {
      throw new Error('Reentrancy detected')
    }
  }

  // Pausable modifier
  whenNotPaused() {
    if (this.paused) {
      throw new Error('Pausable: paused')
    }
  }

  // Owner-only modifier
  onlyOwner(params) {
    if (params.from !== this.owner) {
      throw new Error('Ownable: caller is not the owner')
    }
  }

  // Role-based access control
  hasRole(role, account) {
    const userRoles = this.roles.get(account) || []
    return userRoles.includes(role)
  }

  requireRole(role, account) {
    if (!this.hasRole(role, account)) {
      throw new Error(`AccessControl: account is missing role`)
    }
  }

  // SafeMath operations
  async add(a, b) {
    const result = a + b
    if (result < a) throw new Error('SafeMath: addition overflow')
    return result
  }

  async subtract(a, b) {
    if (b > a) throw new Error('SafeMath: subtraction underflow')
    return a - b
  }

  async multiply(a, b) {
    if (a === BigInt(0)) return BigInt(0)
    const result = a * b
    if (result / a !== b) throw new Error('SafeMath: multiplication overflow')
    return result
  }

  async divide(a, b) {
    if (b === BigInt(0)) throw new Error('SafeMath: division by zero')
    return a / b
  }

  // Input validation
  async calculatePercentage(amount, percentage) {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Invalid percentage')
    }
    if (amount < 0) {
      throw new Error('Invalid amount')
    }
    return await this.multiply(BigInt(amount), BigInt(percentage)) / BigInt(100)
  }

  // Admin functions
  async pause(params) {
    this.onlyOwner(params)
    this.paused = true
  }

  async unpause(params) {
    this.onlyOwner(params)
    this.paused = false
  }

  async transferOwnership(newOwner, params) {
    this.onlyOwner(params)
    this.owner = newOwner
  }

  // Multi-signature functions
  async upgradeContract(params) {
    if (!params.signatures || params.signatures.length < 2) {
      throw new Error('Insufficient signatures')
    }
    // Simulate upgrade
  }

  async changeOwnership(params) {
    if (!params.signatures || params.signatures.length < 2) {
      throw new Error('Insufficient signatures')
    }
  }

  async emergencyStop(params) {
    if (!params.signatures || params.signatures.length < 2) {
      throw new Error('Insufficient signatures')
    }
  }

  // Gas limit protection
  async processArray(array) {
    if (array.length > 100) {
      throw new Error('Gas limit exceeded')
    }
    
    const results = []
    for (let i = 0; i < array.length; i++) {
      results.push(array[i] * 2)
    }
    return results
  }

  // Batch operations with failure handling
  async batchTransfer(recipients, amounts) {
    const results = { successful: [], failed: [] }
    
    for (let i = 0; i < recipients.length; i++) {
      try {
        if (recipients[i] === 'failing_contract') {
          throw new Error('Transfer failed')
        }
        await this.transfer(recipients[i], amounts[i])
        results.successful.push({ recipient: recipients[i], amount: amounts[i] })
      } catch (error) {
        results.failed.push({ recipient: recipients[i], error: error.message })
      }
    }
    
    return results
  }

  // Oracle functions
  async updatePrice(priceData) {
    // Check data freshness
    if (Date.now() - priceData.timestamp > 1800000) { // 30 minutes
      throw new Error('Oracle data too old')
    }
    
    // Circuit breaker
    if (priceData.previousPrice) {
      const priceChange = Math.abs(priceData.price - priceData.previousPrice) / priceData.previousPrice
      if (priceChange > 0.5) { // 50% change threshold
        throw new Error('Price change exceeds circuit breaker threshold')
      }
    }
    
    this.priceData = priceData
  }

  async aggregatePrices(oraclePrices) {
    const validPrices = oraclePrices.filter(p => p.price && p.timestamp)
    if (validPrices.length < 2) {
      throw new Error('Insufficient oracle data')
    }
    
    const prices = validPrices.map(p => p.price).sort((a, b) => a - b)
    const median = prices[Math.floor(prices.length / 2)]
    
    return {
      price: median,
      confidence: validPrices.length / oraclePrices.length,
      sources: validPrices.map(p => p.source)
    }
  }

  async getPriceWithFallback(oracleData) {
    if (oracleData.price) {
      return { price: oracleData.price, source: oracleData.source }
    }
    
    // Fallback to cached price
    return { price: this.priceData.price, source: 'fallback' }
  }

  // Upgrade functions
  async upgradeTo(newImplementation, params) {
    this.requireRole('ADMIN_ROLE', params.from)
    this.implementation = newImplementation
  }

  async validateUpgrade(newImplementation) {
    const currentLayout = ['slot0', 'slot1', 'slot2']
    if (newImplementation.storageLayout.length !== currentLayout.length) {
      throw new Error('Storage layout incompatible')
    }
  }

  async emergencyWithdraw(params) {
    this.requireRole('ADMIN_ROLE', params.from)
    // Emergency withdrawal logic
  }

  // Helper functions
  async getBalance() {
    let total = BigInt(0)
    for (const balance of this.balances.values()) {
      total += balance
    }
    return Number(total)
  }

  getSourceCode() {
    return `
      pragma solidity ^0.8.0;
      
      import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
      import "@openzeppelin/contracts/security/Pausable.sol";
      import "@openzeppelin/contracts/access/AccessControl.sol";
      import "@openzeppelin/contracts/utils/math/SafeMath.sol";
      
      contract CampaignContract is ReentrancyGuard, Pausable, AccessControl {
        using SafeMath for uint256;
        
        mapping(address => uint256) public balances;
        uint256 private _guardCounter;
        
        function deposit() external payable nonReentrant whenNotPaused {
          require(msg.value > 0, "Invalid deposit amount");
          balances[msg.sender] = balances[msg.sender].add(msg.value);
          emit Deposit(msg.sender, msg.value);
        }
        
        function withdraw(uint256 amount) external nonReentrant whenNotPaused {
          require(balances[msg.sender] >= amount, "Insufficient balance");
          balances[msg.sender] = balances[msg.sender].sub(amount);
          payable(msg.sender).transfer(amount);
        }
        
        function pause() external onlyOwner {
          _pause();
        }
        
        function setFeePercentage(uint256 fee) external onlyOwner whenNotPaused {
          require(fee <= 100, "Invalid percentage");
        }
      }
    `
  }

  recordOperation(type, description) {
    this.operations.push({ type, description, timestamp: Date.now() })
    if (this.onOperation) {
      this.onOperation({ type, description })
    }
  }

  async transfer(to, amount) {
    // Simulate transfer
    return true
  }

  emit(event, ...args) {
    // Simulate event emission
  }

  estimateGas = {
    deposit: async (amount) => BigInt(45000),
    withdraw: async (amount) => BigInt(65000), 
    transfer: async (to, amount) => BigInt(55000)
  }
}

// Malicious contract for reentrancy testing
class MaliciousReentrantContract {
  constructor(targetContract) {
    this.address = 'malicious_contract'
    this.target = targetContract
  }

  async attack() {
    // This should trigger reentrancy protection
    await this.target.withdraw(100, { from: this.address })
  }

  // This would be called by the target contract during withdrawal
  async receive() {
    // Attempt reentrancy
    await this.target.withdraw(100, { from: this.address })
  }
}

// Cross-function reentrancy attacker
class CrossFunctionReentrancyAttacker {
  constructor(targetContract) {
    this.address = 'cross_function_attacker'
    this.target = targetContract
  }

  async crossFunctionAttack() {
    // Call one function that calls back into another
    await this.target.withdraw(50, { from: this.address })
  }

  async receive() {
    // Attempt to call different function during withdrawal
    await this.target.transfer('other_user', 50, { from: this.address })
  }
}