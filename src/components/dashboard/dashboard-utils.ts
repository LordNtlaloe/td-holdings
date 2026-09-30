export function formatCurrency(amount: number): string {
  return `R${amount.toFixed(2)}`
}

export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    month: 'short',
    day: 'numeric',
  })
}

export function formatTs(ts: number): string {
  return new Date(ts).toLocaleString('en-ZA', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getStatusVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'completed' || status === 'received') return 'default'
  if (status === 'refunded' || status === 'voided' || status === 'cancelled') return 'destructive'
  return 'secondary'
}

export function getTransferStatusVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'received') return 'default'
  if (status === 'cancelled') return 'destructive'
  if (status === 'in_transit') return 'secondary'
  return 'outline'
}

// ─── Human-readable action labels ────────────────────────────────────────────

const ACTION_MAP: Record<string, string> = {
  create_sale:        'Created sale',
  void_sale:          'Voided sale',
  refund_sale:        'Refunded sale',
  create_purchase:    'Created purchase',
  receive_purchase:   'Received purchase',
  cancel_purchase:    'Cancelled purchase',
  create_transfer:    'Created transfer',
  send_transfer:      'Dispatched transfer',
  receive_transfer:   'Received transfer',
  cancel_transfer:    'Cancelled transfer',
  add_inventory:      'Added inventory',
  adjust_inventory:   'Adjusted inventory',
  create_product:     'Created product',
  update_product:     'Updated product',
  delete_product:     'Deleted product',
  create_store:       'Created store',
  update_store:       'Updated store',
  create_user:        'Created user',
  update_user:        'Updated user',
  suspend_user:       'Suspended user',
  login:              'Logged in',
  logout:             'Logged out',
}

export function humanizeAction(action: string): string {
  if (ACTION_MAP[action]) return ACTION_MAP[action]
  // Fallback: replace underscores, title-case
  return action
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}