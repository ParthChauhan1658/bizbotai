import Anthropic from '@anthropic-ai/sdk'

// MCP tool definitions — these are passed to Claude so it knows what tools exist
// Actual tool execution happens in the MCP servers
export const BIZBOT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_knowledge_base',
    description: 'Search the business knowledge base for menus, FAQs, service info, policies, etc.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'What to search for' },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_order',
    description: 'Create a food/product order for the customer. Use after confirming items and quantities.',
    input_schema: {
      type: 'object' as const,
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'number' },
              price: { type: 'string' },
            },
            required: ['name', 'quantity', 'price'],
          },
        },
        delivery_type: { type: 'string', enum: ['pickup', 'delivery', 'dine_in'] },
        delivery_address: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['items'],
    },
  },
  {
    name: 'check_availability',
    description: 'Check available appointment slots for a service on a given date.',
    input_schema: {
      type: 'object' as const,
      properties: {
        service_name: { type: 'string' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        preferred_time: { type: 'string', description: 'Preferred time in HH:mm format (optional)' },
      },
      required: ['service_name', 'date'],
    },
  },
  {
    name: 'create_appointment',
    description: 'Book an appointment for a customer after confirming date, time, and service.',
    input_schema: {
      type: 'object' as const,
      properties: {
        service_name: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        start_time: { type: 'string', description: 'HH:mm' },
        notes: { type: 'string' },
      },
      required: ['service_name', 'date', 'start_time'],
    },
  },
  {
    name: 'create_payment_link',
    description: 'Generate a Razorpay payment link to collect payment from the customer.',
    input_schema: {
      type: 'object' as const,
      properties: {
        amount: { type: 'string', description: 'Amount in INR' },
        description: { type: 'string', description: 'What the payment is for' },
        order_id: { type: 'string', description: 'Associated order ID if applicable' },
        appointment_id: { type: 'string', description: 'Associated appointment ID if applicable' },
      },
      required: ['amount', 'description'],
    },
  },
  {
    name: 'escalate_to_human',
    description: 'Transfer the conversation to a human agent when the query is too complex, customer is upset, or requires human judgment.',
    input_schema: {
      type: 'object' as const,
      properties: {
        reason: { type: 'string', description: 'Why the conversation needs human attention' },
      },
      required: ['reason'],
    },
  },
]
