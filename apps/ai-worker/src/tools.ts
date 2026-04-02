import Anthropic from '@anthropic-ai/sdk'

// MCP tool definitions — passed to Claude so it knows what tools are available.
// Tool execution is handled by the MCP microservices called from processor.ts.
export const BIZBOT_TOOLS: Anthropic.Tool[] = [
  // ── Knowledge Base ────────────────────────────────────────────────────────
  {
    name: 'search_knowledge_base',
    description: 'Search the business knowledge base for menus, FAQs, service info, policies, pricing, hours, location, etc. Always search before answering questions about the business.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'What to search for' },
      },
      required: ['query'],
    },
  },

  // ── Menu / Catalog ────────────────────────────────────────────────────────
  {
    name: 'list_menu',
    description: 'List menu items or products. Use when customer asks about what is available, pricing, or wants to browse items.',
    input_schema: {
      type: 'object' as const,
      properties: {
        category: { type: 'string', description: 'Filter by category (optional)' },
      },
      required: [],
    },
  },

  // ── Orders ────────────────────────────────────────────────────────────────
  {
    name: 'create_order',
    description: 'Create a food/product order for the customer. Only use after confirming all items, quantities, and delivery type with the customer.',
    input_schema: {
      type: 'object' as const,
      properties: {
        items: {
          type: 'array',
          description: 'List of ordered items',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'number' },
              price: { type: 'string', description: 'Price per unit in INR' },
              notes: { type: 'string', description: 'Special instructions for this item' },
            },
            required: ['name', 'quantity', 'price'],
          },
        },
        delivery_type: { type: 'string', enum: ['pickup', 'delivery', 'dine_in'] },
        delivery_address: { type: 'string', description: 'Required if delivery_type is delivery' },
        notes: { type: 'string', description: 'Order-level notes or special requests' },
      },
      required: ['items', 'delivery_type'],
    },
  },
  {
    name: 'get_order',
    description: 'Check the status of an existing order.',
    input_schema: {
      type: 'object' as const,
      properties: {
        order_id: { type: 'string', description: 'Order UUID' },
        order_number: { type: 'string', description: 'Human-readable order number like BIZ-123456-ABC' },
      },
      required: [],
    },
  },

  // ── Appointments / Booking ────────────────────────────────────────────────
  {
    name: 'list_services',
    description: 'List available services offered by the business with pricing and duration. Use when customer asks what services are available.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'check_availability',
    description: 'Check available appointment slots for a service on a given date. Always call this before create_appointment.',
    input_schema: {
      type: 'object' as const,
      properties: {
        service_name: { type: 'string', description: 'Name of the service to book' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        preferred_time: { type: 'string', description: 'Preferred time in HH:mm format (optional)' },
      },
      required: ['service_name', 'date'],
    },
  },
  {
    name: 'create_appointment',
    description: 'Book an appointment after confirming service, date, and time with the customer.',
    input_schema: {
      type: 'object' as const,
      properties: {
        service_name: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        start_time: { type: 'string', description: 'HH:mm (24h format)' },
        notes: { type: 'string', description: 'Any special requests' },
      },
      required: ['service_name', 'date', 'start_time'],
    },
  },

  // ── Payments ──────────────────────────────────────────────────────────────
  {
    name: 'create_payment_link',
    description: 'Generate a Razorpay payment link to collect payment. Use after creating an order or appointment.',
    input_schema: {
      type: 'object' as const,
      properties: {
        amount: { type: 'string', description: 'Amount in INR (e.g. "499.00")' },
        description: { type: 'string', description: 'What the payment is for' },
        order_id: { type: 'string', description: 'Associated order ID if applicable' },
        appointment_id: { type: 'string', description: 'Associated appointment ID if applicable' },
      },
      required: ['amount', 'description'],
    },
  },
  {
    name: 'check_payment_status',
    description: 'Check whether a payment has been completed.',
    input_schema: {
      type: 'object' as const,
      properties: {
        order_id: { type: 'string' },
        appointment_id: { type: 'string' },
        payment_link_id: { type: 'string' },
      },
      required: [],
    },
  },

  // ── Human Escalation ──────────────────────────────────────────────────────
  {
    name: 'escalate_to_human',
    description: 'Transfer the conversation to a human agent when: the query is too complex, customer is upset or angry, requires human judgment, or explicitly asks for a human.',
    input_schema: {
      type: 'object' as const,
      properties: {
        reason: { type: 'string', description: 'Why the conversation needs human attention' },
      },
      required: ['reason'],
    },
  },
]
