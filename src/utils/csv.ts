import { Sale } from '../types';

export const exportSalesToCSV = (sales: Sale[]) => {
  // Define CSV headers
  const headers = [
    'ID da Venda',
    'Data',
    'Cliente',
    'Forma de Pagamento',
    'Status',
    'Produtos Vendidos (Qtd)',
    'Valor Total (R$)',
    'Lucro (R$)'
  ];

  // Map sales data to rows
  const rows = sales.map(sale => {
    const productsStr = sale.items
      .map(item => `${item.productName} (${item.quantity}x)`)
      .join(' | ');

    return [
      sale.id,
      sale.date,
      sale.customerName,
      sale.paymentMethod,
      sale.status === 'pago' ? 'Pago' : 'Pendente (Fiado)',
      `"${productsStr}"`,
      sale.totalAmount.toFixed(2),
      sale.profitAmount.toFixed(2)
    ];
  });

  // Construct CSV string
  const csvContent = [
    '\uFEFF' + headers.join(','), // UTF-8 BOM for Excel compatibility
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create download link and trigger click
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `aura_dourada_vendas_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
