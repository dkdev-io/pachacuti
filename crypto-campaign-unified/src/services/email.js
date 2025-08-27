/**
 * Email service
 * Handles sending confirmation emails and notifications
 */

/**
 * Send donation confirmation email
 * @param {Object} emailData - Email details
 * @returns {Object} Email send result
 */
export const sendConfirmationEmail = async ({
  email,
  donationId,
  amount,
  currency,
  campaignId
}) => {
  if (!email || !donationId || !amount) {
    throw new Error('Missing required email fields')
  }

  try {
    // Mock email service integration (replace with actual service)
    const response = await fetch('/api/email/confirmation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: email,
        donationId,
        amount,
        currency,
        campaignId,
        template: 'donation-confirmation'
      })
    })

    if (!response.ok) {
      throw new Error('Failed to send confirmation email')
    }

    const result = await response.json()

    return {
      success: true,
      messageId: result.messageId
    }
  } catch (error) {
    console.error('Error sending confirmation email:', error)
    throw error
  }
}

/**
 * Send campaign update email
 * @param {Object} emailData - Email details
 * @returns {Object} Email send result
 */
export const sendCampaignUpdate = async ({
  email,
  campaignId,
  updateType,
  message
}) => {
  if (!email || !campaignId || !updateType) {
    throw new Error('Missing required email fields')
  }

  try {
    const response = await fetch('/api/email/campaign-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: email,
        campaignId,
        updateType,
        message,
        template: 'campaign-update'
      })
    })

    if (!response.ok) {
      throw new Error('Failed to send campaign update email')
    }

    const result = await response.json()

    return {
      success: true,
      messageId: result.messageId
    }
  } catch (error) {
    console.error('Error sending campaign update email:', error)
    throw error
  }
}