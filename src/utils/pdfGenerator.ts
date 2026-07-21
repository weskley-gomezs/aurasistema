import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale, Product, Customer } from '../types';

// Palette Colors
const COLOR_PRIMARY: [number, number, number] = [197, 160, 89]; // #c5a059 Gold
const COLOR_SECONDARY: [number, number, number] = [212, 154, 137]; // #d49a89 Rose Gold
const COLOR_DARK: [number, number, number] = [31, 41, 55]; // #1f2937 Charcoal/Slate
const COLOR_LIGHT: [number, number, number] = [249, 250, 251]; // #f9fafb Off-white

// Helper to format currency
const formatCurrency = (val: number): string => {
  return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Helper to format date
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR');
};

// Generic header drawing function for reports
const drawPDFHeader = (doc: jsPDF, title: string, subtitle: string) => {
  // Gold Top accent bar
  doc.setFillColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.rect(0, 0, 210, 8, 'F');

  // Brand Name
  doc.setFont('times', 'italic');
  doc.setFontSize(22);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text('Aura Dourada Sistema', 14, 20);

  // Divider
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.5);
  doc.line(14, 24, 196, 24);

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.text(title, 14, 32);

  // Subtitle / Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(subtitle, 14, 37);

  // Print Date
  const printDate = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  doc.text(`Gerado em: ${printDate}`, 196, 32, { align: 'right' });
};

// Generic footer drawing function
const drawPDFFooter = (doc: jsPDF, pageNum: number) => {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Aura Dourada Sistema - Gestão de Cosméticos & Revenda', 14, 287);
  doc.text(`Página ${pageNum}`, 196, 287, { align: 'right' });
};

/**
 * Generates and shares/downloads Sales Report PDF
 */
