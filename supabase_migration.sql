ALTER TABLE products ADD COLUMN featured BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN original_price NUMERIC;

-- Tabela de Encomendas para pedidos feitos pelo catálogo online
CREATE TABLE IF NOT EXISTS encomendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    product_price NUMERIC,
    expected_date DATE,
    status TEXT DEFAULT 'pendente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

