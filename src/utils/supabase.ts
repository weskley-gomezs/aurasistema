import { createClient } from '@supabase/supabase-js';
import { Product, Customer, Sale, Encomenda } from '../types';

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

// Auth Helpers
export async function getCurrentSession() {
  if (!isSupabaseConfigured || !supabaseClient) return null;
  const { data: { session }, error } = await supabaseClient.auth.getSession();
  if (error) console.error('[Supabase Auth Error] getSession:', error);
  return session;
}

export async function getCurrentUser() {
  if (!isSupabaseConfigured || !supabaseClient) return null;
  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error) console.error('[Supabase Auth Error] getUser:', error);
  return user;
}

export async function signOutUser() {
  if (!isSupabaseConfigured || !supabaseClient) return;
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    console.error('[Supabase Auth Error] signOut:', error);
    throw error;
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
    originalPrice: row.original_price != null ? Number(row.original_price) : undefined,
    quantity: Number(row.quantity ?? 0),
    minQuantity: row.min_quantity !== undefined ? Number(row.min_quantity) : (row.minQuantity !== undefined ? Number(row.minQuantity) : 2),
    photoUrl: row.photo_url ?? row.photoUrl ?? undefined,
    featured: row.featured ?? false,
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
    original_price: product.originalPrice ?? null,
    quantity: product.quantity ?? 0,
    min_quantity: product.minQuantity ?? 2,
    photo_url: product.photoUrl || null,
    featured: product.featured ?? false,
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
let productsFetchPromise: Promise<Product[]> | null = null;

export async function fetchProducts(): Promise<Product[]> {
  if (productsFetchPromise) return productsFetchPromise;

  productsFetchPromise = (async () => {
    try {
      await checkSupabaseConnection();
      const { data, error } = await supabaseClient!
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        if (error.code !== '42P01' && !error.message?.includes('does not exist')) {
          console.error('[Supabase Error] fetchProducts:', error);
        }
        return [];
      }
      return (data || []).map(mapProductFromRow);
    } catch (err) {
      console.error('[Supabase Catch Error] fetchProducts:', err);
      return [];
    } finally {
      productsFetchPromise = null;
    }
  })();
  
  return productsFetchPromise;
}

// Fetch Customers
let customersFetchPromise: Promise<Customer[]> | null = null;

export async function fetchCustomers(): Promise<Customer[]> {
  if (customersFetchPromise) return customersFetchPromise;

  customersFetchPromise = (async () => {
    try {
      await checkSupabaseConnection();
      const { data, error } = await supabaseClient!
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        if (error.code !== '42P01' && !error.message?.includes('does not exist')) {
          console.error('[Supabase Error] fetchCustomers:', error);
        }
        return [];
      }
      return (data || []).map(mapCustomerFromRow);
    } catch (err) {
      console.error('[Supabase Catch Error] fetchCustomers:', err);
      return [];
    } finally {
      customersFetchPromise = null;
    }
  })();
  
  return customersFetchPromise;
}

// Fetch Sales
let salesFetchPromise: Promise<Sale[]> | null = null;

export async function fetchSales(): Promise<Sale[]> {
  if (salesFetchPromise) return salesFetchPromise;

  salesFetchPromise = (async () => {
    try {
      await checkSupabaseConnection();
      const { data, error } = await supabaseClient!
        .from('sales')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        if (error.code !== '42P01' && !error.message?.includes('does not exist')) {
          console.error('[Supabase Error] fetchSales:', error);
        }
        return [];
      }
      return (data || []).map(mapSaleFromRow);
    } catch (err) {
      console.error('[Supabase Catch Error] fetchSales:', err);
      return [];
    } finally {
      salesFetchPromise = null;
    }
  })();
  
  return salesFetchPromise;
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

// Queue/Debounce Helper para impedir requisições simultâneas e repetitivas
function createDebouncedFetchLock<T>(fetchFn: () => Promise<T>, callback: (data: T) => void, delay: number = 300) {
  let timeoutId: any = null;
  let isFetching = false;
  let hasPendingEvent = false;

  const executeFetch = async () => {
    if (isFetching) {
      hasPendingEvent = true; // Coloca na fila se já houver uma requisição em andamento
      return;
    }
    
    isFetching = true;
    try {
      const data = await fetchFn();
      callback(data);
    } catch (e) {
      console.error(e);
    } finally {
      isFetching = false;
      if (hasPendingEvent) {
        hasPendingEvent = false;
        timeoutId = setTimeout(executeFetch, delay);
      }
    }
  };

  return () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(executeFetch, delay);
  };
}

// Realtime Subscriptions via supabaseClient.channel().on().subscribe()
export function subscribeToProducts(callback: (products: Product[]) => void) {
  if (!isSupabaseConfigured || !supabaseClient) return () => {};

  fetchProducts().then(callback).catch(console.error);

  const handleEvent = createDebouncedFetchLock(fetchProducts, callback, 300);

  const channel = supabaseClient
    .channel('public:products')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, handleEvent)
    .subscribe();

  return () => {
    supabaseClient.removeChannel(channel);
  };
}

export function subscribeToCustomers(callback: (customers: Customer[]) => void) {
  if (!isSupabaseConfigured || !supabaseClient) return () => {};

  fetchCustomers().then(callback).catch(console.error);

  const handleEvent = createDebouncedFetchLock(fetchCustomers, callback, 300);

  const channel = supabaseClient
    .channel('public:customers')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, handleEvent)
    .subscribe();

  return () => {
    supabaseClient.removeChannel(channel);
  };
}

