import { createClient } from '@supabase/supabase-js';
import { Product, Customer, Sale } from '../types';

// Supabase Environment configuration
const metaEnv = (import.meta as any).env || {};
const supabaseUrl = (metaEnv.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env.SUPABASE_URL : '') || '').trim();
const supabaseAnonKey = (metaEnv.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env.SUPABASE_ANON_KEY : '') || '').trim();

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

export const supabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Alias for compatibility
export const supabase = supabaseClient;

export async function checkSupabaseConnection() {
  if (!isSupabaseConfigured || !supabaseClient) {
    throw new Error('Supabase não está configurado. Por favor, configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.');
  }
}

// Row mapping helpers
function mapProductFromRow(row: any): Product {
  return {
    id: row.id,
    name: row.name || '',
    brand: row.brand || '',
    category: row.category || 'outros',
    gender: row.gender || 'todos',
    costPrice: Number(row.cost_price ?? row.costPrice ?? 0),
    sellPrice: Number(row.sell_price ?? row.sellPrice ?? 0),
    quantity: Number(row.quantity ?? 0),
    minQuantity: row.min_quantity !== undefined ? Number(row.min_quantity) : (row.minQuantity !== undefined ? Number(row.minQuantity) : 2),
    photoUrl: row.photo_url ?? row.photoUrl ?? undefined,
  };
}

function mapProductToRow(product: Omit<Product, 'id'> & { id?: string }) {
  const row: any = {
    name: product.name || '',
    brand: product.brand || '',
    category: product.category || 'outros',
    gender: product.gender || 'todos',
    cost_price: product.costPrice ?? 0,
    sell_price: product.sellPrice ?? 0,
    quantity: product.quantity ?? 0,
    min_quantity: product.minQuantity ?? 2,
    photo_url: product.photoUrl || null,
  };
  if (product.id) {
    row.id = product.id;
  }
  return row;
}

function mapCustomerFromRow(row: any): Customer {
  return {
    id: row.id,
    name: row.name || '',
    whatsapp: row.phone ?? row.whatsapp ?? '',
    notes: row.notes || '',
  };
}

function mapCustomerToRow(customer: Omit<Customer, 'id'> & { id?: string }) {
  const row: any = {
    name: customer.name || '',
    phone: customer.whatsapp || '',
    notes: customer.notes || null,
  };
  if (customer.id) {
    row.id = customer.id;
  }
  return row;
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
    id: row.id,
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

function mapSaleToRow(sale: Omit<Sale, 'id'> & { id?: string }) {
  const row: any = {
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
  if (sale.id) {
    row.id = sale.id;
  }
  return row;
}

// Fetch Products
export async function fetchProducts(): Promise<Product[]> {
  await checkSupabaseConnection();
  const { data, error } = await supabaseClient!
    .from('products')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('[Supabase Error] fetchProducts:', error);
    throw error;
  }
  return (data || []).map(mapProductFromRow);
}

// Fetch Customers
export async function fetchCustomers(): Promise<Customer[]> {
  await checkSupabaseConnection();
  const { data, error } = await supabaseClient!
    .from('customers')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('[Supabase Error] fetchCustomers:', error);
    throw error;
  }
  return (data || []).map(mapCustomerFromRow);
}

// Fetch Sales
export async function fetchSales(): Promise<Sale[]> {
  await checkSupabaseConnection();
  const { data, error } = await supabaseClient!
    .from('sales')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('[Supabase Error] fetchSales:', error);
    throw error;
  }
  return (data || []).map(mapSaleFromRow);
}

// Save Product (Upsert)
export async function saveProductToSupabase(product: Product): Promise<Product> {
  await checkSupabaseConnection();
  const { data, error } = await supabaseClient!
    .from('products')
    .upsert(mapProductToRow(product))
    .select()
    .single();

  if (error) {
    console.error('[Supabase Error] saveProductToSupabase:', error);
    throw error;
  }
  return mapProductFromRow(data);
}