export async function generateSalesReportPDF(
  sales: Sale[],
  products: Product[],
  timeRange: 'month' | 'total'
): Promise<{ success: boolean; method: 'share' | 'download'; fileName: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const now = new Date();
  const monthName = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const title = 'RELATÓRIO DE VENDAS E DESEMPENHO';
  const subtitle = timeRange === 'month' 
    ? `Período: ${monthName.toUpperCase()} (Este Mês)` 
    : 'Período: HISTÓRICO COMPLETO (Total acumulado)';

  drawPDFHeader(doc, title, subtitle);

  // Metrics Section
  const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalProfit = sales.reduce((sum, s) => sum + s.profitAmount, 0);
  const totalCost = totalRevenue - totalProfit;
  const averageTicket = sales.length > 0 ? totalRevenue / sales.length : 0;
  const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // Draw Summary Cards
  doc.setFillColor(COLOR_LIGHT[0], COLOR_LIGHT[1], COLOR_LIGHT[2]);
  doc.roundedRect(14, 43, 182, 30, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('FATURAMENTO BRUTO', 20, 50);
  doc.text('LUCRO REAL', 85, 50);
  doc.text('MARGEM BRUTA', 150, 50);

  doc.setFontSize(14);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text(formatCurrency(totalRevenue), 20, 57);
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.text(formatCurrency(totalProfit), 85, 57);
  doc.text(`${margin.toFixed(1)}%`, 150, 57);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(130, 130, 130);
  doc.text(`Custo total: ${formatCurrency(totalCost)}`, 20, 64);
  doc.text(`Ticket médio: ${formatCurrency(averageTicket)}`, 85, 64);
  doc.text(`Total de vendas: ${sales.length}`, 150, 64);

  // Top Selling Products calculations
  const productQuantities: { [key: string]: { name: string; qty: number; total: number } } = {};
  sales.forEach(sale => {
    sale.items.forEach(item => {
      if (!productQuantities[item.productId]) {
        productQuantities[item.productId] = { name: item.productName, qty: 0, total: 0 };
      }
      productQuantities[item.productId].qty += item.quantity;
      productQuantities[item.productId].total += item.quantity * item.sellPrice;
    });
  });

  const topProducts = Object.values(productQuantities)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  let currentY = 82;

  // Add Best Sellers Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.text('PRODUTOS MAIS VENDIDOS (TOP 5)', 14, currentY);
  currentY += 4;

  const topProductsBody = topProducts.map((p, index) => [
    `#${index + 1}`,
    p.name,
    p.qty.toString(),
    formatCurrency(p.total)
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Pos', 'Produto', 'Qtd Vendida', 'Total Faturado']],
    body: topProductsBody.length > 0 ? topProductsBody : [['-', 'Nenhum produto vendido no período selecionado', '-', '-']],
    theme: 'striped',
    headStyles: { 
      fillColor: COLOR_PRIMARY, 
      textColor: [255, 255, 255], 
      fontSize: 8.5,
      fontStyle: 'bold'
    },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' }
    }
  });

  // @ts-ignore
  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Detailed Sales List
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.text('HISTÓRICO DETALHADO DE VENDAS', 14, currentY);
  currentY += 4;

  const salesTableBody = sales.map(s => {
    const itemsDesc = s.items.map(it => `${it.quantity}x ${it.productName}`).join('\n');
    return [
      formatDate(s.date),
      s.customerName,
      itemsDesc,
      s.paymentMethod,
      s.status === 'pago' ? 'PAGO' : 'PENDENTE',
      formatCurrency(s.totalAmount)
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Data', 'Cliente', 'Itens', 'Pagamento', 'Status', 'Total']],
    body: salesTableBody.length > 0 ? salesTableBody : [['-', 'Nenhuma venda registrada no período', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: { 
      fillColor: COLOR_DARK, 
      textColor: [255, 255, 255], 
      fontSize: 8.5,
      fontStyle: 'bold'
    },
    styles: { fontSize: 8, cellPadding: 2.5, valign: 'middle' },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 35 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 20 },
      4: { cellWidth: 20, fontStyle: 'bold' },
      5: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: function(data: any) {
      if (data.column.index === 4 && data.cell.section === 'body') {
        if (data.cell.text[0] === 'PAGO') {
          data.cell.styles.textColor = [16, 124, 65]; // Green
        } else if (data.cell.text[0] === 'PENDENTE') {
          data.cell.styles.textColor = [197, 120, 0]; // Amber
        }
      }
    }
  });

  // Footer for first page (or subsequent pages if autoTable broke them)
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawPDFFooter(doc, i);
  }

  const cleanMonth = monthName.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = timeRange === 'month' 
    ? `Relatorio_Vendas_${cleanMonth}.pdf` 
    : 'Relatorio_Vendas_Completo.pdf';

  return handlePDFExport(doc, fileName);
}

/**
 * Generates and shares/downloads Customer Statement (Extrato de Cliente)
 */
export async function generateCustomerStatementPDF(
  customer: Customer,
  sales: Sale[]
): Promise<{ success: boolean; method: 'share' | 'download'; fileName: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const customerSales = sales.filter(s => s.customerId === customer.id);
  const title = `EXTRATO FINANCEIRO E HISTÓRICO`;
  const subtitle = `Cliente: ${customer.name.toUpperCase()}`;

  drawPDFHeader(doc, title, subtitle);

  // Client Details Section (Left Card)
  doc.setFillColor(COLOR_LIGHT[0], COLOR_LIGHT[1], COLOR_LIGHT[2]);
  doc.setDrawColor(240, 240, 240);
  doc.roundedRect(14, 43, 100, 32, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text('DADOS DO CLIENTE', 18, 49);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.text(`Nome: ${customer.name}`, 18, 54);
  doc.text(`WhatsApp: ${customer.whatsapp.replace(/(\d{2})(\d{5})(\d{4})/, "($1) *****-$3")}`, 18, 59);
  
  // Custom wrap for customer notes
  const notesText = customer.notes ? `Obs: ${customer.notes}` : 'Sem observações cadastradas';
  const splitNotes = doc.splitTextToSize(notesText, 92);
  doc.text(splitNotes, 18, 64);

  // Account Summary Card (Right Card)
  const totalPurchases = customerSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const pendingSales = customerSales.filter(s => s.status === 'pendente');
  const totalPending = pendingSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalPaid = totalPurchases - totalPending;

  doc.setFillColor(totalPending > 0 ? 255 : COLOR_LIGHT[0], totalPending > 0 ? 251 : COLOR_LIGHT[1], totalPending > 0 ? 240 : COLOR_LIGHT[2]);
  doc.setDrawColor(totalPending > 0 ? 254 : 240, totalPending > 0 ? 243 : 240, totalPending > 0 ? 199 : 240);
  doc.roundedRect(120, 43, 76, 32, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(totalPending > 0 ? 180 : COLOR_PRIMARY[0], totalPending > 0 ? 83 : COLOR_PRIMARY[1], 9);
  doc.text('RESUMO DA CONTA', 124, 49);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.text(`Total Compras: ${formatCurrency(totalPurchases)}`, 124, 54);
  doc.text(`Total Pago: ${formatCurrency(totalPaid)}`, 124, 59);
  
  doc.setFont('helvetica', 'bold');
  if (totalPending > 0) {
    doc.setTextColor(185, 28, 28); // Red
    doc.text(`VALOR EM ABERTO: ${formatCurrency(totalPending)}`, 124, 65);
    doc.setFontSize(7.5);
    doc.setTextColor(217, 119, 6); // Orange
    doc.text(`(${pendingSales.length} compras pendentes no fiado)`, 124, 69);
  } else {
    doc.setTextColor(16, 124, 65); // Green
    doc.text('CONTA TOTALMENTE PAGA', 124, 65);
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text('Nenhuma pendência financeira.', 124, 69);
  }

  let currentY = 82;

  // Statement History Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.text('HISTÓRICO DETALHADO DE TRANSAÇÕES', 14, currentY);
  currentY += 4;

  const statementTableBody = customerSales.map(s => {
    const itemsDesc = s.items.map(it => `${it.quantity}x ${it.productName}`).join('\n');
    let statusText = s.status === 'pago' ? 'PAGO' : 'EM ABERTO (Fiado)';
    if (s.status === 'pendente' && s.dueDate) {
      statusText += `\nVenc: ${formatDate(s.dueDate)}`;
    }
    return [
      formatDate(s.date),
      itemsDesc,
      s.paymentMethod,
      statusText,
      formatCurrency(s.totalAmount)
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Data', 'Produtos Adquiridos', 'Forma', 'Status / Vencimento', 'Total']],
    body: statementTableBody.length > 0 ? statementTableBody : [['-', 'Nenhuma transação com este cliente', '-', '-', '-']],
    theme: 'striped',
    headStyles: { 
      fillColor: COLOR_PRIMARY, 
      textColor: [255, 255, 255], 
      fontSize: 8.5,
      fontStyle: 'bold'
    },
    styles: { fontSize: 8, cellPadding: 2.5, valign: 'middle' },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20 },
      3: { cellWidth: 38, fontStyle: 'bold' },
      4: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: function(data: any) {
      if (data.column.index === 3 && data.cell.section === 'body') {
        if (data.cell.text[0].startsWith('PAGO')) {
          data.cell.styles.textColor = [16, 124, 65]; // Green
        } else if (data.cell.text[0].startsWith('EM ABERTO')) {
          data.cell.styles.textColor = [185, 28, 28]; // Red
        }
      }
    }
  });

  // Render Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawPDFFooter(doc, i);
  }

  const cleanCustomerName = customer.name.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Extrato_Aura_${cleanCustomerName}.pdf`;

  return handlePDFExport(doc, fileName);
}

/**
 * Handles the export (Downloading the PDF directly)
 */
async function handlePDFExport(
  doc: jsPDF,
  fileName: string
): Promise<{ success: boolean; method: 'share' | 'download'; fileName: string }> {
  // Direct download using jsPDF's built-in save method
  try {
    doc.save(fileName);
    return { success: true, method: 'download', fileName };
  } catch (err) {
    console.error('Erro ao baixar PDF:', err);
    
    // Fallback logic for environments where doc.save might fail
    const pdfBlob = doc.output('blob');
    const downloadUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
    
    return { success: true, method: 'download', fileName };
  }
}

/**
 * Helper to generate pre-written WhatsApp messages to facilitate sharing
 */
export function getWhatsAppShareText(
  type: 'report' | 'statement',
  customerName: string,
  totalAmount: number,
  salesCount: number,
  pendingAmount: number = 0
): string {
  if (type === 'report') {
    return encodeURIComponent(
      `Olá! 📊 Segue o resumo do Relatório de Vendas Aura Dourada Sistema:\n\n` +
      `• Vendas registradas: *${salesCount}*\n` +
      `• Faturamento Total: *R$ ${totalAmount.toFixed(2)}*\n\n` +
      `Acabei de gerar o PDF detalhado correspondente. Estou enviando o arquivo para você em seguida! ✨`
    );
  } else {
    const statusText = pendingAmount > 0 
      ? `• Situação atual: *Possui saldo em aberto de R$ ${pendingAmount.toFixed(2)}*`
      : `• Situação atual: *Tudo quitado! Conta zerada. 🎉*`;

    return encodeURIComponent(
      `Olá, ${customerName}! Espero que esteja bem. 🌸\n\n` +
      `Gerai aqui o seu Extrato de Compras completo da Aura Dourada Sistema:\n\n` +
      `• Total de compras: *${salesCount}*\n` +
      `• Valor total adquirido: *R$ ${totalAmount.toFixed(2)}*\n` +
      `${statusText}\n\n` +
      `Estou te enviando o PDF detalhado com o histórico completo das suas compras em anexo! Se tiver qualquer dúvida, estou à disposição. Muito obrigada! 🥰✨`
    );
  }
}

/**
 * Generates and downloads Product Catalog PDF (strictly without cost price)
 */
export async function generateCatalogPDF(
  products: Product[]
): Promise<{ success: boolean; method: 'share' | 'download'; fileName: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const title = 'CATÁLOGO DE PRODUTOS & PRONTA ENTREGA';
  const subtitle = 'Fragrâncias e cosméticos exclusivos - Aura Dourada';

  drawPDFHeader(doc, title, subtitle);

  // Group products by category
  const categories: Record<string, string> = {
    perfume: 'Perfumes',
    creme: 'Cremes & Hidratantes',
    kit: 'Kits & Presentes',
    outros: 'Outros Cosméticos'
  };

  let currentY = 45;

  const catalogBody = products.map((p) => {
    const catLabel = categories[p.category] || 'Outros';
    const statusText = p.quantity > 0 ? 'Disponível' : 'Sob Encomenda';
    return [
      p.brand.toUpperCase(),
      p.name,
      catLabel,
      formatCurrency(p.sellPrice),
      statusText
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Marca', 'Nome do Produto', 'Categoria', 'Preço de Venda', 'Status']],
    body: catalogBody.length > 0 ? catalogBody : [['-', 'Nenhum produto cadastrado', '-', '-', '-']],
    theme: 'striped',
    headStyles: { 
      fillColor: COLOR_PRIMARY, 
      textColor: [255, 255, 255], 
      fontSize: 8.5,
      fontStyle: 'bold'
    },
    styles: { fontSize: 8, cellPadding: 2.5, valign: 'middle' },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 35 },
      3: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      4: { cellWidth: 25, halign: 'center' }
    },
    didParseCell: function(data: any) {
      if (data.column.index === 3 && data.cell.section === 'body') {
        data.cell.styles.textColor = COLOR_PRIMARY;
      }
      if (data.column.index === 4 && data.cell.section === 'body') {
        if (data.cell.text[0] === 'Disponível') {
          data.cell.styles.textColor = [16, 124, 65]; // Green
        } else {
          data.cell.styles.textColor = [150, 150, 150]; // Gray
        }
      }
    }
  });

  // Render Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawPDFFooter(doc, i);
  }

  const fileName = `Catalogo_Aura_Dourada.pdf`;
  return handlePDFExport(doc, fileName);
}
