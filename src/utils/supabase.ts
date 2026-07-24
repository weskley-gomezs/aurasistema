import { createClient } from '@supabase/supabase-js';
import { Product, Customer, Sale } from '../types';
import { INITIAL_PRODUCTS, INITIAL_CUSTOMERS, INITIAL_SALES } from './initialData';

// Supabase Environment configuration
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env.SUPABASE_URL : '') || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env.SUPABASE_ANON_KEY : '') || '').trim();

function isValidHttpUrl(urlString: string): boolean {
  if (!urlString) return false;
  try {
    const parsed = new URL(urlString);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

export const isSupabaseConfigured = isValidHttpUrl(supabaseUrl) && !!supabaseAnonKey && !supabaseAnonKey.includes('placeholder');

console.log('[Supabase Debug] isSupabaseConfigured:', isSupabaseConfigured);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Alias to maintain compatibility with existing components
export const isFirebaseConfigured = isSupabaseConfigured;

// Helper to generate a valid UUID v4
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback RFC4122 v4 UUID generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Row mapping helpers for flexible column naming (snake_case or camelCase)
function mapProductFromRow(row: any): Product {
  return {
    id: row.id || generateUUID(),
    name: row.name || '',
    brand: row.brand || '',
    category: row.category || 'outros',
    costPrice: Number(row.cost_price ?? row.costPrice ?? 0),
    sellPrice: Number(row.sell_price ?? row.sellPrice ?? 0),
    quantity: Number(row.quantity ?? 0),
    minQuantity: row.min_quantity !== undefined ? Number(row.min_quantity) : (row.minQuantity !== undefined ? Number(row.minQuantity) : undefined),
    photoUrl: row.photo_url ?? row.photoUrl ?? undefined,
  };
}

function mapProductToRow(product: Product) {
  const validId = (product.id && String(product.id).trim() !== '') ? String(product.id) : generateUUID();
  return {
    id: validId,
    name: product.name || '',
    brand: product.brand || '',
    category: product.category || 'outros',
    cost_price: product.costPrice ?? 0,
    sell_price: product.sellPrice ?? 0,
    quantity: product.quantity ?? 0,
    min_quantity: product.minQuantity ?? 2,
    photo_url: product.photoUrl || null,
  };
}

function mapCustomerFromRow(row: any): Customer {
  return {
    id: row.id || generateUUID(),
    name: row.name || '',
    phone: row.phone || '',
    address: row.address || '',
    notes: row.notes || undefined,
  };
}

function mapCustomerToRow(customer: Customer) {
  const validId = (customer.id && String(customer.id).trim() !== '') ? String(customer.id) : generateUUID();
  return {
    id: validId,
    name: customer.name || '',
    phone: customer.phone || '',
    address: customer.address || '',
    notes: customer.notes || null,
  };
}

function mapSaleFromRow(row: any): Sale {
  let items = row.items;
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch (e) {
      items = [];
    }
  }
  return {
    id: row.id || generateUUID(),
    date: row.date || new Date().toISOString().split('T')[0],
    customerId: row.customer_id ?? row.customerId ?? 'venda_avulsa',
    customerName: row.customer_name ?? row.customerName ?? 'Cliente Avulso',
    items: Array.isArray(items) ? items : [],
    totalAmount: Number(row.total_amount ?? row.totalAmount ?? 0),
    profitAmount: Number(row.profit_amount ?? row.profitAmount ?? 0),
    paymentMethod: row.payment_method ?? row.paymentMethod ?? 'Pix',
    status: row.status ?? 'pago',
    paidDate: row.paid_date ?? row.paidDate ?? undefined,
    dueDate: row.due_date ?? row.dueDate ?? undefined,
  };
}

function mapSaleToRow(sale: Sale) {
  const validId = (sale.id && String(sale.id).trim() !== '') ? String(sale.id) : generateUUID();
  return {
    id: validId,
    date: sale.date || new Date().toISOString().split('T')[0],
    customer_id: sale.customerId || 'venda_avulsa',
    customer_name: sale.customerName || 'Cliente Avulso',
    items: sale.items || [],
    total_amount: sale.totalAmount ?? 0,
    profit_amount: sale.profitAmount ?? 0,
    payment_method: sale.paymentMethod || 'Pix',
    status: sale.status || 'pago',
    paid_date: sale.paidDate || null,
    due_date: sale.dueDate || null,
  };
}

// Fetch Products
export async function fetchProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured || !supabase) {
    const local = localStorage.getItem('aura_products');
    return local ? JSON.parse(local) : [];
  }
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('[Supabase Error] fetchProducts:', error);
    const local = localStorage.getItem('aura_products');
    return local ? JSON.parse(local) : [];
  }
  return (data || []).map(mapProductFromRow);
}

