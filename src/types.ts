export type Category = 'perfume' | 'creme' | 'kit' | 'outros';

export type Gender = 'masculino' | 'feminino' | 'todos';

export type PaymentMethod = 'Pix' | 'Dinheiro' | 'Cartão' | 'Fiado';

export interface Product {
  id: string;
  name: string;
  category: Category;
  gender?: Gender;
  brand: string;
  costPrice: number;
  sellPrice: number;
  originalPrice?: number;
  quantity: number;
  minQuantity: number;
  photoUrl?: string;
  featured?: boolean;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  sellPrice: number;
}

export interface Sale {
  id: string;
  date: string; // YYYY-MM-DD
  customerId: string; // "venda_avulsa" or actual customer id
  customerName: string;
  items: SaleItem[];
  totalAmount: number;
  profitAmount: number;
  paymentMethod: PaymentMethod;
  status: 'pago' | 'pendente'; // Fiados are 'pendente' until paid
  paidDate?: string;
  dueDate?: string; // YYYY-MM-DD (promised payment date)
}

export interface Customer {
  id: string;
  name: string;
  whatsapp: string;
  notes: string;
}