// Delete Product
export async function deleteProductFromSupabase(id: string): Promise<void> {
  await checkSupabaseConnection();
  const { error } = await supabaseClient!
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Supabase Error] deleteProductFromSupabase:', error);
    throw error;
  }
}

// Save Customer (Upsert)
export async function saveCustomerToSupabase(customer: Customer): Promise<Customer> {
  await checkSupabaseConnection();
  const { data, error } = await supabaseClient!
    .from('customers')
    .upsert(mapCustomerToRow(customer))
    .select()
    .single();

  if (error) {
    console.error('[Supabase Error] saveCustomerToSupabase:', error);
    throw error;
  }
  return mapCustomerFromRow(data);
}

// Delete Customer
export async function deleteCustomerFromSupabase(id: string): Promise<void> {
  await checkSupabaseConnection();
  const { error } = await supabaseClient!
    .from('customers')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Supabase Error] deleteCustomerFromSupabase:', error);
    throw error;
  }
}

// Save Sale (Upsert)
export async function saveSaleToSupabase(sale: Sale): Promise<Sale> {
  await checkSupabaseConnection();
  const { data, error } = await supabaseClient!
    .from('sales')
    .upsert(mapSaleToRow(sale))
    .select()
    .single();

  if (error) {
    console.error('[Supabase Error] saveSaleToSupabase:', error);
    throw error;
  }
  return mapSaleFromRow(data);
}

// Delete Sale
export async function deleteSaleFromSupabase(id: string): Promise<void> {
  await checkSupabaseConnection();
  const { error } = await supabaseClient!
    .from('sales')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Supabase Error] deleteSaleFromSupabase:', error);
    throw error;
  }
}

// Realtime Subscriptions via supabaseClient.channel().on().subscribe()
export function subscribeToProducts(callback: (products: Product[]) => void) {
  if (!isSupabaseConfigured || !supabaseClient) return () => {};

  fetchProducts().then(callback).catch(console.error);

  const channel = supabaseClient
    .channel('public:products')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async () => {
      try {
        const prods = await fetchProducts();
        callback(prods);
      } catch (e) {
        console.error(e);
      }
    })
    .subscribe();

  return () => {
    supabaseClient.removeChannel(channel);
  };
}

export function subscribeToCustomers(callback: (customers: Customer[]) => void) {
  if (!isSupabaseConfigured || !supabaseClient) return () => {};

  fetchCustomers().then(callback).catch(console.error);

  const channel = supabaseClient
    .channel('public:customers')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, async () => {
      try {
        const custs = await fetchCustomers();
        callback(custs);
      } catch (e) {
        console.error(e);
      }
    })
    .subscribe();

  return () => {
    supabaseClient.removeChannel(channel);
  };
}

export function subscribeToSales(callback: (sales: Sale[]) => void) {
  if (!isSupabaseConfigured || !supabaseClient) return () => {};

  fetchSales().then(callback).catch(console.error);

  const channel = supabaseClient
    .channel('public:sales')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, async () => {
      try {
        const sales = await fetchSales();
        callback(sales);
      } catch (e) {
        console.error(e);
      }
    })
    .subscribe();

  return () => {
    supabaseClient.removeChannel(channel);
  };
}

// Reset Supabase DB with new or default data
export async function resetSupabaseWithData(
  initialProducts: Product[],
  initialCustomers: Customer[],
  initialSales: Sale[]
): Promise<void> {
  await checkSupabaseConnection();

  try {
    await supabaseClient!.from('products').delete().neq('id', '');
    await supabaseClient!.from('customers').delete().neq('id', '');
    await supabaseClient!.from('sales').delete().neq('id', '');

    if (initialProducts.length > 0) {
      await supabaseClient!.from('products').upsert(initialProducts.map(mapProductToRow));
    }
    if (initialCustomers.length > 0) {
      await supabaseClient!.from('customers').upsert(initialCustomers.map(mapCustomerToRow));
    }
    if (initialSales.length > 0) {
      await supabaseClient!.from('sales').upsert(initialSales.map(mapSaleToRow));
    }
  } catch (error) {
    console.error('[Supabase Error] resetSupabaseWithData:', error);
    throw error;
  }
}
