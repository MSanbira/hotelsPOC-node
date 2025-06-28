const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, 'hotels.db'));
        this.initTables();
        this.seedData();
    }

    initTables() {
        const tables = [
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE,
                preferences TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS hotels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                city TEXT NOT NULL,
                country TEXT NOT NULL,
                price_per_night REAL NOT NULL,
                rating REAL DEFAULT 0,
                amenities TEXT,
                available_rooms INTEGER DEFAULT 10,
                latitude REAL,
                longitude REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS search_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                city TEXT,
                checkin_date TEXT,
                checkout_date TEXT,
                guests INTEGER,
                results_count INTEGER,
                response_time_ms INTEGER,
                cache_hit BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )`,
            `CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                hotel_id INTEGER,
                checkin_date TEXT,
                checkout_date TEXT,
                guests INTEGER,
                total_price REAL,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(hotel_id) REFERENCES hotels(id)
            )`
        ];

        tables.forEach(table => {
            this.db.run(table, (err) => {
                if (err) console.error('Error creating table:', err);
            });
        });
    }

    seedData() {
        // Check if hotels already exist
        this.db.get("SELECT COUNT(*) as count FROM hotels", (err, row) => {
            if (err || row.count > 0) return;

            const hotels = [
                ['Grand Hotel Amsterdam', 'Amsterdam', 'Netherlands', 250.00, 4.5, 'WiFi,Pool,Spa,Restaurant', 15, 52.3676, 4.9041],
                ['Hotel Berlin Central', 'Berlin', 'Germany', 180.00, 4.2, 'WiFi,Gym,Bar,Restaurant', 20, 52.5200, 13.4050],
                ['Paris Luxury Suite', 'Paris', 'France', 320.00, 4.8, 'WiFi,Spa,Restaurant,RoomService', 8, 48.8566, 2.3522],
                ['London Bridge Hotel', 'London', 'UK', 280.00, 4.4, 'WiFi,Gym,Bar,Concierge', 12, 51.5074, -0.1278],
                ['Barcelona Beach Resort', 'Barcelona', 'Spain', 220.00, 4.6, 'WiFi,Pool,Beach,Restaurant', 25, 41.3851, 2.1734],
                ['Rome Historic Inn', 'Rome', 'Italy', 190.00, 4.3, 'WiFi,Restaurant,Tours', 18, 41.9028, 12.4964],
                ['Amsterdam Canal View', 'Amsterdam', 'Netherlands', 200.00, 4.1, 'WiFi,CanalView,Bikes', 10, 52.3676, 4.9041],
                ['Berlin Modern Loft', 'Berlin', 'Germany', 160.00, 4.0, 'WiFi,Kitchen,ModernDesign', 16, 52.5200, 13.4050],
                ['Paris Boutique Hotel', 'Paris', 'France', 290.00, 4.7, 'WiFi,Boutique,Restaurant,Spa', 6, 48.8566, 2.3522],
                ['London City Center', 'London', 'UK', 240.00, 4.2, 'WiFi,Central,Shopping,Theater', 14, 51.5074, -0.1278]
            ];

            const stmt = this.db.prepare(`INSERT INTO hotels 
                (name, city, country, price_per_night, rating, amenities, available_rooms, latitude, longitude) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

            hotels.forEach(hotel => {
                stmt.run(hotel);
            });
            stmt.finalize();
            console.log('✅ Hotels data seeded successfully');
        });
    }

    searchHotels(city, callback) {
        const query = `SELECT * FROM hotels WHERE LOWER(city) LIKE LOWER(?) ORDER BY rating DESC`;
        this.db.all(query, [`%${city}%`], callback);
    }

    logSearch(searchData, callback) {
        const query = `INSERT INTO search_logs 
            (user_id, city, checkin_date, checkout_date, guests, results_count, response_time_ms, cache_hit) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        
        this.db.run(query, [
            searchData.user_id || null,
            searchData.city,
            searchData.checkin_date,
            searchData.checkout_date,
            searchData.guests,
            searchData.results_count,
            searchData.response_time_ms,
            searchData.cache_hit ? 1 : 0
        ], callback);
    }

    getSearchStats(callback) {
        const queries = {
            totalSearches: "SELECT COUNT(*) as count FROM search_logs",
            avgResponseTime: "SELECT AVG(response_time_ms) as avg_time FROM search_logs",
            cacheHitRate: "SELECT (COUNT(CASE WHEN cache_hit = 1 THEN 1 END) * 100.0 / COUNT(*)) as hit_rate FROM search_logs",
            popularCities: "SELECT city, COUNT(*) as search_count FROM search_logs GROUP BY city ORDER BY search_count DESC LIMIT 5"
        };

        const stats = {};
        let completed = 0;
        const total = Object.keys(queries).length;

        Object.entries(queries).forEach(([key, query]) => {
            if (key === 'popularCities') {
                this.db.all(query, (err, rows) => {
                    stats[key] = err ? [] : rows;
                    completed++;
                    if (completed === total) callback(null, stats);
                });
            } else {
                this.db.get(query, (err, row) => {
                    stats[key] = err ? 0 : (row[Object.keys(row)[0]] || 0);
                    completed++;
                    if (completed === total) callback(null, stats);
                });
            }
        });
    }

    createBooking(bookingData, callback) {
        const query = `INSERT INTO bookings 
            (user_id, hotel_id, checkin_date, checkout_date, guests, total_price, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`;
        
        this.db.run(query, [
            bookingData.user_id || null,
            bookingData.hotel_id,
            bookingData.checkin_date,
            bookingData.checkout_date,
            bookingData.guests,
            bookingData.total_price,
            'confirmed'
        ], callback);
    }

    close() {
        this.db.close();
    }
}

module.exports = Database; 