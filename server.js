const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');

// 设置时区为亚洲/上海
process.env.TZ = 'Asia/Shanghai';

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || '/app/data';
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');
const GIFTBOOKS_FILE = path.join(DATA_DIR, 'giftbooks.json');
const PASSWORD_FILE = path.join(DATA_DIR, 'password.json');

// 农历计算函数 - 调用第三方API
async function getLunarDateString(year, month, day) {
    try {
        // 使用免费的中国农历API
        const response = await fetch(`https://www.mxnzp.com/api/lunar/calendar?year=${year}&month=${month}&day=${day}`, {
            timeout: 5000
        });
        
        if (!response.ok) {
            throw new Error('API调用失败');
        }
        
        const data = await response.json();
        
        if (data.code === 1 && data.data) {
            const lunarInfo = data.data;
            const ganZhi = lunarInfo.ganzhi || '';
            const animal = lunarInfo.animal || '';
            const lunarMonth = lunarInfo.lunarMonth || '';
            const lunarDay = lunarInfo.lunarDay || '';
            
            return `农历${ganZhi}（${animal}）年${lunarMonth}${lunarDay}`;
        }
        
        throw new Error('API返回数据格式错误');
    } catch (error) {
        console.error('农历API调用失败:', error);
        
        // 后备：使用本地简化算法
        const Gan = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
        const Zhi = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
        const Animals = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
        const lunarMonthName = ['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','冬月','腊月'];
        const lunarDayName = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
            '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
            '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
        
        // 春节日期表
        const springFestivals = {
            2020: {month: 1, day: 25, ganIdx: 6, zhiIdx: 0},
            2021: {month: 2, day: 12, ganIdx: 7, zhiIdx: 1},
            2022: {month: 2, day: 1, ganIdx: 8, zhiIdx: 2},
            2023: {month: 1, day: 22, ganIdx: 9, zhiIdx: 3},
            2024: {month: 2, day: 10, ganIdx: 0, zhiIdx: 4},
            2025: {month: 1, day: 29, ganIdx: 1, zhiIdx: 5},
            2026: {month: 2, day: 17, ganIdx: 2, zhiIdx: 6},
        };
        
        const sf = springFestivals[year];
        if (!sf) {
            const cycleYear = (year - 2020) % 60;
            const ganIdx = (cycleYear + 6) % 10;
            const zhiIdx = (cycleYear + 0) % 12;
            return `农历${Gan[ganIdx]}${Zhi[zhiIdx]}（${Animals[zhiIdx]}）年正月`;
        }
        
        const inputDate = new Date(year, month - 1, day);
        const springDate = new Date(year, sf.month - 1, sf.day);
        let daysDiff = Math.floor((inputDate - springDate) / (24 * 60 * 60 * 1000));
        
        let lunarYear = year;
        if (daysDiff < 0) {
            lunarYear = year - 1;
        }
        
        const lunarMonth = Math.floor(daysDiff / 29.5) + 1;
        const lunarDay = (daysDiff % 29) + 1;
        
        const cycleYear = (lunarYear - 2020) % 60;
        const ganIdx = (cycleYear + 6) % 10;
        const zhiIdx = (cycleYear + 0) % 12;
        const ganZhi = Gan[ganIdx] + Zhi[zhiIdx];
        const animal = Animals[zhiIdx];
        
        const monthStr = lunarMonthName[Math.min(lunarMonth - 1, 11)];
        const dayStr = lunarDayName[Math.min(lunarDay - 1, 29)];
        
        return `农历${ganZhi}（${animal}）年${monthStr}${dayStr}`;
    }
}

// API: 转换公历日期为农历日期
app.get('/api/lunar/:year/:month/:day', async (req, res) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const day = parseInt(req.params.day);
    const lunarDate = await getLunarDateString(year, month, day);
    res.json({ lunarDate });
});

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
async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
        console.log(`数据目录已存在: ${DATA_DIR}`);
    } catch {
        console.log(`创建数据目录: ${DATA_DIR}`);
        await fs.mkdir(DATA_DIR, { recursive: true });
        console.log(`数据目录创建成功: ${DATA_DIR}`);
    }
}