export function subscribeToSales(callback: (sales: Sale[]) => void) {
  if (!isSupabaseConfigured || !supabaseClient) return () => {};

  fetchSales().then(callback).catch(console.error);

  const handleEvent = createDebouncedFetchLock(fetchSales, callback, 300);

  const channel = supabaseClient
    .channel('public:sales')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, handleEvent)
    .subscribe();

  return () => {
    supabaseClient.removeChannel(channel);
  };
}

// Fetch Encomendas
let encomendasFetchPromise: Promise<Encomenda[]> | null = null;

export async function fetchEncomendas(): Promise<Encomenda[]> {
  if (encomendasFetchPromise) return encomendasFetchPromise;

  encomendasFetchPromise = (async () => {
    try {
      await checkSupabaseConnection();
      const { data, error } = await supabaseClient!
        .from('encomendas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code !== '42P01' && !error.message?.includes('does not exist')) {
          console.error('[Supabase Error] fetchEncomendas:', error);
        }
        return []; // Return empty if table doesn't exist yet so app doesn't crash
      }
      return (data || []).map(mapEncomendaFromRow);
    } catch (err) {
      console.error('[Supabase Catch Error] fetchEncomendas:', err);
      return [];
    } finally {
      encomendasFetchPromise = null;
    }
  })();
  
  return encomendasFetchPromise;
}

// Save Encomenda (Upsert)
export async function saveEncomendaToSupabase(encomenda: Omit<Encomenda, 'id'> & { id?: string }): Promise<Encomenda> {
  await checkSupabaseConnection();
  const { data, error } = await supabaseClient!
    .from('encomendas')
    .upsert(mapEncomendaToRow(encomenda))
    .select()
    .single();

  if (error) {
    console.error('[Supabase Error] saveEncomendaToSupabase:', error);
    throw error;
  }
  return mapEncomendaFromRow(data);
}

// Delete Encomenda
export async function deleteEncomendaFromSupabase(id: string): Promise<void> {
  await checkSupabaseConnection();
  const { error } = await supabaseClient!
    .from('encomendas')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Supabase Error] deleteEncomendaFromSupabase:', error);
    throw error;
  }
}

// Create or Get Customer by Phone
export async function createOrGetCustomerByPhone(name: string, phone: string): Promise<Customer> {
  await checkSupabaseConnection();
  const cleanedPhone = phone.replace(/\D/g, '');
  const trimmedName = name.trim();

  // Check if customer exists by phone
  const { data, error } = await supabaseClient!
    .from('customers')
    .select('*')
    .or(`phone.eq.${cleanedPhone},phone.eq.${phone}`);

  if (data && data.length > 0) {
    return mapCustomerFromRow(data[0]);
  }

  // Create new customer
  const newCust = {
    name: trimmedName,
    whatsapp: cleanedPhone,
    notes: 'Cadastrado automaticamente via Catálogo (Encomenda)'
  } as Customer;
  return await saveCustomerToSupabase(newCust);
}

// Mapping Encomenda
function mapEncomendaFromRow(row: any): Encomenda {
  return {
    id: row.id,
    customerId: row.customer_id ?? row.customerId ?? undefined,
    customerName: row.customer_name ?? row.customerName ?? '',
    customerPhone: row.customer_phone ?? row.customerPhone ?? '',
    productId: row.product_id ?? row.productId ?? undefined,
    productName: row.product_name ?? row.productName ?? '',
    productPrice: row.product_price != null ? Number(row.product_price) : undefined,
    quantity: row.quantity != null ? Number(row.quantity) : 1,
    paymentMethodOnArrival: row.payment_method_on_arrival ?? row.paymentMethodOnArrival ?? 'Pix',
    expectedDate: row.expected_date ?? row.expectedDate ?? undefined,
    status: row.status ?? 'pendente',
    createdAt: row.created_at ?? new Date().toISOString()
  };
}

function mapEncomendaToRow(enc: Omit<Encomenda, 'id'> & { id?: string }) {
  const row: any = {
    customer_id: enc.customerId || null,
    customer_name: enc.customerName || '',
    customer_phone: enc.customerPhone || '',
    product_id: enc.productId || null,
    product_name: enc.productName || '',
    product_price: enc.productPrice ?? null,
    quantity: enc.quantity ?? 1,
    payment_method_on_arrival: enc.paymentMethodOnArrival || 'Pix',
    expected_date: enc.expectedDate || null,
    status: enc.status || 'pendente',
  };
  if (enc.id) {
    row.id = enc.id;
  }
  return row;
}

// Realtime subscription for encomendas
export function subscribeToEncomendas(callback: (encomendas: Encomenda[]) => void) {
  if (!isSupabaseConfigured || !supabaseClient) return () => {};

  fetchEncomendas().then(callback).catch(console.error);

  const handleEvent = createDebouncedFetchLock(fetchEncomendas, callback, 300);

  const channel = supabaseClient
    .channel('public:encomendas')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'encomendas' }, handleEvent)
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
    try {
      await supabaseClient!.from('encomendas').delete().neq('id', '');
    } catch {
      // table might not exist yet
    }

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

