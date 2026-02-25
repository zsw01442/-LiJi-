// 测试当前getLunarDate函数的准确性
const fs = require('fs');
const path = require('path');

// 从index.html中提取getLunarDate函数
const htmlPath = path.join(__dirname, 'public', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// 提取getLunarDate函数
const getLunarDateMatch = htmlContent.match(/function getLunarDate\(dateStr\)\s*\{[\s\S]*?\}/);
if (!getLunarDateMatch) {
    console.error('未找到getLunarDate函数');
    process.exit(1);
}

// 提取函数体并执行
const getLunarDateFunction = getLunarDateMatch[0];

// 创建测试函数
const testLunarDate = new Function('dateStr', getLunarDateFunction.replace('function getLunarDate(dateStr) {', 'return ('));

// 测试用例：重要日期的农历转换
const testCases = [
    '2023-01-22', // 2023年春节
    '2024-02-10', // 2024年春节
    '2025-01-29', // 2025年春节
    '2023-01-01', // 2023年元旦
    '2023-02-14', // 2023年情人节
    '2023-05-01', // 2023年劳动节
    '2023-06-22', // 2023年端午节
    '2023-09-29', // 2023年中秋节
    '2023-10-01', // 2023年国庆节
    '2024-01-01', // 2024年元旦
    '2024-02-14', // 2024年情人节
    '2024-05-01', // 2024年劳动节
    '2024-06-10', // 2024年端午节
    '2024-09-17', // 2024年中秋节
    '2024-10-01', // 2024年国庆节
    '2025-01-01', // 2025年元旦
    '2025-02-14', // 2025年情人节
    '2025-05-01', // 2025年劳动节
    '2025-05-31', // 2025年端午节
    '2025-09-06', // 2025年中秋节
    '2025-10-01'  // 2025年国庆节
];

console.log('测试getLunarDate函数的准确性：');
console.log('=====================================');

testCases.forEach(dateStr => {
    try {
        const lunarDate = testLunarDate(dateStr);
        console.log(`${dateStr} => ${lunarDate}`);
    } catch (error) {
        console.error(`${dateStr} 测试失败: ${error.message}`);
    }
});

console.log('=====================================');
console.log('测试完成');
