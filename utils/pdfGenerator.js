const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

/**
 * Fetch remote image and convert to buffer
 * @param {string} url - Image URL
 * @returns {Promise<Buffer>} - Image buffer
 */
function fetchRemoteImage(url) {
  return new Promise((resolve, reject) => {
    try {
      const protocol = url.startsWith('https') ? https : http;
      protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to fetch image: ${response.statusCode}`));
          return;
        }
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generate Invoice PDF - Professional Template
 * @param {Object} invoiceData - Invoice data including order, user, and company info
 * @param {Object} companySettings - Company settings for branding (companyName, address, phone, email, gstin, pan, logo, signature, selectedBank)
 * @returns {Promise<Buffer>} - PDF buffer
 */
async function generateInvoicePDF(invoiceData, companySettings = {}) {
  return new Promise(async (resolve, reject) => {
    try { 
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 35,
        bufferPages: true 
      });
      
      const chunks = [];
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Professional color scheme
      const primaryColor = '#1e40af'; // Blue
      const accentColor = '#10b981'; // Green
      const textColor = '#1f2937'; // Dark gray
      const lightText = '#6b7280'; // Light gray
      const mutedColor = '#9ca3af'; // Muted gray
      const borderColor = '#e5e7eb'; // Light border
      const headerBgColor = '#f9fafb'; // Very light gray
      const pageWidth = 595; // A4 width in points
      const pageHeight = 842; // A4 height in points

      // Helper function to format currency with proper encoding
      const formatCurrency = (amount) => {
        return `${parseFloat(amount || 0).toFixed(2)}`;
      };

      // Helper function to format date
      const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      };

      // Helper function to convert number to words (Indian format)
      const numberToWords = (num) => {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        
        if (num === 0) return 'Zero';
        
        const convertLessThanThousand = (n) => {
          if (n === 0) return '';
          if (n < 10) return ones[n];
          if (n < 20) return teens[n - 10];
          if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
          return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
        };
        
        const crore = Math.floor(num / 10000000);
        const lakh = Math.floor((num % 10000000) / 100000);
        const thousand = Math.floor((num % 100000) / 1000);
        const remainder = num % 1000;
        
        let result = '';
        if (crore > 0) result += convertLessThanThousand(crore) + ' Crore ';
        if (lakh > 0) result += convertLessThanThousand(lakh) + ' Lakh ';
        if (thousand > 0) result += convertLessThanThousand(thousand) + ' Thousand ';
        if (remainder > 0) result += convertLessThanThousand(remainder);
        
        return result.trim();
      };

      let yPosition = 35;

      // ===== PROFESSIONAL HEADER SECTION =====
      // Header background box
      doc.rect(35, yPosition, 525, 80).fill(headerBgColor);
      
      // Logo (left side) - Handles remote URLs and base64
      let logoX = 45;
      if (companySettings.logo) {
        try {
          const logoSource = companySettings.logo;
          
          if (logoSource && logoSource.trim().length > 0) {
            // Check if it's a URL (Cloudinary or other)
            if (logoSource.startsWith('http://') || logoSource.startsWith('https://')) {
              // It's a remote URL - fetch and render
              try {
                const logoBuffer = await fetchRemoteImage(logoSource);
                doc.image(logoBuffer, logoX, yPosition + 10, { width: 50, height: 50, fit: [50, 50] });
                logoX += 65;
              } catch (urlErr) {
                console.error('Error fetching remote logo:', urlErr.message);
                // Continue without logo
              }
            } else {
              // Try to handle as base64
              let logoData = logoSource.trim();
              
              // Handle different base64 formats
              if (logoData.includes('base64,')) {
                logoData = logoData.split('base64,')[1];
              } else if (logoData.startsWith('data:')) {
                logoData = logoData.replace(/^data:image\/[^;]+;base64,/, '');
              }
              
              // Clean up any whitespace
              logoData = logoData.replace(/\s/g, '');
              
              // Validate base64 and decode
              if (logoData && logoData.length > 100) {
                const logoBuffer = Buffer.from(logoData, 'base64');
                if (logoBuffer.length > 0) {
                  doc.image(logoBuffer, logoX, yPosition + 10, { width: 50, height: 50, fit: [50, 50] });
                  logoX += 65;
                }
              }
            }
          }
        } catch (err) {
          console.error('Logo render error:', err.message);
          // Continue without logo
        }
      }

      // Company Info (center-left)
      doc.fontSize(16).fillColor(primaryColor).font('Helvetica-Bold')
        .text(companySettings.companyName || 'COMPANY NAME', logoX, yPosition + 8, { width: 250 });
      
      doc.fontSize(8).fillColor(lightText).font('Helvetica')
        .text(`GSTIN: ${companySettings.gstin || 'N/A'} | PAN: ${companySettings.pan || 'N/A'}`, logoX, yPosition + 28);
      
      // Invoice type (right side)
      doc.fontSize(14).fillColor(primaryColor).font('Helvetica-Bold')
        .text('TAX INVOICE', 430, yPosition + 15);
      
      doc.fontSize(8).fillColor(lightText).font('Helvetica')
        .text('ORIGINAL FOR RECIPIENT', 430, yPosition + 35);

      yPosition += 90;

      // ===== COMPANY & CUSTOMER DETAILS SECTION =====
      // Two column layout
      const leftColX = 45;
      const rightColX = 320;
      const colWidth = 250;

      // Company Details (Left)
      doc.fontSize(9).fillColor(primaryColor).font('Helvetica-Bold')
        .text('FROM:', leftColX, yPosition);
      
      yPosition += 12;
      doc.fontSize(9).fillColor(textColor).font('Helvetica-Bold')
        .text(companySettings.companyName || 'Company Name', leftColX, yPosition);
      
      yPosition += 12;
      doc.fontSize(8).fillColor(textColor).font('Helvetica')
        .text(companySettings.address || 'Address not set', leftColX, yPosition, { width: colWidth });
      
      yPosition += 30;
      doc.fontSize(8).fillColor(lightText).font('Helvetica')
        .text(`Phone: ${companySettings.phone || 'N/A'}`, leftColX, yPosition);
      
      yPosition += 10;
      doc.text(`Email: ${companySettings.email || 'N/A'}`, leftColX, yPosition);
      
      yPosition += 10;
      doc.text(`Website: ${companySettings.website || 'N/A'}`, leftColX, yPosition);

      // Customer Details (Right) - Using Shipping Address
      const customerY = yPosition - 50;
      const shippingAddr = invoiceData.shippingAddress || invoiceData.billingAddress || {};
      
      doc.fontSize(9).fillColor(primaryColor).font('Helvetica-Bold')
        .text('BILL TO:', rightColX, customerY);
      
      // Customer Name
      doc.fontSize(9).fillColor(textColor).font('Helvetica-Bold')
        .text(shippingAddr.full_name || shippingAddr.fullName || invoiceData.userName || 'Customer Name', rightColX, customerY + 12);
      
      // Phone and Email on same line
      const phoneEmail = `Phone: ${shippingAddr.phone || 'N/A'} | Email: ${invoiceData.userEmail || 'N/A'}`;
      doc.fontSize(8).fillColor(textColor).font('Helvetica')
        .text(phoneEmail, rightColX, customerY + 28, { width: colWidth });
      
      // Shipping Address - Clean up and format properly
      const addressLines = [
        (shippingAddr.address_line1 || shippingAddr.addressLine1 || '').replace(/,\s*,/g, ',').trim().replace(/,\s*$/, ''),
        (shippingAddr.address_line2 || shippingAddr.addressLine2 || '').trim(),
        `${(shippingAddr.city || '').trim()} ${(shippingAddr.state || '').trim()}`.trim(),
        `${(shippingAddr.postal_code || shippingAddr.postalCode || '').trim()} ${(shippingAddr.country || '').trim()}`.trim(),
      ].filter(line => line.trim());

      let addressY = customerY + 50;
      addressLines.forEach(line => {
        doc.fontSize(8).fillColor(textColor).font('Helvetica')
          .text(line, rightColX, addressY, { width: colWidth });
        addressY += 10;
      });

      yPosition = Math.max(yPosition + 20, addressY + 10);

      // ===== INVOICE DETAILS ROW =====
      yPosition += 10;
      doc.fontSize(8).fillColor(lightText).font('Helvetica')
        .text(`Invoice #: ${invoiceData.invoiceNumber}`, leftColX, yPosition);
      
      doc.text(`Invoice Date: ${formatDate(invoiceData.issueDate)}`, leftColX + 150, yPosition);
      
      doc.text(`Due Date: ${formatDate(invoiceData.dueDate || invoiceData.issueDate)}`, rightColX, yPosition);

      yPosition += 15;

      // Horizontal line separator
      doc.strokeColor(borderColor).lineWidth(1.5)
        .moveTo(35, yPosition)
        .lineTo(560, yPosition)
        .stroke();
      
      yPosition += 15;

      // Place of Supply
      doc.fontSize(8).fillColor(lightText).font('Helvetica')
        .text(`Place of Supply: ${companySettings.placeOfSupply || 'N/A'}`, leftColX, yPosition);
      
      yPosition += 15;

      // ===== ITEMS TABLE - SIMPLIFIED (No per-item tax) =====
      // Table Header with background
      const tableTop = yPosition;
      const itemNoX = 45;
      const itemNameX = 75;
      const rateX = 300;
      const qtyX = 370;
      const totalAmountX = 520;

      // Header background with border
      doc.rect(35, tableTop, 530, 24).fill(primaryColor);

      // Table Headers - Simplified
      doc.fontSize(9).fillColor('#FFFFFF').font('Helvetica-Bold');
      doc.text('#', itemNoX, tableTop + 8);
      doc.text('Item Description', itemNameX, tableTop + 8);
      doc.text('Rate', rateX, tableTop + 8, { width: 60, align: 'right' });
      doc.text('Qty', qtyX, tableTop + 8, { width: 40, align: 'center' });
      doc.text('Total', totalAmountX, tableTop + 8, { width: 40, align: 'right' });

      yPosition += 30;

      // Table Rows - Simplified (no per-item tax)
      let rowBgColor = true;
      (invoiceData.items || []).forEach((item, index) => {
        // Check if we need a new page
        if (yPosition > 650) {
          doc.addPage();
          yPosition = 50;
        }

        const itemName = item.name || item.description || 'Item';
        const itemRate = item.price || item.rate || 0;
        const itemQty = item.quantity || 1;
        const itemTotal = itemRate * itemQty;

        // Alternate row background
        if (rowBgColor) {
          doc.rect(35, yPosition - 2, 530, 20).fill('#f9fafb');
        }
        rowBgColor = !rowBgColor;

        // Row number
        doc.fontSize(9).fillColor(textColor).font('Helvetica')
          .text((index + 1).toString(), itemNoX, yPosition + 2);
        
        // Item name
        doc.font('Helvetica').text(itemName, itemNameX, yPosition + 2, { width: 200 });
        
        // Rate - Right aligned
        doc.text(formatCurrency(itemRate), rateX, yPosition + 2, { width: 60, align: 'right' });
        
        // Quantity - Center aligned
        doc.text(itemQty.toString(), qtyX, yPosition + 2, { width: 40, align: 'center' });
        
        // Product Total - Right aligned and bold
        doc.fontSize(9).fillColor(textColor).font('Helvetica-Bold')
          .text(formatCurrency(itemTotal), totalAmountX, yPosition + 2, { width: 40, align: 'right' });

        yPosition += 20;

        // Item separator line
        doc.strokeColor(borderColor).lineWidth(0.5)
          .moveTo(35, yPosition)
          .lineTo(565, yPosition)
          .stroke();

        yPosition += 2;
      });

      yPosition += 10;

      // ===== TOTALS SECTION - COMPLETE PAYMENT SUMMARY =====
      // Total Items / Qty
      const totalQty = (invoiceData.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
      const totalItems = (invoiceData.items || []).length;
      doc.fontSize(9).fillColor(textColor).font('Helvetica-Bold')
        .text(`Total Items: ${totalItems}  |  Total Qty: ${totalQty}`, 45, yPosition);
      
      yPosition += 20;

      // Amount Payable Section
      doc.fontSize(10).fillColor(primaryColor).font('Helvetica-Bold')
        .text('Payment Summary', 45, yPosition);
      
      yPosition += 18;

      // Get all amounts from invoice data (pre-calculated for accuracy)
      const subtotal = invoiceData.subtotal || 0;
      // const discountAmount = invoiceData.discount_amount || invoiceData.discount || 0;
      const couponDiscount = invoiceData.coupon_discount || 0;
      const giftPrice = invoiceData.gift_price || 0;
      const deliveryCharges = invoiceData.delivery_charges || 0;
      const shippingCharges = invoiceData.shipping_charges || invoiceData.shippingCharges || deliveryCharges || 0;
      
      // Use pre-calculated GST from invoice data for accuracy
      // If not available, calculate it (for backward compatibility)
      let gstAmount = invoiceData.gst_amount || 0;
      if (gstAmount === 0) {
        const subtotalAfterDiscount = subtotal  - couponDiscount + giftPrice;
        gstAmount = (subtotalAfterDiscount * 5) / 100;
      }
      
      // Final total (use invoice total for accuracy)
      const finalTotal = invoiceData.total || (subtotal  - couponDiscount + giftPrice + gstAmount + shippingCharges);

      // Display all payment components
      doc.fontSize(9).fillColor(textColor).font('Helvetica');
      
      // Subtotal
      doc.text('Subtotal:', 380, yPosition);
      doc.text(formatCurrency(subtotal), 480, yPosition, { width: 80, align: 'right' });
      yPosition += 14;

      // Discount
      // if (discountAmount > 0) {
      //   doc.text('Discount:', 380, yPosition);
      //   doc.text(`-${formatCurrency(discountAmount)}`, 480, yPosition, { width: 80, align: 'right' });
      //   yPosition += 14;
      // }

      // Coupon Discount
      if (couponDiscount > 0) {
        doc.text('Coupon Discount:', 380, yPosition);
        doc.text(`-${formatCurrency(couponDiscount)}`, 480, yPosition, { width: 80, align: 'right' });
        yPosition += 14;
      }

      // Gift Price
      if (giftPrice > 0) {
        doc.text('Gift Price:', 380, yPosition);
        doc.text(`+${formatCurrency(giftPrice)}`, 480, yPosition, { width: 80, align: 'right' });
        yPosition += 14;
      }

      // Delivery Charges
      if (shippingCharges > 0) {
        doc.text('Delivery Charges:', 380, yPosition);
        doc.text(formatCurrency(shippingCharges), 480, yPosition, { width: 80, align: 'right' });
        yPosition += 14;
      } else {
        doc.text('Delivery (standard):', 380, yPosition);
        doc.text('FREE', 480, yPosition, { width: 80, align: 'right' });
        yPosition += 14;
      }

      // GST 5%
      doc.text('Tax (5%):', 380, yPosition);
      doc.text(formatCurrency(gstAmount), 480, yPosition, { width: 80, align: 'right' });
      yPosition += 18;

      // Total Line
      doc.strokeColor(borderColor).lineWidth(1.5)
        .moveTo(380, yPosition)
        .lineTo(560, yPosition)
        .stroke();
      yPosition += 12;

      // Grand Total - Bold and larger
      doc.fontSize(11).fillColor(primaryColor).font('Helvetica-Bold');
      doc.text('Grand Total:', 380, yPosition);
      doc.fontSize(12).text(formatCurrency(finalTotal), 480, yPosition, { width: 80, align: 'right' });

      // Total amount in words
      const totalInWords = numberToWords(Math.floor(finalTotal));
      yPosition += 20;
      doc.fontSize(9).fillColor(textColor).font('Helvetica')
        .text(`Amount in Words: `, 45, yPosition);
      doc.font('Helvetica-Bold')
        .text(`Rs. ${totalInWords} Only`, 150, yPosition);

      yPosition += 30;

      // Horizontal line separator
      doc.strokeColor(borderColor).lineWidth(1)
        .moveTo(40, yPosition)
        .lineTo(555, yPosition)
        .stroke();
      
      yPosition += 15;

      // ===== PAYMENT & BANK DETAILS SECTION =====
      const leftSectionX = 45;
      const rightSectionX = 380;

      // Payment ID (for online payments)
      if (invoiceData.razorpay_payment_id) {
        doc.fontSize(8).fillColor('#10b981').font('Helvetica-Bold')
          .text(`✓ PAID via Razorpay`, leftSectionX, yPosition);
        yPosition += 12;
        doc.fontSize(7).fillColor(textColor).font('Helvetica')
          .text(`Payment ID: ${invoiceData.razorpay_payment_id}`, leftSectionX, yPosition);
        yPosition += 20;
      }

      // Left Section - Pay using UPI (QR Code for offline sales)
      if (invoiceData.sale_type === 'offline' && invoiceData.paymentStatus === 'pending') {
        doc.fontSize(9).fillColor(textColor).font('Helvetica-Bold')
          .text('Pay using UPI:', leftSectionX, yPosition);
        
        yPosition += 15;

        // Display actual QR Code if available
        if (invoiceData.upi_qr_code) {
          try {
            const qrBuffer = Buffer.from(
              invoiceData.upi_qr_code.replace(/^data:image\/\w+;base64,/, ''),
              'base64'
            );
            doc.image(qrBuffer, leftSectionX, yPosition, { width: 80, height: 80 });
          } catch (err) {
            console.error('Error adding QR code:', err);
            // Fallback to placeholder
            doc.rect(leftSectionX, yPosition, 80, 80).stroke(borderColor);
            doc.fontSize(7).fillColor(mutedColor).font('Helvetica')
              .text('QR Code', leftSectionX + 25, yPosition + 35);
          }
        } else {
          // QR Code placeholder
          doc.rect(leftSectionX, yPosition, 80, 80).stroke(borderColor);
          doc.fontSize(7).fillColor(mutedColor).font('Helvetica')
            .text('Scan to Pay', leftSectionX + 20, yPosition + 35);
        }
      }
      
      const qrBottomY = yPosition + 85;

      // Right Section - Bank Details
      doc.fontSize(9).fillColor(textColor).font('Helvetica-Bold')
        .text('Bank Details:', rightSectionX, yPosition);
      
      yPosition += 15;

      const bank = companySettings.selectedBank || {};
      doc.fontSize(8).fillColor(textColor).font('Helvetica');
      doc.text(`Bank:`, rightSectionX, yPosition);
      doc.text(bank.bankName || 'HDFC Bank', rightSectionX + 80, yPosition);
      yPosition += 12;

      doc.text(`Account Holder:`, rightSectionX, yPosition);
      doc.text(bank.accountHolder || companySettings.companyName || 'BYTEWISE CONSULTING LLP', rightSectionX + 80, yPosition);
      yPosition += 12;

      doc.text(`Account #:`, rightSectionX, yPosition);
      doc.text(bank.accountNumber || '50200110001118', rightSectionX + 80, yPosition);
      yPosition += 12;

      doc.text(`IFSC Code:`, rightSectionX, yPosition);
      doc.text(bank.ifscCode || 'HDFC0005444', rightSectionX + 80, yPosition);
      yPosition += 12;

      doc.text(`Branch:`, rightSectionX, yPosition);
      doc.text(bank.branchName || 'TAMANDO', rightSectionX + 80, yPosition);

      yPosition = Math.max(qrBottomY, yPosition + 20);

      // ===== SIGNATURE SECTION =====
      // Check if we need a new page for signature
      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
      }

      yPosition += 30;

      // Horizontal line separator before signature
      doc.strokeColor(borderColor).lineWidth(1)
        .moveTo(35, yPosition)
        .lineTo(560, yPosition)
        .stroke();

      yPosition += 20;

      // Company name on the right for signature
      doc.fontSize(9).fillColor(textColor).font('Helvetica-Bold')
        .text(`For ${companySettings.companyName || 'COMPANY NAME'}`, rightSectionX, yPosition);
      
      yPosition += 25;

      // Signature image - Handles remote URLs and base64
      const signatureSource = companySettings.signature || null;
      
      if (signatureSource) {
        try {
          if (signatureSource.trim && signatureSource.trim().length > 0) {
            // Check if it's a URL (Cloudinary or other)
            if (signatureSource.startsWith('http://') || signatureSource.startsWith('https://')) {
              // It's a remote URL - fetch and render
              try {
                const sigBuffer = await fetchRemoteImage(signatureSource);
                doc.image(sigBuffer, rightSectionX, yPosition, { width: 100, height: 40, fit: [100, 40] });
                yPosition += 45;
              } catch (urlErr) {
                console.error('Error fetching remote signature:', urlErr.message);
                // Draw signature line if fetch fails
                doc.strokeColor(textColor).lineWidth(1)
                  .moveTo(rightSectionX, yPosition + 20)
                  .lineTo(rightSectionX + 100, yPosition + 20)
                  .stroke();
                yPosition += 30;
              }
            } else {
              // Try to handle as base64
              let sigData = signatureSource.trim();
              
              // Handle different base64 formats
              if (sigData.includes('base64,')) {
                sigData = sigData.split('base64,')[1];
              } else if (sigData.startsWith('data:')) {
                sigData = sigData.replace(/^data:image\/[^;]+;base64,/, '');
              }
              
              // Clean up any whitespace
              sigData = sigData.replace(/\s/g, '');
              
              // Validate base64 and decode
              if (sigData && sigData.length > 100) {
                const sigBuffer = Buffer.from(sigData, 'base64');
                if (sigBuffer.length > 0) {
                  doc.image(sigBuffer, rightSectionX, yPosition, { width: 100, height: 40, fit: [100, 40] });
                  yPosition += 45;
                } else {
                  throw new Error('Empty buffer');
                }
              } else {
                throw new Error('Invalid signature data');
              }
            }
          }
        } catch (err) {
          console.error('Signature render error:', err.message);
          // Draw signature line if image fails
          doc.strokeColor(textColor).lineWidth(1)
            .moveTo(rightSectionX, yPosition + 20)
            .lineTo(rightSectionX + 100, yPosition + 20)
            .stroke();
          yPosition += 30;
        }
      } else {
        // Draw signature line placeholder
        doc.strokeColor(textColor).lineWidth(1)
          .moveTo(rightSectionX, yPosition + 20)
          .lineTo(rightSectionX + 100, yPosition + 20)
          .stroke();
        yPosition += 30;
      }

      // Authorized Signatory text
      doc.fontSize(8).fillColor(textColor).font('Helvetica')
        .text('Authorized Signatory', rightSectionX, yPosition);

      // ===== FOOTER =====
      const footerY = 750;
      
      // Powered by Swipe logo/text (bottom right)
      doc.fontSize(7).fillColor(mutedColor).font('Helvetica')
        .text('Powered By', 490, footerY);
      
      doc.fontSize(9).fillColor(primaryColor).font('Helvetica-Bold')
        .text('swipe', 500, footerY + 10);
      
      // Footer links (bottom left)
      doc.fontSize(6).fillColor(primaryColor).font('Helvetica')
        .text('Swipe | Simple Invoicing, Billing and Payments | Visit getswipe.in', 40, footerY + 15);
      
      doc.fontSize(6).fillColor(mutedColor).font('Helvetica')
        .text('Page 1/1  ★  This is a digitally signed document.', 40, footerY + 25);

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateInvoicePDF,
};
