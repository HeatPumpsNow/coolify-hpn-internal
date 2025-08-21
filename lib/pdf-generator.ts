// Simple PDF generator utility for sales portal
export interface QuoteData {
  id: string;
  customerName: string;
  lineItems: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
}

export class PDFGenerator {
  static async generateQuotePDF(quoteData: QuoteData): Promise<Buffer> {
    // Placeholder implementation - would integrate with jsPDF or similar
    const htmlContent = `
      <html>
        <head><title>Quote #${quoteData.id}</title></head>
        <body>
          <h1>Heat Pumps Now - Quote #${quoteData.id}</h1>
          <p><strong>Customer:</strong> ${quoteData.customerName}</p>
          <table border="1">
            <tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
            ${quoteData.lineItems.map(item => 
              `<tr><td>${item.name}</td><td>${item.quantity}</td><td>$${item.unitPrice}</td><td>$${item.total}</td></tr>`
            ).join('')}
          </table>
          <p><strong>Subtotal:</strong> $${quoteData.subtotal}</p>
          <p><strong>Tax:</strong> $${quoteData.tax}</p>
          <p><strong>Total:</strong> $${quoteData.total}</p>
        </body>
      </html>
    `;
    
    // Return placeholder PDF content as buffer
    return Buffer.from(htmlContent, 'utf-8');
  }

  static async generateEstimatePDF(estimateData: any): Promise<Buffer> {
    // Placeholder implementation
    return Buffer.from('PDF content placeholder', 'utf-8');
  }
}

export default PDFGenerator;

// Company information
export const defaultCompanyInfo = {
  name: 'Heat Pumps Now',
  address: '123 Main Street',
  city: 'Anytown',
  state: 'CA',
  zip: '12345',
  phone: '(555) 123-4567',
  email: 'info@heatpumpsnow.com'
};

// HTML generation function
export function generateProposalHTML(quoteData: QuoteData, companyInfo = defaultCompanyInfo): string {
  return `
    <html>
      <head>
        <title>Proposal #${quoteData.id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .company-info { text-align: center; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total-section { margin-top: 20px; text-align: right; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${companyInfo.name}</h1>
          <div class="company-info">
            <p>${companyInfo.address}<br>
            ${companyInfo.city}, ${companyInfo.state} ${companyInfo.zip}<br>
            ${companyInfo.phone} | ${companyInfo.email}</p>
          </div>
        </div>
        
        <h2>Proposal #${quoteData.id}</h2>
        <p><strong>Customer:</strong> ${quoteData.customerName}</p>
        
        <table>
          <tr><th>Item</th><th>Quantity</th><th>Unit Price</th><th>Total</th></tr>
          ${quoteData.lineItems.map(item => 
            `<tr><td>${item.name}</td><td>${item.quantity}</td><td>$${item.unitPrice.toFixed(2)}</td><td>$${item.total.toFixed(2)}</td></tr>`
          ).join('')}
        </table>
        
        <div class="total-section">
          <p><strong>Subtotal:</strong> $${quoteData.subtotal.toFixed(2)}</p>
          <p><strong>Tax:</strong> $${quoteData.tax.toFixed(2)}</p>
          <p><strong>Total:</strong> $${quoteData.total.toFixed(2)}</p>
        </div>
      </body>
    </html>
  `;
}