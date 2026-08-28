import html2canvas from 'html2canvas';
import { dataStore } from '../utils/dataStore.js';
import { currency } from './currency.js';
import { sound } from '../utils/sound.js';
import { toast } from '../utils/toast.js';
import { OWNER_SIGNATURE } from '../data/signatureBase64.js';
import { YAZH_CIRCLE_LOGO } from '../data/logoBase64.js';

export class BookingInvoiceManager {
  constructor() {
    this.currentBooking = null;
    this.init();
  }

  init() {
    this.bindEvents();
    this.checkUrlForInvoice();

    // Listen for live updates
    document.addEventListener('bookingsUpdated', async () => {
      if (this.currentBooking) {
        const updated = await dataStore.getBookingById(this.currentBooking.id);
        if (updated) {
          this.currentBooking = updated;
          this.populateInvoice(updated);
        }
      }
    });

    document.addEventListener('bookingApproved', async (e) => {
      const approved = e.detail;
      if (this.currentBooking && this.currentBooking.id === approved.id) {
        this.currentBooking = approved;
        this.populateInvoice(approved);
        toast.show({
          title: 'Invoice Approved!',
          message: `Booking ${approved.id} has been officially approved.`,
          type: 'success',
          icon: 'check-circle'
        });
      }
    });
  }

