# 🏨 HotelFinder POC - Multi-City Hotel Search

A complete Node.js POC application demonstrating modern backend architecture patterns and performance optimization techniques for hotel search systems.

## 🎯 Demo Overview

**Perfect for Booking.com Technical Interviews!**

This POC showcases:
- ✅ Real-time hotel search across multiple cities
- ✅ Redis caching with 5-minute TTL
- ✅ SQLite database with proper schema design
- ✅ Rate limiting and API security
- ✅ Performance monitoring dashboard
- ✅ Queue simulation for async operations
- ✅ Load balancing and graceful degradation
- ✅ Health check endpoints
- ✅ Modern responsive UI

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- Redis Server (optional - app runs without it)

### Installation

1. **Clone and Install**
```bash
git clone <repository>
cd hotelsPOC-node
npm install
```

2. **Start Redis (Optional)**
```bash
# macOS with Homebrew
brew services start redis

# Ubuntu/Debian
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:alpine
```

3. **Start the Application**
```bash
npm start
```

4. **Access the Application**
- 🏨 **Search Interface**: http://localhost:3000
- 📊 **Dashboard**: http://localhost:3000/dashboard.html
- 🔍 **API Health**: http://localhost:3000/health

## 📋 Demo Flow

### 1. Search Demonstration
1. Go to http://localhost:3000
2. Search for "Amsterdam" (check response time)
3. Search for "Amsterdam" again (notice cache hit - faster response)
4. Try other cities: Paris, London, Berlin, Barcelona, Rome

### 2. Dashboard Monitoring
1. Open http://localhost:3000/dashboard.html
2. Observe real-time metrics updating
3. Click "Simulate High Load" to test performance
4. Watch cache hit rates and response times

### 3. Booking Simulation
1. Click "Book Now" on any hotel
2. Fill booking form and confirm
3. Check console for async email confirmation

### 4. System Health
1. Check health endpoints: `/health` and `/health/detailed`
2. Observe Redis connection status in dashboard
3. Test graceful degradation (stop Redis, app continues working)

## 🏗️ Architecture

### Backend Stack
- **Express.js**: REST API server
- **SQLite**: Persistent data storage
- **Redis**: Caching layer and rate limiting
- **Node.js**: Runtime environment

### Database Schema
```sql
-- Hotels with location and pricing data
hotels (id, name, city, country, price_per_night, rating, amenities, available_rooms)

-- Search analytics and performance tracking
search_logs (id, city, response_time_ms, cache_hit, created_at)

-- Booking records
bookings (id, hotel_id, checkin_date, checkout_date, total_price, status)
```

### Caching Strategy
- **Search Results**: 5-minute TTL
- **Popular Destinations**: Redis sorted sets
- **User Sessions**: 24-hour TTL
- **Rate Limiting**: IP-based with Redis counters

## 🔧 API Endpoints

### Core API
- `GET /api/search` - Hotel search with caching
- `POST /api/book` - Booking simulation
- `GET /api/metrics` - Performance dashboard data
- `GET /api/destinations/popular` - Trending destinations

### Health & Monitoring
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system status
- `POST /api/admin/reindex` - Background task simulation

### Load Balancing Simulation
- `GET /api/v1/search` - Legacy API endpoint
- `GET /api/v2/search` - New API with failure simulation
- `GET /api/search/fallback` - Graceful degradation endpoint

## ⚡ Performance Features

### Caching
- **Redis Integration**: Automatic cache management
- **TTL Strategy**: 5-minute expiration for search results
- **Cache Metrics**: Hit/miss ratio tracking
- **Graceful Fallback**: App works without Redis

### Rate Limiting
- **100 requests per 15 minutes** per IP
- **Redis-based counters** for distributed environments
- **Graceful handling** when limits exceeded

### Queue Simulation
- **Async email confirmations** (2-second delay)
- **Background search indexing** (5-second simulation)
- **Booking confirmation emails** tracked in metrics

### Monitoring
- **Real-time metrics** updated every 30 seconds
- **Response time tracking** for all API calls
- **System health monitoring** (DB, Redis, API status)
- **Popular destinations tracking** with Redis sorted sets

## 📊 Metrics Dashboard

The dashboard provides comprehensive monitoring:

### Overview Cards
- Total searches performed
- Average response time
- Cache hit rate percentage
- Total bookings created

### Charts
- **Cache Performance**: Doughnut chart showing hits vs misses
- **Popular Destinations**: Bar chart of trending cities

### System Health
- Database connection status
- Redis connection status  
- API service operational status
- Server uptime

### Load Testing
- Simulate high traffic scenarios
- Test cache performance under load
- Trigger background reindexing

## 🔍 Interview Talking Points

### Technical Excellence
1. **Caching Strategy**: Multi-layer caching with TTL
2. **Database Design**: Proper indexing and relationships
3. **Error Handling**: Graceful degradation patterns
4. **Security**: Rate limiting, input validation, CORS
5. **Monitoring**: Real-time performance tracking

### Scalability Concepts
1. **Horizontal Scaling**: Health checks for load balancers
2. **Cache Invalidation**: TTL-based strategy
3. **Queue Systems**: Async operation simulation
4. **Circuit Breakers**: Fallback endpoint patterns
5. **Graceful Degradation**: Redis-optional architecture

### Performance Optimization
1. **Response Times**: Sub-100ms for cached results
2. **Database Queries**: Optimized search patterns
3. **Memory Management**: Efficient caching
4. **Rate Limiting**: Prevents abuse
5. **Connection Pooling**: Ready for production

## 🛠️ Development

### Project Structure
```
hotelsPOC-node/
├── server.js              # Main Express application
├── database.js            # SQLite operations & schema
├── redis-cache.js          # Redis caching layer
├── package.json            # Dependencies & scripts
├── public/                 # Frontend assets
│   ├── index.html         # Search interface
│   ├── dashboard.html     # Monitoring dashboard
│   ├── style.css          # Modern responsive styling
│   ├── app.js             # Search functionality
│   └── dashboard.js       # Dashboard interactions
└── README.md              # This file
```

### Key Dependencies
```json
{
  "express": "^4.18.2",        // Web framework
  "redis": "^4.6.8",          // Caching layer
  "sqlite3": "^5.1.6",        // Database
  "cors": "^2.8.5",           // Cross-origin requests
  "helmet": "^7.0.0",         // Security headers
  "express-rate-limit": "^6.10.0"  // Rate limiting
}
```

### Environment Variables
```bash
# Optional Redis configuration
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3000
```

## 🎯 Production Considerations

### Deployment Ready Features
- Health check endpoints for load balancers
- Graceful shutdown handling
- Error logging and monitoring
- Security headers with Helmet
- CORS configuration
- Rate limiting protection

### Scaling Recommendations
1. **Redis Cluster**: For distributed caching
2. **Database**: Migrate to PostgreSQL/MySQL
3. **CDN**: For static asset delivery
4. **Load Balancer**: Multiple server instances
5. **Monitoring**: Integrate with Prometheus/Grafana

## 🏆 Why This POC is Perfect for Interviews

1. **Real-World Relevance**: Mirrors actual Booking.com architecture
2. **Technical Depth**: Demonstrates multiple advanced concepts
3. **Working Demo**: Fully functional with impressive UI
4. **Scalability Focus**: Shows understanding of distributed systems
5. **Performance Optimized**: Sub-100ms response times
6. **Production Ready**: Includes monitoring, security, health checks

---

**Built with ❤️ for technical excellence and interview success!**

🚀 Ready to impress at Booking.com? This POC demonstrates real-world architecture patterns and performance optimization techniques used by leading travel platforms.