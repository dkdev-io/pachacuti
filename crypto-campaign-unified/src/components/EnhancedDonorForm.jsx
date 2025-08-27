import React, { useState, useCallback, useEffect, useRef } from 'react'
import { validateEmail, validateAmount, validateAddress, sanitizeInput } from '../utils/validation'
import { formatCurrency, formatAddress } from '../utils/formatting'
import { processPayment, verifyPayment } from '../services/payment'
import { recordDonation } from '../services/donations'
import { sendConfirmationEmail } from '../services/email'

/**
 * EnhancedDonorForm - Advanced donation form with compliance validation
 * Includes KYC, AML checks, tax reporting, and enhanced payment options
 */
export const EnhancedDonorForm = ({
  campaignId,
  onSuccess,
  onError,
  minAmount = 1,
  maxAmount = 50000,
  currencies = ['USD', 'EUR', 'GBP', 'ETH', 'BTC'],
  requireKyc = false,
  taxReporting = true,
  complianceLevel = 'standard', // 'basic', 'standard', 'strict'
  theme = 'light'
}) => {
  const [formData, setFormData] = useState({
    // Personal Information
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '',
    
    // Address Information
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    
    // Donation Details
    amount: '',
    currency: currencies[0],
    paymentMethod: 'card',
    walletAddress: '',
    
    // Compliance
    anonymous: false,
    taxDeductible: false,
    employerName: '',
    occupation: '',
    sourceOfFunds: 'personal_savings',
    
    // Communications
    message: '',
    subscribeUpdates: true,
    allowContact: false,
    
    // Legal Agreements
    agreeTerms: false,
    agreePrivacy: false,
    confirmAdult: false,
    confirmCapacity: false
  })

  const [errors, setErrors] = useState({})
  const [warnings, setWarnings] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [kycStatus, setKycStatus] = useState('not_required')
  const [amlFlags, setAmlFlags] = useState([])
  const [submitAttempts, setSubmitAttempts] = useState(0)
  const [paymentStatus, setPaymentStatus] = useState(null)
  const [verificationRequired, setVerificationRequired] = useState(false)

  const formRef = useRef()
  const maxSubmitAttempts = 3

  // Compliance thresholds
  const complianceThresholds = {
    basic: { kyc: 1000, aml: 5000, reporting: 10000 },
    standard: { kyc: 500, aml: 2000, reporting: 1000 },
    strict: { kyc: 100, aml: 500, reporting: 100 }
  }

  const sourceOfFundsOptions = [
    { value: 'personal_savings', label: 'Personal Savings' },
    { value: 'salary_wages', label: 'Salary/Wages' },
    { value: 'investment_income', label: 'Investment Income' },
    { value: 'business_income', label: 'Business Income' },
    { value: 'inheritance', label: 'Inheritance' },
    { value: 'gift', label: 'Gift' },
    { value: 'other', label: 'Other' }
  ]

  // Handle input changes with enhanced validation
  const handleInputChange = useCallback((field, value) => {
    let sanitizedValue = value

    // Sanitize string inputs
    if (typeof value === 'string') {
      sanitizedValue = sanitizeInput(value)
    }

    setFormData(prev => ({
      ...prev,
      [field]: sanitizedValue
    }))

    // Clear field errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }

    // Real-time validation for critical fields
    if (field === 'email' && sanitizedValue) {
      if (!validateEmail(sanitizedValue)) {
        setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }))
      }
    }

    if (field === 'amount' && sanitizedValue) {
      const amount = parseFloat(sanitizedValue)
      if (!validateAmount(sanitizedValue, minAmount, maxAmount)) {
        setErrors(prev => ({ ...prev, amount: `Amount must be between ${formatCurrency(minAmount)} and ${formatCurrency(maxAmount)}` }))
      } else {
        // Check compliance thresholds
        checkComplianceRequirements(amount)
      }
    }

    if (field === 'walletAddress' && sanitizedValue) {
      if (!validateAddress(sanitizedValue)) {
        setErrors(prev => ({ ...prev, walletAddress: 'Please enter a valid wallet address' }))
      }
    }
  }, [errors, minAmount, maxAmount])

  // Check compliance requirements based on donation amount
  const checkComplianceRequirements = useCallback((amount) => {
    const thresholds = complianceThresholds[complianceLevel]
    const newWarnings = {}

    // KYC requirements
    if (amount >= thresholds.kyc || requireKyc) {
      setKycStatus('required')
      if (!formData.firstName || !formData.lastName || !formData.dateOfBirth) {
        newWarnings.kyc = 'Additional identity verification will be required for this donation amount'
      }
    } else {
      setKycStatus('not_required')
    }

    // Tax reporting requirements
    if (amount >= thresholds.reporting && taxReporting) {
      if (!formData.addressLine1 || !formData.city || !formData.country) {
        newWarnings.reporting = 'Address information required for tax reporting'
      }
    }

    // AML screening
    if (amount >= thresholds.aml) {
      if (!formData.occupation || !formData.sourceOfFunds) {
        newWarnings.aml = 'Source of funds verification required for large donations'
      }
    }

    setWarnings(newWarnings)
  }, [complianceLevel, requireKyc, taxReporting, formData])

  // Enhanced form validation with compliance checks
  const validateForm = useCallback(() => {
    const newErrors = {}

    // Basic validation
    if (!formData.email || !validateEmail(formData.email)) {
      newErrors.email = 'Valid email address is required'
    }

    if (!formData.amount || !validateAmount(formData.amount, minAmount, maxAmount)) {
      newErrors.amount = `Donation amount must be between ${formatCurrency(minAmount)} and ${formatCurrency(maxAmount)}`
    }

    // Identity requirements
    if (!formData.anonymous) {
      if (!formData.firstName) newErrors.firstName = 'First name is required'
      if (!formData.lastName) newErrors.lastName = 'Last name is required'
    }

    // KYC requirements
    if (kycStatus === 'required') {
      if (!formData.firstName) newErrors.firstName = 'First name is required for identity verification'
      if (!formData.lastName) newErrors.lastName = 'Last name is required for identity verification'
      if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required for identity verification'
      if (!formData.phone) newErrors.phone = 'Phone number is required for identity verification'
    }

    // Address requirements for tax reporting
    const amount = parseFloat(formData.amount)
    if (amount >= complianceThresholds[complianceLevel].reporting && taxReporting) {
      if (!formData.addressLine1) newErrors.addressLine1 = 'Address is required for tax reporting'
      if (!formData.city) newErrors.city = 'City is required for tax reporting'
      if (!formData.country) newErrors.country = 'Country is required for tax reporting'
      if (!formData.zipCode) newErrors.zipCode = 'ZIP/Postal code is required for tax reporting'
    }

    // AML requirements
    if (amount >= complianceThresholds[complianceLevel].aml) {
      if (!formData.occupation) newErrors.occupation = 'Occupation is required for large donations'
      if (!formData.sourceOfFunds) newErrors.sourceOfFunds = 'Source of funds is required for large donations'
    }

    // Crypto-specific validation
    if (formData.paymentMethod === 'crypto' && !validateAddress(formData.walletAddress)) {
      newErrors.walletAddress = 'Valid wallet address is required for crypto donations'
    }

    // Legal agreements
    if (!formData.agreeTerms) newErrors.agreeTerms = 'You must agree to the terms and conditions'
    if (!formData.agreePrivacy) newErrors.agreePrivacy = 'You must agree to the privacy policy'
    if (!formData.confirmAdult) newErrors.confirmAdult = 'You must confirm you are 18 or older'
    if (!formData.confirmCapacity) newErrors.confirmCapacity = 'You must confirm legal capacity to make this donation'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData, minAmount, maxAmount, kycStatus, complianceLevel, taxReporting])

  // Enhanced AML screening
  const performAmlScreening = useCallback(async () => {
    const flags = []

    // Check for suspicious patterns
    const amount = parseFloat(formData.amount)
    
    // Large round amounts
    if (amount >= 10000 && amount % 1000 === 0) {
      flags.push({ type: 'pattern', message: 'Large round amount detected' })
    }

    // Rapid successive donations (would need session/database check)
    if (submitAttempts > 1) {
      flags.push({ type: 'behavior', message: 'Multiple submission attempts' })
    }

    // Geographic risk (simplified check)
    const highRiskCountries = ['XX', 'YY'] // Would be actual country codes
    if (highRiskCountries.includes(formData.country)) {
      flags.push({ type: 'geographic', message: 'High-risk jurisdiction' })
    }

    setAmlFlags(flags)
    return flags.length === 0
  }, [formData, submitAttempts])

  // Submit form with enhanced processing
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    
    if (isSubmitting) return

    setSubmitAttempts(prev => prev + 1)

    if (submitAttempts >= maxSubmitAttempts) {
      setErrors(prev => ({ ...prev, submit: 'Maximum submission attempts exceeded. Please contact support.' }))
      return
    }

    if (!validateForm()) {
      onError?.('Please correct all errors before submitting')
      return
    }

    setIsSubmitting(true)
    setPaymentStatus('processing')

    try {
      // Perform AML screening
      const amlClear = await performAmlScreening()
      if (!amlClear) {
        setVerificationRequired(true)
        setPaymentStatus('verification_required')
        throw new Error('Additional verification required. Our team will contact you shortly.')
      }

      // Process payment
      const paymentData = {
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        paymentMethod: formData.paymentMethod,
        customerEmail: formData.email,
        walletAddress: formData.walletAddress,
        compliance: {
          kycRequired: kycStatus === 'required',
          amlFlags,
          complianceLevel
        }
      }

      const paymentResult = await processPayment(paymentData)
      
      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment processing failed')
      }

      setPaymentStatus('completed')

      // Record donation with compliance data
      const donation = await recordDonation({
        campaignId,
        donorEmail: formData.email,
        donorName: formData.anonymous ? null : `${formData.firstName} ${formData.lastName}`,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        paymentMethod: formData.paymentMethod,
        paymentId: paymentResult.paymentId,
        message: formData.message,
        anonymous: formData.anonymous,
        compliance: {
          kycStatus,
          amlFlags,
          sourceOfFunds: formData.sourceOfFunds,
          taxDeductible: formData.taxDeductible,
          complianceLevel
        },
        contactInfo: {
          phone: formData.phone,
          address: {
            line1: formData.addressLine1,
            line2: formData.addressLine2,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zipCode,
            country: formData.country
          }
        }
      })

      // Send confirmation email
      await sendConfirmationEmail({
        email: formData.email,
        donationId: donation.id,
        amount: formData.amount,
        currency: formData.currency,
        campaignId,
        taxDeductible: formData.taxDeductible
      })

      // Reset form
      setFormData({
        email: '', firstName: '', lastName: '', phone: '', dateOfBirth: '',
        addressLine1: '', addressLine2: '', city: '', state: '', zipCode: '', country: '',
        amount: '', currency: currencies[0], paymentMethod: 'card', walletAddress: '',
        anonymous: false, taxDeductible: false, employerName: '', occupation: '',
        sourceOfFunds: 'personal_savings', message: '', subscribeUpdates: true, allowContact: false,
        agreeTerms: false, agreePrivacy: false, confirmAdult: false, confirmCapacity: false
      })

      setSubmitAttempts(0)
      setPaymentStatus(null)
      onSuccess?.(donation)

    } catch (error) {
      console.error('Enhanced donation submission error:', error)
      setPaymentStatus('failed')
      onError?.(error.message || 'Failed to process donation')
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, campaignId, currencies, isSubmitting, submitAttempts, validateForm, performAmlScreening, kycStatus, amlFlags, complianceLevel, onSuccess, onError])

  return (
    <div className={`enhanced-donor-form ${theme}`} data-testid="enhanced-donor-form">
      <form ref={formRef} onSubmit={handleSubmit} className="enhanced-form" noValidate>
        <div className="form-header">
          <h2>Secure Donation Form</h2>
          <div className="compliance-badge">
            <span>Compliance Level: {complianceLevel.toUpperCase()}</span>
            {kycStatus === 'required' && <span className="kyc-required">KYC Required</span>}
          </div>
        </div>

        {/* Payment Status */}
        {paymentStatus && (
          <div className={`payment-status ${paymentStatus}`} data-testid="payment-status">
            {paymentStatus === 'processing' && (
              <div className="status-processing">
                <span className="spinner" />
                Processing your donation...
              </div>
            )}
            {paymentStatus === 'verification_required' && (
              <div className="status-verification">
                <span className="warning-icon">⚠️</span>
                Additional verification required
              </div>
            )}
            {paymentStatus === 'completed' && (
              <div className="status-completed">
                <span className="check-icon">✅</span>
                Donation processed successfully!
              </div>
            )}
            {paymentStatus === 'failed' && (
              <div className="status-failed">
                <span className="error-icon">❌</span>
                Payment failed. Please try again.
              </div>
            )}
          </div>
        )}

        {/* Warnings */}
        {Object.keys(warnings).length > 0 && (
          <div className="warnings-section" data-testid="warnings-section">
            {Object.entries(warnings).map(([key, warning]) => (
              <div key={key} className="warning-message">
                <span className="warning-icon">⚠️</span>
                {warning}
              </div>
            ))}
          </div>
        )}

        {/* Contact Information */}
        <fieldset className="form-section">
          <legend>Contact Information</legend>
          
          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={errors.email ? 'error' : ''}
              data-testid="email-input"
              required
              autoComplete="email"
            />
            {errors.email && (
              <div className="error-message" data-testid="email-error">
                {errors.email}
              </div>
            )}
          </div>

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

          {!formData.anonymous && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">First Name *</label>
                <input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className={errors.firstName ? 'error' : ''}
                  data-testid="firstName-input"
                  required={!formData.anonymous}
                  autoComplete="given-name"
                />
                {errors.firstName && (
                  <div className="error-message" data-testid="firstName-error">
                    {errors.firstName}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Last Name *</label>
                <input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className={errors.lastName ? 'error' : ''}
                  data-testid="lastName-input"
                  required={!formData.anonymous}
                  autoComplete="family-name"
                />
                {errors.lastName && (
                  <div className="error-message" data-testid="lastName-error">
                    {errors.lastName}
                  </div>
                )}
              </div>
            </div>
          )}

          {kycStatus === 'required' && (
            <>
              <div className="form-group">
                <label htmlFor="phone">Phone Number *</label>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={errors.phone ? 'error' : ''}
                  data-testid="phone-input"
                  required
                  autoComplete="tel"
                />
                {errors.phone && (
                  <div className="error-message" data-testid="phone-error">
                    {errors.phone}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="dateOfBirth">Date of Birth *</label>
                <input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  className={errors.dateOfBirth ? 'error' : ''}
                  data-testid="dateOfBirth-input"
                  required
                  max={new Date(Date.now() - 18 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                />
                {errors.dateOfBirth && (
                  <div className="error-message" data-testid="dateOfBirth-error">
                    {errors.dateOfBirth}
                  </div>
                )}
              </div>
            </>
          )}
        </fieldset>

        {/* Address Information */}
        {(parseFloat(formData.amount) >= complianceThresholds[complianceLevel].reporting && taxReporting) && (
          <fieldset className="form-section">
            <legend>Address Information (Required for Tax Reporting)</legend>
            
            <div className="form-group">
              <label htmlFor="addressLine1">Address Line 1 *</label>
              <input
                id="addressLine1"
                type="text"
                value={formData.addressLine1}
                onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                className={errors.addressLine1 ? 'error' : ''}
                data-testid="addressLine1-input"
                required
                autoComplete="address-line1"
              />
              {errors.addressLine1 && (
                <div className="error-message" data-testid="addressLine1-error">
                  {errors.addressLine1}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="addressLine2">Address Line 2</label>
              <input
                id="addressLine2"
                type="text"
                value={formData.addressLine2}
                onChange={(e) => handleInputChange('addressLine2', e.target.value)}
                data-testid="addressLine2-input"
                autoComplete="address-line2"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">City *</label>
                <input
                  id="city"
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className={errors.city ? 'error' : ''}
                  data-testid="city-input"
                  required
                  autoComplete="address-level2"
                />
                {errors.city && (
                  <div className="error-message" data-testid="city-error">
                    {errors.city}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="state">State/Province</label>
                <input
                  id="state"
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  data-testid="state-input"
                  autoComplete="address-level1"
                />
              </div>

              <div className="form-group">
                <label htmlFor="zipCode">ZIP/Postal Code *</label>
                <input
                  id="zipCode"
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  className={errors.zipCode ? 'error' : ''}
                  data-testid="zipCode-input"
                  required
                  autoComplete="postal-code"
                />
                {errors.zipCode && (
                  <div className="error-message" data-testid="zipCode-error">
                    {errors.zipCode}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="country">Country *</label>
              <select
                id="country"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                className={errors.country ? 'error' : ''}
                data-testid="country-select"
                required
                autoComplete="country"
              >
                <option value="">Select Country</option>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="AU">Australia</option>
                {/* Add more countries */}
              </select>
              {errors.country && (
                <div className="error-message" data-testid="country-error">
                  {errors.country}
                </div>
              )}
            </div>
          </fieldset>
        )}

        {/* Donation Details */}
        <fieldset className="form-section">
          <legend>Donation Details</legend>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="amount">Donation Amount *</label>
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
              <label htmlFor="currency">Currency</label>
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
                  value="bank"
                  checked={formData.paymentMethod === 'bank'}
                  onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                  data-testid="payment-bank"
                />
                Bank Transfer
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

          {formData.paymentMethod === 'crypto' && (
            <div className="form-group">
              <label htmlFor="walletAddress">Your Wallet Address *</label>
              <input
                id="walletAddress"
                type="text"
                value={formData.walletAddress}
                onChange={(e) => handleInputChange('walletAddress', e.target.value)}
                className={errors.walletAddress ? 'error' : ''}
                data-testid="walletAddress-input"
                placeholder="0x..."
                required
              />
              {errors.walletAddress && (
                <div className="error-message" data-testid="walletAddress-error">
                  {errors.walletAddress}
                </div>
              )}
              <div className="help-text">
                Your wallet address for receiving any potential refunds
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.taxDeductible}
                onChange={(e) => handleInputChange('taxDeductible', e.target.checked)}
                data-testid="taxDeductible-checkbox"
              />
              I would like this donation to be tax-deductible (where applicable)
            </label>
          </div>
        </fieldset>

        {/* Compliance Information */}
        {parseFloat(formData.amount) >= complianceThresholds[complianceLevel].aml && (
          <fieldset className="form-section">
            <legend>Compliance Information</legend>
            
            <div className="form-group">
              <label htmlFor="occupation">Occupation *</label>
              <input
                id="occupation"
                type="text"
                value={formData.occupation}
                onChange={(e) => handleInputChange('occupation', e.target.value)}
                className={errors.occupation ? 'error' : ''}
                data-testid="occupation-input"
                required
                autoComplete="organization-title"
              />
              {errors.occupation && (
                <div className="error-message" data-testid="occupation-error">
                  {errors.occupation}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="employerName">Employer Name</label>
              <input
                id="employerName"
                type="text"
                value={formData.employerName}
                onChange={(e) => handleInputChange('employerName', e.target.value)}
                data-testid="employerName-input"
                autoComplete="organization"
              />
            </div>

            <div className="form-group">
              <label htmlFor="sourceOfFunds">Source of Funds *</label>
              <select
                id="sourceOfFunds"
                value={formData.sourceOfFunds}
                onChange={(e) => handleInputChange('sourceOfFunds', e.target.value)}
                className={errors.sourceOfFunds ? 'error' : ''}
                data-testid="sourceOfFunds-select"
                required
              >
                {sourceOfFundsOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.sourceOfFunds && (
                <div className="error-message" data-testid="sourceOfFunds-error">
                  {errors.sourceOfFunds}
                </div>
              )}
            </div>
          </fieldset>
        )}

        {/* Message */}
        <fieldset className="form-section">
          <legend>Message (Optional)</legend>
          
          <div className="form-group">
            <label htmlFor="message">Leave a Message</label>
            <textarea
              id="message"
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              data-testid="message-textarea"
              rows={4}
              maxLength={1000}
              placeholder="Share why this cause matters to you..."
            />
            <div className="character-count">
              {formData.message.length}/1000
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.subscribeUpdates}
                onChange={(e) => handleInputChange('subscribeUpdates', e.target.checked)}
                data-testid="subscribeUpdates-checkbox"
              />
              Subscribe to campaign updates
            </label>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.allowContact}
                onChange={(e) => handleInputChange('allowContact', e.target.checked)}
                data-testid="allowContact-checkbox"
              />
              Allow the campaign organizer to contact me
            </label>
          </div>
        </fieldset>

        {/* Legal Agreements */}
        <fieldset className="form-section">
          <legend>Legal Agreements</legend>
          
          <div className="form-group">
            <label className="checkbox-label required">
              <input
                type="checkbox"
                checked={formData.agreeTerms}
                onChange={(e) => handleInputChange('agreeTerms', e.target.checked)}
                className={errors.agreeTerms ? 'error' : ''}
                data-testid="agreeTerms-checkbox"
                required
              />
              I agree to the <a href="/terms" target="_blank">Terms and Conditions</a> *
            </label>
            {errors.agreeTerms && (
              <div className="error-message" data-testid="agreeTerms-error">
                {errors.agreeTerms}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="checkbox-label required">
              <input
                type="checkbox"
                checked={formData.agreePrivacy}
                onChange={(e) => handleInputChange('agreePrivacy', e.target.checked)}
                className={errors.agreePrivacy ? 'error' : ''}
                data-testid="agreePrivacy-checkbox"
                required
              />
              I agree to the <a href="/privacy" target="_blank">Privacy Policy</a> *
            </label>
            {errors.agreePrivacy && (
              <div className="error-message" data-testid="agreePrivacy-error">
                {errors.agreePrivacy}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="checkbox-label required">
              <input
                type="checkbox"
                checked={formData.confirmAdult}
                onChange={(e) => handleInputChange('confirmAdult', e.target.checked)}
                className={errors.confirmAdult ? 'error' : ''}
                data-testid="confirmAdult-checkbox"
                required
              />
              I confirm that I am 18 years of age or older *
            </label>
            {errors.confirmAdult && (
              <div className="error-message" data-testid="confirmAdult-error">
                {errors.confirmAdult}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="checkbox-label required">
              <input
                type="checkbox"
                checked={formData.confirmCapacity}
                onChange={(e) => handleInputChange('confirmCapacity', e.target.checked)}
                className={errors.confirmCapacity ? 'error' : ''}
                data-testid="confirmCapacity-checkbox"
                required
              />
              I confirm that I have the legal capacity to make this donation *
            </label>
            {errors.confirmCapacity && (
              <div className="error-message" data-testid="confirmCapacity-error">
                {errors.confirmCapacity}
              </div>
            )}
          </div>
        </fieldset>

        {/* Submit Button */}
        <div className="form-actions">
          <button
            type="submit"
            disabled={isSubmitting || (submitAttempts >= maxSubmitAttempts)}
            data-testid="submit-button"
            className={`submit-button ${isSubmitting ? 'loading' : ''}`}
          >
            {isSubmitting ? (
              <>
                <span className="spinner" />
                Processing Secure Donation...
              </>
            ) : (
              `Donate ${formData.amount ? formatCurrency(parseFloat(formData.amount), formData.currency) : ''}`
            )}
          </button>

          {submitAttempts >= maxSubmitAttempts && (
            <div className="error-message" data-testid="max-attempts-error">
              Maximum submission attempts exceeded. Please contact support.
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="security-notice">
          <div className="security-badges">
            <span className="badge ssl">🔒 SSL Secured</span>
            <span className="badge compliance">✅ Compliant</span>
            <span className="badge encrypted">🛡️ Encrypted</span>
          </div>
          <p>
            Your information is protected with bank-level security and encryption.
            All donations are processed through secure, compliant payment systems.
          </p>
        </div>
      </form>
    </div>
  )
}

export default EnhancedDonorForm