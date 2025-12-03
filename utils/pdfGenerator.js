// filename: invoicePdfGenerator.js
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
        bufferPages: true,
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Colors & layout
      const primaryColor = '#1e40af';
      const textColor = '#1f2937';
      const lightText = '#6b7280';
      const mutedColor = '#9ca3af';
      const borderColor = '#e5e7eb';
      const headerBgColor = '#f9fafb';

      // Helpers
      const parseAmount = (value) => {
        if (value === null || value === undefined || value === '') return 0;
        const num = Number(value);
        return Number.isFinite(num) ? num : 0;
      };

      // ✅ UPDATED: Remove rupee symbol, just format the number
      const formatCurrency = (amount) => {
        const n = parseAmount(amount);
        return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      };

      const numberToWords = (num) => {
        // simplified number to words for integer portion (Indian grouping)
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        if (num === 0) return 'Zero';
        const convLessThanThousand = (n) => {
          if (n === 0) return '';
          if (n < 10) return ones[n];
          if (n < 20) return teens[n - 10];
          if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
          return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convLessThanThousand(n % 100) : '');
        };
        const crore = Math.floor(num / 10000000);
        const lakh = Math.floor((num % 10000000) / 100000);
        const thousand = Math.floor((num % 100000) / 1000);
        const remainder = num % 1000;
        let result = '';
        if (crore > 0) result += convLessThanThousand(crore) + ' Crore ';
        if (lakh > 0) result += convLessThanThousand(lakh) + ' Lakh ';
        if (thousand > 0) result += convLessThanThousand(thousand) + ' Thousand ';
        if (remainder > 0) result += convLessThanThousand(remainder);
        return result.trim();
      };

      let yPosition = 35;

      // ===== Header =====
      doc.rect(35, yPosition, 525, 80).fill(headerBgColor);

      // Logo (left)
      let logoX = 45;
      if (companySettings.logo) {
        try {
          const logoSource = companySettings.logo;
          if (logoSource && logoSource.trim().length > 0) {
            if (logoSource.startsWith('http://') || logoSource.startsWith('https://')) {
              try {
                const logoBuffer = await fetchRemoteImage(logoSource);
                doc.image(logoBuffer, logoX, yPosition + 10, { width: 50, height: 50, fit: [50, 50] });
                logoX += 65;
              } catch (err) {
                console.error('Logo URL fetch failed:', err.message);
              }
            } else {
              let logoData = logoSource.trim();
              if (logoData.includes('base64,')) logoData = logoData.split('base64,')[1];
              else if (logoData.startsWith('data:')) logoData = logoData.replace(/^data:image\/[^;]+;base64,/, '');
              logoData = logoData.replace(/\s/g, '');
              if (logoData && logoData.length > 100) {
                try {
                  const logoBuffer = Buffer.from(logoData, 'base64');
                  doc.image(logoBuffer, logoX, yPosition + 10, { width: 50, height: 50, fit: [50, 50] });
                  logoX += 65;
                } catch (err) {
                  console.error('Logo base64 decode failed:', err.message);
                }
              }
            }
          }
        } catch (err) {
          console.error('Logo render error:', err.message);
        }
      }

      const companyNameY = yPosition + 8;
      doc.fontSize(14).fillColor(primaryColor).font('Helvetica-Bold')
        .text(companySettings.companyName || 'COMPANY NAME', logoX, companyNameY, { width: 250 });
      const companyMetaY = companyNameY + 22;
      doc.fontSize(8).fillColor(lightText).font('Helvetica')
        .text(`GSTIN: ${companySettings.gstin || 'N/A'} | PAN: ${companySettings.pan || 'N/A'}`, logoX, companyMetaY, { width: 250 });

      doc.fontSize(14).fillColor(primaryColor).font('Helvetica-Bold')
        .text('TAX INVOICE', 430, yPosition + 15);
      doc.fontSize(8).fillColor(lightText).font('Helvetica')
        .text('ORIGINAL FOR RECIPIENT', 430, yPosition + 35);

      yPosition += 90;

      // ===== Company & Customer details =====
      const leftColX = 45;
      const rightColX = 320;
      const colWidth = 250;
      let leftY = yPosition;
      doc.fontSize(9).fillColor(primaryColor).font('Helvetica-Bold').text('FROM:', leftColX, leftY);
      leftY += 12;
      doc.fontSize(9).fillColor(textColor).font('Helvetica-Bold').text(companySettings.companyName || 'Company Name', leftColX, leftY);
      leftY += 12;
      const companyAddress = companySettings.address || 'Address not set';
      doc.fontSize(8).fillColor(textColor).font('Helvetica').text(companyAddress, leftColX, leftY, { width: colWidth });
      leftY += doc.heightOfString(companyAddress, { width: colWidth }) + 10;
      doc.fontSize(8).fillColor(lightText).font('Helvetica').text(`Phone: ${companySettings.phone || 'N/A'}`, leftColX, leftY);
      leftY += 12;
      doc.text(`Email: ${companySettings.email || 'N/A'}`, leftColX, leftY);
      leftY += 12;
      doc.text(`Website: ${companySettings.website || 'N/A'}`, leftColX, leftY);
      leftY += 12;

      // Customer
      const shippingAddr = invoiceData.shippingAddress || invoiceData.billingAddress || {};
      let rightY = yPosition;
      doc.fontSize(9).fillColor(primaryColor).font('Helvetica-Bold').text('BILL TO:', rightColX, rightY);
      rightY += 12;
      // ✅ FIX: Use snake_case field names
      const customerName = shippingAddr.full_name || shippingAddr.fullName || invoiceData.user_name || invoiceData.userName || 'Customer Name';
      doc.fontSize(9).fillColor(textColor).font('Helvetica-Bold').text(customerName, rightColX, rightY);
      rightY += 12;
      // ✅ FIX: Use snake_case field names
      const phoneEmail = `Phone: ${shippingAddr.phone || invoiceData.user_phone || 'N/A'} | Email: ${invoiceData.user_email || invoiceData.userEmail || 'N/A'}`;
      doc.fontSize(8).fillColor(textColor).font('Helvetica').text(phoneEmail, rightColX, rightY, { width: colWidth });
      rightY += doc.heightOfString(phoneEmail, { width: colWidth }) + 6;

      const addressLines = [
        (shippingAddr.address_line1 || shippingAddr.addressLine1 || '').replace(/,\s*,/g, ',').trim().replace(/,\s*$/, ''),
        (shippingAddr.address_line2 || shippingAddr.addressLine2 || '').trim(),
        `${(shippingAddr.city || '').trim()} ${(shippingAddr.state || '').trim()}`.trim(),
        `${(shippingAddr.postal_code || shippingAddr.postalCode || '').trim()} ${(shippingAddr.country || '').trim()}`.trim(),
      ].filter(line => line && line.trim());
      addressLines.forEach(line => {
        doc.fontSize(8).fillColor(textColor).font('Helvetica').text(line, rightColX, rightY, { width: colWidth });
        rightY += doc.heightOfString(line, { width: colWidth }) + 4;
      });

      yPosition = Math.max(leftY, rightY) + 20;

      // ===== Invoice details row =====
      yPosition += 10;
      const detailFirstX = leftColX;
      const detailColWidth = 160;
      const detailSecondX = detailFirstX + detailColWidth + 15;
      const detailThirdX = rightColX;

      // ✅ FIX: Use snake_case field names
      doc.fontSize(8).fillColor(lightText).font('Helvetica').text(`Invoice #: ${invoiceData.invoice_number || invoiceData.invoiceNumber || 'N/A'}`, detailFirstX, yPosition, { width: detailColWidth });
      doc.text(`Invoice Date: ${formatDate(invoiceData.issue_date || invoiceData.issueDate)}`, detailSecondX, yPosition, { width: detailColWidth });
      
      // ✅ NEW: Conditionally show Due Date only for offline sales with pending payment
      const saleType = invoiceData.sale_type || 'online';
      const paymentStatus = invoiceData.payment_status || 'pending';
      const isOffline = saleType === 'offline';
      const isPending = paymentStatus !== 'paid';
      
      if (isOffline && isPending) {
        doc.fillColor('#FF6B35').font('Helvetica-Bold').text(`Due Date: ${formatDate(invoiceData.due_date || invoiceData.dueDate || invoiceData.issue_date || invoiceData.issueDate)}`, detailThirdX, yPosition, { width: 220, align: 'right' });
      } else {
        // Show payment status for online or paid invoices
        const statusLabel = paymentStatus === 'paid' ? 'Status: PAID' : `Sale Type: ${saleType.toUpperCase()}`;
        doc.fillColor(paymentStatus === 'paid' ? '#10B981' : lightText).font('Helvetica-Bold').text(statusLabel, detailThirdX, yPosition, { width: 220, align: 'right' });
      }

      yPosition += 14;

      const invoiceOrderId = invoiceData.order_id || invoiceData.orderId || 'N/A';
      doc.fontSize(8).fillColor(lightText).font('Helvetica').text(`Order ID: ${invoiceOrderId}`, detailFirstX, yPosition, { width: detailColWidth });
      
      // ✅ NEW: Always show Sale Type
      const saleTypeDisplay = (invoiceData.sale_type || 'online').toUpperCase();
      doc.fontSize(8).fillColor(lightText).font('Helvetica').text(`Sale Type: ${saleTypeDisplay}`, detailSecondX, yPosition, { width: detailColWidth });

      yPosition += 18;

      // Separator
      doc.strokeColor(borderColor).lineWidth(1.5).moveTo(35, yPosition).lineTo(560, yPosition).stroke();
      yPosition += 15;

      // Place of supply
      doc.fontSize(8).fillColor(lightText).font('Helvetica').text(`Place of Supply: ${companySettings.placeOfSupply || 'N/A'}`, detailFirstX, yPosition, { width: detailColWidth * 2 });
      yPosition += 20;

      // ===== Items table header =====
      const tableTop = yPosition;
      const itemNoX = 45;
      const itemNameX = 75;
      const rateX = 300;
      const qtyX = 370;
      const totalAmountX = 520;

      doc.rect(35, tableTop, 530, 24).fill(primaryColor);
      doc.fontSize(9).fillColor('#FFFFFF').font('Helvetica-Bold');
      doc.text('#', itemNoX, tableTop + 8);
      doc.text('Item Description', itemNameX, tableTop + 8);
      doc.text('Rate', rateX, tableTop + 8, { width: 60, align: 'right' });
      doc.text('Qty', qtyX, tableTop + 8, { width: 40, align: 'center' });
      doc.text('Total', totalAmountX, tableTop + 8, { width: 40, align: 'right' });

      yPosition += 30;

      // Items rows
      let rowBgColor = true;
      (invoiceData.items || []).forEach((item, index) => {
        if (yPosition > 650) {
          doc.addPage();
          yPosition = 50;
        }
        const itemName = item.name || item.description || 'Item';
        const itemRate = parseAmount(item.price || item.rate || 0);
        const itemQty = parseAmount(item.quantity || 1);
        const itemTotal = itemRate * itemQty;

        if (rowBgColor) {
          doc.rect(35, yPosition - 2, 530, 20).fill('#f9fafb');
        }
        rowBgColor = !rowBgColor;

        doc.fontSize(9).fillColor(textColor).font('Helvetica').text((index + 1).toString(), itemNoX, yPosition + 2);
        doc.font('Helvetica').text(itemName, itemNameX, yPosition + 2, { width: 200 });
        doc.text(formatCurrency(itemRate), rateX, yPosition + 2, { width: 60, align: 'right' });
        doc.text(itemQty.toString(), qtyX, yPosition + 2, { width: 40, align: 'center' });
        doc.fontSize(9).fillColor(textColor).font('Helvetica-Bold').text(formatCurrency(itemTotal), totalAmountX, yPosition + 2, { width: 40, align: 'right' });

        yPosition += 20;
        doc.strokeColor(borderColor).lineWidth(0.5).moveTo(35, yPosition).lineTo(565, yPosition).stroke();
        yPosition += 2;
      });

      yPosition += 10;

      // Totals header
      const totalQty = (invoiceData.items || []).reduce((sum, item) => sum + parseAmount(item.quantity || 1), 0);
      const totalItems = (invoiceData.items || []).length;
      doc.fontSize(9).fillColor(textColor).font('Helvetica-Bold').text(`Total Items: ${totalItems}  |  Total Qty: ${totalQty}`, 45, yPosition, { width: 260 });
      yPosition += 20;
      doc.fontSize(10).fillColor(primaryColor).font('Helvetica-Bold').text('Payment Summary', 45, yPosition);
      yPosition += 18;

      if (yPosition > 620) {
        doc.addPage();
        yPosition = 50;
        doc.fontSize(9).fillColor(textColor).font('Helvetica-Bold').text(`Total Items: ${totalItems}  |  Total Qty: ${totalQty}`, 45, yPosition, { width: 260 });
        yPosition += 20;
        doc.fontSize(10).fillColor(primaryColor).font('Helvetica-Bold').text('Payment Summary', 45, yPosition);
        yPosition += 18;
      }

      // ===== Totals logic & rendering =====
      const subtotal = parseAmount(
        invoiceData.subtotal ??
        invoiceData.subtotal_amount ??
        invoiceData.items?.reduce?.((s, i) => s + (parseAmount(i.price || i.rate) * parseAmount(i.quantity || 1)), 0) ??
        0
      );
      const discountAmount = parseAmount(invoiceData.discount_amount ?? invoiceData.discount ?? 0);
      const couponDiscount = parseAmount(invoiceData.coupon_discount ?? invoiceData.couponDiscount ?? 0);
      const giftPrice = parseAmount(invoiceData.gift_price ?? invoiceData.giftPrice ?? 0);
      const deliveryCharges = parseAmount(invoiceData.delivery_charges ?? invoiceData.deliveryCharges ?? 0);
      const shippingCharges = deliveryCharges;

      // Normalize sale type. DEFAULT: treat missing as 'online' for backward compatibility.
      let saleTypeRaw = invoiceData.sale_type;
      let isOfflineSale = saleTypeRaw === 'offline';
      let isOnlineSale = saleTypeRaw === 'online' || (!saleTypeRaw); // default online if missing

      // Applied discount/coupon rules:
      const appliedDiscount = isOfflineSale ? discountAmount : 0;
      const appliedCoupon = isOnlineSale ? (couponDiscount || discountAmount) : 0;

      // ✅ FIX: Use stored tax amount from invoice, don't recalculate!
      let gstAmount = parseAmount(invoiceData.tax_amount ?? invoiceData.gst_amount ?? invoiceData.tax ?? 0);
      
      // For offline sales, GST is included in subtotal (set to 0 for display)
      if (isOfflineSale) {
        gstAmount = 0;
      }
      // For online sales, use the exact tax_amount from the invoice (already calculated and stored)

      // final total calculation: prefer invoiceData.total or invoiceData.total_amount if provided
      const providedTotal = parseAmount(invoiceData.total ?? invoiceData.total_amount ?? invoiceData.totalAmount ?? 0);
      let computedTotal;
      if (isOfflineSale) {
        computedTotal = subtotal - appliedDiscount;
      } else {
        computedTotal = subtotal + shippingCharges + giftPrice + gstAmount - appliedCoupon;
      }
      const finalTotal = providedTotal || computedTotal;

      // Render summary in required format (Option B: + / - on values only)
      const summaryLabelX = 340;
      const summaryLabelWidth = 140;
      const valueX = 480;

      // Subtotal label
      const subtotalLabel = isOfflineSale ? 'Subtotal (GST 5% Inclusive):' : 'Subtotal:';

      doc.fontSize(9).fillColor(textColor).font('Helvetica').text(subtotalLabel, 380, yPosition);
      doc.text(formatCurrency(subtotal), valueX, yPosition, { width: 80, align: 'right' });
      yPosition += 14;

      if (isOfflineSale) {
        // Offline: show discount and grand total only
        if (appliedDiscount > 0) {
          doc.text('Discount:', 380, yPosition);
          doc.text(`-${formatCurrency(appliedDiscount)}`, valueX, yPosition, { width: 80, align: 'right' });
          yPosition += 14;
        }

        // Grand Total for offline
        doc.strokeColor(borderColor).lineWidth(1.5).moveTo(380, yPosition).lineTo(560, yPosition).stroke();
        yPosition += 12;
        doc.fontSize(11).fillColor(primaryColor).font('Helvetica-Bold').text('Grand Total:', 380, yPosition);
        doc.fontSize(12).text(formatCurrency(finalTotal), valueX, yPosition, { width: 80, align: 'right' });
        doc.font('Helvetica');
        yPosition += 18;
      } else {
        // ONLINE: show Subtotal, Delivery Charges, Tax, Gift Price, Discount, Grand Total (Total Paid)
        // Delivery Charges
        doc.text('Delivery Charges:', 380, yPosition);
        doc.text(formatCurrency(shippingCharges), valueX, yPosition, { width: 80, align: 'right' });
        yPosition += 14;

        // Tax (5%)
        if (gstAmount > 0) {
          doc.text('Tax (5%):', 380, yPosition);
          doc.text(formatCurrency(gstAmount), valueX, yPosition, { width: 80, align: 'right' });
          yPosition += 14;
        }

        // Gift Price
        if (giftPrice > 0) {
          doc.text('Gift Price:', 380, yPosition);
          doc.text(`+${formatCurrency(giftPrice)}`, valueX, yPosition, { width: 80, align: 'right' });
          yPosition += 14;
        }

        // Coupon / Discount
        if (appliedCoupon > 0) {
          doc.text('Discount:', 380, yPosition);
          doc.text(`-${formatCurrency(appliedCoupon)}`, valueX, yPosition, { width: 80, align: 'right' });
          yPosition += 14;
        } else if (discountAmount > 0 && !appliedCoupon) {
          // fallback
          doc.text('Discount:', 380, yPosition);
          doc.text(`-${formatCurrency(discountAmount)}`, valueX, yPosition, { width: 80, align: 'right' });
          yPosition += 14;
        }

        // Separator
        doc.strokeColor(borderColor).lineWidth(1.5).moveTo(380, yPosition).lineTo(560, yPosition).stroke();
        yPosition += 12;

        // Total Paid / Grand Total
        doc.fontSize(11).fillColor(primaryColor).font('Helvetica-Bold').text('Total Paid:', 380, yPosition);
        doc.fontSize(12).text(formatCurrency(finalTotal), valueX, yPosition, { width: 80, align: 'right' });
        doc.font('Helvetica');
        yPosition += 18;
      }

      // Amount in words
      const totalInWords = numberToWords(Math.floor(finalTotal));
      doc.fontSize(9).fillColor(textColor).font('Helvetica').text('Amount in Words: ', 45, yPosition);
      doc.font('Helvetica-Bold').text(`Rs. ${totalInWords} Only`, 150, yPosition);
      yPosition += 30;

      // Separator
      doc.strokeColor(borderColor).lineWidth(1).moveTo(40, yPosition).lineTo(555, yPosition).stroke();
      yPosition += 15;

      // ===== Payment & Bank details =====
      const leftSectionX = 45;
      const rightSectionX = 380;

      // Payment ID if present
      if (invoiceData.razorpay_payment_id) {
        doc.fontSize(8).fillColor('#10b981').font('Helvetica-Bold').text('✓ PAID via Razorpay', leftSectionX, yPosition);
        yPosition += 12;
        doc.fontSize(7).fillColor(textColor).font('Helvetica').text(`Payment ID: ${invoiceData.razorpay_payment_id}`, leftSectionX, yPosition);
        yPosition += 20;
      }

      // UPI QR for offline pending
      if (invoiceData.sale_type === 'offline' && (invoiceData.paymentStatus === 'pending' || invoiceData.payment_status === 'pending')) {
        doc.fontSize(9).fillColor(textColor).font('Helvetica-Bold').text('Pay using UPI:', leftSectionX, yPosition);
        yPosition += 15;
        if (invoiceData.upi_qr_code) {
          try {
            const qrBuffer = Buffer.from(invoiceData.upi_qr_code.replace(/^data:image\/\w+;base64,/, ''), 'base64');
            doc.image(qrBuffer, leftSectionX, yPosition, { width: 80, height: 80 });
          } catch (err) {
            console.error('Error adding QR code image', err.message);
            doc.rect(leftSectionX, yPosition, 80, 80).stroke(borderColor);
            doc.fontSize(7).fillColor(mutedColor).font('Helvetica').text('QR Code', leftSectionX + 25, yPosition + 35);
          }
        } else {
          doc.rect(leftSectionX, yPosition, 80, 80).stroke(borderColor);
          doc.fontSize(7).fillColor(mutedColor).font('Helvetica').text('Scan to Pay', leftSectionX + 20, yPosition + 35);
        }
      }

      const qrBottomY = yPosition + 85;

      // Bank details on right
      doc.fontSize(9).fillColor(textColor).font('Helvetica-Bold').text('Bank Details:', rightSectionX, yPosition);
      yPosition += 15;
      const bank = companySettings.selectedBank || {};
      doc.fontSize(8).fillColor(textColor).font('Helvetica');
      doc.text('Bank:', rightSectionX, yPosition);
      doc.text(bank.bankName || 'HDFC Bank', rightSectionX + 80, yPosition);
      yPosition += 12;
      doc.text('Account Holder:', rightSectionX, yPosition);
      doc.text(bank.accountHolder || companySettings.companyName || 'BYTEWISE CONSULTING LLP', rightSectionX + 80, yPosition);
      yPosition += 12;
      doc.text('Account #:', rightSectionX, yPosition);
      doc.text(bank.accountNumber || '50200110001118', rightSectionX + 80, yPosition);
      yPosition += 12;
      doc.text('IFSC Code:', rightSectionX, yPosition);
      doc.text(bank.ifscCode || 'HDFC0005444', rightSectionX + 80, yPosition);
      yPosition += 12;
      doc.text('Branch:', rightSectionX, yPosition);
      doc.text(bank.branchName || 'TAMANDO', rightSectionX + 80, yPosition);

      yPosition = Math.max(qrBottomY, yPosition + 20);

      // Signature section
      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
      }
      yPosition += 30;
      doc.strokeColor(borderColor).lineWidth(1).moveTo(35, yPosition).lineTo(560, yPosition).stroke();
      yPosition += 20;
      doc.fontSize(9).fillColor(textColor).font('Helvetica-Bold').text(`For ${companySettings.companyName || 'COMPANY NAME'}`, rightSectionX, yPosition);
      yPosition += 25;

      const signatureSource = companySettings.signature || null;
      if (signatureSource) {
        try {
          if (signatureSource.startsWith('http://') || signatureSource.startsWith('https://')) {
            const sigBuffer = await fetchRemoteImage(signatureSource);
            doc.image(sigBuffer, rightSectionX, yPosition, { width: 100, height: 40, fit: [100, 40] });
            yPosition += 45;
          } else {
            let sigData = signatureSource.trim();
            if (sigData.includes('base64,')) sigData = sigData.split('base64,')[1];
            else if (sigData.startsWith('data:')) sigData = sigData.replace(/^data:image\/[^;]+;base64,/, '');
            sigData = sigData.replace(/\s/g, '');
            if (sigData && sigData.length > 100) {
              const sigBuffer = Buffer.from(sigData, 'base64');
              doc.image(sigBuffer, rightSectionX, yPosition, { width: 100, height: 40, fit: [100, 40] });
              yPosition += 45;
            } else {
              throw new Error('Invalid signature data');
            }
          }
        } catch (err) {
          console.error('Signature render error:', err.message);
          doc.strokeColor(textColor).lineWidth(1).moveTo(rightSectionX, yPosition + 20).lineTo(rightSectionX + 100, yPosition + 20).stroke();
          yPosition += 30;
        }
      } else {
        doc.strokeColor(textColor).lineWidth(1).moveTo(rightSectionX, yPosition + 20).lineTo(rightSectionX + 100, yPosition + 20).stroke();
        yPosition += 30;
      }

      doc.fontSize(8).fillColor(textColor).font('Helvetica').text('Authorized Signatory', rightSectionX, yPosition);

      // finalize
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateInvoicePDF,
};
