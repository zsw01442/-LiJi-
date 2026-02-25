const express = require('express');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || '/app/data';
const DB_PATH = path.join(DATA_DIR, 'liji.db');

// 中间件
app.use(bodyParser.json());
app.use(express.static('public'));

// 处理 favicon 请求
app.get('/favicon.ico', (req, res) => {
    res.setHeader('Content-Type', 'image/x-icon');
    res.sendFile(path.join(__dirname, 'public', 'favicon.svg'), {
        headers: { 'Content-Type': 'image/svg+xml' }
    }, (err) => {
        if (err) {
            res.status(404).end();
        }
    });
});

app.get('/favicon.svg', (req, res) => {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.sendFile(path.join(__dirname, 'public', 'favicon.svg'));
});

// 确保数据目录存在
function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

// 初始化数据库
let db;
function initDatabase() {
    ensureDataDir();
    db = new Database(DB_PATH);
    
    // 创建记录表
    db.exec(`
        CREATE TABLE IF NOT EXISTS records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            person_name TEXT NOT NULL,
            event_type TEXT NOT NULL,
            event_date TEXT NOT NULL,
            amount REAL NOT NULL,
            gift_type TEXT,
            notes TEXT,
            is_returned INTEGER DEFAULT 0,
            return_date TEXT,
            return_amount REAL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // 创建礼薄表
    db.exec(`
        CREATE TABLE IF NOT EXISTS giftbooks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            event_type TEXT NOT NULL,
            event_date TEXT NOT NULL,
            total_amount REAL DEFAULT 0,
            total_count INTEGER DEFAULT 0,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // 创建礼薄明细表
    db.exec(`
        CREATE TABLE IF NOT EXISTS giftbook_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            giftbook_id INTEGER NOT NULL,
            person_name TEXT NOT NULL,
            amount REAL NOT NULL,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (giftbook_id) REFERENCES giftbooks(id) ON DELETE CASCADE
        )
    `);
    
    // 创建密码表
    db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    `);
    
    // 初始化默认密码
    const defaultPassword = db.prepare('SELECT value FROM settings WHERE key = ?').get('password');
    if (!defaultPassword) {
        db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('password', 'admin');
    }
    
    console.log('数据库初始化完成:', DB_PATH);
}

// 读取密码
function readPassword() {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('password');
    return row ? row.value : 'admin';
}

// 写入密码
function writePassword(password) {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('password', password);
}

// API 路由

// 获取密码状态
app.get('/api/password/status', (req, res) => {
    try {
        const password = readPassword();
        res.json({ hasPassword: !!password, isFirstTime: password === 'admin' });
    } catch (error) {
        res.status(500).json({ error: '无法获取密码状态' });
    }
});

// 设置/修改密码
app.post('/api/password', (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const currentPassword = readPassword();
        
        // 验证旧密码（如果是修改密码）
        if (oldPassword && currentPassword !== oldPassword) {
            return res.status(401).json({ success: false, message: '旧密码错误' });
        }
        
        // 保存新密码
        writePassword(newPassword);
        res.json({ success: true, message: '密码设置成功' });
    } catch (error) {
        res.status(500).json({ success: false, message: '密码设置失败' });
    }
});

// 验证密码
app.post('/api/password/verify', (req, res) => {
    try {
        const { password } = req.body;
        const storedPassword = readPassword();
        
        if (password === storedPassword) {
            res.json({ success: true, message: '验证成功' });
        } else {
            res.status(401).json({ success: false, message: '密码错误' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: '验证失败' });
    }
});

// 获取所有记录
app.get('/api/records', (req, res) => {
    try {
        const records = db.prepare('SELECT * FROM records ORDER BY event_date DESC').all();
        // 转换布尔值
        const formattedRecords = records.map(r => ({
            ...r,
            is_returned: !!r.is_returned
        }));
        res.json(formattedRecords);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 保存记录（批量）
app.post('/api/records', (req, res) => {
    try {
        const records = req.body;
        
        const insert = db.prepare(`
            INSERT OR REPLACE INTO records 
            (id, person_name, event_type, event_date, amount, gift_type, notes, is_returned, return_date, return_amount, updated_at)
            VALUES (@id, @person_name, @event_type, @event_date, @amount, @gift_type, @notes, @is_returned, @return_date, @return_amount, CURRENT_TIMESTAMP)
        `);
        
        const deleteStmt = db.prepare('DELETE FROM records WHERE id = ?');
        
        db.transaction(() => {
            // 获取现有记录ID
            const existingIds = db.prepare('SELECT id FROM records').all().map(r => r.id);
            const newIds = records.map(r => r.id).filter(id => id);
            
            // 删除不存在的记录
            existingIds.forEach(id => {
                if (!newIds.includes(id)) {
                    deleteStmt.run(id);
                }
            });
            
            // 插入或更新记录
            records.forEach(record => {
                insert.run({
                    id: record.id || null,
                    person_name: record.person_name,
                    event_type: record.event_type,
                    event_date: record.event_date,
                    amount: record.amount,
                    gift_type: record.gift_type || null,
                    notes: record.notes || null,
                    is_returned: record.is_returned ? 1 : 0,
                    return_date: record.return_date || null,
                    return_amount: record.return_amount || null
                });
            });
        })();
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取所有礼薄
app.get('/api/giftbooks', (req, res) => {
    try {
        const giftbooks = db.prepare('SELECT * FROM giftbooks ORDER BY event_date DESC').all();
        
        // 获取每个礼薄的明细
        const result = giftbooks.map(gb => {
            const items = db.prepare('SELECT * FROM giftbook_items WHERE giftbook_id = ?').all(gb.id);
            return {
                ...gb,
                items: items || []
            };
        });
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 保存礼薄（批量）
app.post('/api/giftbooks', (req, res) => {
    try {
        const giftbooks = req.body;
        
        const insertBook = db.prepare(`
            INSERT OR REPLACE INTO giftbooks 
            (id, name, event_type, event_date, total_amount, total_count, notes, updated_at)
            VALUES (@id, @name, @event_type, @event_date, @total_amount, @total_count, @notes, CURRENT_TIMESTAMP)
        `);
        
        const insertItem = db.prepare(`
            INSERT OR REPLACE INTO giftbook_items 
            (id, giftbook_id, person_name, amount, notes)
            VALUES (@id, @giftbook_id, @person_name, @amount, @notes)
        `);
        
        const deleteBook = db.prepare('DELETE FROM giftbooks WHERE id = ?');
        const deleteItems = db.prepare('DELETE FROM giftbook_items WHERE giftbook_id = ?');
        
        db.transaction(() => {
            // 获取现有礼薄ID
            const existingIds = db.prepare('SELECT id FROM giftbooks').all().map(r => r.id);
            const newIds = giftbooks.map(gb => gb.id).filter(id => id);
            
            // 删除不存在的礼薄及其明细
            existingIds.forEach(id => {
                if (!newIds.includes(id)) {
                    deleteItems.run(id);
                    deleteBook.run(id);
                }
            });
            
            // 插入或更新礼薄
            giftbooks.forEach(book => {
                const result = insertBook.run({
                    id: book.id || null,
                    name: book.name,
                    event_type: book.event_type,
                    event_date: book.event_date,
                    total_amount: book.total_amount || 0,
                    total_count: book.total_count || 0,
                    notes: book.notes || null
                });
                
                const bookId = book.id || result.lastInsertRowid;
                
                // 删除旧明细
                if (book.id) {
                    deleteItems.run(book.id);
                }
                
                // 插入新明细
                if (book.items && book.items.length > 0) {
                    book.items.forEach(item => {
                        insertItem.run({
                            id: null,
                            giftbook_id: bookId,
                            person_name: item.person_name,
                            amount: item.amount,
                            notes: item.notes || null
                        });
                    });
                }
            });
        })();
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', database: 'connected' });
});

// 启动服务器
function start() {
    initDatabase();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`礼记系统运行在 http://0.0.0.0:${PORT}`);
        console.log(`数据库存储: ${DB_PATH}`);
    });
}

start();
