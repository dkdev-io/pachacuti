/**
 * File storage service
 * Handles image and file uploads
 */

/**
 * Upload image file to storage
 * @param {File} file - Image file to upload
 * @param {string} folder - Storage folder (default: 'uploads')
 * @returns {Object} Upload result with URL
 */
export const uploadImage = async (file, folder = 'uploads') => {
  if (!file) {
    throw new Error('File is required')
  }

  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload JPEG, PNG, GIF, or WebP')
  }

  // Validate file size (10MB max)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error('File size too large. Maximum size is 10MB')
  }

  try {
    // In a real implementation, this would upload to cloud storage (Supabase Storage, AWS S3, etc.)
    // For now, we'll simulate an upload with a delay and return a mock URL
    
    await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate upload time

    const fileExtension = file.name.split('.').pop()
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExtension}`
    const url = `https://storage.example.com/${folder}/${fileName}`

    return {
      success: true,
      url,
      fileName,
      size: file.size,
      type: file.type
    }
  } catch (error) {
    console.error('Error uploading image:', error)
    throw new Error('Failed to upload image')
  }
}

/**
 * Upload multiple images
 * @param {FileList|Array} files - Array of image files
 * @param {string} folder - Storage folder
 * @returns {Array} Array of upload results
 */
export const uploadMultipleImages = async (files, folder = 'uploads') => {
  if (!files || files.length === 0) {
    throw new Error('Files are required')
  }

  const fileArray = Array.from(files)
  const uploadPromises = fileArray.map(file => uploadImage(file, folder))

  try {
    const results = await Promise.all(uploadPromises)
    return results
  } catch (error) {
    console.error('Error uploading multiple images:', error)
    throw error
  }
}

/**
 * Delete file from storage
 * @param {string} url - File URL to delete
 * @returns {boolean} Success status
 */
export const deleteFile = async (url) => {
  if (!url) {
    throw new Error('File URL is required')
  }

  try {
    // In a real implementation, this would delete from cloud storage
    await new Promise(resolve => setTimeout(resolve, 500))
    
    return true
  } catch (error) {
    console.error('Error deleting file:', error)
    throw new Error('Failed to delete file')
  }
}

/**
 * Get file info from URL
 * @param {string} url - File URL
 * @returns {Object} File information
 */
export const getFileInfo = async (url) => {
  if (!url) {
    throw new Error('File URL is required')
  }

  try {
    // Extract filename from URL
    const urlParts = url.split('/')
    const fileName = urlParts[urlParts.length - 1]
    
    // In a real implementation, this would fetch actual file metadata
    return {
      url,
      fileName,
      size: null, // Would be actual file size
      type: null, // Would be actual MIME type
      uploadedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error getting file info:', error)
    throw error
  }
}

/**
 * Generate optimized image URLs for different sizes
 * @param {string} originalUrl - Original image URL
 * @returns {Object} URLs for different image sizes
 */
export const getImageSizes = (originalUrl) => {
  if (!originalUrl) {
    return {
      thumbnail: null,
      medium: null,
      large: null,
      original: null
    }
  }

  // In a real implementation, this would generate actual optimized URLs
  // For now, return the original URL for all sizes
  return {
    thumbnail: originalUrl,
    medium: originalUrl,
    large: originalUrl,
    original: originalUrl
  }
}

/**
 * Validate image file before upload
 * @param {File} file - File to validate
 * @returns {Object} Validation result
 */
export const validateImageFile = (file) => {
  if (!file) {
    return {
      valid: false,
      errors: ['File is required']
    }
  }

  const errors = []

  // Check file type
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!validTypes.includes(file.type)) {
    errors.push('Invalid file type. Please upload JPEG, PNG, GIF, or WebP')
  }

  // Check file size (10MB max)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    errors.push('File size too large. Maximum size is 10MB')
  }

  // Check minimum dimensions (if it's an image)
  // This would require reading the image, which is async
  // For now, we'll skip this check

  return {
    valid: errors.length === 0,
    errors
  }
}