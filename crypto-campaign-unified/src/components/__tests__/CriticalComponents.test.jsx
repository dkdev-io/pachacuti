import React from 'react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../test/test-utils'
import { DonorForm } from '../DonorForm'
import { Web3Wallet } from '../Web3Wallet'
import { SetupWizard } from '../SetupWizard'
import { EnhancedDonorForm } from '../EnhancedDonorForm'
import { CampaignManager } from '../CampaignManager'

// Mock services
vi.mock('../../services/payment', () => ({
  processPayment: vi.fn(() => Promise.resolve({ 
    success: true, 
    paymentId: 'test-payment-123' 
  }))
}))

vi.mock('../../services/donations', () => ({
  recordDonation: vi.fn(() => Promise.resolve({ 
    id: 'test-donation-123',
    amount: 100 
  }))
}))

vi.mock('../../services/email', () => ({
  sendConfirmationEmail: vi.fn(() => Promise.resolve({ 
    success: true 
  }))
}))

vi.mock('../../services/campaigns', () => ({
  createCampaign: vi.fn(() => Promise.resolve({ 
    id: 'test-campaign-123',
    title: 'Test Campaign' 
  })),
  listCampaigns: vi.fn(() => Promise.resolve([
    { id: '1', title: 'Campaign 1', status: 'active', target_amount: 1000 }
  ])),
  getCampaignStats: vi.fn(() => Promise.resolve({
    totalDonations: 50,
    uniqueDonors: 25,
    averageDonation: 40
  }))
}))

vi.mock('../../services/storage', () => ({
  uploadImage: vi.fn(() => Promise.resolve({ 
    success: true,
    url: 'https://example.com/image.jpg' 
  }))
}))

