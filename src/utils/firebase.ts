import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  onSnapshot,
  query,
  orderBy,
  getDocFromServer
} from 'firebase/firestore';
import { Product, Customer, Sale } from '../types';
import { INITIAL_PRODUCTS, INITIAL_CUSTOMERS, INITIAL_SALES } from './initialData';
import firebaseConfig from '../../firebase-applet-config.json';

// Check if Firebase is configured with necessary configuration
export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId
);

console.log('[Firebase Debug] isFirebaseConfigured:', isFirebaseConfigured);

let app;
let db: any = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } catch (error) {
    console.error('Erro ao inicializar o Firebase:', error);
  }
}

export { db };

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null, // No auth implemented yet
      email: null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// MANDATORY: Test connection on boot
if (isFirebaseConfigured && db) {
  const testConnection = async () => {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
      console.log('[Firebase Debug] Conexão com Firestore validada com sucesso.');
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration.");
      }
    }
  };
  testConnection();
}

// Fetch all products
export async function fetchProducts(): Promise<Product[]> {
  if (!isFirebaseConfigured || !db) {
    const local = localStorage.getItem('aura_products');
    return local ? JSON.parse(local) : [];
  }
  const colRef = collection(db, 'products');
  const snapshot = await getDocs(colRef);
  const data: Product[] = [];
  snapshot.forEach((docSnap) => {
    data.push({ id: docSnap.id, ...docSnap.data() } as Product);
  });
  return data;
}

// Fetch all customers
export async function fetchCustomers(): Promise<Customer[]> {
  if (!isFirebaseConfigured || !db) {
    const local = localStorage.getItem('aura_customers');
    return local ? JSON.parse(local) : [];
  }
  const colRef = collection(db, 'customers');
  const snapshot = await getDocs(colRef);
  const data: Customer[] = [];
  snapshot.forEach((docSnap) => {
    data.push({ id: docSnap.id, ...docSnap.data() } as Customer);
  });
  return data;
}

// Fetch all sales
export async function fetchSales(): Promise<Sale[]> {
  if (!isFirebaseConfigured || !db) {
    const local = localStorage.getItem('aura_sales');
    return local ? JSON.parse(local) : [];
  }
  const colRef = collection(db, 'sales');
  const snapshot = await getDocs(colRef);
  const data: Sale[] = [];
  snapshot.forEach((docSnap) => {
    data.push({ id: docSnap.id, ...docSnap.data() } as Sale);
  });
  return data;
}

