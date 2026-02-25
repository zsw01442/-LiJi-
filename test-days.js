// 测试天数差计算
console.log('=== 测试天数差计算 ===');

// 基准日期：1900年2月19日（农历庚子年正月初一）
const baseDate = new Date(1900, 1, 19);
console.log('基准日期:', baseDate.toISOString().split('T')[0]);

// 测试用例
const testDates = [
    "2026-02-24",
    "2024-05-24", 
    "2023-01-22",
    "2020-01-25"
];

testDates.forEach(dateStr => {
    const testDate = new Date(dateStr + 'T00:00:00');
    const offset = Math.floor((testDate - baseDate) / 86400000);
    console.log(`${dateStr} 到基准日期的天数差: ${offset}`);
});

// 测试当前日期
const today = new Date();
const todayStr = today.toISOString().split('T')[0];
const todayOffset = Math.floor((today - baseDate) / 86400000);
console.log(`\n当前日期 ${todayStr} 到基准日期的天数差: ${todayOffset}`);
