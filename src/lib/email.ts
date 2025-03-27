import { SendMailClient } from "zeptomail";

type EmailTemplate = "magic-link" | "welcome" | "order-confirmation";

interface SendEmailOptions {
  to: string;
  subject: string;
  template: EmailTemplate;
  templateData: Record<string, any>;
}

/**
 * Sends an email using Zeptomail API
 */
export async function sendEmail({
  to,
  subject,
  template,
  templateData,
}: SendEmailOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const ZEPTOMAIL_TOKEN = process.env.ZEPTOMAIL_TOKEN;
    console.log(ZEPTOMAIL_TOKEN);

    if (!ZEPTOMAIL_TOKEN) {
      throw new Error(
        "ZEPTOMAIL_TOKEN is not defined in environment variables"
      );
    }

    const client = new SendMailClient({
      url: "api.zeptomail.com/",
      token: ZEPTOMAIL_TOKEN,
    });

    // Prepare the email payload
    const payload = {
      from: {
        address: "no-reply@everwoodus.com",
        name: "Everwood",
      },
      to: [
        {
          email_address: {
            address: to,
          },
        },
      ],
      subject,
      htmlbody: getEmailTemplate(template, templateData),
    };

    // Send the email using Zeptomail API
    const response = await client.sendMail(payload);

    return {
      success: true,
      messageId: response.request_id,
    };
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
    console.error("Error sending email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Returns the HTML template for the specified email type
 */
function getEmailTemplate(
  template: EmailTemplate,
  data: Record<string, any>
): string {
  switch (template) {
    case "magic-link":
      return getMagicLinkTemplate(data.link, data.email);
    case "welcome":
      return getWelcomeTemplate(data.name);
    case "order-confirmation":
      return getOrderConfirmationTemplate(data.orderNumber, data.items);
    default:
      throw new Error(`Unknown email template: ${template}`);
  }
}

/**
 * Returns the HTML template for magic link emails
 */
function getMagicLinkTemplate(link: string, email: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sign in to Everwood</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.5;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          max-width: 150px;
          margin-bottom: 20px;
        }
        .content {
          background-color: #f9f9f9;
          border-radius: 8px;
          padding: 30px;
          margin-bottom: 30px;
        }
        .button {
          display: inline-block;
          background-color: #4f46e5;
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-weight: 500;
          margin: 20px 0;
        }
        .footer {
          font-size: 14px;
          color: #666;
          text-align: center;
        }
        .link-text {
          word-break: break-all;
          color: #4f46e5;
        }
        @media (prefers-color-scheme: dark) {
          body {
            background-color: #1a1a1a;
            color: #e0e0e0;
          }
          .content {
            background-color: #2a2a2a;
            color: #e0e0e0;
          }
          .footer {
            color: #999;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Everwood</h1>
        </div>
        <div class="content">
          <h2>Sign in to Everwood</h2>
          <p>Click the button below to sign in to your Everwood account. This link is valid for 15 minutes and can only be used once.</p>
          <div style="text-align: center;">
            <a href="${link}" class="button">Sign in to Everwood</a>
          </div>
          <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
          <p class="link-text">${link}</p>
          <p>If you didn't request this email, you can safely ignore it.</p>
        </div>
        <div class="footer">
          <p>This email was sent to ${email}</p>
          <p>&copy; ${new Date().getFullYear()} Everwood LLC. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Returns the HTML template for welcome emails
 */
function getWelcomeTemplate(name: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Everwood</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.5;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          max-width: 150px;
          margin-bottom: 20px;
        }
        .content {
          background-color: #f9f9f9;
          border-radius: 8px;
          padding: 30px;
          margin-bottom: 30px;
        }
        .button {
          display: inline-block;
          background-color: #4f46e5;
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-weight: 500;
          margin: 20px 0;
        }
        .footer {
          font-size: 14px;
          color: #666;
          text-align: center;
        }
        @media (prefers-color-scheme: dark) {
          body {
            background-color: #1a1a1a;
            color: #e0e0e0;
          }
          .content {
            background-color: #2a2a2a;
            color: #e0e0e0;
          }
          .footer {
            color: #999;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Everwood</h1>
        </div>
        <div class="content">
          <h2>Welcome to Everwood, ${name}!</h2>
          <p>Thank you for joining Everwood. We're excited to have you on board!</p>
          <p>With Everwood, you can:</p>
          <ul>
            <li>Create beautiful custom designs</li>
            <li>Share your designs with others</li>
            <li>Order high-quality products with your designs</li>
          </ul>
          <div style="text-align: center;">
            <a href="${
              process.env.NEXT_PUBLIC_APP_URL || "https://everwood.com"
            }/order" class="button">Start Creating</a>
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Everwood. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Returns the HTML template for order confirmation emails
 */
function getOrderConfirmationTemplate(
  orderNumber: string,
  items: any[]
): string {
  const itemsList = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${
        item.name
      }</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${
        item.quantity
      }</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">$${item.price.toFixed(
        2
      )}</td>
    </tr>
  `
    )
    .join("");

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation - Everwood</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.5;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          max-width: 150px;
          margin-bottom: 20px;
        }
        .content {
          background-color: #f9f9f9;
          border-radius: 8px;
          padding: 30px;
          margin-bottom: 30px;
        }
        .order-details {
          margin: 20px 0;
        }
        .order-table {
          width: 100%;
          border-collapse: collapse;
        }
        .order-table th {
          text-align: left;
          padding: 10px;
          border-bottom: 2px solid #ddd;
        }
        .total-row {
          font-weight: bold;
        }
        .button {
          display: inline-block;
          background-color: #4f46e5;
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-weight: 500;
          margin: 20px 0;
        }
        .footer {
          font-size: 14px;
          color: #666;
          text-align: center;
        }
        @media (prefers-color-scheme: dark) {
          body {
            background-color: #1a1a1a;
            color: #e0e0e0;
          }
          .content {
            background-color: #2a2a2a;
            color: #e0e0e0;
          }
          .order-table th {
            border-bottom: 2px solid #444;
          }
          .order-table td {
            border-bottom: 1px solid #444;
          }
          .footer {
            color: #999;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Everwood</h1>
        </div>
        <div class="content">
          <h2>Order Confirmation</h2>
          <p>Thank you for your order! We've received your order and are processing it now.</p>
          <p><strong>Order Number:</strong> ${orderNumber}</p>
          <div class="order-details">
            <table class="order-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsList}
                <tr class="total-row">
                  <td style="padding: 10px; text-align: right;" colspan="2">Total:</td>
                  <td style="padding: 10px;">$${total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style="text-align: center;">
            <a href="${
              process.env.NEXT_PUBLIC_APP_URL || "https://everwood.com"
            }/orders/${orderNumber}" class="button">View Order Details</a>
          </div>
        </div>
        <div class="footer">
          <p>If you have any questions about your order, please contact our customer support.</p>
          <p>&copy; ${new Date().getFullYear()} Everwood. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