  bindEvents() {
    // Print Button
    document.getElementById('btn-invoice-print')?.addEventListener('click', () => {
      this.printInvoice();
    });

    // WhatsApp Share Button
    document.getElementById('btn-invoice-whatsapp')?.addEventListener('click', () => {
      if (this.currentBooking) {
        this.shareOnWhatsApp(this.currentBooking);
      }
    });

    // Gallery Download Image Button
    document.getElementById('btn-invoice-download-img')?.addEventListener('click', async () => {
      await this.downloadInvoiceImage();
    });

    // Copy Link Button
    document.getElementById('btn-invoice-copy-link')?.addEventListener('click', () => {
      if (this.currentBooking) {
        this.copyInvoiceLink(this.currentBooking.id);
      }
    });

    // Close Invoice Modal
    document.querySelectorAll('#booking-invoice-modal .modal-close, #booking-invoice-modal .invoice-modal-backdrop').forEach(el => {
      el.addEventListener('click', () => {
        this.closeInvoiceModal();
      });
    });

    // Close Track Booking Modal
    document.querySelectorAll('#track-booking-modal .modal-close, #track-booking-modal .modal-backdrop').forEach(el => {
      el.addEventListener('click', () => {
        document.getElementById('track-booking-modal')?.classList.remove('active');
        document.body.style.overflow = '';
      });
    });

    // Track Booking Form Submit
    document.getElementById('track-booking-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('track-booking-input')?.value.trim();
      if (!input) return;

      const submitBtn = document.getElementById('btn-submit-track-booking');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span> Searching...';
      }

      try {
        const found = await dataStore.getBookingByPhoneOrId(input);
        if (found) {
          sound.playSuccessChime();
          document.getElementById('track-booking-modal')?.classList.remove('active');
          document.getElementById('track-booking-form')?.reset();
          this.openInvoice(found);
        } else {
          toast.show({
            title: 'Booking Not Found',
            message: `No booking inquiry found matching "${input}". Please check your Booking ID or Mobile Number.`,
            type: 'warning',
            icon: 'warning'
          });
        }
      } catch (err) {
        console.error('Error tracking booking:', err);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Lookup Booking Bill';
        }
      }
    });

    // Open Track Booking Modal Buttons across site
    document.querySelectorAll('.btn-open-track-booking').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openLookupModal();
      });
    });
  }

  formatDateDisplay(dateStr) {
    if (!dateStr) return 'Date to be confirmed';
    try {
      const parts = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      const [year, month, day] = parts.split('-').map(Number);
      if (year && month && day) {
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      }
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      }
    } catch (e) {
      console.warn('Date formatting error:', e);
    }
    return dateStr;
  }

  formatPhoneDisplay(phoneStr) {
    if (!phoneStr) return 'Not Provided';
    const digits = phoneStr.replace(/\D/g, '');
    if (digits.length === 10) {
      return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    } else if (digits.length === 12 && digits.startsWith('91')) {
      return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
    }
    return phoneStr;
  }

  checkUrlForInvoice() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const billId = urlParams.get('bill') || urlParams.get('inquiry') || urlParams.get('invoice');
      
      let hashBill = '';
      if (window.location.hash.startsWith('#bill-')) {
        hashBill = window.location.hash.replace('#bill-', '');
      }

      const targetId = billId || hashBill;
      if (targetId) {
        setTimeout(async () => {
          const booking = await dataStore.getBookingById(targetId);
          if (booking) {
            this.openInvoice(booking);
          }
        }, 300);
      }
    } catch (e) {
      console.warn('URL Param bill parse error:', e);
    }
  }

  async openInvoice(bookingOrId) {
    let booking = bookingOrId;
    if (typeof bookingOrId === 'string') {
      booking = await dataStore.getBookingById(bookingOrId);
    }

    if (!booking) {
      const all = await dataStore.getBookings();
      if (all && all.length > 0) {
        booking = all[0];
      } else {
        booking = {
          id: 'YZ-000001',
          createdAt: new Date().toISOString(),
          clientName: 'NIZARDEEN S',
          clientEmail: 'nazardeens21@gmail.com',
          clientPhone: '8248526646',
          eventDate: '2026-09-12',
          location: 'Singampunari, Tamil Nadu',
          packageName: 'Standard Wedding Photography Package',
          packagePrice: 60000,
          customizations: [],
          customizationTotal: 0,
          totalINR: 60000,
          advanceINR: 15000,
          remainingINR: 45000,
          status: 'Approved',
          approvedAt: new Date().toISOString(),
          approvedBy: 'Admin'
        };
      }
    }

    this.currentBooking = booking;
    this.populateInvoice(booking);

    const modal = document.getElementById('booking-invoice-modal');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  closeInvoiceModal() {
    const modal = document.getElementById('booking-invoice-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
    this.currentBooking = null;
  }

  openLookupModal() {
    const modal = document.getElementById('track-booking-modal');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      const input = document.getElementById('track-booking-input');
      if (input) {
        input.value = '';
        setTimeout(() => input.focus(), 100);
      }
    }
  }

  populateInvoice(b) {
    // 1. Meta Elements
    const invIdEl = document.getElementById('inv-bill-id');
    const invDateEl = document.getElementById('inv-issued-date');
    const invEventDateEl = document.getElementById('inv-event-date');
    const invStatusEl = document.getElementById('inv-status-badge');

    let bookingId = b.id || 'YZ-000001';
    const numMatch = bookingId.match(/^YZ-(\d+)$/i);
    if (numMatch) {
      bookingId = `YZ-${numMatch[1].padStart(6, '0')}`;
    }
    if (invIdEl) invIdEl.textContent = bookingId;
    
    const formattedIssueDate = b.createdAt ? this.formatDateDisplay(b.createdAt) : this.formatDateDisplay(new Date().toISOString());
    if (invDateEl) invDateEl.textContent = formattedIssueDate;

    const formattedEventDate = this.formatDateDisplay(b.eventDate);
    if (invEventDateEl) invEventDateEl.textContent = formattedEventDate;

    // Status Badge
    const status = b.status || 'New';
    let statusClass = 'status-pending';
    let statusLabel = '⏳ PENDING STUDIO APPROVAL';
    
    if (status === 'Approved' || status === 'Confirmed') {
      statusClass = 'status-approved';
      statusLabel = '✓ APPROVED & CONFIRMED';
    } else if (status === 'In Progress') {
      statusClass = 'status-inprogress';
      statusLabel = '● IN PROGRESS';
    } else if (status === 'Completed') {
      statusClass = 'status-completed';
      statusLabel = '✓ COMPLETED & DELIVERED';
    } else if (status === 'Cancelled') {
      statusClass = 'status-cancelled';
      statusLabel = '✕ CANCELLED';
    }

    if (invStatusEl) {
      invStatusEl.className = `clean-status-pill ${statusClass}`;
      invStatusEl.textContent = statusLabel;
    }

    // 2. Client Details (Clean 4-Item Particulars)
    const clientNameEl = document.getElementById('inv-client-name');
    const clientPhoneEl = document.getElementById('inv-client-phone');
    const locationEl = document.getElementById('inv-event-location');

    if (clientNameEl) clientNameEl.textContent = (b.clientName || 'Valued Client').toUpperCase();
    if (clientPhoneEl) clientPhoneEl.textContent = this.formatPhoneDisplay(b.clientPhone);
    if (locationEl) locationEl.textContent = b.location || 'Venue to be confirmed';

    // 3. Deliverables Table
    const tbody = document.getElementById('inv-items-tbody');
    if (tbody) {
      let rowsHtml = '';
      let slNo = 1;
      
      // Base Package Row
      const basePrice = Number(b.packagePrice) || Number(b.totalINR) || 0;
      rowsHtml += `
        <tr>
          <td style="text-align: center; font-weight: 700; color: #64748b;">${slNo++}</td>
          <td>
            <div class="clean-item-name">📸 ${b.packageName || 'Wedding Photography Package'}</div>
            <div class="clean-item-desc">Full Day Photography Coverage • High-Res Master Retouched Proofs • Digital Cloud Gallery • Album Print Ready Deliverables</div>
          </td>
          <td style="text-align: center; font-weight: 600; color: #64748b; font-size: 0.8rem;">Full Event</td>
          <td style="text-align: right; font-weight: 700; color: #0f172a;">${currency.format(basePrice)}</td>
        </tr>
      `;

      // Customizations / Add-ons Rows
      if (b.customizations && Array.isArray(b.customizations) && b.customizations.length > 0) {
        b.customizations.forEach(c => {
          rowsHtml += `
            <tr>
              <td style="text-align: center; font-weight: 700; color: #64748b;">${slNo++}</td>
              <td>
                <div class="clean-item-name">✨ ${c.name}</div>
                <div class="clean-item-desc">Selected premium service add-on customization</div>
              </td>
              <td style="text-align: center; font-weight: 600; color: #64748b; font-size: 0.8rem;">Add-on</td>
              <td style="text-align: right; font-weight: 700; color: #0f172a;">${currency.format(c.price || 0)}</td>
            </tr>
          `;
        });
      }

      tbody.innerHTML = rowsHtml;
    }

    // 4. Financial Calculations
    const pkgPrice = Number(b.packagePrice) || Number(b.totalINR) || 0;
    const custTotal = Number(b.customizationTotal) || 0;
    const discount = Number(b.discountINR) || 0;
    const grandTotal = Number(b.totalINR) || (pkgPrice + custTotal - discount);
    const advancePaid = Number(b.advanceINR) || 0;
    const balanceDue = Math.max(0, grandTotal - advancePaid);

    const subtotalEl = document.getElementById('inv-calc-subtotal');
    const discountRow = document.getElementById('inv-calc-discount-row');
    const discountEl = document.getElementById('inv-calc-discount');
    const totalEl = document.getElementById('inv-calc-total');
    const advanceEl = document.getElementById('inv-calc-advance');
    const balanceEl = document.getElementById('inv-calc-balance');

    if (subtotalEl) subtotalEl.textContent = currency.format(pkgPrice + custTotal);
    
    if (discountRow && discountEl) {
      if (discount > 0) {
        discountRow.style.display = 'table-row';
        discountEl.textContent = `- ${currency.format(discount)}`;
      } else {
        discountRow.style.display = 'none';
      }
    }

    if (totalEl) totalEl.textContent = currency.format(grandTotal);
    if (advanceEl) advanceEl.textContent = currency.format(advancePaid);
    if (balanceEl) balanceEl.textContent = currency.format(balanceDue);

    // 5. Studio Circle Logo & Owner Signature Injection
    const logoImg = document.getElementById('inv-circle-logo-img');
    if (logoImg) {
      logoImg.src = YAZH_CIRCLE_LOGO;
    }

    const sigImg = document.getElementById('inv-owner-signature-img');
    if (sigImg) {
      sigImg.src = OWNER_SIGNATURE;
    }

    // 6. Signatory info
    const signatoryEl = document.getElementById('inv-signatory-date');
    if (signatoryEl) {
      const stampDate = b.approvedAt ? this.formatDateDisplay(b.approvedAt) : formattedIssueDate;
      signatoryEl.textContent = `Date: ${stampDate}`;
    }

    if (window.lucide) window.lucide.createIcons();
  }

  printInvoice() {
    sound.playSuccessChime();
    window.print();
  }

  async downloadInvoiceImage() {
    const cardEl = document.getElementById('yazh-official-invoice-card');
    if (!cardEl) return;

    const dlBtn = document.getElementById('btn-invoice-download-img');
    const originalText = dlBtn ? dlBtn.innerHTML : '';
    if (dlBtn) {
      dlBtn.disabled = true;
      dlBtn.innerHTML = '<span class="btn-spinner"></span> Saving Image...';
    }

    try {
      sound.playShutter();
      
      const canvas = await html2canvas(cardEl, {
        scale: 2.5, // Crisp 300 DPI retina resolution
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');
      const filename = `yazh_photography_bill_${this.currentBooking ? this.currentBooking.id : 'invoice'}.png`;

      // Direct download trigger for Gallery / Camera Roll / Downloads
      const link = document.createElement('a');
      link.href = imgData;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      sound.playSuccessChime();
      toast.show({
        title: 'Bill Saved to Gallery!',
        message: `Official bill saved as high-resolution image (${filename}).`,
        type: 'success',
        icon: 'image'
      });
    } catch (err) {
      console.error('Error generating invoice image:', err);
      toast.show({
        title: 'Download Failed',
        message: 'Could not generate image. You can still Print or Share to WhatsApp.',
        type: 'error',
        icon: 'error'
      });
    } finally {
      if (dlBtn) {
        dlBtn.disabled = false;
        dlBtn.innerHTML = originalText;
      }
    }
  }

  shareOnWhatsApp(b, targetPhone = '') {
    const origin = window.location.origin + window.location.pathname;
    const invoiceUrl = `${origin}?bill=${encodeURIComponent(b.id)}`;
    const statusText = (b.status === 'Approved' || b.status === 'Confirmed') ? '✅ APPROVED & CONFIRMED' : '⏳ PENDING APPROVAL';
    const formattedDate = this.formatDateDisplay(b.eventDate);
    
    const message = [
      `📸 *YAZH PHOTOGRAPHY — OFFICIAL BOOKING BILL*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `*Invoice Ref:* ${b.id}`,
      `*Status:* ${statusText}`,
      `*Client:* ${(b.clientName || '').toUpperCase()}`,
      `*Event Date:* ${formattedDate}`,
      `*Venue:* ${b.location || 'Venue TBD'}`,
      `*Package:* ${b.packageName}`,
      `*Total Value:* ₹${Number(b.totalINR || 0).toLocaleString('en-IN')}`,
      `*Advance Paid:* ₹${Number(b.advanceINR || 0).toLocaleString('en-IN')}`,
      `*Balance Due:* ₹${Number(b.remainingINR || 0).toLocaleString('en-IN')}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📄 *View Official Bill / Download PNG:*`,
      `${invoiceUrl}`,
      ``,
      `*Yazh Photography* — Save your memory in every click.`,
      `📞 +91 81482 74100 / +91 88383 33828 | ✉️ YazhPhotographypvp@gmail.com`
    ].join('\n');

    let waUrl = '';
    const cleanPhone = (targetPhone || b.clientPhone || '').replace(/\D/g, '');
    if (cleanPhone && cleanPhone.length >= 10) {
      const phoneWithCountry = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone.slice(-10)}`;
      waUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
    } else {
      waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    }

    sound.playSuccessChime();
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }

  copyInvoiceLink(bookingId) {
    const origin = window.location.origin + window.location.pathname;
    const url = `${origin}?bill=${encodeURIComponent(bookingId)}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        sound.playSuccessChime();
        toast.success(`Direct bill link copied: ${url}`, 'Link Copied');
      }).catch(() => {
        this.fallbackCopy(url);
      });
    } else {
      this.fallbackCopy(url);
    }
  }

  fallbackCopy(text) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    toast.success('Direct bill link copied to clipboard.', 'Link Copied');
  }
}
