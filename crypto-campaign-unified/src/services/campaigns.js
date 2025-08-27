/**
 * Campaign management service
 * Handles campaign CRUD operations and related functionality
 */

// Mock database client (replace with actual Supabase client)
const db = {
  from: (table) => ({
    insert: async (data) => {
      // Simulate database insert
      await new Promise(resolve => setTimeout(resolve, 800))
      
      return {
        data: {
          id: crypto.randomUUID(),
          ...data,
          status: 'draft',
          currentAmount: 0,
          donorCount: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        error: null
      }
    },
    
    select: (fields = '*') => ({
      eq: (field, value) => ({
        single: async () => {
          await new Promise(resolve => setTimeout(resolve, 400))
          
          return {
            data: {
              id: value,
              title: 'Sample Campaign',
              description: 'A sample campaign description',
              targetAmount: 10000,
              currentAmount: 2500,
              status: 'active',
              category: 'general'
            },
            error: null
          }
        },
        
        limit: (count) => ({
          order: (field, options = {}) => ({
            range: (start, end) => ({
              then: async () => ({
                data: [
                  {
                    id: crypto.randomUUID(),
                    title: 'Campaign 1',
                    description: 'Description 1',
                    targetAmount: 5000,
                    currentAmount: 1250,
                    status: 'active'
                  },
                  {
                    id: crypto.randomUUID(),
                    title: 'Campaign 2', 
                    description: 'Description 2',
                    targetAmount: 8000,
                    currentAmount: 3200,
                    status: 'active'
                  }
                ],
                error: null
              })
            })
          })
        })
      }),
      
      in: (field, values) => ({
        order: (field, options = {}) => ({
          then: async () => ({
            data: values.map(val => ({
              id: crypto.randomUUID(),
              title: `Campaign ${val}`,
              status: 'active',
              targetAmount: 5000
            })),
            error: null
          })
        })
      })
    }),
    
    update: (data) => ({
      eq: (field, value) => ({
        select: () => ({
          single: async () => {
            await new Promise(resolve => setTimeout(resolve, 500))
            
            return {
              data: {
                id: value,
                ...data,
                updated_at: new Date().toISOString()
              },
              error: null
            }
          }
        })
      })
    }),
    
    delete: () => ({
      eq: (field, value) => ({
        then: async () => {
          await new Promise(resolve => setTimeout(resolve, 300))
          
          return {
            data: null,
            error: null
          }
        }
      })
    })
  })
}

/**
 * Create a new campaign
 * @param {Object} campaignData - Campaign details
 * @returns {Object} Created campaign record
 */
export const createCampaign = async (campaignData) => {
  if (!campaignData.title || !campaignData.description) {
    throw new Error('Campaign title and description are required')
  }

  if (!campaignData.targetAmount || campaignData.targetAmount <= 0) {
    throw new Error('Valid target amount is required')
  }

  try {
    const { data, error } = await db.from('campaigns').insert({
      title: campaignData.title,
      description: campaignData.description,
      story: campaignData.story || '',
      category: campaignData.category || 'general',
      target_amount: parseFloat(campaignData.targetAmount),
      currency: campaignData.currency || 'USD',
      accept_crypto: Boolean(campaignData.acceptCrypto),
      accepted_tokens: campaignData.acceptedTokens || [],
      start_date: campaignData.startDate,
      end_date: campaignData.endDate,
      cover_image_url: campaignData.coverImageUrl || null,
      gallery_urls: campaignData.galleryUrls || [],
      video_url: campaignData.videoUrl || null,
      rewards: campaignData.rewards || [],
      is_public: Boolean(campaignData.isPublic),
      allow_comments: Boolean(campaignData.allowComments),
      email_updates: Boolean(campaignData.emailUpdates),
      social_sharing: Boolean(campaignData.socialSharing)
    })

    if (error) {
      throw new Error(error.message || 'Failed to create campaign')
    }

    return data
  } catch (error) {
    console.error('Error creating campaign:', error)
    throw error
  }
}

/**
 * Get campaign by ID
 * @param {string} campaignId - Campaign ID
 * @returns {Object} Campaign record
 */
export const getCampaign = async (campaignId) => {
  if (!campaignId) {
    throw new Error('Campaign ID is required')
  }

  try {
    const { data, error } = await db.from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (error) {
      throw new Error(error.message || 'Failed to fetch campaign')
    }

    return data
  } catch (error) {
    console.error('Error fetching campaign:', error)
    throw error
  }
}

/**
 * Update campaign
 * @param {string} campaignId - Campaign ID
 * @param {Object} updates - Updates to apply
 * @returns {Object} Updated campaign
 */
export const updateCampaign = async (campaignId, updates) => {
  if (!campaignId) {
    throw new Error('Campaign ID is required')
  }

  try {
    const { data, error } = await db.from('campaigns')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .select()
      .single()

    if (error) {
      throw new Error(error.message || 'Failed to update campaign')
    }

    return data
  } catch (error) {
    console.error('Error updating campaign:', error)
    throw error
  }
}

/**
 * Delete campaign
 * @param {string} campaignId - Campaign ID
 * @returns {boolean} Success status
 */
export const deleteCampaign = async (campaignId) => {
  if (!campaignId) {
    throw new Error('Campaign ID is required')
  }

  try {
    const { error } = await db.from('campaigns')
      .delete()
      .eq('id', campaignId)

    if (error) {
      throw new Error(error.message || 'Failed to delete campaign')
    }

    return true
  } catch (error) {
    console.error('Error deleting campaign:', error)
    throw error
  }
}

/**
 * List campaigns with filters
 * @param {Object} options - Query options
 * @returns {Array} List of campaigns
 */
export const listCampaigns = async (options = {}) => {
  const {
    limit = 20,
    offset = 0,
    status = null,
    category = null,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = options

  try {
    let query = db.from('campaigns').select('*')

    if (status) {
      query = query.eq('status', status)
    }

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(error.message || 'Failed to fetch campaigns')
    }

    return data
  } catch (error) {
    console.error('Error listing campaigns:', error)
    throw error
  }
}

/**
 * Search campaigns
 * @param {string} searchTerm - Search term
 * @param {Object} options - Search options
 * @returns {Array} Search results
 */
export const searchCampaigns = async (searchTerm, options = {}) => {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return listCampaigns(options)
  }

  const { limit = 20, offset = 0 } = options

  try {
    // In a real implementation, this would use full-text search
    // For now, we'll simulate search results
    const allCampaigns = await listCampaigns({ limit: 100 })
    
    const searchResults = allCampaigns.filter(campaign =>
      campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.story?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return searchResults.slice(offset, offset + limit)
  } catch (error) {
    console.error('Error searching campaigns:', error)
    throw error
  }
}

/**
 * Get campaigns by user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Array} User's campaigns
 */
export const getUserCampaigns = async (userId, options = {}) => {
  if (!userId) {
    throw new Error('User ID is required')
  }

  const { limit = 20, offset = 0 } = options

  try {
    const { data, error } = await db.from('campaigns')
      .select('*')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(error.message || 'Failed to fetch user campaigns')
    }

    return data
  } catch (error) {
    console.error('Error fetching user campaigns:', error)
    throw error
  }
}