// Save single product
export async function saveProductToFirestore(product: Product): Promise<void> {
  console.log('[Firebase Debug] saveProductToFirestore chamado para:', product.name);
  if (!isFirebaseConfigured || !db) {
    console.warn('[Firebase Debug] Abortando saveProduct: Firebase não configurado ou DB nulo');
    return;
  }
  const path = `products/${product.id}`;
  const docRef = doc(db, 'products', product.id);
  try {
    await setDoc(docRef, product);
    console.log('[Firebase Debug] setDoc sucesso para produto:', product.id);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete product
export async function deleteProductFromFirestore(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const docRef = doc(db, 'products', id);
  await deleteDoc(docRef);
}

// Save customer
export async function saveCustomerToFirestore(customer: Customer): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const path = `customers/${customer.id}`;
  try {
    const docRef = doc(db, 'customers', customer.id);
    await setDoc(docRef, customer);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete customer
export async function deleteCustomerFromFirestore(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const docRef = doc(db, 'customers', id);
  await deleteDoc(docRef);
}

// Save sale
export async function saveSaleToFirestore(sale: Sale): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const path = `sales/${sale.id}`;
  try {
    const docRef = doc(db, 'sales', sale.id);
    await setDoc(docRef, sale);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete sale
export async function deleteSaleFromFirestore(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const docRef = doc(db, 'sales', id);
  await deleteDoc(docRef);
}

// Seed initial data if collections are empty in Firestore (and purge old demo items if found)
export async function seedInitialDataIfNeeded(
  initialProducts: Product[],
  initialCustomers: Customer[],
  initialSales: Sale[]
): Promise<{ products: Product[]; customers: Customer[]; sales: Sale[] }> {
  const demoProductIds = ['prod_1', 'prod_2', 'prod_3', 'prod_4'];
  const demoCustomerIds = ['cust_1', 'cust_2', 'cust_3', 'cust_4'];
  const demoSaleIds = ['sale_1', 'sale_2', 'sale_3', 'sale_4', 'sale_5'];

  if (!isFirebaseConfigured || !db) {
    const localProds = localStorage.getItem('aura_products');
    const localCusts = localStorage.getItem('aura_customers');
    const localSales = localStorage.getItem('aura_sales');
    
    let prods: Product[] = localProds ? JSON.parse(localProds) : initialProducts;
    let custs: Customer[] = localCusts ? JSON.parse(localCusts) : initialCustomers;
    let sls: Sale[] = localSales ? JSON.parse(localSales) : initialSales;

    // Purge demo data if present in local state
    const originalProdsCount = prods.length;
    const originalCustsCount = custs.length;
    const originalSalesCount = sls.length;

    prods = prods.filter(p => !demoProductIds.includes(p.id));
    custs = custs.filter(c => !demoCustomerIds.includes(c.id));
    sls = sls.filter(s => !demoSaleIds.includes(s.id));

    if (prods.length !== originalProdsCount || !localProds) {
      localStorage.setItem('aura_products', JSON.stringify(prods));
    }
    if (custs.length !== originalCustsCount || !localCusts) {
      localStorage.setItem('aura_customers', JSON.stringify(custs));
    }
    if (sls.length !== originalSalesCount || !localSales) {
      localStorage.setItem('aura_sales', JSON.stringify(sls));
    }
    
    return { products: prods, customers: custs, sales: sls };
  }

  try {
    const batchDelete = writeBatch(db);
    let hasDeletions = false;

    // Products Collection
    const prodCol = collection(db, 'products');
    const prodSnap = await getDocs(prodCol);
    let finalProducts: Product[] = [];
    if (prodSnap.empty) {
      // Tenta ler do localStorage primeiro para migrar dados locais para a nuvem
      const localProds = localStorage.getItem('aura_products');
      const localProdsArr = localProds ? JSON.parse(localProds) : [];
      
      const seedProducts = localProdsArr.length > 0 ? localProdsArr : initialProducts;
      const filteredSeed = seedProducts.filter((p: any) => !demoProductIds.includes(p.id));

      if (filteredSeed.length > 0) {
        const batch = writeBatch(db);
        filteredSeed.forEach((p: any) => {
          const docRef = doc(db, 'products', p.id);
          batch.set(docRef, p);
        });
        await batch.commit();
      }
      finalProducts = filteredSeed;
    } else {
      prodSnap.forEach((docSnap) => {
        if (demoProductIds.includes(docSnap.id)) {
          batchDelete.delete(doc(db, 'products', docSnap.id));
          hasDeletions = true;
        } else {
          finalProducts.push({ id: docSnap.id, ...docSnap.data() } as Product);
        }
      });
    }

    // Customers Collection
    const custCol = collection(db, 'customers');
    const custSnap = await getDocs(custCol);
    let finalCustomers: Customer[] = [];
    if (custSnap.empty) {
      // Tenta ler do localStorage primeiro para migrar clientes locais para a nuvem
      const localCusts = localStorage.getItem('aura_customers');
      const localCustsArr = localCusts ? JSON.parse(localCusts) : [];
      
      const seedCustomers = localCustsArr.length > 0 ? localCustsArr : initialCustomers;
      const filteredSeed = seedCustomers.filter((c: any) => !demoCustomerIds.includes(c.id));

      if (filteredSeed.length > 0) {
        const batch = writeBatch(db);
        filteredSeed.forEach((c: any) => {
          const docRef = doc(db, 'customers', c.id);
          batch.set(docRef, c);
        });
        await batch.commit();
      }
      finalCustomers = filteredSeed;
    } else {
      custSnap.forEach((docSnap) => {
        if (demoCustomerIds.includes(docSnap.id)) {
          batchDelete.delete(doc(db, 'customers', docSnap.id));
          hasDeletions = true;
        } else {
          finalCustomers.push({ id: docSnap.id, ...docSnap.data() } as Customer);
        }
      });
    }

    // Sales Collection
    const salesCol = collection(db, 'sales');
    const salesSnap = await getDocs(salesCol);
    let finalSales: Sale[] = [];
    if (salesSnap.empty) {
      // Tenta ler do localStorage primeiro para migrar vendas locais para a nuvem
      const localSales = localStorage.getItem('aura_sales');
      const localSalesArr = localSales ? JSON.parse(localSales) : [];
      
      const seedSales = localSalesArr.length > 0 ? localSalesArr : initialSales;
      const filteredSeed = seedSales.filter((s: any) => !demoSaleIds.includes(s.id));

      if (filteredSeed.length > 0) {
        const batch = writeBatch(db);
        filteredSeed.forEach((s: any) => {
          const docRef = doc(db, 'sales', s.id);
          batch.set(docRef, s);
        });
        await batch.commit();
      }
      finalSales = filteredSeed;
    } else {
      salesSnap.forEach((docSnap) => {
        if (demoSaleIds.includes(docSnap.id)) {
          batchDelete.delete(doc(db, 'sales', docSnap.id));
          hasDeletions = true;
        } else {
          finalSales.push({ id: docSnap.id, ...docSnap.data() } as Sale);
        }
      });
    }

    if (hasDeletions) {
      await batchDelete.commit();
    }

    // Update localStorage to match purged Firestore data
    localStorage.setItem('aura_products', JSON.stringify(finalProducts));
    localStorage.setItem('aura_customers', JSON.stringify(finalCustomers));
    localStorage.setItem('aura_sales', JSON.stringify(finalSales));

    return { products: finalProducts, customers: finalCustomers, sales: finalSales };
  } catch (error) {
    console.error('Erro ao semear/carregar do Firestore:', error);
    // Graceful fallback to localStorage on network or permission errors
    const localProds = localStorage.getItem('aura_products');
    const localCusts = localStorage.getItem('aura_customers');
    const localSales = localStorage.getItem('aura_sales');
    
    let prods: Product[] = localProds ? JSON.parse(localProds) : initialProducts;
    let custs: Customer[] = localCusts ? JSON.parse(localCusts) : initialCustomers;
    let sls: Sale[] = localSales ? JSON.parse(localSales) : initialSales;

    prods = prods.filter(p => !demoProductIds.includes(p.id));
    custs = custs.filter(c => !demoCustomerIds.includes(c.id));
    sls = sls.filter(s => !demoSaleIds.includes(s.id));

    return { products: prods, customers: custs, sales: sls };
  }
}

// Real-time Listeners
export function subscribeToProducts(callback: (products: Product[]) => void) {
  console.log('[Firebase Debug] Registrando subscribeToProducts...');
  if (!isFirebaseConfigured || !db) {
    console.warn('[Firebase Debug] Falha ao registrar subscribeToProducts: Firebase inativo');
    return () => {};
  }
  const q = query(collection(db, 'products'), orderBy('name', 'asc'));
  return onSnapshot(q, (snapshot) => {
    console.log(`[Firebase Debug] onSnapshot (Produtos) recebeu ${snapshot.size} documentos`);
    const products: Product[] = [];
    snapshot.forEach((docSnap) => {
      products.push({ id: docSnap.id, ...docSnap.data() } as Product);
    });
    callback(products);
  }, (error) => {
    console.error('[Firebase Debug] Erro no onSnapshot (Produtos):', error);
  });
}

export function subscribeToCustomers(callback: (customers: Customer[]) => void) {
  console.log('[Firebase Debug] Registrando subscribeToCustomers...');
  if (!isFirebaseConfigured || !db) return () => {};
  const q = query(collection(db, 'customers'), orderBy('name', 'asc'));
  return onSnapshot(q, (snapshot) => {
    console.log(`[Firebase Debug] onSnapshot (Clientes) recebeu ${snapshot.size} documentos`);
    const customers: Customer[] = [];
    snapshot.forEach((docSnap) => {
      customers.push({ id: docSnap.id, ...docSnap.data() } as Customer);
    });
    callback(customers);
  }, (error) => {
    console.error('[Firebase Debug] Erro na sincronização de clientes:', error);
  });
}

export function subscribeToSales(callback: (sales: Sale[]) => void) {
  console.log('[Firebase Debug] Registrando subscribeToSales...');
  if (!isFirebaseConfigured || !db) return () => {};
  const q = query(collection(db, 'sales'), orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    console.log(`[Firebase Debug] onSnapshot (Vendas) recebeu ${snapshot.size} documentos`);
    const sales: Sale[] = [];
    snapshot.forEach((docSnap) => {
      sales.push({ id: docSnap.id, ...docSnap.data() } as Sale);
    });
    callback(sales);
  }, (error) => {
    console.error('[Firebase Debug] Erro na sincronização de vendas:', error);
  });
}

// Explicit Migration Routine
export async function migrateLocalDataToFirestore(): Promise<boolean> {
  if (!isFirebaseConfigured || !db) return false;

  try {
    // Check if migration was already done
    const migrationDoc = doc(db, 'system', 'migration');
    const prodCol = collection(db, 'products');
    const prodSnap = await getDocs(prodCol);

    // If Firestore already has products, we assume migration or setup is already done
    // But let's check a specific flag to be sure
    if (!prodSnap.empty) {
      console.log('Firestore já contém dados. Pulando migração automática.');
      return true;
    }

    console.log('Iniciando rotina de migração única...');

    // 1. Collect data from all local sources
    const localProds = localStorage.getItem('aura_products');
    const localCusts = localStorage.getItem('aura_customers');
    const localSales = localStorage.getItem('aura_sales');

    let products = localProds ? JSON.parse(localProds) : INITIAL_PRODUCTS;
    let customers = localCusts ? JSON.parse(localCusts) : INITIAL_CUSTOMERS;
    let sales = localSales ? JSON.parse(localSales) : INITIAL_SALES;

    // 2. Try to collect from server API as well (data.json)
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const serverData = await res.json();
        // Merge with local data, prioritizing server data or combining
        if (serverData.products?.length > products.length) products = serverData.products;
        if (serverData.customers?.length > customers.length) customers = serverData.customers;
        if (serverData.sales?.length > sales.length) sales = serverData.sales;
      }
    } catch (e) {
      console.warn('Não foi possível buscar dados do servidor para migração:', e);
    }

    // 3. Push to Firestore
    if (products.length > 0 || customers.length > 0 || sales.length > 0) {
      const batch = writeBatch(db);
      
      products.forEach((p: Product) => {
        batch.set(doc(db, 'products', p.id), p);
      });
      
      customers.forEach((c: Customer) => {
        batch.set(doc(db, 'customers', c.id), c);
      });
      
      sales.forEach((s: Sale) => {
        batch.set(doc(db, 'sales', s.id), s);
      });

      await batch.commit();
      console.log('Migração para Firestore concluída com sucesso.');
    }

    return true;
  } catch (error) {
    console.error('Erro durante a migração:', error);
    return false;
  }
}

// Reset Firestore completely and restore default demo data
export async function resetFirestoreWithData(
  initialProducts: Product[],
  initialCustomers: Customer[],
  initialSales: Sale[]
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;

  try {
    const prodSnap = await getDocs(collection(db, 'products'));
    const custSnap = await getDocs(collection(db, 'customers'));
    const salesSnap = await getDocs(collection(db, 'sales'));

    const deleteBatch = writeBatch(db);
    prodSnap.forEach((docSnap) => deleteBatch.delete(doc(db, 'products', docSnap.id)));
    custSnap.forEach((docSnap) => deleteBatch.delete(doc(db, 'customers', docSnap.id)));
    salesSnap.forEach((docSnap) => deleteBatch.delete(doc(db, 'sales', docSnap.id)));
    await deleteBatch.commit();

    const seedBatch = writeBatch(db);
    initialProducts.forEach((p) => seedBatch.set(doc(db, 'products', p.id), p));
    initialCustomers.forEach((c) => seedBatch.set(doc(db, 'customers', c.id), c));
    initialSales.forEach((s) => seedBatch.set(doc(db, 'sales', s.id), s));
    await seedBatch.commit();
  } catch (error) {
    console.error('Erro ao resetar dados do Firestore:', error);
    throw error;
  }
}

// Synchronize entire state to Firestore (periodic autosave / force sync)
export async function syncStateToFirestore(
  products: Product[],
  customers: Customer[],
  sales: Sale[]
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;

  try {
    // Due to Firestore batch limits of 500 operations, we will process write requests
    // in multiple batches or write individual docs if it's simpler. Since we usually have small datasets,
    // we can use writeBatch. If the total size exceeds 450, we can slice it or write parallel.
    // Let's do standard batch commits in chunks of 100 to be perfectly safe.
    const allItems: { ref: any, data: any }[] = [];
    
    products.forEach((p) => {
      allItems.push({ ref: doc(db, 'products', p.id), data: p });
    });
    
    customers.forEach((c) => {
      allItems.push({ ref: doc(db, 'customers', c.id), data: c });
    });
    
    sales.forEach((s) => {
      allItems.push({ ref: doc(db, 'sales', s.id), data: s });
    });

    if (allItems.length === 0) return;

    // Process in batches of 100
    const chunkSize = 100;
    for (let i = 0; i < allItems.length; i += chunkSize) {
      const chunk = allItems.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((item) => {
        batch.set(item.ref, item.data);
      });
      await batch.commit();
    }
  } catch (error) {
    console.error('Erro no salvamento automático no Firestore:', error);
    throw error;
  }
}