// Fetch Customers
export async function fetchCustomers(): Promise<Customer[]> {
  if (!isSupabaseConfigured || !supabase) {
    const local = localStorage.getItem('aura_customers');
    return local ? JSON.parse(local) : [];
  }
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('[Supabase Error] fetchCustomers:', error);
    const local = localStorage.getItem('aura_customers');
    return local ? JSON.parse(local) : [];
  }
  return (data || []).map(mapCustomerFromRow);
}

// Fetch Sales
export async function fetchSales(): Promise<Sale[]> {
  if (!isSupabaseConfigured || !supabase) {
    const local = localStorage.getItem('aura_sales');
    return local ? JSON.parse(local) : [];
  }
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('[Supabase Error] fetchSales:', error);
    const local = localStorage.getItem('aura_sales');
    return local ? JSON.parse(local) : [];
  }
  return (data || []).map(mapSaleFromRow);
}

// Save Product
export async function saveProductToSupabase(product: Product): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  if (!product.id || String(product.id).trim() === '') {
    product.id = generateUUID();
  }
  const { error } = await supabase
    .from('products')
    .upsert(mapProductToRow(product));

  if (error) {
    console.error('[Supabase Error] saveProductToSupabase:', error);
    throw error;
  }
}

// Delete Product
export async function deleteProductFromSupabase(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Supabase Error] deleteProductFromSupabase:', error);
    throw error;
  }
}

// Save Customer
export async function saveCustomerToSupabase(customer: Customer): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  if (!customer.id || String(customer.id).trim() === '') {
    customer.id = generateUUID();
  }
  const { error } = await supabase
    .from('customers')
    .upsert(mapCustomerToRow(customer));

  if (error) {
    console.error('[Supabase Error] saveCustomerToSupabase:', error);
    throw error;
  }
}

// Delete Customer
export async function deleteCustomerFromSupabase(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Supabase Error] deleteCustomerFromSupabase:', error);
    throw error;
  }
}

// Save Sale
export async function saveSaleToSupabase(sale: Sale): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  if (!sale.id || String(sale.id).trim() === '') {
    sale.id = generateUUID();
  }
  const { error } = await supabase
    .from('sales')
    .upsert(mapSaleToRow(sale));

  if (error) {
    console.error('[Supabase Error] saveSaleToSupabase:', error);
    throw error;
  }
}

// Delete Sale
export async function deleteSaleFromSupabase(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('sales')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Supabase Error] deleteSaleFromSupabase:', error);
    throw error;
  }
}

// Aliases for Firebase function names so existing components continue working transparently
export const saveProductToFirestore = saveProductToSupabase;
export const deleteProductFromFirestore = deleteProductFromSupabase;
export const saveCustomerToFirestore = saveCustomerToSupabase;
export const deleteCustomerFromFirestore = deleteCustomerFromSupabase;
export const saveSaleToFirestore = saveSaleToSupabase;
export const deleteSaleFromFirestore = deleteSaleFromSupabase;

