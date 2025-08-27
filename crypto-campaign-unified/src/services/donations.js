/**
 * Donations service
 * Handles donation recording and management
 */

// Mock database client (replace with actual Supabase client)
const db = {
  from: (table) => ({
    insert: async (data) => {
      // Simulate database insert
      await new Promise(resolve => setTimeout(resolve, 500))
      
      return {
        data: {
          id: crypto.randomUUID(),
          ...data,
          created_at: new Date().toISOString()
        },
        error: null
      }
    },
    
    select: (fields = '*') => ({
      eq: (field, value) => ({
        single: async () => {
          await new Promise(resolve => setTimeout(resolve, 300))
          
          return {
            data: {
              id: crypto.randomUUID(),
              campaign_id: value,
              amount: 100,
              currency: 'USD',
              status: 'completed'
            },
            error: null
          }
        }
      })
    })
  })
}

/**
 * Record a new donation
 * @param {Object} donationData - Donation details
 * @returns {Object} Created donation record
 */
export const recordDonation = async ({
  campaignId,
  donorEmail,
  donorName,
  amount,
  currency,
  message,
  anonymous,
  paymentId,
  paymentMethod
}) => {
  if (!campaignId || !donorEmail || !amount) {
    throw new Error('Missing required donation fields')
  }

  try {
    const { data, error } = await db.from('donations').insert({
      campaign_id: campaignId,
      donor_email: donorEmail,
      donor_name: anonymous ? null : donorName,
      amount: parseFloat(amount),
      currency,
      message: message || null,
      anonymous: Boolean(anonymous),
      payment_id: paymentId,
      payment_method: paymentMethod,
      status: 'completed'
    })

    if (error) {
      throw new Error(error.message || 'Failed to record donation')
    }

    return data
  } catch (error) {
    console.error('Error recording donation:', error)
    throw error
  }
}

/**
 * Get donation by ID
 * @param {string} donationId - Donation ID
 * @returns {Object} Donation record
 */
export const getDonation = async (donationId) => {
  if (!donationId) {
    throw new Error('Donation ID is required')
  }

  try {
    const { data, error } = await db.from('donations')
      .select('*')
      .eq('id', donationId)
      .single()

    if (error) {
      throw new Error(error.message || 'Failed to fetch donation')
    }

    return data
  } catch (error) {
    console.error('Error fetching donation:', error)
    throw error
  }
}

/**
 * Get donations for a campaign
 * @param {string} campaignId - Campaign ID
 * @param {Object} options - Query options
 * @returns {Array} List of donations
 */
export const getCampaignDonations = async (campaignId, options = {}) => {
  if (!campaignId) {
    throw new Error('Campaign ID is required')
  }

  const { limit = 100, offset = 0, includeAnonymous = true } = options

  try {
    let query = db.from('donations')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (!includeAnonymous) {
      query = query.eq('anonymous', false)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(error.message || 'Failed to fetch campaign donations')
    }

    return data
  } catch (error) {
    console.error('Error fetching campaign donations:', error)
    throw error
  }
}

/**
 * Update donation status
 * @param {string} donationId - Donation ID
 * @param {string} status - New status
 * @returns {Object} Updated donation
 */
export const updateDonationStatus = async (donationId, status) => {
  if (!donationId || !status) {
    throw new Error('Donation ID and status are required')
  }

  const validStatuses = ['pending', 'completed', 'failed', 'refunded']
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid donation status')
  }

  try {
    const { data, error } = await db.from('donations')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', donationId)
      .select()
      .single()

    if (error) {
      throw new Error(error.message || 'Failed to update donation status')
    }

    return data
  } catch (error) {
    console.error('Error updating donation status:', error)
    throw error
  }
}