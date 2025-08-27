import React, { useState, useCallback, useEffect } from 'react'
import { validateCampaignTitle, validateCampaignDescription, validateDateRange, validateAmount, validateUrl, sanitizeInput } from '../utils/validation'
import { createCampaign } from '../services/campaigns'
import { uploadImage } from '../services/storage'

/**
 * SetupWizard - Multi-step campaign creation workflow
 * Handles campaign setup with validation, image upload, and preview
 */
export const SetupWizard = ({
  onComplete,
  onCancel,
  onError,
  onStepChange,
  initialData = {},
  theme = 'light'
}) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  
  const [formData, setFormData] = useState({
    // Basic Information
    title: initialData.title || '',
    description: initialData.description || '',
    category: initialData.category || 'general',
    
    // Financial Goals
    targetAmount: initialData.targetAmount || '',
    currency: initialData.currency || 'USD',
    acceptCrypto: initialData.acceptCrypto || false,
    acceptedTokens: initialData.acceptedTokens || ['ETH'],
    
    // Timeline
    startDate: initialData.startDate || '',
    endDate: initialData.endDate || '',
    
    // Media and Content
    coverImage: initialData.coverImage || null,
    coverImageUrl: initialData.coverImageUrl || '',
    gallery: initialData.gallery || [],
    videoUrl: initialData.videoUrl || '',
    
    // Campaign Details
    story: initialData.story || '',
    rewards: initialData.rewards || [],
    updates: initialData.updates || [],
    
    // Settings
    isPublic: initialData.isPublic !== false, // Default to public
    allowComments: initialData.allowComments !== false,
    emailUpdates: initialData.emailUpdates !== false,
    socialSharing: initialData.socialSharing !== false
  })

  const steps = [
    {
      id: 'basic',
      title: 'Basic Information',
      description: 'Tell us about your campaign',
      fields: ['title', 'description', 'category']
    },
    {
      id: 'financial',
      title: 'Financial Goals',
      description: 'Set your funding targets and payment options',
      fields: ['targetAmount', 'currency', 'acceptCrypto', 'acceptedTokens']
    },
    {
      id: 'timeline',
      title: 'Campaign Timeline',
      description: 'When will your campaign run?',
      fields: ['startDate', 'endDate']
    },
    {
      id: 'media',
      title: 'Media & Content',
      description: 'Add images and videos to showcase your campaign',
      fields: ['coverImage', 'gallery', 'videoUrl']
    },
    {
      id: 'story',
      title: 'Your Story',
      description: 'Share the details of your campaign',
      fields: ['story', 'rewards']
    },
    {
      id: 'settings',
      title: 'Campaign Settings',
      description: 'Configure privacy and engagement options',
      fields: ['isPublic', 'allowComments', 'emailUpdates', 'socialSharing']
    },
    {
      id: 'preview',
      title: 'Review & Launch',
      description: 'Review your campaign before publishing',
      fields: []
    }
  ]

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'charity', label: 'Charity' },
    { value: 'medical', label: 'Medical' },
    { value: 'education', label: 'Education' },
    { value: 'business', label: 'Business' },
    { value: 'creative', label: 'Creative Projects' },
    { value: 'sports', label: 'Sports' },
    { value: 'community', label: 'Community' },
    { value: 'environmental', label: 'Environmental' },
    { value: 'other', label: 'Other' }
  ]

  const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
  const cryptoTokens = ['ETH', 'BTC', 'USDC', 'USDT', 'DAI']

  // Handle input changes with sanitization
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

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }))
    }
  }, [errors])

  // Handle array field changes (for rewards, gallery, etc.)
  const handleArrayChange = useCallback((field, index, value) => {
    setFormData(prev => {
      const newArray = [...prev[field]]
      if (index >= newArray.length) {
        newArray.push(value)
      } else {
        newArray[index] = value
      }
      return {
        ...prev,
        [field]: newArray
      }
    })
  }, [])

  const handleArrayRemove = useCallback((field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }))
  }, [])

  // Handle image upload
  const handleImageUpload = useCallback(async (field, file) => {
    if (!file) return

    // Validate file type and size
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const maxSize = 10 * 1024 * 1024 // 10MB

    if (!validTypes.includes(file.type)) {
      setErrors(prev => ({
        ...prev,
        [field]: 'Please upload a valid image file (JPEG, PNG, GIF, or WebP)'
      }))
      return
    }

    if (file.size > maxSize) {
      setErrors(prev => ({
        ...prev,
        [field]: 'Image file size must be less than 10MB'
      }))
      return
    }

    try {
      // Create preview URL
      const previewUrl = URL.createObjectURL(file)
      
      setFormData(prev => ({
        ...prev,
        [field]: file,
        [`${field}Url`]: previewUrl
      }))

      setErrors(prev => ({ ...prev, [field]: null }))
    } catch (error) {
      console.error('Error handling image upload:', error)
      setErrors(prev => ({
        ...prev,
        [field]: 'Failed to process image'
      }))
    }
  }, [])

  // Validate current step
  const validateStep = useCallback((stepIndex) => {
    const step = steps[stepIndex]
    const stepErrors = {}

    switch (step.id) {
      case 'basic':
        const titleValidation = validateCampaignTitle(formData.title)
        if (!titleValidation.valid) {
          stepErrors.title = titleValidation.errors[0]
        }

        const descValidation = validateCampaignDescription(formData.description)
        if (!descValidation.valid) {
          stepErrors.description = descValidation.errors[0]
        }

        if (!formData.category) {
          stepErrors.category = 'Please select a category'
        }
        break

      case 'financial':
        if (!validateAmount(formData.targetAmount, 100, 1000000)) {
          stepErrors.targetAmount = 'Target amount must be between $100 and $1,000,000'
        }

        if (!formData.currency) {
          stepErrors.currency = 'Please select a currency'
        }

        if (formData.acceptCrypto && formData.acceptedTokens.length === 0) {
          stepErrors.acceptedTokens = 'Please select at least one cryptocurrency'
        }
        break

      case 'timeline':
        if (!formData.startDate) {
          stepErrors.startDate = 'Start date is required'
        }

        if (!formData.endDate) {
          stepErrors.endDate = 'End date is required'
        }

        if (formData.startDate && formData.endDate) {
          const dateValidation = validateDateRange(formData.startDate, formData.endDate)
          if (!dateValidation.valid) {
            stepErrors.endDate = dateValidation.errors[0]
          }
        }
        break

      case 'media':
        if (!formData.coverImage && !formData.coverImageUrl) {
          stepErrors.coverImage = 'Cover image is required'
        }

        if (formData.videoUrl && !validateUrl(formData.videoUrl)) {
          stepErrors.videoUrl = 'Please enter a valid video URL'
        }
        break

      case 'story':
        if (!formData.story || formData.story.length < 50) {
          stepErrors.story = 'Campaign story must be at least 50 characters'
        }
        break

      default:
        break
    }

    setErrors(prev => ({ ...prev, ...stepErrors }))
    return Object.keys(stepErrors).length === 0
  }, [formData, steps])

  // Navigate to next step
  const nextStep = useCallback(() => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length - 1) {
        const newStep = currentStep + 1
        setCurrentStep(newStep)
        onStepChange?.(newStep, steps[newStep])
      }
    }
  }, [currentStep, steps.length, validateStep, onStepChange])

  // Navigate to previous step
  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      const newStep = currentStep - 1
      setCurrentStep(newStep)
      onStepChange?.(newStep, steps[newStep])
    }
  }, [currentStep, onStepChange])

  // Jump to specific step
  const goToStep = useCallback((stepIndex) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(stepIndex)
      onStepChange?.(stepIndex, steps[stepIndex])
    }
  }, [steps, onStepChange])

  // Submit campaign
  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return

    // Validate all steps
    let allValid = true
    for (let i = 0; i < steps.length - 1; i++) {
      if (!validateStep(i)) {
        allValid = false
      }
    }

    if (!allValid) {
      setCurrentStep(0) // Go to first step with errors
      onError?.('Please correct all errors before submitting')
      return
    }

    setIsSubmitting(true)

    try {
      let coverImageUrl = formData.coverImageUrl

      // Upload cover image if it's a file
      if (formData.coverImage instanceof File) {
        const uploadResult = await uploadImage(formData.coverImage, 'campaign-covers')
        coverImageUrl = uploadResult.url
      }

      // Upload gallery images
      const galleryUrls = []
      for (const image of formData.gallery) {
        if (image instanceof File) {
          const uploadResult = await uploadImage(image, 'campaign-gallery')
          galleryUrls.push(uploadResult.url)
        } else if (typeof image === 'string') {
          galleryUrls.push(image)
        }
      }

      // Prepare campaign data
      const campaignData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        targetAmount: parseFloat(formData.targetAmount),
        currency: formData.currency,
        acceptCrypto: formData.acceptCrypto,
        acceptedTokens: formData.acceptedTokens,
        startDate: formData.startDate,
        endDate: formData.endDate,
        coverImageUrl,
        galleryUrls,
        videoUrl: formData.videoUrl,
        story: formData.story,
        rewards: formData.rewards,
        isPublic: formData.isPublic,
        allowComments: formData.allowComments,
        emailUpdates: formData.emailUpdates,
        socialSharing: formData.socialSharing
      }

      const result = await createCampaign(campaignData)
      onComplete?.(result)

    } catch (error) {
      console.error('Error creating campaign:', error)
      onError?.(error.message || 'Failed to create campaign')
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, isSubmitting, validateStep, steps.length, onComplete, onError])

  // Progress calculation
  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <div className={`setup-wizard ${theme}`} data-testid="setup-wizard">
      {/* Header */}
      <div className="wizard-header">
        <h1>Create Your Campaign</h1>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
            data-testid="progress-bar"
          />
        </div>
        <div className="step-info">
          Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
        </div>
      </div>

      {/* Step Navigation */}
      <div className="step-navigation" data-testid="step-navigation">
        {steps.map((step, index) => (
          <button
            key={step.id}
            className={`step-button ${index <= currentStep ? 'active' : ''} ${index === currentStep ? 'current' : ''}`}
            onClick={() => goToStep(index)}
            data-testid={`step-${index}`}
            disabled={index > currentStep + 1}
          >
            <div className="step-number">{index + 1}</div>
            <div className="step-title">{step.title}</div>
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div className="step-content" data-testid="step-content">
        <div className="step-header">
          <h2>{steps[currentStep].title}</h2>
          <p>{steps[currentStep].description}</p>
        </div>

        {/* Basic Information Step */}
        {currentStep === 0 && (
          <div className="basic-info-step" data-testid="basic-info-step">
            <div className="form-group">
              <label htmlFor="title">Campaign Title *</label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={errors.title ? 'error' : ''}
                data-testid="title-input"
                maxLength={100}
                placeholder="Give your campaign a compelling title"
              />
              {errors.title && (
                <div className="error-message" data-testid="title-error">
                  {errors.title}
                </div>
              )}
              <div className="character-count">{formData.title.length}/100</div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Short Description *</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={errors.description ? 'error' : ''}
                data-testid="description-textarea"
                rows={4}
                maxLength={500}
                placeholder="Briefly describe what your campaign is about"
              />
              {errors.description && (
                <div className="error-message" data-testid="description-error">
                  {errors.description}
                </div>
              )}
              <div className="character-count">{formData.description.length}/500</div>
            </div>

            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className={errors.category ? 'error' : ''}
                data-testid="category-select"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              {errors.category && (
                <div className="error-message" data-testid="category-error">
                  {errors.category}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Financial Goals Step */}
        {currentStep === 1 && (
          <div className="financial-step" data-testid="financial-step">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="targetAmount">Target Amount *</label>
                <input
                  id="targetAmount"
                  type="number"
                  min="100"
                  max="1000000"
                  value={formData.targetAmount}
                  onChange={(e) => handleInputChange('targetAmount', e.target.value)}
                  className={errors.targetAmount ? 'error' : ''}
                  data-testid="target-amount-input"
                  placeholder="10000"
                />
                {errors.targetAmount && (
                  <div className="error-message" data-testid="target-amount-error">
                    {errors.targetAmount}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="currency">Currency *</label>
                <select
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  data-testid="currency-select"
                >
                  {currencies.map(curr => (
                    <option key={curr} value={curr}>
                      {curr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.acceptCrypto}
                  onChange={(e) => handleInputChange('acceptCrypto', e.target.checked)}
                  data-testid="accept-crypto-checkbox"
                />
                Accept cryptocurrency donations
              </label>
            </div>

            {formData.acceptCrypto && (
              <div className="form-group">
                <label>Accepted Cryptocurrencies *</label>
                <div className="token-checkboxes">
                  {cryptoTokens.map(token => (
                    <label key={token} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.acceptedTokens.includes(token)}
                        onChange={(e) => {
                          const newTokens = e.target.checked
                            ? [...formData.acceptedTokens, token]
                            : formData.acceptedTokens.filter(t => t !== token)
                          handleInputChange('acceptedTokens', newTokens)
                        }}
                        data-testid={`token-${token.toLowerCase()}`}
                      />
                      {token}
                    </label>
                  ))}
                </div>
                {errors.acceptedTokens && (
                  <div className="error-message" data-testid="accepted-tokens-error">
                    {errors.acceptedTokens}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Timeline Step */}
        {currentStep === 2 && (
          <div className="timeline-step" data-testid="timeline-step">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startDate">Start Date *</label>
                <input
                  id="startDate"
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className={errors.startDate ? 'error' : ''}
                  data-testid="start-date-input"
                  min={new Date().toISOString().slice(0, 16)}
                />
                {errors.startDate && (
                  <div className="error-message" data-testid="start-date-error">
                    {errors.startDate}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="endDate">End Date *</label>
                <input
                  id="endDate"
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className={errors.endDate ? 'error' : ''}
                  data-testid="end-date-input"
                  min={formData.startDate || new Date().toISOString().slice(0, 16)}
                />
                {errors.endDate && (
                  <div className="error-message" data-testid="end-date-error">
                    {errors.endDate}
                  </div>
                )}
              </div>
            </div>

            {formData.startDate && formData.endDate && (
              <div className="timeline-preview">
                <h4>Campaign Duration</h4>
                <div className="duration-info">
                  {(() => {
                    const start = new Date(formData.startDate)
                    const end = new Date(formData.endDate)
                    const durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
                    return `${durationDays} days`
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Media & Content Step */}
        {currentStep === 3 && (
          <div className="media-step" data-testid="media-step">
            <div className="form-group">
              <label htmlFor="coverImage">Cover Image *</label>
              <div className="image-upload">
                <input
                  id="coverImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload('coverImage', e.target.files[0])}
                  data-testid="cover-image-input"
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('coverImage').click()}
                  className="upload-button"
                  data-testid="cover-image-upload-button"
                >
                  {formData.coverImageUrl ? 'Change Cover Image' : 'Upload Cover Image'}
                </button>
                {formData.coverImageUrl && (
                  <div className="image-preview">
                    <img 
                      src={formData.coverImageUrl} 
                      alt="Cover preview" 
                      data-testid="cover-image-preview"
                    />
                  </div>
                )}
              </div>
              {errors.coverImage && (
                <div className="error-message" data-testid="cover-image-error">
                  {errors.coverImage}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="videoUrl">Video URL (Optional)</label>
              <input
                id="videoUrl"
                type="url"
                value={formData.videoUrl}
                onChange={(e) => handleInputChange('videoUrl', e.target.value)}
                className={errors.videoUrl ? 'error' : ''}
                data-testid="video-url-input"
                placeholder="https://youtube.com/watch?v=..."
              />
              {errors.videoUrl && (
                <div className="error-message" data-testid="video-url-error">
                  {errors.videoUrl}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Story Step */}
        {currentStep === 4 && (
          <div className="story-step" data-testid="story-step">
            <div className="form-group">
              <label htmlFor="story">Your Campaign Story *</label>
              <textarea
                id="story"
                value={formData.story}
                onChange={(e) => handleInputChange('story', e.target.value)}
                className={errors.story ? 'error' : ''}
                data-testid="story-textarea"
                rows={10}
                maxLength={5000}
                placeholder="Tell the full story of your campaign. What is your goal? Why is it important? How will donations be used?"
              />
              {errors.story && (
                <div className="error-message" data-testid="story-error">
                  {errors.story}
                </div>
              )}
              <div className="character-count">{formData.story.length}/5000</div>
            </div>
          </div>
        )}

        {/* Settings Step */}
        {currentStep === 5 && (
          <div className="settings-step" data-testid="settings-step">
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                  data-testid="is-public-checkbox"
                />
                Make campaign publicly visible
              </label>
              <div className="help-text">
                Public campaigns can be discovered and shared by anyone
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.allowComments}
                  onChange={(e) => handleInputChange('allowComments', e.target.checked)}
                  data-testid="allow-comments-checkbox"
                />
                Allow comments and messages
              </label>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.emailUpdates}
                  onChange={(e) => handleInputChange('emailUpdates', e.target.checked)}
                  data-testid="email-updates-checkbox"
                />
                Send email updates to donors
              </label>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.socialSharing}
                  onChange={(e) => handleInputChange('socialSharing', e.target.checked)}
                  data-testid="social-sharing-checkbox"
                />
                Enable social media sharing
              </label>
            </div>
          </div>
        )}

        {/* Preview Step */}
        {currentStep === 6 && (
          <div className="preview-step" data-testid="preview-step">
            <div className="campaign-preview">
              <h3>Campaign Preview</h3>
              
              <div className="preview-section">
                <h4>{formData.title}</h4>
                <p>{formData.description}</p>
                
                {formData.coverImageUrl && (
                  <img 
                    src={formData.coverImageUrl} 
                    alt="Campaign cover" 
                    className="preview-cover"
                  />
                )}
                
                <div className="preview-details">
                  <div><strong>Goal:</strong> {formData.currency} {formData.targetAmount}</div>
                  <div><strong>Category:</strong> {categories.find(c => c.value === formData.category)?.label}</div>
                  <div><strong>Duration:</strong> {formData.startDate} to {formData.endDate}</div>
                  {formData.acceptCrypto && (
                    <div><strong>Accepts Crypto:</strong> {formData.acceptedTokens.join(', ')}</div>
                  )}
                </div>
                
                {formData.story && (
                  <div className="preview-story">
                    <h5>Campaign Story</h5>
                    <p>{formData.story}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="wizard-actions" data-testid="wizard-actions">
        <div className="action-buttons">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={prevStep}
              className="prev-button"
              data-testid="prev-button"
            >
              Previous
            </button>
          )}
          
          <button
            type="button"
            onClick={onCancel}
            className="cancel-button"
            data-testid="cancel-button"
          >
            Cancel
          </button>

          {currentStep < steps.length - 1 ? (
            <button
              type="button"
              onClick={nextStep}
              className="next-button"
              data-testid="next-button"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="submit-button"
              data-testid="submit-button"
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" />
                  Creating Campaign...
                </>
              ) : (
                'Launch Campaign'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default SetupWizard