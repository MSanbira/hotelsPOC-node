// Dashboard JavaScript
class Dashboard {
    constructor() {
        this.charts = {};
        this.refreshInterval = null;
        this.autoRefreshEnabled = true;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialData();
        this.initializeCharts();
        this.startAutoRefresh();
    }

    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', this.refreshData.bind(this));
        }

        // Auto-refresh toggle
        const autoRefreshToggle = document.getElementById('autoRefresh');
        if (autoRefreshToggle) {
            autoRefreshToggle.addEventListener('change', (e) => {
                this.autoRefreshEnabled = e.target.checked;
                if (this.autoRefreshEnabled) {
                    this.startAutoRefresh();
                } else {
                    this.stopAutoRefresh();
                }
            });
        }

        // Load testing buttons
        const simulateLoadBtn = document.getElementById('simulateLoadBtn');
        if (simulateLoadBtn) {
            simulateLoadBtn.addEventListener('click', this.simulateLoad.bind(this));
        }

        const reindexBtn = document.getElementById('reindexBtn');
        if (reindexBtn) {
            reindexBtn.addEventListener('click', this.triggerReindex.bind(this));
        }
    }

    async loadInitialData() {
        this.showLoading(true);
        await this.refreshData();
        this.showLoading(false);
    }

    async refreshData() {
        try {
            const response = await fetch('/api/metrics');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.updateMetrics(data);
            this.updateCharts(data);
            this.updateSystemHealth(data);
            this.updatePopularCities(data);

        } catch (error) {
            console.error('Failed to refresh data:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    updateMetrics(data) {
        // Update overview cards
        const totalSearches = data.database_stats?.totalSearches || 0;
        const avgResponseTime = data.database_stats?.avgResponseTime || 0;
        const cacheHitRate = data.cache_metrics?.hit_rate || 0;
        const totalBookings = data.api_metrics?.bookings_created || 0;

        this.updateElement('totalSearches', totalSearches);
        this.updateElement('avgResponseTime', `${Math.round(avgResponseTime)}ms`);
        this.updateElement('cacheHitRate', `${cacheHitRate}%`);
        this.updateElement('totalBookings', totalBookings);

        // Update detailed metrics table
        this.updateElement('apiRequests', data.api_metrics?.total_requests || 0);
        this.updateElement('cacheHits', data.api_metrics?.cache_hits || 0);
        this.updateElement('cacheMisses', data.api_metrics?.cache_misses || 0);
        this.updateElement('bookingsCreated', data.api_metrics?.bookings_created || 0);
        this.updateElement('emailConfirmations', data.api_metrics?.booking_confirmations_sent || 0);

        // Update uptime
        if (data.system_health?.uptime) {
            const uptime = this.formatUptime(data.system_health.uptime);
            this.updateElement('uptime', uptime);
        }
    }

    updateSystemHealth(data) {
        // Update Redis status
        const redisIndicator = document.getElementById('redisStatusIndicator');
        if (redisIndicator && data.system_health) {
            const isConnected = data.system_health.redis_connected;
            redisIndicator.textContent = isConnected ? 'Connected' : 'Disconnected';
            redisIndicator.className = `status-indicator ${isConnected ? 'status-connected' : 'status-disconnected'}`;
        }
    }

    updatePopularCities(data) {
        const popularCitiesList = document.getElementById('popularCitiesList');
        if (!popularCitiesList || !data.popular_destinations) return;

        popularCitiesList.innerHTML = '';

        if (data.popular_destinations.length === 0) {
            popularCitiesList.innerHTML = '<p>No search data available yet. Start searching to see popular destinations!</p>';
            return;
        }

        data.popular_destinations.forEach(dest => {
            const item = document.createElement('div');
            item.className = 'popular-city-item';
            item.innerHTML = `
                <span class="city-name">${dest.city}</span>
                <span class="search-count">${dest.searches}</span>
            `;
            popularCitiesList.appendChild(item);
        });
    }

    initializeCharts() {
        this.initCacheChart();
        this.initDestinationsChart();
    }

    initCacheChart() {
        const ctx = document.getElementById('cacheChart');
        if (!ctx) return;

        this.charts.cache = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Cache Hits', 'Cache Misses'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    initDestinationsChart() {
        const ctx = document.getElementById('destinationsChart');
        if (!ctx) return;

        this.charts.destinations = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Searches',
                    data: [],
                    backgroundColor: '#667eea',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    updateCharts(data) {
        // Update cache chart
        if (this.charts.cache && data.api_metrics) {
            const hits = data.api_metrics.cache_hits || 0;
            const misses = data.api_metrics.cache_misses || 0;
            
            this.charts.cache.data.datasets[0].data = [hits, misses];
            this.charts.cache.update();
        }

        // Update destinations chart
        if (this.charts.destinations && data.popular_destinations) {
            const destinations = data.popular_destinations.slice(0, 5); // Top 5
            const labels = destinations.map(d => d.city);
            const values = destinations.map(d => d.searches);

            this.charts.destinations.data.labels = labels;
            this.charts.destinations.data.datasets[0].data = values;
            this.charts.destinations.update();
        }
    }

    async simulateLoad() {
        const btn = document.getElementById('simulateLoadBtn');
        const originalText = btn.innerHTML;
        
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Simulating...';
        btn.disabled = true;

        try {
            // Simulate multiple concurrent searches
            const cities = ['amsterdam', 'paris', 'london', 'berlin', 'barcelona'];
            const promises = [];

            for (let i = 0; i < 10; i++) {
                const city = cities[Math.floor(Math.random() * cities.length)];
                const promise = fetch(`/api/search?city=${city}&checkin=2024-12-01&checkout=2024-12-02&guests=2`);
                promises.push(promise);
            }

            await Promise.all(promises);
            
            // Show success message
            this.showSuccess('Load simulation completed! Check the metrics for updated data.');
            
            // Refresh data to show the impact
            setTimeout(() => this.refreshData(), 1000);

        } catch (error) {
            console.error('Load simulation error:', error);
            this.showError('Load simulation failed');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    async triggerReindex() {
        const btn = document.getElementById('reindexBtn');
        const originalText = btn.innerHTML;
        
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Reindexing...';
        btn.disabled = true;

        try {
            const response = await fetch('/api/admin/reindex', {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            this.showSuccess(result.message);

        } catch (error) {
            console.error('Reindex error:', error);
            this.showError('Reindex operation failed');
        } finally {
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }, 5000); // Keep disabled for 5 seconds to simulate the operation
        }
    }

    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(() => {
            if (this.autoRefreshEnabled) {
                this.refreshData();
            }
        }, 30000); // 30 seconds
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            // Add smooth transition effect
            element.style.opacity = '0.5';
            setTimeout(() => {
                element.textContent = value;
                element.style.opacity = '1';
            }, 150);
        }
    }

    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = show ? 'flex' : 'none';
        }
    }

    showError(message) {
        // Simple alert for now - in a real app, you'd use a toast notification
        alert(`Error: ${message}`);
    }

    showSuccess(message) {
        // Simple alert for now - in a real app, you'd use a toast notification
        alert(message);
    }

    destroy() {
        this.stopAutoRefresh();
        
        // Destroy charts
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
    }
}

// Initialize dashboard
let dashboard;

document.addEventListener('DOMContentLoaded', () => {
    dashboard = new Dashboard();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (dashboard) {
        dashboard.destroy();
    }
});

// Add some real-time visual feedback
document.addEventListener('DOMContentLoaded', () => {
    // Add pulse animation to metric cards when they update
    const metricCards = document.querySelectorAll('.metric-card');
    metricCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-5px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(-2px) scale(1)';
        });
    });

    // Add status indicators animation
    const statusIndicators = document.querySelectorAll('.status-connected');
    statusIndicators.forEach(indicator => {
        setInterval(() => {
            indicator.style.opacity = '0.6';
            setTimeout(() => {
                indicator.style.opacity = '1';
            }, 300);
        }, 3000);
    });
}); 