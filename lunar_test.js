// 农历算法测试文件
const fs = require('fs');

// 农历日期转换函数（从index.html中提取）
function getLunarDate(dateStr) {
    const solarDate = new Date(dateStr + 'T00:00:00');
    
    // 农历数据表 (1900-2100年)
    const lunarInfo = [
        0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
        0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
        0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
        0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
        0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
        0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
        0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
        0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
        0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
        0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,
        0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
        0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
        0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
        0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
        0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
        0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
        0x0a2e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
        0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
        0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
        0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
        0x0d520
    ];
    
    const Gan = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    const Zhi = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    const Animals = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
    const lunarMonthName = ['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','冬月','腊月'];
    const lunarDayName = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
        '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
        '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
    
    // 获取某年的闰月，0表示无闰月
    function getLeapMonth(y) {
        return lunarInfo[y - 1900] & 0xf;
    }
    
    // 获取某年闰月的天数
    function getLeapDays(y) {
        if (getLeapMonth(y)) {
            return (lunarInfo[y - 1900] & 0x10000) ? 30 : 29;
        }
        return 0;
    }
    
    // 获取某年某月的天数
    function getMonthDays(y, m) {
        return (lunarInfo[y - 1900] & (0x10000 >> m)) ? 30 : 29;
    }
    
    // 获取农历某年的总天数
    function getYearDays(y) {
        let sum = 348;
        for (let i = 0x8000; i > 0x8; i >>= 1) {
            sum += (lunarInfo[y - 1900] & i) ? 1 : 0;
        }
        return sum + getLeapDays(y);
    }
    
    // 计算农历
    const baseDate = new Date(1900, 1, 19); // 基准日期改为1900年2月19日（农历正月初一）
    let offset = Math.floor((solarDate - baseDate) / 86400000);
    
    let lunarYear, lunarMonth, lunarDay;
    let isLeap = false;
    
    // 如果偏移量小于0，说明日期早于基准日期，需要向前计算年份
    if (offset < 0) {
        lunarYear = 1899;
        while (offset < 0 && lunarYear >= 1900) {
            lunarYear--;
            offset += getYearDays(lunarYear);
        }
    } else {
        // 计算年
        let daysInYear = 0;
        for (lunarYear = 1900; lunarYear < 2101; lunarYear++) {
            daysInYear = getYearDays(lunarYear);
            if (offset < daysInYear) {
                break;
            }
            offset -= daysInYear;
        }
    }
    
    // 获取当年闰月
    let leapMonth = getLeapMonth(lunarYear);
    
    // 计算月
    let daysInMonth = 0;
    for (lunarMonth = 1; lunarMonth <= 12; lunarMonth++) {
        // 检查是否是闰月
        if (leapMonth > 0 && lunarMonth === leapMonth + 1 && !isLeap) {
            // 处理闰月
            daysInMonth = getLeapDays(lunarYear);
            if (offset < daysInMonth) {
                isLeap = true;
                break;
            }
            offset -= daysInMonth;
            continue;
        }
        
        daysInMonth = getMonthDays(lunarYear, lunarMonth);
        if (offset < daysInMonth) {
            break;
        }
        offset -= daysInMonth;
    }
    
    // 计算日
    lunarDay = offset + 1;
    
    // 确保lunarDay在有效范围内
    if (lunarDay < 1) lunarDay = 1;
    if (lunarDay > 30) lunarDay = 30;
    
    // 格式化输出：农历甲辰（龙）年四月十七
    const ganIndex = (lunarYear - 4) % 10;
    const zhiIndex = (lunarYear - 4) % 12;
    const ganZhi = Gan[ganIndex] + Zhi[zhiIndex];
    const animal = Animals[zhiIndex];
    const monthStr = isLeap ? '闰' + lunarMonthName[lunarMonth - 1] : lunarMonthName[lunarMonth - 1];
    const dayStr = lunarDayName[lunarDay - 1] || '初一';
    
    return `农历${ganZhi}（${animal}）年${monthStr}${dayStr}`;
}

// 测试用例
const testCases = [
    { date: "2024-05-24", expected: "农历甲辰（龙）年四月十七" },
    { date: "2019-03-07", expected: "农历己亥（猪）年二月初一" },
    { date: "2015-09-20", expected: "农历乙未（羊）年八月初八" },
    { date: "2015-02-25", expected: "农历乙未（羊）年正月初七" },
    { date: "2024-02-10", expected: "农历甲辰（龙）年正月初一" },
    { date: "2023-01-22", expected: "农历癸卯（兔）年正月初一" }
];

console.log("=== 农历算法测试 ===\n");

let passed = 0;
let failed = 0;

testCases.forEach(testCase => {
    const result = getLunarDate(testCase.date);
    const isCorrect = result === testCase.expected;
    
    console.log(`日期: ${testCase.date}`);
    console.log(`期望: ${testCase.expected}`);
    console.log(`实际: ${result}`);
    console.log(`结果: ${isCorrect ? '✅ 通过' : '❌ 失败'}`);
    console.log('---');
    
    if (isCorrect) {
        passed++;
    } else {
        failed++;
    }
});

console.log(`\n测试总结: ${passed} 通过, ${failed} 失败`);

// 额外测试：检查当前日期
const today = new Date();
const todayStr = today.toISOString().split('T')[0];
const todayLunar = getLunarDate(todayStr);
console.log(`\n当前日期测试:`);
console.log(`公历: ${todayStr}`);
console.log(`农历: ${todayLunar}`);