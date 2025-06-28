// HotelFinder Frontend JavaScript
class HotelFinder {
    constructor() {
        this.currentSearchData = null;
        this.selectedHotel = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDateValidation();
        this.loadPopularDestinations();
    }

    setupEventListeners() {
        // Search form
        const searchForm = document.getElementById('searchForm');
        if (searchForm) {
            searchForm.addEventListener('submit', this.handleSearch.bind(this));
        }

        // City input for suggestions
        const cityInput = document.getElementById('city');
        if (cityInput) {
            cityInput.addEventListener('input', this.handleCityInput.bind(this));
            cityInput.addEventListener('blur', () => {
                setTimeout(() => this.hideSuggestions(), 200);
            });
        }

        // Popular destinations
        const popularItems = document.querySelectorAll('.popular-item');
        popularItems.forEach(item => {
            item.addEventListener('click', () => {
                const city = item.dataset.city;
                this.searchCity(city);
            });
        });
    }

    setupDateValidation() {
        const checkinInput = document.getElementById('checkin');
        const checkoutInput = document.getElementById('checkout');
        
        if (checkinInput && checkoutInput) {
            // Set minimum date to today
            const today = new Date().toISOString().split('T')[0];
            checkinInput.min = today;
            checkoutInput.min = today;

            checkinInput.addEventListener('change', () => {
                checkoutInput.min = checkinInput.value;
                if (checkoutInput.value && checkoutInput.value <= checkinInput.value) {
                    const nextDay = new Date(checkinInput.value);
                    nextDay.setDate(nextDay.getDate() + 1);
                    checkoutInput.value = nextDay.toISOString().split('T')[0];
                }
            });
        }
    }

    async handleSearch(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const searchParams = {
            city: formData.get('city'),
            checkin: formData.get('checkin'),
            checkout: formData.get('checkout'),
            guests: formData.get('guests')
        };

        if (!this.validateSearch(searchParams)) {
            return;
        }

        await this.performSearch(searchParams);
    }

    validateSearch(params) {
        if (!params.city.trim()) {
            this.showError('Please enter a city name');
            return false;
        }

        if (!params.checkin || !params.checkout) {
            this.showError('Please select check-in and check-out dates');
            return false;
        }

        const checkin = new Date(params.checkin);
        const checkout = new Date(params.checkout);
        
        if (checkout <= checkin) {
            this.showError('Check-out date must be after check-in date');
            return false;
        }

        return true;
    }

