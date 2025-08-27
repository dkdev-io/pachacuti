import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// Setup server for testing environment
export const server = setupServer(...handlers)