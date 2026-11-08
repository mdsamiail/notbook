export type UserRole = 'owner' | 'manager' | 'employee'

export type TransactionType =
  | 'income'
  | 'expense'
  | 'sale'
  | 'purchase'
  | 'payment'
  | 'collection'

export interface Business {
  id: string
  name: string
  owner_id: string
  created_at: string
}

export interface Customer {
  id: string
  business_id: string
  name: string
  phone: string
  balance: number
  created_at: string
}

export interface Product {
  id: string
  business_id: string
  name: string
  sku: string
  purchase_price: number
  selling_price: number
  stock: number
}

export interface Transaction {
  id: string
  business_id: string
  customer_id?: string
  type: TransactionType
  amount: number
  description: string
  created_at: string
}

export interface AppUser {
  id: string
  name: string
  email: string
  role: UserRole
}