    async performSearch(searchParams) {
        this.showLoading(true);
        this.currentSearchData = searchParams;

        try {
            const queryString = new URLSearchParams(searchParams).toString();
            const response = await fetch(`/api/search?${queryString}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.displayResults(data);
            
        } catch (error) {
            console.error('Search error:', error);
            this.showError('Search failed. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    displayResults(data) {
        const resultsSection = document.getElementById('results-section');
        const resultsTitle = document.getElementById('results-title');
        const searchInfo = document.getElementById('search-info');
        const resultsGrid = document.getElementById('results-grid');

        // Update title and info
        resultsTitle.textContent = `Hotels in ${this.currentSearchData.city}`;
        searchInfo.innerHTML = `
            <span>${data.metadata.total_results} hotels found</span>
            <span>Response time: ${data.metadata.response_time_ms}ms</span>
            <span>${data.metadata.from_cache ? 'Cached' : 'Fresh'} results</span>
        `;

        // Clear and populate results
        resultsGrid.innerHTML = '';
        
        if (data.results.length === 0) {
            resultsGrid.innerHTML = `
                <div class="no-results">
                    <h3>No hotels found in ${this.currentSearchData.city}</h3>
                    <p>Try searching for a different city or check your spelling.</p>
                </div>
            `;
        } else {
            data.results.forEach(hotel => {
                resultsGrid.appendChild(this.createHotelCard(hotel));
            });
        }

        // Show results section
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    createHotelCard(hotel) {
        const card = document.createElement('div');
        card.className = 'hotel-card';
        
        const amenities = hotel.amenities ? hotel.amenities.split(',') : [];
        const amenityTags = amenities.map(amenity => 
            `<span class="amenity-tag">${amenity.trim()}</span>`
        ).join('');

        const stars = this.generateStars(hotel.rating);
        
        card.innerHTML = `
            <div class="hotel-image">
                <i class="fas fa-hotel"></i>
            </div>
            <div class="hotel-info">
                <h3 class="hotel-name">${hotel.name}</h3>
                <div class="hotel-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${hotel.city}, ${hotel.country}
                </div>
                <div class="hotel-rating">
                    <div class="stars">${stars}</div>
                    <span>${hotel.rating.toFixed(1)}</span>
                </div>
                <div class="hotel-amenities">
                    ${amenityTags}
                </div>
                <div class="hotel-price">
                    <div class="price">$${hotel.price_per_night}/night</div>
                    <button class="book-btn" onclick="hotelFinder.openBookingModal(${hotel.id})">
                        Book Now
                    </button>
                </div>
            </div>
        `;

        return card;
    }

    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        return '★'.repeat(fullStars) + 
               (hasHalfStar ? '☆' : '') + 
               '☆'.repeat(emptyStars);
    }

    async handleCityInput(event) {
        const input = event.target.value.toLowerCase().trim();
        
        if (input.length < 2) {
            this.hideSuggestions();
            return;
        }

        // Mock city suggestions - in a real app, this would come from an API
        const cities = [
            'Amsterdam', 'Barcelona', 'Berlin', 'London', 'Paris', 'Rome',
            'Madrid', 'Vienna', 'Prague', 'Budapest', 'Stockholm', 'Copenhagen'
        ];

        const matches = cities.filter(city => 
            city.toLowerCase().includes(input)
        ).slice(0, 5);

        this.showSuggestions(matches);
    }

    showSuggestions(cities) {
        const suggestions = document.getElementById('suggestions');
        
        if (cities.length === 0) {
            this.hideSuggestions();
            return;
        }

        suggestions.innerHTML = cities.map(city => 
            `<div class="suggestion-item" onclick="hotelFinder.selectCity('${city}')">${city}</div>`
        ).join('');

        suggestions.style.display = 'block';
    }

    hideSuggestions() {
        const suggestions = document.getElementById('suggestions');
        suggestions.style.display = 'none';
    }

    selectCity(city) {
        const cityInput = document.getElementById('city');
        cityInput.value = city;
        this.hideSuggestions();
    }

    async searchCity(city) {
        // Auto-fill form and search
        const cityInput = document.getElementById('city');
        const checkinInput = document.getElementById('checkin');
        const checkoutInput = document.getElementById('checkout');

        cityInput.value = city;

        // Set default dates if empty
        if (!checkinInput.value) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            checkinInput.value = tomorrow.toISOString().split('T')[0];
        }

        if (!checkoutInput.value) {
            const dayAfter = new Date();
            dayAfter.setDate(dayAfter.getDate() + 2);
            checkoutInput.value = dayAfter.toISOString().split('T')[0];
        }

        // Trigger search
        const searchForm = document.getElementById('searchForm');
        if (searchForm) {
            searchForm.dispatchEvent(new Event('submit'));
        }
    }

    async openBookingModal(hotelId) {
        try {
            // Find hotel data
            const response = await fetch(`/api/search?${new URLSearchParams(this.currentSearchData).toString()}`);
            const data = await response.json();
            this.selectedHotel = data.results.find(h => h.id === hotelId);

            if (!this.selectedHotel) {
                throw new Error('Hotel not found');
            }

            this.showBookingModal();
        } catch (error) {
            console.error('Error opening booking modal:', error);
            this.showError('Unable to load hotel details');
        }
    }

    showBookingModal() {
        const modal = document.getElementById('bookingModal');
        const bookingDetails = document.getElementById('booking-details');
        
        const checkinDate = new Date(this.currentSearchData.checkin).toLocaleDateString();
        const checkoutDate = new Date(this.currentSearchData.checkout).toLocaleDateString();
        const nights = Math.ceil((new Date(this.currentSearchData.checkout) - new Date(this.currentSearchData.checkin)) / (1000 * 60 * 60 * 24));
        const totalPrice = this.selectedHotel.price_per_night * nights;

        bookingDetails.innerHTML = `
            <div class="booking-summary">
                <h4>${this.selectedHotel.name}</h4>
                <p><i class="fas fa-map-marker-alt"></i> ${this.selectedHotel.city}, ${this.selectedHotel.country}</p>
                <div class="booking-dates">
                    <p><strong>Check-in:</strong> ${checkinDate}</p>
                    <p><strong>Check-out:</strong> ${checkoutDate}</p>
                    <p><strong>Guests:</strong> ${this.currentSearchData.guests}</p>
                    <p><strong>Nights:</strong> ${nights}</p>
                </div>
                <div class="booking-total">
                    <h3>Total: $${totalPrice.toFixed(2)}</h3>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
    }

    async confirmBooking() {
        const guestName = document.getElementById('guest-name').value.trim();
        const guestEmail = document.getElementById('guest-email').value.trim();

        if (!guestName || !guestEmail) {
            this.showError('Please fill in all booking details');
            return;
        }

        this.showLoading(true);

        try {
            const nights = Math.ceil((new Date(this.currentSearchData.checkout) - new Date(this.currentSearchData.checkin)) / (1000 * 60 * 60 * 24));
            const totalPrice = this.selectedHotel.price_per_night * nights;

            const bookingData = {
                hotel_id: this.selectedHotel.id,
                checkin: this.currentSearchData.checkin,
                checkout: this.currentSearchData.checkout,
                guests: this.currentSearchData.guests,
                total_price: totalPrice,
                guest_name: guestName,
                guest_email: guestEmail
            };

            const response = await fetch('/api/book', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bookingData)
            });

            if (!response.ok) {
                throw new Error(`Booking failed: ${response.statusText}`);
            }

            const result = await response.json();
            this.showSuccess(`Booking confirmed! Booking ID: ${result.booking_id}`);
            this.closeBookingModal();

        } catch (error) {
            console.error('Booking error:', error);
            this.showError('Booking failed. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    closeBookingModal() {
        const modal = document.getElementById('bookingModal');
        modal.style.display = 'none';
        
        // Clear form
        document.getElementById('guest-name').value = '';
        document.getElementById('guest-email').value = '';
    }

    async loadPopularDestinations() {
        try {
            const response = await fetch('/api/destinations/popular');
            const data = await response.json();
            
            // Update popular destinations with search counts
            if (data.destinations && data.destinations.length > 0) {
                this.updatePopularDestinations(data.destinations);
            }
        } catch (error) {
            console.error('Failed to load popular destinations:', error);
        }
    }

    updatePopularDestinations(destinations) {
        const popularGrid = document.getElementById('popular-grid');
        const existingItems = popularGrid.querySelectorAll('.popular-item');
        
        destinations.forEach((dest, index) => {
            if (existingItems[index]) {
                const span = existingItems[index].querySelector('span');
                span.textContent = `${dest.city} (${dest.searches} searches)`;
            }
        });
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        loading.style.display = show ? 'flex' : 'none';
    }

    showError(message) {
        // Simple alert for now - in a real app, you'd use a toast notification
        alert(`Error: ${message}`);
    }

    showSuccess(message) {
        // Simple alert for now - in a real app, you'd use a toast notification
        alert(message);
    }
}

// Global functions for onclick handlers
function closeBookingModal() {
    hotelFinder.closeBookingModal();
}

function confirmBooking() {
    hotelFinder.confirmBooking();
}

// Initialize the app
const hotelFinder = new HotelFinder();

// Add some keyboard shortcuts
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        const modal = document.getElementById('bookingModal');
        if (modal && modal.style.display === 'flex') {
            closeBookingModal();
        }
    }
});

// Add loading states to buttons
document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('button[type="submit"], .book-btn');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            if (this.type === 'submit' || this.classList.contains('book-btn')) {
                this.style.opacity = '0.7';
                this.style.pointerEvents = 'none';
                
                setTimeout(() => {
                    this.style.opacity = '1';
                    this.style.pointerEvents = 'auto';
                }, 2000);
            }
        });
    });
}); 