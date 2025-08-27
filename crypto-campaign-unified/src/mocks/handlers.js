import { http, HttpResponse } from 'msw'

// Supabase API mocks
export const supabaseHandlers = [
  // Authentication
  http.post('*/auth/v1/token*', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User'
      }
    })
  }),

  // Users table
  http.get('*/rest/v1/users*', () => {
    return HttpResponse.json([
      {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user'
      }
    ])
  }),

  http.post('*/rest/v1/users*', () => {
    return HttpResponse.json({
      id: 'new-user-id',
      email: 'newuser@example.com',
      name: 'New User',
      role: 'user'
    })
  }),

  // Campaigns table
  http.get('*/rest/v1/campaigns*', () => {
    return HttpResponse.json([
      {
        id: 'test-campaign-id',
        title: 'Test Campaign',
        description: 'A test campaign',
        targetAmount: 10000,
        currentAmount: 2500,
        status: 'active'
      }
    ])
  }),

  http.post('*/rest/v1/campaigns*', () => {
    return HttpResponse.json({
      id: 'new-campaign-id',
      title: 'New Campaign',
      description: 'A new campaign',
      targetAmount: 5000,
      currentAmount: 0,
      status: 'draft'
    })
  }),

  // Donations table
  http.get('*/rest/v1/donations*', () => {
    return HttpResponse.json([
      {
        id: 'test-donation-id',
        campaignId: 'test-campaign-id',
        amount: 100,
        currency: 'USD',
        status: 'completed'
      }
    ])
  }),

  http.post('*/rest/v1/donations*', () => {
    return HttpResponse.json({
      id: 'new-donation-id',
      campaignId: 'test-campaign-id',
      amount: 50,
      currency: 'ETH',
      status: 'pending'
    })
  })
]

// Web3/Ethereum API mocks
export const web3Handlers = [
  // Ethereum JSON-RPC
  http.post('*/v1/*', async ({ request }) => {
    const body = await request.json()
    
    switch (body.method) {
      case 'eth_accounts':
        return HttpResponse.json({
          result: ['0x1234567890123456789012345678901234567890']
        })
      
      case 'eth_getBalance':
        return HttpResponse.json({
          result: '0x152d02c7e14af6800000' // 100 ETH in wei
        })
      
      case 'eth_sendTransaction':
        return HttpResponse.json({
          result: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
        })
      
      case 'eth_getTransactionReceipt':
        return HttpResponse.json({
          result: {
            status: '0x1',
            transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            gasUsed: '0x5208'
          }
        })
      
      default:
        return HttpResponse.json({ result: null })
    }
  })
]

// Payment processing mocks
export const paymentHandlers = [
  // Stripe API
  http.post('*/v1/payment_intents*', () => {
    return HttpResponse.json({
      id: 'pi_test_payment_intent',
      client_secret: 'pi_test_payment_intent_secret',
      status: 'requires_payment_method'
    })
  }),

  // PayPal API
  http.post('*/v2/checkout/orders*', () => {
    return HttpResponse.json({
      id: 'paypal-order-id',
      status: 'CREATED',
      links: [
        {
          rel: 'approve',
          href: 'https://paypal.com/approve/paypal-order-id'
        }
      ]
    })
  })
]

// Analytics and metrics mocks
export const analyticsHandlers = [
  http.post('*/analytics/events*', () => {
    return HttpResponse.json({ success: true })
  }),

  http.get('*/analytics/campaigns/*', () => {
    return HttpResponse.json({
      impressions: 1500,
      clicks: 75,
      conversions: 15,
      conversionRate: 0.2
    })
  })
]

// Error simulation handlers
export const errorHandlers = [
  // Network error simulation
  http.post('*/test/network-error*', () => {
    return HttpResponse.error()
  }),

  // Server error simulation
  http.post('*/test/server-error*', () => {
    return new HttpResponse(null, { status: 500 })
  }),

  // Validation error simulation
  http.post('*/test/validation-error*', () => {
    return HttpResponse.json(
      { error: 'Validation failed', details: ['Email is required'] },
      { status: 400 }
    )
  })
]

export const handlers = [
  ...supabaseHandlers,
  ...web3Handlers,
  ...paymentHandlers,
  ...analyticsHandlers,
  ...errorHandlers
]