// Realtime Subscriptions
export function subscribeToProducts(callback: (products: Product[]) => void) {
  if (!isSupabaseConfigured || !supabase) return () => {};

  fetchProducts().then(callback);

  const channel = supabase
    .channel('products_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async () => {
      const prods = await fetchProducts();
      callback(prods);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToCustomers(callback: (customers: Customer[]) => void) {
  if (!isSupabaseConfigured || !supabase) return () => {};

  fetchCustomers().then(callback);

  const channel = supabase
    .channel('customers_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, async () => {
      const custs = await fetchCustomers();
      callback(custs);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToSales(callback: (sales: Sale[]) => void) {
  if (!isSupabaseConfigured || !supabase) return () => {};

  fetchSales().then(callback);

  const channel = supabase
    .channel('sales_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, async () => {
      const sales = await fetchSales();
      callback(sales);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Migrate Local/Server Data to Supabase
export async function migrateLocalDataToSupabase(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const existingProducts = await fetchProducts();
    if (existingProducts.length > 0) {
      console.log('[Supabase] O banco de dados já contém dados. Pulando migração inicial.');
      return true;
    }

    console.log('[Supabase] Iniciando migração para o Supabase...');

    const localProds = localStorage.getItem('aura_products');
    const localCusts = localStorage.getItem('aura_customers');
    const localSales = localStorage.getItem('aura_sales');

    let products: Product[] = localProds ? JSON.parse(localProds) : INITIAL_PRODUCTS;
    let customers: Customer[] = localCusts ? JSON.parse(localCusts) : INITIAL_CUSTOMERS;
    let sales: Sale[] = localSales ? JSON.parse(localSales) : INITIAL_SALES;

    // Optional sync from server endpoint /api/data
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const serverData = await res.json();
        if (serverData.products?.length > products.length) products = serverData.products;
        if (serverData.customers?.length > customers.length) customers = serverData.customers;
        if (serverData.sales?.length > sales.length) sales = serverData.sales;
      }
    } catch (e) {
      console.warn('[Supabase] Não foi possível ler /api/data:', e);
    }

    if (products.length > 0) {
      await supabase.from('products').upsert(products.map(mapProductToRow));
    }
    if (customers.length > 0) {
      await supabase.from('customers').upsert(customers.map(mapCustomerToRow));
    }
    if (sales.length > 0) {
      await supabase.from('sales').upsert(sales.map(mapSaleToRow));
    }

    console.log('[Supabase] Migração inicial concluída com sucesso!');
    return true;
  } catch (error) {
    console.error('[Supabase Error] migrateLocalDataToSupabase:', error);
    return false;
  }
}

export const migrateLocalDataToFirestore = migrateLocalDataToSupabase;

// Reset Supabase DB with new or default data
export async function resetSupabaseWithData(
  initialProducts: Product[],
  initialCustomers: Customer[],
  initialSales: Sale[]
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    await supabase.from('products').delete().neq('id', '');
    await supabase.from('customers').delete().neq('id', '');
    await supabase.from('sales').delete().neq('id', '');

    if (initialProducts.length > 0) {
      await supabase.from('products').upsert(initialProducts.map(mapProductToRow));
    }
    if (initialCustomers.length > 0) {
      await supabase.from('customers').upsert(initialCustomers.map(mapCustomerToRow));
    }
    if (initialSales.length > 0) {
      await supabase.from('sales').upsert(initialSales.map(mapSaleToRow));
    }
  } catch (error) {
    console.error('[Supabase Error] resetSupabaseWithData:', error);
    throw error;
  }
}

export const resetFirestoreWithData = resetSupabaseWithData;

// Sync state to Supabase
export async function syncStateToSupabase(
  products: Product[],
  customers: Customer[],
  sales: Sale[]
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    if (products.length > 0) {
      await supabase.from('products').upsert(products.map(mapProductToRow));
    }
    if (customers.length > 0) {
      await supabase.from('customers').upsert(customers.map(mapCustomerToRow));
    }
    if (sales.length > 0) {
      await supabase.from('sales').upsert(sales.map(mapSaleToRow));
    }
  } catch (error) {
    console.error('[Supabase Error] syncStateToSupabase:', error);
    throw error;
  }
}

export const syncStateToFirestore = syncStateToSupabase;
