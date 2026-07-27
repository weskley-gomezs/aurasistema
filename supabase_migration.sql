ALTER TABLE products ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS original_price NUMERIC;

-- Tabela de Encomendas para pedidos feitos pelo catálogo online
CREATE TABLE IF NOT EXISTS encomendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    product_price NUMERIC,
    quantity INTEGER DEFAULT 1,
    payment_method_on_arrival TEXT,
    expected_date DATE,
    status TEXT DEFAULT 'pendente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE encomendas ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE encomendas ADD COLUMN IF NOT EXISTS payment_method_on_arrival TEXT;

-- Habilitar e configurar políticas RLS para permitir inserção pública (catálogo)
ALTER TABLE encomendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todas as operações em encomendas" ON encomendas;
CREATE POLICY "Permitir todas as operações em encomendas" ON encomendas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todas as operações em customers" ON customers;
CREATE POLICY "Permitir todas as operações em customers" ON customers FOR ALL USING (true) WITH CHECK (true);