/**
 * Get campaigns by category
 * @param {string} category - Campaign category
 * @param {Object} options - Query options
 * @returns {Array} Campaigns in category
 */
export const getCampaignsByCategory = async (category, options = {}) => {
  if (!category) {
    throw new Error('Category is required')
  }

  return listCampaigns({ ...options, category })
}

/**
 * Activate campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Object} Activated campaign
 */
export const activateCampaign = async (campaignId) => {
  return updateCampaign(campaignId, { status: 'active' })
}

/**
 * Pause campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Object} Paused campaign
 */
export const pauseCampaign = async (campaignId) => {
  return updateCampaign(campaignId, { status: 'paused' })
}

/**
 * Complete campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Object} Completed campaign
 */
export const completeCampaign = async (campaignId) => {
  return updateCampaign(campaignId, { 
    status: 'completed',
    completed_at: new Date().toISOString()
  })
}

/**
 * Get campaign statistics
 * @param {string} campaignId - Campaign ID
 * @returns {Object} Campaign statistics
 */
export const getCampaignStats = async (campaignId) => {
  if (!campaignId) {
    throw new Error('Campaign ID is required')
  }

  try {
    // In a real implementation, this would query multiple tables
    // For now, we'll return mock statistics
    await new Promise(resolve => setTimeout(resolve, 400))

    return {
      totalDonations: 150,
      uniqueDonors: 75,
      averageDonation: 125.50,
      conversionRate: 0.12,
      shareCount: 45,
      viewCount: 2500,
      commentCount: 28
    }
  } catch (error) {
    console.error('Error fetching campaign statistics:', error)
    throw error
  }
}