// 初始化数据文件
async function initializeDataFiles() {
    console.log('开始初始化数据文件...');
    
    // 初始化密码文件
    try {
        await fs.access(PASSWORD_FILE);
        console.log('密码文件已存在');
    } catch {
        console.log('创建默认密码文件');
        try {
            await writePassword('admin');
        } catch (error) {
            console.error('创建密码文件失败:', error.message);
            console.log('继续启动应用，但密码功能可能受限');
        }
    }
    
    // 初始化记录文件
    try {
        await fs.access(RECORDS_FILE);
        console.log('记录文件已存在');
    } catch {
        console.log('创建空记录文件');
        try {
            await writeData(RECORDS_FILE, []);
        } catch (error) {
            console.error('创建记录文件失败:', error.message);
            console.log('继续启动应用，但记录功能可能受限');
        }
    }
    
    // 初始化礼薄文件
    try {
        await fs.access(GIFTBOOKS_FILE);
        console.log('礼薄文件已存在');
    } catch {
        console.log('创建空礼薄文件');
        try {
            await writeData(GIFTBOOKS_FILE, []);
        } catch (error) {
            console.error('创建礼薄文件失败:', error.message);
            console.log('继续启动应用，但礼薄功能可能受限');
        }
    }
    
    console.log('数据文件初始化完成');
}

// 读取密码
async function readPassword() {
    try {
        const data = await fs.readFile(PASSWORD_FILE, 'utf8');
        return JSON.parse(data).password;
    } catch (err) {
        // 如果密码文件不存在，创建默认密码
        const defaultPassword = 'admin';
        await writePassword(defaultPassword);
        return defaultPassword;
    }
}

// 写入密码
async function writePassword(password) {
    try {
        const data = { password: password };
        console.log('正在写入密码文件:', PASSWORD_FILE);
        await fs.writeFile(PASSWORD_FILE, JSON.stringify(data, null, 2));
        console.log('密码文件写入成功');
    } catch (error) {
        console.error('写入密码文件失败:', error);
        throw error;
    }
}

// 读取数据
async function readData(file) {
    try {
        const data = await fs.readFile(file, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

// 写入数据
async function writeData(file, data) {
    try {
        console.log('正在写入数据文件:', file);
        await fs.writeFile(file, JSON.stringify(data, null, 2));
        console.log('数据文件写入成功:', file);
    } catch (error) {
        console.error('写入数据文件失败:', file, error);
        throw error;
    }
}

// API 路由

// 获取密码状态
app.get('/api/password/status', async (req, res) => {
    try {
        const password = await readPassword();
        res.json({ hasPassword: !!password, isFirstTime: password === 'admin' });
    } catch (error) {
        res.status(500).json({ error: '无法获取密码状态' });
    }
});

// 设置/修改密码
app.post('/api/password', async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const currentPassword = await readPassword();
        
        // 验证旧密码（如果是修改密码）
        if (oldPassword && currentPassword !== oldPassword) {
            return res.status(401).json({ success: false, message: '旧密码错误' });
        }
        
        // 保存新密码
        await writePassword(newPassword);
        res.json({ success: true, message: '密码设置成功' });
    } catch (error) {
        res.status(500).json({ success: false, message: '密码设置失败' });
    }
});

// 验证密码
app.post('/api/password/verify', async (req, res) => {
    try {
        const { password } = req.body;
        const storedPassword = await readPassword();
        
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
app.get('/api/records', async (req, res) => {
    try {
        const records = await readData(RECORDS_FILE);
        res.json(records);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 保存记录
app.post('/api/records', async (req, res) => {
    try {
        const records = req.body;
        await writeData(RECORDS_FILE, records);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取所有礼薄
app.get('/api/giftbooks', async (req, res) => {
    try {
        const giftbooks = await readData(GIFTBOOKS_FILE);
        res.json(giftbooks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 保存礼薄
app.post('/api/giftbooks', async (req, res) => {
    try {
        const giftbooks = req.body;
        await writeData(GIFTBOOKS_FILE, giftbooks);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// 获取应用版本信息
app.get('/api/version', (req, res) => {
    // 从package.json读取版本信息
    const packagePath = path.join(__dirname, 'package.json');
    fs.readFile(packagePath, 'utf8')
        .then(data => {
            const packageInfo = JSON.parse(data);
            res.json({
                version: packageInfo.version,
                name: packageInfo.name,
                description: packageInfo.description
            });
        })
        .catch(error => {
            console.error('读取版本信息失败:', error);
            // 如果读取失败，返回默认版本
            res.json({
                version: '1.9.1',
                name: 'liji',
                description: '礼记 - 管理随礼还礼的智能工具'
            });
        });
});

// 启动服务器
async function start() {
    await ensureDataDir();
    await initializeDataFiles();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`礼记系统运行在 http://0.0.0.0:${PORT}`);
        console.log(`数据存储目录: ${DATA_DIR}`);
        console.log('应用启动完成');
    });
}

start();
