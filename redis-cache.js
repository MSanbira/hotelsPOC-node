const redis = require('redis');

class RedisCache {
    constructor() {
        this.client = redis.createClient({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            retry_strategy: (options) => {
                if (options.error && options.error.code === 'ECONNREFUSED') {
                    console.log('⚠️  Redis server connection refused. Running without cache.');
                    return new Error('Redis unavailable');
                }
                return Math.min(options.attempt * 100, 3000);
            }
        });

        this.connected = false;
        this.setupConnection();
    }

    async setupConnection() {
        try {
            await this.client.connect();
            this.connected = true;
            console.log('✅ Redis connected successfully');
        } catch (error) {
            console.log('⚠️  Redis connection failed. Running without cache:', error.message);
            this.connected = false;
        }
    }

    // Search results caching (5 min TTL)
    async cacheSearchResults(searchKey, results) {
        if (!this.connected) return false;
        
        try {
            const key = `search:${searchKey}`;
            await this.client.setEx(key, 300, JSON.stringify(results)); // 5 minutes TTL
            return true;
        } catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    }

    async getSearchResults(searchKey) {
        if (!this.connected) return null;
        
        try {
            const key = `search:${searchKey}`;
            const cached = await this.client.get(key);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    // Popular destinations tracking with sorted sets
    async trackDestination(city) {
        if (!this.connected) return false;
        
        try {
            await this.client.zIncrBy('popular:destinations', 1, city.toLowerCase());
            return true;
        } catch (error) {
            console.error('Destination tracking error:', error);
            return false;
        }
    }

    async getPopularDestinations(limit = 5) {
        if (!this.connected) return [];
        
        try {
            const destinations = await this.client.zRevRange('popular:destinations', 0, limit - 1, {
                BY: 'SCORE',
                REV: true,
                WITHSCORES: true
            });
            
            const result = [];
            for (let i = 0; i < destinations.length; i += 2) {
                result.push({
                    city: destinations[i],
                    searches: parseInt(destinations[i + 1])
                });
            }
            return result;
        } catch (error) {
            console.error('Get popular destinations error:', error);
            return [];
        }
    }

    // Rate limiting
    async checkRateLimit(ip, limit = 100, window = 3600) {
        if (!this.connected) return { allowed: true, remaining: limit };
        
        try {
            const key = `rate_limit:${ip}`;
            const current = await this.client.get(key);
            
            if (!current) {
                await this.client.setEx(key, window, '1');
                return { allowed: true, remaining: limit - 1 };
            }
            
            const count = parseInt(current);
            if (count >= limit) {
                return { allowed: false, remaining: 0 };
            }
            
            await this.client.incr(key);
            return { allowed: true, remaining: limit - count - 1 };
        } catch (error) {
            console.error('Rate limit error:', error);
            return { allowed: true, remaining: limit };
        }
    }

    // User session management
    async setUserSession(sessionId, userData) {
        if (!this.connected) return false;
        
        try {
            const key = `session:${sessionId}`;
            await this.client.setEx(key, 86400, JSON.stringify(userData)); // 24 hours
            return true;
        } catch (error) {
            console.error('Session set error:', error);
            return false;
        }
    }

    async getUserSession(sessionId) {
        if (!this.connected) return null;
        
        try {
            const key = `session:${sessionId}`;
            const session = await this.client.get(key);
            return session ? JSON.parse(session) : null;
        } catch (error) {
            console.error('Session get error:', error);
            return null;
        }
    }

    // Metrics tracking
    async incrementCounter(key) {
        if (!this.connected) return false;
        
        try {
            await this.client.incr(`metrics:${key}`);
            return true;
        } catch (error) {
            console.error('Counter increment error:', error);
            return false;
        }
    }

    async getCounter(key) {
        if (!this.connected) return 0;
        
        try {
            const count = await this.client.get(`metrics:${key}`);
            return parseInt(count) || 0;
        } catch (error) {
            console.error('Counter get error:', error);
            return 0;
        }
    }

    async getMetrics() {
        if (!this.connected) return {};
        
        try {
            const keys = await this.client.keys('metrics:*');
            const metrics = {};
            
            for (const key of keys) {
                const value = await this.client.get(key);
                const metricName = key.replace('metrics:', '');
                metrics[metricName] = parseInt(value) || 0;
            }
            
            return metrics;
        } catch (error) {
            console.error('Get metrics error:', error);
            return {};
        }
    }

    // Health check
    async healthCheck() {
        if (!this.connected) return false;
        
        try {
            await this.client.ping();
            return true;
        } catch (error) {
            return false;
        }
    }

    async close() {
        if (this.connected) {
            await this.client.quit();
        }
    }
}

module.exports = RedisCache; 