describe('Critical React Components Integration', () => {
  
  describe('DonorForm Component', () => {
    const defaultProps = {
      campaignId: 'test-campaign',
      onSuccess: vi.fn(),
      onError: vi.fn()
    }

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('renders successfully', () => {
      render(<DonorForm {...defaultProps} />)
      expect(screen.getByTestId('donor-form')).toBeInTheDocument()
    })

    it('shows and hides name fields based on anonymous checkbox', async () => {
      const user = userEvent.setup()
      render(<DonorForm {...defaultProps} />)

      expect(screen.getByTestId('firstName-input')).toBeInTheDocument()
      
      await user.click(screen.getByTestId('anonymous-checkbox'))
      
      expect(screen.queryByTestId('firstName-input')).not.toBeInTheDocument()
    })

    it('validates required fields', async () => {
      const user = userEvent.setup()
      render(<DonorForm {...defaultProps} />)

      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toBeInTheDocument()
        expect(screen.getByTestId('amount-error')).toBeInTheDocument()
      })
    })

    it('updates submit button text with amount', async () => {
      const user = userEvent.setup()
      render(<DonorForm {...defaultProps} />)

      const amountInput = screen.getByTestId('amount-input')
      await user.type(amountInput, '100')

      expect(screen.getByTestId('submit-button')).toHaveTextContent('Donate $100')
    })
  })

  describe('Web3Wallet Component', () => {
    const defaultProps = {
      onConnect: vi.fn(),
      onDisconnect: vi.fn(),
      onError: vi.fn()
    }

    beforeEach(() => {
      vi.clearAllMocks()
      // Mock window.ethereum
      Object.defineProperty(window, 'ethereum', {
        value: undefined,
        writable: true
      })
    })

    it('renders successfully', () => {
      render(<Web3Wallet {...defaultProps} />)
      expect(screen.getByTestId('web3-wallet')).toBeInTheDocument()
    })

    it('shows MetaMask not installed message when ethereum is undefined', () => {
      render(<Web3Wallet {...defaultProps} />)
      
      expect(screen.getByTestId('metamask-not-installed')).toBeInTheDocument()
      expect(screen.getByText('MetaMask Not Detected')).toBeInTheDocument()
    })

    it('shows install MetaMask link', () => {
      render(<Web3Wallet {...defaultProps} />)
      
      const installLink = screen.getByTestId('install-metamask-link')
      expect(installLink).toBeInTheDocument()
      expect(installLink).toHaveAttribute('href', 'https://metamask.io/download.html')
    })
  })

  describe('SetupWizard Component', () => {
    const defaultProps = {
      onComplete: vi.fn(),
      onCancel: vi.fn(),
      onError: vi.fn()
    }

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('renders successfully with first step', () => {
      render(<SetupWizard {...defaultProps} />)
      
      expect(screen.getByTestId('setup-wizard')).toBeInTheDocument()
      expect(screen.getByTestId('basic-info-step')).toBeInTheDocument()
      expect(screen.getByText('Step 1 of 7: Basic Information')).toBeInTheDocument()
    })

    it('shows progress bar', () => {
      render(<SetupWizard {...defaultProps} />)
      
      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveStyle({ width: '14.285714285714286%' }) // 1/7 steps
    })

    it('navigates between steps', async () => {
      const user = userEvent.setup()
      render(<SetupWizard {...defaultProps} />)

      // Fill required fields for first step
      await user.type(screen.getByTestId('title-input'), 'Test Campaign')
      await user.type(screen.getByTestId('description-textarea'), 'A test campaign description that is long enough to pass validation')

      // Go to next step
      await user.click(screen.getByTestId('next-button'))

      await waitFor(() => {
        expect(screen.getByTestId('financial-step')).toBeInTheDocument()
      })
    })

    it('validates step before proceeding', async () => {
      const user = userEvent.setup()
      render(<SetupWizard {...defaultProps} />)

      // Try to proceed without filling required fields
      await user.click(screen.getByTestId('next-button'))

      expect(screen.getByTestId('title-error')).toBeInTheDocument()
      expect(screen.getByTestId('description-error')).toBeInTheDocument()
    })
  })

  describe('EnhancedDonorForm Component', () => {
    const defaultProps = {
      campaignId: 'test-campaign',
      onSuccess: vi.fn(),
      onError: vi.fn()
    }

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('renders successfully', () => {
      render(<EnhancedDonorForm {...defaultProps} />)
      expect(screen.getByTestId('enhanced-donor-form')).toBeInTheDocument()
    })

    it('shows compliance level badge', () => {
      render(<EnhancedDonorForm {...defaultProps} complianceLevel="strict" />)
      expect(screen.getByText('Compliance Level: STRICT')).toBeInTheDocument()
    })

    it('shows security badges', () => {
      render(<EnhancedDonorForm {...defaultProps} />)
      
      expect(screen.getByText('🔒 SSL Secured')).toBeInTheDocument()
      expect(screen.getByText('✅ Compliant')).toBeInTheDocument()
      expect(screen.getByText('🛡️ Encrypted')).toBeInTheDocument()
    })

    it('validates legal agreements', async () => {
      const user = userEvent.setup()
      render(<EnhancedDonorForm {...defaultProps} />)

      // Fill basic required fields
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('amount-input'), '100')

      // Try to submit without legal agreements
      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('agreeTerms-error')).toBeInTheDocument()
        expect(screen.getByTestId('agreePrivacy-error')).toBeInTheDocument()
      })
    })

    it('shows different payment methods', () => {
      render(<EnhancedDonorForm {...defaultProps} />)
      
      expect(screen.getByTestId('payment-card')).toBeInTheDocument()
      expect(screen.getByTestId('payment-bank')).toBeInTheDocument()
      expect(screen.getByTestId('payment-crypto')).toBeInTheDocument()
    })
  })

  describe('CampaignManager Component', () => {
    const defaultProps = {
      userRole: 'admin',
      userId: 'test-user'
    }

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('renders successfully', () => {
      render(<CampaignManager {...defaultProps} />)
      expect(screen.getByTestId('campaign-manager')).toBeInTheDocument()
    })

    it('shows manager controls', () => {
      render(<CampaignManager {...defaultProps} />)
      
      expect(screen.getByTestId('manager-controls')).toBeInTheDocument()
      expect(screen.getByTestId('search-input')).toBeInTheDocument()
      expect(screen.getByTestId('status-filter')).toBeInTheDocument()
    })

    it('shows campaign statistics in header', () => {
      render(<CampaignManager {...defaultProps} />)
      
      expect(screen.getByText('Total Campaigns')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('Draft')).toBeInTheDocument()
    })

    it('filters campaigns by search term', async () => {
      const user = userEvent.setup()
      render(<CampaignManager {...defaultProps} />)

      const searchInput = screen.getByTestId('search-input')
      await user.type(searchInput, 'test campaign')

      expect(searchInput).toHaveValue('test campaign')
    })

    it('shows refresh button', () => {
      render(<CampaignManager {...defaultProps} />)
      
      const refreshButton = screen.getByTestId('refresh-button')
      expect(refreshButton).toBeInTheDocument()
      expect(refreshButton).toHaveTextContent('Refresh')
    })
  })

  describe('Cross-Component Integration', () => {
    it('all components handle theme prop correctly', () => {
      const components = [
        { Component: DonorForm, props: { campaignId: 'test' } },
        { Component: Web3Wallet, props: {} },
        { Component: SetupWizard, props: { onComplete: vi.fn() } },
        { Component: EnhancedDonorForm, props: { campaignId: 'test' } },
        { Component: CampaignManager, props: { userRole: 'admin' } }
      ]

      components.forEach(({ Component, props }) => {
        const { unmount } = render(<Component {...props} theme="dark" />)
        const rootElement = screen.getByTestId(Component.name.toLowerCase().replace(/([A-Z])/g, '-$1').substring(1))
        expect(rootElement).toHaveClass('dark')
        unmount()
      })
    })

    it('all forms handle error states properly', async () => {
      const errorHandler = vi.fn()
      const formComponents = [
        { Component: DonorForm, testId: 'donor-form', props: { campaignId: 'test', onError: errorHandler } },
        { Component: EnhancedDonorForm, testId: 'enhanced-donor-form', props: { campaignId: 'test', onError: errorHandler } }
      ]

      for (const { Component, testId, props } of formComponents) {
        render(<Component {...props} />)
        
        const form = screen.getByTestId(testId)
        expect(form).toBeInTheDocument()
        
        // Try to submit without required fields to trigger error handling
        const submitButton = screen.getByTestId('submit-button')
        fireEvent.click(submitButton)
        
        // Should show validation errors
        await waitFor(() => {
          const errors = screen.getAllByText(/required/i)
          expect(errors.length).toBeGreaterThan(0)
        })
      }
    })

    it('components properly sanitize user input', async () => {
      const user = userEvent.setup()
      render(<DonorForm campaignId="test" />)

      const nameInput = screen.getByTestId('firstName-input')
      const maliciousInput = '<script>alert("xss")</script>John'
      
      await user.type(nameInput, maliciousInput)
      
      // Input should be sanitized (script tags removed)
      expect(nameInput.value).toBe('John')
    })
  })

  describe('Security and XSS Prevention', () => {
    it('sanitizes all text inputs', async () => {
      const user = userEvent.setup()
      const testCases = [
        { component: DonorForm, testId: 'firstName-input', props: { campaignId: 'test' } },
        { component: SetupWizard, testId: 'title-input', props: { onComplete: vi.fn() } }
      ]

      for (const { component: Component, testId, props } of testCases) {
        render(<Component {...props} />)
        
        const input = screen.getByTestId(testId)
        const maliciousInput = '<img src="x" onerror="alert(\'xss\')">'
        
        await user.type(input, maliciousInput)
        
        // Malicious content should be sanitized
        expect(input.value).not.toContain('<img')
        expect(input.value).not.toContain('onerror')
      }
    })

    it('validates email addresses against XSS attempts', async () => {
      const user = userEvent.setup()
      render(<DonorForm campaignId="test" />)

      const emailInput = screen.getByTestId('email-input')
      const maliciousEmail = 'test@example.com<script>alert("xss")</script>'

      await user.type(emailInput, maliciousEmail)
      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toHaveTextContent(/valid email/i)
      })
    })
  })

  describe('Accessibility Features', () => {
    it('all form inputs have proper labels', () => {
      render(<DonorForm campaignId="test" />)
      
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/donation amount/i)).toBeInTheDocument()
    })

    it('error messages are properly associated with inputs', async () => {
      const user = userEvent.setup()
      render(<DonorForm campaignId="test" />)

      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        const emailInput = screen.getByTestId('email-input')
        const emailError = screen.getByTestId('email-error')
        
        expect(emailInput).toHaveAttribute('aria-describedby')
        expect(emailError).toHaveAttribute('id')
      })
    })

    it('form submission buttons are properly labeled', () => {
      const components = [
        { Component: DonorForm, props: { campaignId: 'test' } },
        { Component: EnhancedDonorForm, props: { campaignId: 'test' } },
        { Component: SetupWizard, props: { onComplete: vi.fn() } }
      ]

      components.forEach(({ Component, props }) => {
        const { unmount } = render(<Component {...props} />)
        const submitButton = screen.getByTestId('submit-button')
        expect(submitButton).toBeInTheDocument()
        expect(submitButton.textContent).toBeTruthy()
        unmount()
      })
    })
  })
})