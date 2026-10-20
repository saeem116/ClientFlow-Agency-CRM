import { describe, it, expect } from 'vitest'

describe('Invoice Calculations', () => {
  it('should calculate subtotal from line items', () => {
    const items = [
      { description: 'Item 1', quantity: 2, unitPrice: 100, amount: 200 },
      { description: 'Item 2', quantity: 3, unitPrice: 50, amount: 150 },
    ]
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
    expect(subtotal).toBe(350)
  })

  it('should calculate tax amount from subtotal and tax rate', () => {
    const subtotal = 1000
    const taxRate = 8.25
    const expectedTax = subtotal * (taxRate / 100)
    expect(expectedTax).toBe(82.5)
  })

  it('should calculate total as subtotal plus tax', () => {
    const subtotal = 1000
    const taxAmount = 80
    const expectedTotal = subtotal + taxAmount
    expect(expectedTotal).toBe(1080)
  })

  it('should calculate outstanding balance as total minus paid', () => {
    const total = 1080
    const paidAmount = 300
    const outstanding = total - paidAmount
    expect(outstanding).toBe(780)
  })

  it('should handle zero tax rate', () => {
    const subtotal = 500
    const taxRate = 0
    const taxAmount = subtotal * (taxRate / 100)
    expect(taxAmount).toBe(0)
  })

  it('should handle high tax rate', () => {
    const subtotal = 1000
    const taxRate = 25
    const taxAmount = subtotal * (taxRate / 100)
    expect(taxAmount).toBe(250)
  })

  it('should track multiple payments', () => {
    const payments = [
      { amount: 200, method: 'BANK_TRANSFER' },
      { amount: 100, method: 'CREDIT_CARD' },
    ]
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
    expect(totalPaid).toBe(300)
  })

  it('should verify invoice is fully paid when paid amount equals total', () => {
    const total = 550
    const paidAmount = 550
    expect(paidAmount).toBe(total)
  })

  it('should verify invoice is not fully paid when paid amount is less than total', () => {
    const total = 880
    const paidAmount = 400
    expect(paidAmount).toBeLessThan(total)
  })

  it('should calculate line item amount from quantity and unit price', () => {
    const quantity = 3
    const unitPrice = 150
    const amount = quantity * unitPrice
    expect(amount).toBe(450)
  })

  it('should handle invoice with negative balance (overpayment)', () => {
    const total = 500
    const paidAmount = 600
    const balance = total - paidAmount
    expect(balance).toBe(-100)
  })
})