import { toast } from '../utils/toast.js';
import { sound } from '../utils/sound.js';
import confetti from 'canvas-confetti';

export class ReviewManager {
  constructor() {
    this.reviews = this.loadReviews();
    this.selectedRating = 5;
    this.init();
  }

  init() {
    this.renderOverallRating();
    this.renderReviewsGrid();
    this.setupReviewModal();
    this.bindEvents();
  }

  loadReviews() {
    const saved = localStorage.getItem('yazh_client_reviews');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Filter out any previous dummy seed items (rev-01 to rev-04)
        const realReviews = parsed.filter(r => !['rev-01', 'rev-02', 'rev-03', 'rev-04'].includes(r.id));
        localStorage.setItem('yazh_client_reviews', JSON.stringify(realReviews));
        return realReviews;
      } catch (e) {
        // fallback
      }
    }
    return [];
  }

  saveReviews(reviews) {
    this.reviews = reviews;
    localStorage.setItem('yazh_client_reviews', JSON.stringify(reviews));
    this.renderOverallRating();
    this.renderReviewsGrid();
    document.dispatchEvent(new CustomEvent('reviewsUpdated', { detail: reviews }));
  }

  renderOverallRating() {
    const countEl = document.getElementById('reviews-total-count');
    const scoreEl = document.getElementById('reviews-avg-score');
    const starsEl = document.getElementById('reviews-stars-visual');

    if (this.reviews.length === 0) {
      if (countEl) countEl.textContent = '0 Reviews';
      if (scoreEl) scoreEl.textContent = '5.0';
      if (starsEl) starsEl.innerHTML = '★★★★★';
      return;
    }

    const total = this.reviews.length;
    const sum = this.reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    const avg = (sum / total).toFixed(1);

    if (countEl) countEl.textContent = `${total} Verified ${total === 1 ? 'Review' : 'Reviews'}`;
    if (scoreEl) scoreEl.textContent = avg;
    if (starsEl) {
      starsEl.innerHTML = '★'.repeat(Math.round(avg)) + '☆'.repeat(5 - Math.round(avg));
    }
  }

  renderReviewsGrid() {
    const grid = document.getElementById('reviews-cards-grid');
    if (!grid) return;

    if (this.reviews.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 1.5rem; background: var(--bg-card); border: 1px dashed var(--border-glass); border-radius: var(--radius-md); box-shadow: var(--shadow-sm);">
          <div style="font-size: 2.2rem; margin-bottom: 0.75rem;">⭐</div>
          <h3 style="font-size: 1.25rem; font-family: var(--font-serif); color: var(--text-primary); margin-bottom: 0.4rem;">No Client Reviews Published Yet</h3>
          <p style="color: var(--text-muted); font-size: 0.88rem; max-width: 480px; margin: 0 auto 1.5rem; line-height: 1.6;">
            Have you celebrated your wedding, ceremony, or event with Yazh Photography? We would love to hear your feedback!
          </p>
          <button type="button" class="btn btn-primary btn-sm" onclick="document.getElementById('btn-open-review-modal').click();">
            ✍️ Leave the First Review
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.reviews.map(rev => {
      const stars = '★'.repeat(rev.rating) + '☆'.repeat(5 - rev.rating);
      const dateFormatted = new Date(rev.date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      return `
        <div class="review-card" data-id="${rev.id}">
          <div class="review-card-top">
            <div class="review-user-info">
              <div class="review-avatar-wrap">
                <div class="review-avatar-placeholder">${rev.name.charAt(0)}</div>
              </div>
              <div class="review-user-meta">
                <strong class="review-user-name">${rev.name}</strong>
                <span class="review-event-badge">${rev.eventType} · ${rev.location || 'Tamil Nadu'}</span>
              </div>
            </div>
            <div class="review-stars-badge" title="${rev.rating} out of 5 stars">
              <span class="review-stars-gold">${stars}</span>
            </div>
          </div>

          <div class="review-card-body">
            <h4 class="review-title">"${rev.title}"</h4>
            <p class="review-comment">${rev.comment}</p>
          </div>

          <div class="review-card-footer">
            <span class="review-date">${dateFormatted}</span>
            ${rev.verified ? `<span class="review-verified-tag"><i data-lucide="check-circle-2" style="width: 12px; height: 12px;"></i> Verified Couple</span>` : ''}
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  setupReviewModal() {
    const modal = document.getElementById('client-review-modal');
    const openBtn = document.getElementById('btn-open-review-modal');
    const form = document.getElementById('submit-client-review-form');

    openBtn?.addEventListener('click', () => {
      modal?.classList.add('active');
      document.body.style.overflow = 'hidden';
    });

    modal?.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
      el.addEventListener('click', () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      });
    });

    // Star Rating Click & Hover Handling
    const starBtns = document.querySelectorAll('.star-rating-btn');
    starBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const rating = parseInt(btn.dataset.rating, 10);
        this.selectedRating = rating;
        this.updateStarRatingUI(rating);
      });

      btn.addEventListener('mouseenter', () => {
        const rating = parseInt(btn.dataset.rating, 10);
        this.highlightStars(rating);
      });
    });

    const starContainer = document.getElementById('interactive-stars-wrap');
    starContainer?.addEventListener('mouseleave', () => {
      this.updateStarRatingUI(this.selectedRating);
    });

    // Form Submit
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleReviewSubmit();
    });
  }

  updateStarRatingUI(rating) {
    const starBtns = document.querySelectorAll('.star-rating-btn');
    starBtns.forEach(btn => {
      const starVal = parseInt(btn.dataset.rating, 10);
      btn.classList.toggle('selected', starVal <= rating);
    });
    const label = document.getElementById('star-rating-text-label');
    if (label) {
      const labels = {
        1: 'Poor (1/5)',
        2: 'Fair (2/5)',
        3: 'Good (3/5)',
        4: 'Very Good (4/5)',
        5: 'Outstanding Experience! (5/5)'
      };
      label.textContent = labels[rating] || `${rating}/5 Stars`;
    }
  }

  highlightStars(rating) {
    const starBtns = document.querySelectorAll('.star-rating-btn');
    starBtns.forEach(btn => {
      const starVal = parseInt(btn.dataset.rating, 10);
      btn.classList.toggle('hovered', starVal <= rating);
    });
  }

  handleReviewSubmit() {
    const nameInput = document.getElementById('review-client-name');
    const eventTypeInput = document.getElementById('review-event-type');
    const locationInput = document.getElementById('review-location');
    const titleInput = document.getElementById('review-title');
    const commentInput = document.getElementById('review-comment');
    const modal = document.getElementById('client-review-modal');

    const name = nameInput?.value.trim();
    const eventType = eventTypeInput?.value || 'Wedding Ceremony';
    const location = locationInput?.value.trim() || 'Tamil Nadu';
    const title = titleInput?.value.trim();
    const comment = commentInput?.value.trim();

    if (!name || !title || !comment) {
      toast.show({ title: 'Incomplete Review', message: 'Please fill in your name, review headline, and detailed feedback.', type: 'warning', icon: 'warning' });
      return;
    }

    const newReview = {
      id: `rev-${Date.now()}`,
      name,
      eventType,
      location,
      rating: this.selectedRating,
      date: new Date().toISOString().split('T')[0],
      verified: true,
      title,
      comment
    };

    const updated = [newReview, ...this.reviews];
    this.saveReviews(updated);

    sound.playSuccessChime();
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    });

    toast.success('Thank you! Your review has been published on Yazh Photography.', 'Review Submitted');

    // Reset Form and close modal
    document.getElementById('submit-client-review-form')?.reset();
    this.selectedRating = 5;
    this.updateStarRatingUI(5);
    modal?.classList.remove('active');
    document.body.style.overflow = '';
  }

  bindEvents() {
    // Optional events
  }
}
