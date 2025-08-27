import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  listCampaigns, 
  getCampaign, 
  updateCampaign, 
  deleteCampaign, 
  activateCampaign, 
  pauseCampaign, 
  completeCampaign,
  getCampaignStats 
} from '../services/campaigns'
import { formatCurrency, formatDate, formatPercentage } from '../utils/formatting'
import { validateCampaignTitle, validateCampaignDescription } from '../utils/validation'

/**
 * CampaignManager - Admin panel for campaign management
 * Handles campaign oversight, editing, analytics, and administrative actions
 */
export const CampaignManager = ({
  userRole = 'admin',
  userId,
  onCampaignUpdate,
  onError,
  theme = 'light'
}) => {
  const [campaigns, setCampaigns] = useState([])
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [campaignStats, setCampaignStats] = useState({})
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState({})
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    search: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  })
  const [errors, setErrors] = useState({})
  const [editingCampaign, setEditingCampaign] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [bulkActions, setBulkActions] = useState({
    selectedCampaigns: new Set(),
    action: ''
  })

  // Permission checks
  const canEditCampaign = useCallback((campaign) => {
    return userRole === 'admin' || 
           (userRole === 'manager') ||
           (campaign.creator_id === userId)
  }, [userRole, userId])

  const canDeleteCampaign = useCallback((campaign) => {
    return userRole === 'admin' || 
           (campaign.creator_id === userId && campaign.status === 'draft')
  }, [userRole, userId])

  const canManageStatus = useCallback((campaign) => {
    return userRole === 'admin' || userRole === 'manager'
  }, [userRole])

  // Load campaigns
  const loadCampaigns = useCallback(async () => {
    setLoading(true)
    setErrors(prev => ({ ...prev, loading: null }))
    
    try {
      const campaignList = await listCampaigns({
        limit: 50,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        status: filters.status || null,
        category: filters.category || null
      })
      
      setCampaigns(campaignList)
    } catch (error) {
      console.error('Error loading campaigns:', error)
      setErrors(prev => ({ ...prev, loading: error.message }))
    } finally {
      setLoading(false)
    }
  }, [filters])

  // Load campaign statistics
  const loadCampaignStats = useCallback(async (campaignId) => {
    try {
      const stats = await getCampaignStats(campaignId)
      setCampaignStats(prev => ({
        ...prev,
        [campaignId]: stats
      }))
    } catch (error) {
      console.error('Error loading campaign stats:', error)
    }
  }, [])

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    let filtered = campaigns

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(campaign =>
        campaign.title.toLowerCase().includes(searchTerm) ||
        campaign.description.toLowerCase().includes(searchTerm) ||
        campaign.category.toLowerCase().includes(searchTerm)
      )
    }

    return filtered
  }, [campaigns, filters.search])

  // Handle campaign status change
  const handleStatusChange = useCallback(async (campaignId, newStatus) => {
    setActionLoading(prev => ({ ...prev, [campaignId]: 'status' }))
    
    try {
      let updatedCampaign
      
      switch (newStatus) {
        case 'active':
          updatedCampaign = await activateCampaign(campaignId)
          break
        case 'paused':
          updatedCampaign = await pauseCampaign(campaignId)
          break
        case 'completed':
          updatedCampaign = await completeCampaign(campaignId)
          break
        default:
          updatedCampaign = await updateCampaign(campaignId, { status: newStatus })
      }
      
      setCampaigns(prev => prev.map(c => 
        c.id === campaignId ? updatedCampaign : c
      ))
      
      onCampaignUpdate?.(updatedCampaign)
    } catch (error) {
      console.error('Error updating campaign status:', error)
      onError?.(error.message || 'Failed to update campaign status')
    } finally {
      setActionLoading(prev => ({ ...prev, [campaignId]: null }))
    }
  }, [onCampaignUpdate, onError])

  // Handle campaign edit
  const handleEditCampaign = useCallback((campaign) => {
    setEditingCampaign({
      ...campaign,
      originalData: { ...campaign }
    })
    setErrors({})
  }, [])

  // Save campaign edits
  const saveCampaignEdits = useCallback(async () => {
    if (!editingCampaign) return

    // Validate changes
    const titleValidation = validateCampaignTitle(editingCampaign.title)
    const descriptionValidation = validateCampaignDescription(editingCampaign.description)
    
    const validationErrors = {}
    if (!titleValidation.valid) {
      validationErrors.title = titleValidation.errors[0]
    }
    if (!descriptionValidation.valid) {
      validationErrors.description = descriptionValidation.errors[0]
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setActionLoading(prev => ({ ...prev, [editingCampaign.id]: 'saving' }))
    
    try {
      const updates = {
        title: editingCampaign.title,
        description: editingCampaign.description,
        category: editingCampaign.category,
        target_amount: editingCampaign.target_amount,
        currency: editingCampaign.currency
      }
      
      const updatedCampaign = await updateCampaign(editingCampaign.id, updates)
      
      setCampaigns(prev => prev.map(c => 
        c.id === editingCampaign.id ? updatedCampaign : c
      ))
      
      setEditingCampaign(null)
      onCampaignUpdate?.(updatedCampaign)
    } catch (error) {
      console.error('Error saving campaign:', error)
      onError?.(error.message || 'Failed to save campaign changes')
    } finally {
      setActionLoading(prev => ({ ...prev, [editingCampaign.id]: null }))
    }
  }, [editingCampaign, onCampaignUpdate, onError])

  // Handle campaign deletion
  const handleDeleteCampaign = useCallback(async (campaignId) => {
    setActionLoading(prev => ({ ...prev, [campaignId]: 'deleting' }))
    
    try {
      await deleteCampaign(campaignId)
      
      setCampaigns(prev => prev.filter(c => c.id !== campaignId))
      setShowDeleteConfirm(null)
      
      if (selectedCampaign?.id === campaignId) {
        setSelectedCampaign(null)
      }
    } catch (error) {
      console.error('Error deleting campaign:', error)
      onError?.(error.message || 'Failed to delete campaign')
    } finally {
      setActionLoading(prev => ({ ...prev, [campaignId]: null }))
    }
  }, [selectedCampaign, onError])

  // Handle bulk actions
  const handleBulkAction = useCallback(async () => {
    if (bulkActions.selectedCampaigns.size === 0 || !bulkActions.action) {
      return
    }

    const campaignIds = Array.from(bulkActions.selectedCampaigns)
    setActionLoading(prev => ({ ...prev, bulk: 'processing' }))
    
    try {
      const promises = campaignIds.map(campaignId => {
        switch (bulkActions.action) {
          case 'activate':
            return activateCampaign(campaignId)
          case 'pause':
            return pauseCampaign(campaignId)
          case 'delete':
            return deleteCampaign(campaignId)
          default:
            return Promise.resolve()
        }
      })
      
      await Promise.all(promises)
      
      // Refresh campaign list
      await loadCampaigns()
      
      // Clear bulk selections
      setBulkActions({
        selectedCampaigns: new Set(),
        action: ''
      })
    } catch (error) {
      console.error('Error performing bulk action:', error)
      onError?.(error.message || 'Failed to perform bulk action')
    } finally {
      setActionLoading(prev => ({ ...prev, bulk: null }))
    }
  }, [bulkActions, loadCampaigns, onError])

  // Handle campaign selection for bulk actions
  const toggleCampaignSelection = useCallback((campaignId) => {
    setBulkActions(prev => {
      const newSelected = new Set(prev.selectedCampaigns)
      if (newSelected.has(campaignId)) {
        newSelected.delete(campaignId)
      } else {
        newSelected.add(campaignId)
      }
      return {
        ...prev,
        selectedCampaigns: newSelected
      }
    })
  }, [])

  // Load data on mount
  useEffect(() => {
    loadCampaigns()
  }, [loadCampaigns])

  // Load stats for selected campaign
  useEffect(() => {
    if (selectedCampaign && !campaignStats[selectedCampaign.id]) {
      loadCampaignStats(selectedCampaign.id)
    }
  }, [selectedCampaign, campaignStats, loadCampaignStats])

  return (
    <div className={`campaign-manager ${theme}`} data-testid="campaign-manager">
      {/* Header */}
      <div className="manager-header">
        <h1>Campaign Management</h1>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-value">{campaigns.length}</span>
            <span className="stat-label">Total Campaigns</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">
              {campaigns.filter(c => c.status === 'active').length}
            </span>
            <span className="stat-label">Active</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">
              {campaigns.filter(c => c.status === 'draft').length}
            </span>
            <span className="stat-label">Draft</span>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="manager-controls" data-testid="manager-controls">
        <div className="filters">
          <input
            type="text"
            placeholder="Search campaigns..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            data-testid="search-input"
            className="search-input"
          />
          
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            data-testid="status-filter"
            className="filter-select"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
          
          <select
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            data-testid="category-filter"
            className="filter-select"
          >
            <option value="">All Categories</option>
            <option value="charity">Charity</option>
            <option value="medical">Medical</option>
            <option value="education">Education</option>
            <option value="business">Business</option>
            <option value="creative">Creative</option>
            <option value="other">Other</option>
          </select>
          
          <select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-')
              setFilters(prev => ({ ...prev, sortBy, sortOrder }))
            }}
            data-testid="sort-select"
            className="filter-select"
          >
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
            <option value="title-asc">Title A-Z</option>
            <option value="title-desc">Title Z-A</option>
            <option value="target_amount-desc">Highest Goal</option>
            <option value="target_amount-asc">Lowest Goal</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {bulkActions.selectedCampaigns.size > 0 && (
          <div className="bulk-actions" data-testid="bulk-actions">
            <span className="selection-count">
              {bulkActions.selectedCampaigns.size} selected
            </span>
            
            <select
              value={bulkActions.action}
              onChange={(e) => setBulkActions(prev => ({ ...prev, action: e.target.value }))}
              data-testid="bulk-action-select"
              className="bulk-select"
            >
              <option value="">Select Action</option>
              {userRole === 'admin' && (
                <>
                  <option value="activate">Activate</option>
                  <option value="pause">Pause</option>
                  <option value="delete">Delete</option>
                </>
              )}
            </select>
            
            <button
              onClick={handleBulkAction}
              disabled={!bulkActions.action || actionLoading.bulk}
              data-testid="bulk-action-button"
              className="bulk-action-btn"
            >
              {actionLoading.bulk ? 'Processing...' : 'Apply'}
            </button>
          </div>
        )}

        <button
          onClick={loadCampaigns}
          disabled={loading}
          data-testid="refresh-button"
          className="refresh-btn"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {errors.loading && (
        <div className="error-message" data-testid="loading-error">
          {errors.loading}
        </div>
      )}

      {/* Campaign List */}
      <div className="campaign-list" data-testid="campaign-list">
        {loading ? (
          <div className="loading-state">
            <span className="spinner" />
            Loading campaigns...
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="empty-state" data-testid="empty-state">
            <h3>No campaigns found</h3>
            <p>No campaigns match your current filters.</p>
          </div>
        ) : (
          filteredCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className={`campaign-card ${selectedCampaign?.id === campaign.id ? 'selected' : ''}`}
              data-testid={`campaign-${campaign.id}`}
            >
              <div className="campaign-header">
                <div className="campaign-selection">
                  <input
                    type="checkbox"
                    checked={bulkActions.selectedCampaigns.has(campaign.id)}
                    onChange={() => toggleCampaignSelection(campaign.id)}
                    data-testid={`campaign-checkbox-${campaign.id}`}
                  />
                </div>
                
                <div className="campaign-info">
                  <h3 
                    onClick={() => setSelectedCampaign(campaign)}
                    className="campaign-title"
                    data-testid={`campaign-title-${campaign.id}`}
                  >
                    {campaign.title}
                  </h3>
                  <p className="campaign-description">
                    {campaign.description}
                  </p>
                </div>
                
                <div className="campaign-meta">
                  <span className={`status-badge ${campaign.status}`} data-testid={`status-${campaign.id}`}>
                    {campaign.status.toUpperCase()}
                  </span>
                  <span className="category-badge">
                    {campaign.category}
                  </span>
                </div>
              </div>

              <div className="campaign-stats">
                <div className="stat">
                  <span className="stat-label">Goal</span>
                  <span className="stat-value">
                    {formatCurrency(campaign.target_amount, campaign.currency)}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Raised</span>
                  <span className="stat-value">
                    {formatCurrency(campaign.current_amount || 0, campaign.currency)}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Progress</span>
                  <span className="stat-value">
                    {formatPercentage((campaign.current_amount || 0) / campaign.target_amount * 100)}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Created</span>
                  <span className="stat-value">
                    {formatDate(campaign.created_at, 'short')}
                  </span>
                </div>
              </div>

              <div className="campaign-actions">
                {canEditCampaign(campaign) && (
                  <button
                    onClick={() => handleEditCampaign(campaign)}
                    data-testid={`edit-campaign-${campaign.id}`}
                    className="action-btn edit-btn"
                  >
                    Edit
                  </button>
                )}

                {canManageStatus(campaign) && (
                  <div className="status-controls">
                    {campaign.status === 'draft' && (
                      <button
                        onClick={() => handleStatusChange(campaign.id, 'active')}
                        disabled={actionLoading[campaign.id]}
                        data-testid={`activate-campaign-${campaign.id}`}
                        className="action-btn activate-btn"
                      >
                        {actionLoading[campaign.id] === 'status' ? 'Loading...' : 'Activate'}
                      </button>
                    )}
                    
                    {campaign.status === 'active' && (
                      <button
                        onClick={() => handleStatusChange(campaign.id, 'paused')}
                        disabled={actionLoading[campaign.id]}
                        data-testid={`pause-campaign-${campaign.id}`}
                        className="action-btn pause-btn"
                      >
                        {actionLoading[campaign.id] === 'status' ? 'Loading...' : 'Pause'}
                      </button>
                    )}
                    
                    {campaign.status === 'paused' && (
                      <button
                        onClick={() => handleStatusChange(campaign.id, 'active')}
                        disabled={actionLoading[campaign.id]}
                        data-testid={`resume-campaign-${campaign.id}`}
                        className="action-btn activate-btn"
                      >
                        {actionLoading[campaign.id] === 'status' ? 'Loading...' : 'Resume'}
                      </button>
                    )}

                    {(campaign.status === 'active' || campaign.status === 'paused') && (
                      <button
                        onClick={() => handleStatusChange(campaign.id, 'completed')}
                        disabled={actionLoading[campaign.id]}
                        data-testid={`complete-campaign-${campaign.id}`}
                        className="action-btn complete-btn"
                      >
                        {actionLoading[campaign.id] === 'status' ? 'Loading...' : 'Complete'}
                      </button>
                    )}
                  </div>
                )}

                {canDeleteCampaign(campaign) && (
                  <button
                    onClick={() => setShowDeleteConfirm(campaign.id)}
                    data-testid={`delete-campaign-${campaign.id}`}
                    className="action-btn delete-btn"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Campaign Details Panel */}
      {selectedCampaign && (
        <div className="campaign-details" data-testid="campaign-details">
          <div className="details-header">
            <h2>{selectedCampaign.title}</h2>
            <button
              onClick={() => setSelectedCampaign(null)}
              data-testid="close-details"
              className="close-btn"
            >
              ✕
            </button>
          </div>

          <div className="details-content">
            <div className="details-section">
              <h3>Campaign Information</h3>
              <dl className="details-list">
                <dt>Description</dt>
                <dd>{selectedCampaign.description}</dd>
                
                <dt>Category</dt>
                <dd>{selectedCampaign.category}</dd>
                
                <dt>Status</dt>
                <dd className={`status ${selectedCampaign.status}`}>
                  {selectedCampaign.status.toUpperCase()}
                </dd>
                
                <dt>Target Amount</dt>
                <dd>{formatCurrency(selectedCampaign.target_amount, selectedCampaign.currency)}</dd>
                
                <dt>Current Amount</dt>
                <dd>{formatCurrency(selectedCampaign.current_amount || 0, selectedCampaign.currency)}</dd>
                
                <dt>Created</dt>
                <dd>{formatDate(selectedCampaign.created_at, 'long')}</dd>
                
                <dt>Last Updated</dt>
                <dd>{formatDate(selectedCampaign.updated_at, 'long')}</dd>
              </dl>
            </div>

            {/* Campaign Statistics */}
            {campaignStats[selectedCampaign.id] && (
              <div className="details-section">
                <h3>Statistics</h3>
                <div className="stats-grid">
                  <div className="stat-card">
                    <span className="stat-title">Total Donations</span>
                    <span className="stat-number">
                      {campaignStats[selectedCampaign.id].totalDonations}
                    </span>
                  </div>
                  
                  <div className="stat-card">
                    <span className="stat-title">Unique Donors</span>
                    <span className="stat-number">
                      {campaignStats[selectedCampaign.id].uniqueDonors}
                    </span>
                  </div>
                  
                  <div className="stat-card">
                    <span className="stat-title">Average Donation</span>
                    <span className="stat-number">
                      {formatCurrency(campaignStats[selectedCampaign.id].averageDonation, selectedCampaign.currency)}
                    </span>
                  </div>
                  
                  <div className="stat-card">
                    <span className="stat-title">Conversion Rate</span>
                    <span className="stat-number">
                      {formatPercentage(campaignStats[selectedCampaign.id].conversionRate * 100)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Campaign Modal */}
      {editingCampaign && (
        <div className="modal-overlay" data-testid="edit-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Campaign</h2>
              <button
                onClick={() => setEditingCampaign(null)}
                data-testid="close-edit-modal"
                className="close-btn"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="edit-title">Title *</label>
                <input
                  id="edit-title"
                  type="text"
                  value={editingCampaign.title}
                  onChange={(e) => setEditingCampaign(prev => ({ 
                    ...prev, 
                    title: e.target.value 
                  }))}
                  className={errors.title ? 'error' : ''}
                  data-testid="edit-title-input"
                />
                {errors.title && (
                  <div className="error-message" data-testid="edit-title-error">
                    {errors.title}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="edit-description">Description *</label>
                <textarea
                  id="edit-description"
                  value={editingCampaign.description}
                  onChange={(e) => setEditingCampaign(prev => ({ 
                    ...prev, 
                    description: e.target.value 
                  }))}
                  className={errors.description ? 'error' : ''}
                  data-testid="edit-description-textarea"
                  rows={4}
                />
                {errors.description && (
                  <div className="error-message" data-testid="edit-description-error">
                    {errors.description}
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-category">Category</label>
                  <select
                    id="edit-category"
                    value={editingCampaign.category}
                    onChange={(e) => setEditingCampaign(prev => ({ 
                      ...prev, 
                      category: e.target.value 
                    }))}
                    data-testid="edit-category-select"
                  >
                    <option value="charity">Charity</option>
                    <option value="medical">Medical</option>
                    <option value="education">Education</option>
                    <option value="business">Business</option>
                    <option value="creative">Creative</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="edit-target">Target Amount</label>
                  <input
                    id="edit-target"
                    type="number"
                    min="1"
                    value={editingCampaign.target_amount}
                    onChange={(e) => setEditingCampaign(prev => ({ 
                      ...prev, 
                      target_amount: parseFloat(e.target.value) 
                    }))}
                    data-testid="edit-target-input"
                  />
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                onClick={() => setEditingCampaign(null)}
                data-testid="cancel-edit-button"
                className="cancel-btn"
              >
                Cancel
              </button>
              
              <button
                onClick={saveCampaignEdits}
                disabled={actionLoading[editingCampaign.id]}
                data-testid="save-edit-button"
                className="save-btn"
              >
                {actionLoading[editingCampaign.id] === 'saving' ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" data-testid="delete-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Confirm Deletion</h2>
            </div>

            <div className="modal-body">
              <p>Are you sure you want to delete this campaign? This action cannot be undone.</p>
              <p><strong>Campaign:</strong> {campaigns.find(c => c.id === showDeleteConfirm)?.title}</p>
            </div>

            <div className="modal-actions">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                data-testid="cancel-delete-button"
                className="cancel-btn"
              >
                Cancel
              </button>
              
              <button
                onClick={() => handleDeleteCampaign(showDeleteConfirm)}
                disabled={actionLoading[showDeleteConfirm]}
                data-testid="confirm-delete-button"
                className="delete-btn"
              >
                {actionLoading[showDeleteConfirm] === 'deleting' ? 'Deleting...' : 'Delete Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CampaignManager