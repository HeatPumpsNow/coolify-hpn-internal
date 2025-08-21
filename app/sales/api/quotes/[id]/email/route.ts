import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// NOTE: You'll need to install nodemailer: npm install nodemailer @types/nodemailer
// For now, I'll create a simulated version that shows you how to connect

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quoteId = params.id;
    const body = await request.json();
    const {
      to_email,
      cc_emails = [],
      subject,
      message,
      include_pdf = true,
    } = body;

    // Validate required fields
    if (!to_email || !subject || !message) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Missing required fields: to_email, subject, and message are required' 
          } 
        },
        { status: 400 }
      );
    }

    // Fetch quote details
    const quoteResult = await query(
      `SELECT 
        q.*, 
        o.lead_number,
        c.first_name, c.last_name, c.email as customer_email
       FROM quotes q
       LEFT JOIN opportunities o ON q.opportunity_id = o.id
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE q.id = $1`,
      [quoteId]
    );

    if (quoteResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Quote not found' } },
        { status: 404 }
      );
    }

    const quote = quoteResult.rows[0];
    
    // Generate HTML content for the quote
    const quoteHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .quote-details { background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .line-items { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .line-items th { background: #667eea; color: white; padding: 10px; text-align: left; }
          .line-items td { padding: 10px; border-bottom: 1px solid #ddd; }
          .total { font-size: 24px; font-weight: bold; color: #667eea; text-align: right; margin: 20px 0; }
          .footer { background: #f1f1f1; padding: 20px; text-align: center; margin-top: 40px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Heat Pumps Now</h1>
          <h2>Professional HVAC Quote</h2>
        </div>
        <div class="content">
          <div class="quote-details">
            <h3>Quote #${quote.quote_number}</h3>
            <p><strong>Quote Name:</strong> ${quote.quote_name}</p>
            <p><strong>Valid Until:</strong> ${new Date(quote.valid_until).toLocaleDateString()}</p>
          </div>
          
          <h3>Quote Summary</h3>
          <table class="line-items">
            <tr>
              <td>Total Cost:</td>
              <td style="text-align: right;">$${parseFloat(quote.total_cost).toFixed(2)}</td>
            </tr>
            <tr>
              <td>Markup Applied:</td>
              <td style="text-align: right;">$${parseFloat(quote.total_margin).toFixed(2)}</td>
            </tr>
            <tr style="font-weight: bold; font-size: 18px;">
              <td>Total Price:</td>
              <td style="text-align: right; color: #667eea;">$${parseFloat(quote.total_selling_price).toFixed(2)}</td>
            </tr>
          </table>
          
          ${quote.terms_content ? `
          <div class="quote-details">
            <h4>Terms & Conditions</h4>
            <p>${quote.terms_content}</p>
          </div>
          ` : ''}
          
          <p style="margin-top: 30px;">
            To accept this quote, please reply to this email or contact us directly.
          </p>
        </div>
        <div class="footer">
          <p>Heat Pumps Now | Professional HVAC Services</p>
          <p>📞 1-800-HEAT-NOW | 📧 info@heatpumpsnow.com</p>
        </div>
      </body>
      </html>
    `;

    // ==========================================
    // EMAIL SERVER INTEGRATION OPTIONS
    // ==========================================
    
    // To connect to your email server, uncomment and configure one of these options:
    
    /*
    // OPTION 1: Using Nodemailer with Gmail
    // First: npm install nodemailer @types/nodemailer
    import nodemailer from 'nodemailer';
    
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER, // your-email@gmail.com
        pass: process.env.GMAIL_APP_PASSWORD, // App-specific password (not regular password)
      },
    });
    
    const mailOptions = {
      from: 'Heat Pumps Now <your-email@gmail.com>',
      to: to_email,
      cc: cc_emails.join(', '),
      subject: subject,
      text: message,
      html: include_pdf ? quoteHtml : message.replace(/\n/g, '<br>'),
    };
    
    await transporter.sendMail(mailOptions);
    */
    
    /*
    // OPTION 2: Using SendGrid
    // First: npm install @sendgrid/mail
    import sgMail from '@sendgrid/mail';
    
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const msg = {
      to: to_email,
      cc: cc_emails,
      from: 'noreply@heatpumpsnow.com',
      subject: subject,
      text: message,
      html: include_pdf ? quoteHtml : message.replace(/\n/g, '<br>'),
    };
    
    await sgMail.send(msg);
    */
    
    /*
    // OPTION 3: Using AWS SES
    // First: npm install @aws-sdk/client-ses
    import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
    
    const client = new SESClient({ 
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    });
    
    const command = new SendEmailCommand({
      Source: "noreply@heatpumpsnow.com",
      Destination: {
        ToAddresses: [to_email],
        CcAddresses: cc_emails,
      },
      Message: {
        Subject: { Data: subject },
        Body: {
          Html: { Data: include_pdf ? quoteHtml : message.replace(/\n/g, '<br>') },
          Text: { Data: message },
        },
      },
    });
    
    await client.send(command);
    */
    
    /*
    // OPTION 4: Using custom SMTP server
    // First: npm install nodemailer @types/nodemailer
    import nodemailer from 'nodemailer';
    
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST, // e.g., 'smtp.office365.com'
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@heatpumpsnow.com',
      to: to_email,
      cc: cc_emails.join(', '),
      subject: subject,
      text: message,
      html: include_pdf ? quoteHtml : message.replace(/\n/g, '<br>'),
    };
    
    await transporter.sendMail(mailOptions);
    */
    
    // Update quote status to 'sent' if it was 'draft'
    if (quote.status === 'draft') {
      await query(
        'UPDATE quotes SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['sent', quoteId]
      );
    }
    
    // For now, return a simulated success response
    console.log('Email would be sent to:', to_email);
    console.log('Subject:', subject);
    console.log('CC:', cc_emails);
    console.log('Include HTML Quote:', include_pdf);
    
    return NextResponse.json({
      success: true,
      data: {
        message: 'Email functionality is ready to be connected to your email server',
        configuration_needed: {
          option1: 'Gmail: Set GMAIL_USER and GMAIL_APP_PASSWORD in .env',
          option2: 'SendGrid: Set SENDGRID_API_KEY in .env',
          option3: 'AWS SES: Set AWS credentials in .env',
          option4: 'Custom SMTP: Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD in .env',
        },
        email_details: {
          to: to_email,
          cc: cc_emails,
          subject: subject,
          quote_number: quote.quote_number,
          quote_total: parseFloat(quote.total_selling_price).toFixed(2),
        }
      },
    });

  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          message: 'Failed to send email',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    );
  }
}