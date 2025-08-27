import React, { useState, useCallback } from 'react'
import { validateEmail, validateAmount, sanitizeInput } from '../utils/validation'
import { processPayment } from '../services/payment'
import { recordDonation } from '../services/donations'
import { sendConfirmationEmail } from '../services/email'

/**
 * DonorForm - Main donation form component
 * Handles validation, payment processing, and donation recording
 */
export const DonorForm = ({
  campaignId,
  onSuccess,
  onError,
  minAmount = 1,
  maxAmount = 10000,
  currencies = ['USD', 'ETH'],
  theme = 'light'
}) => {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    amount: '',
    currency: currencies[0],
    anonymous: false,
    message: '',
    paymentMethod: 'card'
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitAttempts, setSubmitAttempts] = useState(0)

  // Input sanitization and validation
  const handleInputChange = useCallback((field, value) => {
    const sanitizedValue = sanitizeInput(value)
    
    setFormData(prev => ({
      ...prev,
      [field]: sanitizedValue
    }))

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }))
    }
  }, [errors])

  // Comprehensive form validation
  const validateForm = useCallback(() => {
    const newErrors = {}

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Name validation (if not anonymous)
    if (!formData.anonymous) {
      if (!formData.firstName) {
        newErrors.firstName = 'First name is required'
      }
      if (!formData.lastName) {
        newErrors.lastName = 'Last name is required'
      }
    }

    // Amount validation
    if (!formData.amount) {
      newErrors.amount = 'Donation amount is required'
    } else if (!validateAmount(formData.amount, minAmount, maxAmount)) {
      newErrors.amount = `Amount must be between $${minAmount} and $${maxAmount}`
    }

    // Message length validation
    if (formData.message && formData.message.length > 500) {
      newErrors.message = 'Message must be 500 characters or less'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData, minAmount, maxAmount])

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    
    if (isSubmitting) return

    setSubmitAttempts(prev => prev + 1)

    if (!validateForm()) {
      onError?.('Please correct the errors in the form')
      return
    }

    setIsSubmitting(true)

    try {
      // Process payment
      const paymentResult = await processPayment({
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        paymentMethod: formData.paymentMethod,
        customerEmail: formData.email
      })

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment processing failed')
      }

      // Record donation in database
      const donation = await recordDonation({
        campaignId,
        donorEmail: formData.email,
        donorName: formData.anonymous ? null : `${formData.firstName} ${formData.lastName}`,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        message: formData.message,
        anonymous: formData.anonymous,
        paymentId: paymentResult.paymentId,
        paymentMethod: formData.paymentMethod
      })

      // Send confirmation email
      await sendConfirmationEmail({
        email: formData.email,
        donationId: donation.id,
        amount: formData.amount,
        currency: formData.currency,
        campaignId
      })

      // Reset form on success
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        amount: '',
        currency: currencies[0],
        anonymous: false,
        message: '',
        paymentMethod: 'card'
      })

      setSubmitAttempts(0)
      onSuccess?.(donation)

    } catch (error) {
      console.error('Donation submission error:', error)
      onError?.(error.message || 'Failed to process donation')
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, campaignId, validateForm, onSuccess, onError, currencies, isSubmitting])

  // Rate limiting - prevent spam submissions
  const isRateLimited = submitAttempts >= 3

  return (
    <form 
      onSubmit={handleSubmit}
      className={`donor-form ${theme}`}
      data-testid="donor-form"
      noValidate
    >
      <div className="form-header">
        <h2>Make a Donation</h2>
        <p>Your support makes a difference</p>
      </div>

      {/* Email field */}
      <div className="form-group">
        <label htmlFor="email">
          Email Address *
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          className={errors.email ? 'error' : ''}
          data-testid="email-input"
          required
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && (
          <div id="email-error" className="error-message" data-testid="email-error">
            {errors.email}
          </div>
        )}
      </div>

      {/* Anonymous donation toggle */}
      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.anonymous}
            onChange={(e) => handleInputChange('anonymous', e.target.checked)}
            data-testid="anonymous-checkbox"
          />
          Make this an anonymous donation
        </label>
      </div>

      {/* Name fields (hidden if anonymous) */}
      {!formData.anonymous && (
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="firstName">
              First Name *
            </label>
            <input
              id="firstName"
              type="text"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              className={errors.firstName ? 'error' : ''}
              data-testid="firstName-input"
              required={!formData.anonymous}
            />
            {errors.firstName && (
              <div className="error-message" data-testid="firstName-error">
                {errors.firstName}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="lastName">
              Last Name *
            </label>
            <input
              id="lastName"
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              className={errors.lastName ? 'error' : ''}
              data-testid="lastName-input"
              required={!formData.anonymous}
            />
            {errors.lastName && (
              <div className="error-message" data-testid="lastName-error">
                {errors.lastName}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Amount and currency */}
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="amount">
            Donation Amount *
          </label>
          <input
            id="amount"
            type="number"
            min={minAmount}
            max={maxAmount}
            step="0.01"
            value={formData.amount}
            onChange={(e) => handleInputChange('amount', e.target.value)}
            className={errors.amount ? 'error' : ''}
            data-testid="amount-input"
            required
          />
          {errors.amount && (
            <div className="error-message" data-testid="amount-error">
              {errors.amount}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="currency">
            Currency
          </label>
          <select
            id="currency"
            value={formData.currency}
            onChange={(e) => handleInputChange('currency', e.target.value)}
            data-testid="currency-select"
          >
            {currencies.map(currency => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Payment method */}
      <div className="form-group">
        <label>Payment Method</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="paymentMethod"
              value="card"
              checked={formData.paymentMethod === 'card'}
              onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
              data-testid="payment-card"
            />
            Credit/Debit Card
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="paymentMethod"
              value="crypto"
              checked={formData.paymentMethod === 'crypto'}
              onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
              data-testid="payment-crypto"
            />
            Cryptocurrency
          </label>
        </div>
      </div>

      {/* Message */}
      <div className="form-group">
        <label htmlFor="message">
          Message (Optional)
        </label>
        <textarea
          id="message"
          value={formData.message}
          onChange={(e) => handleInputChange('message', e.target.value)}
          className={errors.message ? 'error' : ''}
          data-testid="message-textarea"
          maxLength={500}
          rows={3}
          placeholder="Leave a message with your donation..."
        />
        {errors.message && (
          <div className="error-message" data-testid="message-error">
            {errors.message}
          </div>
        )}
        <div className="character-count">
          {formData.message.length}/500
        </div>
      </div>

      {/* Submit button */}
      <div className="form-actions">
        <button
          type="submit"
          disabled={isSubmitting || isRateLimited}
          data-testid="submit-button"
          className={`submit-button ${isSubmitting ? 'loading' : ''}`}
        >
          {isSubmitting ? (
            <>
              <span className="spinner" />
              Processing...
            </>
          ) : (
            `Donate ${formData.amount ? `$${formData.amount}` : ''}`
          )}
        </button>

        {isRateLimited && (
          <div className="error-message" data-testid="rate-limit-error">
            Too many attempts. Please wait before trying again.
          </div>
        )}
      </div>

      <div className="form-footer">
        <p>Your donation is secure and encrypted.</p>
        <p>You will receive a confirmation email.</p>
      </div>
    </form>
  )
}

export default DonorForm