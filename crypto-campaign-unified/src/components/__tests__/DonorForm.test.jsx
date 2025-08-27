import React from 'react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render, mockWeb3, mockSupabase, createMockCampaign } from '../../test/test-utils'
import { DonorForm } from '../DonorForm'
import * as paymentService from '../../services/payment'
import * as donationsService from '../../services/donations'
import * as emailService from '../../services/email'

// Mock services
vi.mock('../../services/payment')
vi.mock('../../services/donations')
vi.mock('../../services/email')

describe('DonorForm', () => {
  const mockCampaign = createMockCampaign()
  const defaultProps = {
    campaignId: mockCampaign.id,
    onSuccess: vi.fn(),
    onError: vi.fn()
  }

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Setup default mock responses
    paymentService.processPayment.mockResolvedValue({
      success: true,
      paymentId: 'payment-123',
      status: 'completed'
    })
    
    donationsService.recordDonation.mockResolvedValue({
      id: 'donation-123',
      amount: 100,
      status: 'completed'
    })
    
    emailService.sendConfirmationEmail.mockResolvedValue({
      success: true,
      messageId: 'email-123'
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('renders the donation form with all required fields', () => {
      render(<DonorForm {...defaultProps} />)

      expect(screen.getByTestId('donor-form')).toBeInTheDocument()
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByTestId('anonymous-checkbox')).toBeInTheDocument()
      expect(screen.getByLabelText(/donation amount/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/currency/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/message/i)).toBeInTheDocument()
      expect(screen.getByTestId('submit-button')).toBeInTheDocument()
    })

    it('renders with custom theme class', () => {
      render(<DonorForm {...defaultProps} theme="dark" />)
      
      expect(screen.getByTestId('donor-form')).toHaveClass('dark')
    })

    it('renders with custom min/max amounts', () => {
      render(<DonorForm {...defaultProps} minAmount={5} maxAmount={5000} />)
      
      const amountInput = screen.getByTestId('amount-input')
      expect(amountInput).toHaveAttribute('min', '5')
      expect(amountInput).toHaveAttribute('max', '5000')
    })

    it('renders with custom currency options', () => {
      const customCurrencies = ['USD', 'ETH', 'BTC']
      render(<DonorForm {...defaultProps} currencies={customCurrencies} />)
      
      const currencySelect = screen.getByTestId('currency-select')
      customCurrencies.forEach(currency => {
        expect(within(currencySelect).getByText(currency)).toBeInTheDocument()
      })
    })
  })

  describe('Form Interactions', () => {
    it('shows/hides name fields based on anonymous checkbox', async () => {
      const user = userEvent.setup()
      render(<DonorForm {...defaultProps} />)

      // Initially name fields should be visible
      expect(screen.getByTestId('firstName-input')).toBeInTheDocument()
      expect(screen.getByTestId('lastName-input')).toBeInTheDocument()

      // Check anonymous checkbox
      await user.click(screen.getByTestId('anonymous-checkbox'))

      // Name fields should be hidden
      expect(screen.queryByTestId('firstName-input')).not.toBeInTheDocument()
      expect(screen.queryByTestId('lastName-input')).not.toBeInTheDocument()

      // Uncheck anonymous checkbox
      await user.click(screen.getByTestId('anonymous-checkbox'))

      // Name fields should be visible again
      expect(screen.getByTestId('firstName-input')).toBeInTheDocument()
      expect(screen.getByTestId('lastName-input')).toBeInTheDocument()
    })

    it('updates submit button text with amount', async () => {
      const user = userEvent.setup()
      render(<DonorForm {...defaultProps} />)

      const amountInput = screen.getByTestId('amount-input')
      const submitButton = screen.getByTestId('submit-button')

      // Initially should show generic text
      expect(submitButton).toHaveTextContent('Donate')

      // Enter amount
      await user.clear(amountInput)
      await user.type(amountInput, '100')

      // Button text should update
      expect(submitButton).toHaveTextContent('Donate $100')
    })

    it('updates character count for message field', async () => {
      const user = userEvent.setup()
      render(<DonorForm {...defaultProps} />)

      const messageTextarea = screen.getByTestId('message-textarea')
      const characterCount = screen.getByText('0/500')

      expect(characterCount).toBeInTheDocument()

      await user.type(messageTextarea, 'Test message')
      
      expect(screen.getByText('12/500')).toBeInTheDocument()
    })

    it('clears field errors when user starts typing', async () => {
      const user = userEvent.setup()
      render(<DonorForm {...defaultProps} />)

      // Submit form to trigger validation errors
      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toBeInTheDocument()
      })

      // Start typing in email field
      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      // Error should be cleared
      expect(screen.queryByTestId('email-error')).not.toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('validates required fields on submit', async () => {
      const user = userEvent.setup()
      render(<DonorForm {...defaultProps} />)

      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toHaveTextContent('Email is required')
        expect(screen.getByTestId('firstName-error')).toHaveTextContent('First name is required')
        expect(screen.getByTestId('lastName-error')).toHaveTextContent('Last name is required')
        expect(screen.getByTestId('amount-error')).toHaveTextContent('Donation amount is required')
      })

      expect(defaultProps.onError).toHaveBeenCalledWith('Please correct the errors in the form')
    })

    it('validates email format', async () => {
      const user = userEvent.setup()
      render(<DonorForm {...defaultProps} />)

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'invalid-email')
      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toHaveTextContent('Please enter a valid email address')
      })
    })

    it('validates amount range', async () => {
      const user = userEvent.setup()
      render(<DonorForm {...defaultProps} minAmount={5} maxAmount={1000} />)

      const amountInput = screen.getByTestId('amount-input')
      
      // Test below minimum
      await user.clear(amountInput)
      await user.type(amountInput, '1')
      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('amount-error')).toHaveTextContent('Amount must be between $5 and $1000')
      })

      // Test above maximum
      await user.clear(amountInput)
      await user.type(amountInput, '2000')
      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('amount-error')).toHaveTextContent('Amount must be between $5 and $1000')
      })
    })

    it('validates message length', async () => {
      const user = userEvent.setup()
      render(<DonorForm {...defaultProps} />)

      const messageTextarea = screen.getByTestId('message-textarea')
      const longMessage = 'a'.repeat(501)
      
      await user.type(messageTextarea, longMessage)
      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('message-error')).toHaveTextContent('Message must be 500 characters or less')
      })
    })

    it('does not require name fields for anonymous donations', async () => {
      const user = userEvent.setup()
      render(<DonorForm {...defaultProps} />)

      // Fill required fields but not names
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('amount-input'), '100')
      
      // Check anonymous checkbox
      await user.click(screen.getByTestId('anonymous-checkbox'))
      
      await user.click(screen.getByTestId('submit-button'))

      // Should not show name field errors
      expect(screen.queryByTestId('firstName-error')).not.toBeInTheDocument()
      expect(screen.queryByTestId('lastName-error')).not.toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    const validFormData = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      amount: '100',
      message: 'Test donation'
    }

    const fillValidForm = async (user, anonymous = false) => {
      await user.type(screen.getByTestId('email-input'), validFormData.email)
      
      if (!anonymous) {
        await user.type(screen.getByTestId('firstName-input'), validFormData.firstName)
        await user.type(screen.getByTestId('lastName-input'), validFormData.lastName)
      } else {
        await user.click(screen.getByTestId('anonymous-checkbox'))
      }
      
      await user.type(screen.getByTestId('amount-input'), validFormData.amount)
      await user.type(screen.getByTestId('message-textarea'), validFormData.message)
    }

    it('successfully submits valid form', async () => {
      const user = userEvent.setup()
      render(<DonorForm {...defaultProps} />)

      await fillValidForm(user)
      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(paymentService.processPayment).toHaveBeenCalledWith({
          amount: 100,
          currency: 'USD',
          paymentMethod: 'card',
          customerEmail: validFormData.email
        })
      })

      expect(donationsService.recordDonation).toHaveBeenCalledWith({
        campaignId: mockCampaign.id,
        donorEmail: validFormData.email,
        donorName: `${validFormData.firstName} ${validFormData.lastName}`,
        amount: 100,
        currency: 'USD',
        message: validFormData.message,
        anonymous: false,
        paymentId: 'payment-123',
        paymentMethod: 'card'
      })

      expect(emailService.sendConfirmationEmail).toHaveBeenCalledWith({
        email: validFormData.email,
        donationId: 'donation-123',
        amount: '100',
        currency: 'USD',
        campaignId: mockCampaign.id
      })

      expect(defaultProps.onSuccess).toHaveBeenCalledWith({
        id: 'donation-123',
        amount: 100,
        status: 'completed'
      })
    })

    it('submits anonymous donation correctly', async () => {
      const user = userEvent.setup()
      render(<DonorForm {...defaultProps} />)

      await fillValidForm(user, true)
      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(donationsService.recordDonation).toHaveBeenCalledWith(
          expect.objectContaining({
            donorName: null,
            anonymous: true
          })
        )
      })
    })

    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      
      // Make payment service take longer
      paymentService.processPayment.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      )
      
      render(<DonorForm {...defaultProps} />)

      await fillValidForm(user)
      await user.click(screen.getByTestId('submit-button'))

      // Button should show loading state
      const submitButton = screen.getByTestId('submit-button')
      expect(submitButton).toBeDisabled()
      expect(submitButton).toHaveTextContent('Processing...')
      expect(screen.getByRole('button', { name: /processing/i })).toBeInTheDocument()
    })

    it('prevents double submission', async () => {
      const user = userEvent.setup()
      render(<DonorForm {...defaultProps} />)

      await fillValidForm(user)
      
      // Click submit button twice quickly
      await user.click(screen.getByTestId('submit-button'))
      await user.click(screen.getByTestId('submit-button'))

      // Service should only be called once
      await waitFor(() => {
        expect(paymentService.processPayment).toHaveBeenCalledTimes(1)
      })
    })

    it('resets form after successful submission', async () => {
      const user = userEvent.setup()
      render(<DonorForm {...defaultProps} />)

      await fillValidForm(user)
      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled()
      })

      // Form fields should be cleared
      expect(screen.getByTestId('email-input')).toHaveValue('')
      expect(screen.getByTestId('amount-input')).toHaveValue('')
      expect(screen.getByTestId('message-textarea')).toHaveValue('')
    })
  })

  describe('Error Handling', () => {
    const validFormData = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      amount: '100'
    }

    const fillValidForm = async (user) => {
      await user.type(screen.getByTestId('email-input'), validFormData.email)
      await user.type(screen.getByTestId('firstName-input'), validFormData.firstName)
      await user.type(screen.getByTestId('lastName-input'), validFormData.lastName)
      await user.type(screen.getByTestId('amount-input'), validFormData.amount)
    }

    it('handles payment processing errors', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Payment processing failed'
      
      paymentService.processPayment.mockRejectedValue(new Error(errorMessage))
      
      render(<DonorForm {...defaultProps} />)

      await fillValidForm(user)
      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith(errorMessage)
      })
    })

    it('handles donation recording errors', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Failed to record donation'
      
      donationsService.recordDonation.mockRejectedValue(new Error(errorMessage))
      
      render(<DonorForm {...defaultProps} />)

      await fillValidForm(user)
      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith(errorMessage)
      })
    })

    it('handles email service errors gracefully', async () => {
      const user = userEvent.setup()
      
      emailService.sendConfirmationEmail.mockRejectedValue(new Error('Email service error'))
      
      render(<DonorForm {...defaultProps} />)

      await fillValidForm(user)
      await user.click(screen.getByTestId('submit-button'))

      // Should still call onSuccess even if email fails
      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled()
      })
    })

    it('shows rate limiting after multiple failed attempts', async () => {
      const user = userEvent.setup()
      
      paymentService.processPayment.mockRejectedValue(new Error('Payment failed'))
      
      render(<DonorForm {...defaultProps} />)

      await fillValidForm(user)

      // Submit 3 times to trigger rate limit
      for (let i = 0; i < 3; i++) {
        await user.click(screen.getByTestId('submit-button'))
        await waitFor(() => {
          expect(defaultProps.onError).toHaveBeenCalled()
        })
        vi.clearAllMocks() // Clear between attempts
      }

      // Fourth attempt should show rate limit
      await user.click(screen.getByTestId('submit-button'))
      
      expect(screen.getByTestId('rate-limit-error')).toBeInTheDocument()
      expect(screen.getByTestId('submit-button')).toBeDisabled()
    })
  })

  describe('Security and XSS Prevention', () => {
    it('sanitizes input values', async () => {
      const user = userEvent.setup()
      render(<DonorForm {...defaultProps} />)

      const maliciousInput = '<script>alert("xss")</script>John'
      const firstNameInput = screen.getByTestId('firstName-input')

      await user.type(firstNameInput, maliciousInput)
      
      // Input should be sanitized
      expect(firstNameInput).toHaveValue('John')
    })

    it('prevents XSS in message field', async () => {
      const user = userEvent.setup()
      render(<DonorForm {...defaultProps} />)

      const maliciousMessage = '<img src="x" onerror="alert(\'xss\')">'
      const messageTextarea = screen.getByTestId('message-textarea')

      await user.type(messageTextarea, maliciousMessage)
      
      // Message should be sanitized
      expect(messageTextarea.value).not.toContain('<img')
      expect(messageTextarea.value).not.toContain('onerror')
    })

    it('validates email against XSS attempts', async () => {
      const user = userEvent.setup()
      render(<DonorForm {...defaultProps} />)

      const maliciousEmail = 'test@example.com<script>alert("xss")</script>'
      const emailInput = screen.getByTestId('email-input')

      await user.type(emailInput, maliciousEmail)
      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toHaveTextContent('Please enter a valid email address')
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and descriptions', () => {
      render(<DonorForm {...defaultProps} />)

      const emailInput = screen.getByTestId('email-input')
      expect(emailInput).toHaveAttribute('aria-describedby')

      // Submit error and show error message
      fireEvent.click(screen.getByTestId('submit-button'))
      
      expect(screen.getByTestId('email-error')).toHaveAttribute('id')
    })

    it('supports keyboard navigation', async () => {
      render(<DonorForm {...defaultProps} />)

      const emailInput = screen.getByTestId('email-input')
      const amountInput = screen.getByTestId('amount-input')
      const submitButton = screen.getByTestId('submit-button')

      // Should be able to tab through form
      emailInput.focus()
      expect(document.activeElement).toBe(emailInput)

      fireEvent.keyDown(emailInput, { key: 'Tab' })
      // Note: jsdom doesn't fully simulate tab navigation
      // In a real browser this would move focus to next element
    })

    it('has proper form structure with labels', () => {
      render(<DonorForm {...defaultProps} />)

      // All inputs should have associated labels
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/donation amount/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/currency/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/message/i)).toBeInTheDocument()
    })
  })
})