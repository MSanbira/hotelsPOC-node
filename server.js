const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const Database = require('./database');
const RedisCache = require('./redis-cache');

const app = express();
const PORT = process.env.PORT || 6969;

// Initialize database and cache
const db = new Database();
const cache = new RedisCache();

// Middleware
app.use(helmet({
    contentSecurityPolicy: false // Allow inline scripts for demo
}));
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Metrics middleware
app.use((req, res, next) => {
    req.startTime = Date.now();
    cache.incrementCounter('total_requests');
    next();
});

// Routes

// Health check endpoints for load balancing simulation
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'hotel-search-primary'
    });
});

app.get('/health/detailed', async (req, res) => {
    const redisHealth = await cache.healthCheck();
    res.json({
        status: 'healthy',
        services: {
            database: 'connected',
            redis: redisHealth ? 'connected' : 'disconnected',
            api: 'operational'
        },
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Hotel search endpoint
app.get('/api/search', async (req, res) => {
    const startTime = Date.now();
    const { city, checkin, checkout, guests = 2 } = req.query;
    
    if (!city) {
        return res.status(400).json({ error: 'City parameter is required' });
    }

    // Rate limiting check
    const rateLimitResult = await cache.checkRateLimit(req.ip);
    if (!rateLimitResult.allowed) {
        return res.status(429).json({ 
            error: 'Rate limit exceeded', 
            remaining: rateLimitResult.remaining 
        });
    }

    // Create cache key
    const searchKey = `${city.toLowerCase()}-${checkin}-${checkout}-${guests}`;
    
    try {
        // Check cache first
        let results = await cache.getSearchResults(searchKey);
        let fromCache = false;
        
        if (results) {
            fromCache = true;
            cache.incrementCounter('cache_hits');
        } else {
            // Search database
            results = await new Promise((resolve, reject) => {
                db.searchHotels(city, (err, hotels) => {
                    if (err) reject(err);
                    else resolve(hotels);
                });
            });
            
            // Simulate some processing time for non-cached results
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
            
            // Cache the results
            await cache.cacheSearchResults(searchKey, results);
            cache.incrementCounter('cache_misses');
        }

        // Track popular destination
        await cache.trackDestination(city);
        
        const responseTime = Date.now() - startTime;
        
        // Log search
        db.logSearch({
            city,
            checkin_date: checkin,
            checkout_date: checkout,
            guests: parseInt(guests),
            results_count: results.length,
            response_time_ms: responseTime,
            cache_hit: fromCache
        }, () => {});

        res.json({
            results,
            metadata: {
                city,
                checkin,
                checkout,
                guests: parseInt(guests),
                total_results: results.length,
                response_time_ms: responseTime,
                from_cache: fromCache,
                remaining_requests: rateLimitResult.remaining
            }
        });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Popular destinations endpoint
app.get('/api/destinations/popular', async (req, res) => {
    try {
        const destinations = await cache.getPopularDestinations();
        res.json({ destinations });
    } catch (error) {
        console.error('Popular destinations error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Booking simulation endpoint
app.post('/api/book', async (req, res) => {
    const { hotel_id, checkin, checkout, guests, total_price } = req.body;
    
    if (!hotel_id || !checkin || !checkout || !total_price) {
        return res.status(400).json({ error: 'Missing required booking information' });
    }

    try {
        const bookingId = uuidv4();
        
        // Simulate async booking confirmation (queue simulation)
        setTimeout(() => {
            console.log(`📧 Booking confirmation email sent for booking ${bookingId}`);
            cache.incrementCounter('booking_confirmations_sent');
        }, 2000);

        // Create booking record
        db.createBooking({
            hotel_id: parseInt(hotel_id),
            checkin_date: checkin,
            checkout_date: checkout,
            guests: parseInt(guests),
            total_price: parseFloat(total_price)
        }, (err) => {
            if (err) console.error('Booking creation error:', err);
        });

        cache.incrementCounter('bookings_created');

        res.json({
            booking_id: bookingId,
            status: 'confirmed',
            message: 'Booking confirmed! Confirmation email will be sent shortly.'
        });

    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ error: 'Booking failed' });
    }
});

// Dashboard metrics endpoint
app.get('/api/metrics', async (req, res) => {
    try {
        // Get database stats
        const dbStats = await new Promise((resolve, reject) => {
            db.getSearchStats((err, stats) => {
                if (err) reject(err);
                else resolve(stats);
            });
        });

        // Get Redis metrics
        const redisMetrics = await cache.getMetrics();
        const popularDestinations = await cache.getPopularDestinations();

        // Calculate additional metrics
        const totalRequests = redisMetrics.total_requests || 0;
        const cacheHits = redisMetrics.cache_hits || 0;
        const cacheMisses = redisMetrics.cache_misses || 0;
        const cacheHitRate = totalRequests > 0 ? ((cacheHits / (cacheHits + cacheMisses)) * 100).toFixed(2) : 0;

        res.json({
            database_stats: dbStats,
            cache_metrics: {
                hit_rate: parseFloat(cacheHitRate),
                total_hits: cacheHits,
                total_misses: cacheMisses
            },
            api_metrics: redisMetrics,
            popular_destinations: popularDestinations,
            system_health: {
                uptime: process.uptime(),
                memory_usage: process.memoryUsage(),
                redis_connected: await cache.healthCheck()
            }
        });

    } catch (error) {
        console.error('Metrics error:', error);
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
});

// Load balancing simulation - multiple API versions
app.get('/api/v1/search', (req, res) => {
    res.json({ 
        message: 'API v1 - Legacy search endpoint',
        version: '1.0',
        deprecated: true 
    });
});

app.get('/api/v2/search', (req, res) => {
    // Simulate service degradation
    if (Math.random() < 0.1) { // 10% failure rate
        return res.status(503).json({ 
            error: 'Service temporarily unavailable',
            retry_after: 30 
        });
    }
    
    res.redirect('/api/search?' + new URLSearchParams(req.query));
});

// Graceful degradation endpoint
app.get('/api/search/fallback', (req, res) => {
    // Simple fallback with mock data when main search fails
    const mockResults = [
        {
            id: 999,
            name: 'Fallback Hotel',
            city: req.query.city || 'Unknown',
            country: 'N/A',
            price_per_night: 100,
            rating: 3.5,
            amenities: 'Basic amenities available'
        }
    ];

    res.json({
        results: mockResults,
        metadata: {
            fallback: true,
            message: 'Main search service unavailable - showing cached results'
        }
    });
});

// Background task simulation endpoint
app.post('/api/admin/reindex', (req, res) => {
    // Simulate background search indexing
    setTimeout(() => {
        console.log('🔄 Search index rebuild completed');
        cache.incrementCounter('index_rebuilds');
    }, 5000);

    res.json({ 
        message: 'Search index rebuild started',
        estimated_completion: '5 seconds'
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    
    try {
        await cache.close();
        db.close();
        console.log('✅ Cleanup completed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
});

app.listen(PORT, () => {
    console.log(`🚀 HotelFinder POC Server running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard available at http://localhost:${PORT}/dashboard.html`);
    console.log(`🏨 Search interface at http://localhost:${PORT}/index.html`);
});

module.exports = app; 