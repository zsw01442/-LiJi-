// 详细分析农历日期计算
console.log('=== 详细分析农历日期计算 ===');

function getLunarDate(dateStr) {
    const solarDate = new Date(dateStr + 'T00:00:00');
    console.log('\n输入日期:', dateStr);
    console.log('转换后的日期对象:', solarDate.toISOString());
    
    // 天干地支系统
    const Gan = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    const Zhi = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    const Animals = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
    const lunarMonthName = ['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','冬月','腊月'];
    const lunarDayName = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
        '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
        '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
    
    // 标准的农历数据（基于天文历法计算）
    const lunarInfo = [
        // 1900-2100年的农历数据
        0x4bd8,0x4ae0,0xa570,0x54d5,0xd260,0xd950,0x16554,0x56a0,0x9ad0,0x55d2,
        0x4ae0,0xa5b6,0xa4d0,0xd250,0x1d255,0xb540,0xd6a0,0xada2,0x95b0,0x14977,
        0x4970,0xa4b0,0xb4b5,0x6a50,0x6d40,0x1ab54,0x2b60,0x9570,0x52f2,0x4970,
        0x6566,0xd4a0,0xea50,0x6e95,0x5ad0,0x2b60,0x186e3,0x92e0,0x1c8d7,0xc950,
        0xd4a0,0x1d8a6,0xb550,0x56a0,0x1a5b4,0x25d0,0x92d0,0xd2b2,0xa950,0x1b557,
        0x6ca0,0xb550,0x15355,0x4da0,0xa5d0,0x14573,0x52d0,0xa9a8,0xe950,0x6aa0,
        0x1aea6,0xab50,0x4b60,0xaae4,0xa570,0x5260,0x1f263,0xd950,0x5b57,0x56a0,
        0x96d0,0x14dd5,0x4ad0,0xa4d0,0x1d4d4,0xd250,0xd558,0xb540,0xb6a0,0x195a6,
        0x95b0,0x49b0,0xa974,0xa4b0,0x1b27a,0x6a50,0x6d40,0x1af46,0xab60,0x9570,
        0x4af5,0x4970,0x64b0,0x174a3,0xea50,0x6b58,0x55c0,0xab60,0x96d5,0x92e0,
        0xc960,0x1d954,0xd4a0,0xda50,0x17552,0x56a0,0xabb7,0x25d0,0x92d0,0x1cab5,
        0xa950,0xb4a0,0xbaa4,0xad50,0x55d9,0x4ba0,0xa5b0,0x15176,0x52b0,0xa930,
        0x7954,0x6aa0,0x1ad50,0x5b52,0x4b60,0xa6e6,0xa4e0,0xd260,0xea65,0xd530,
        0x5aa0,0x176a3,0x96d0,0x4afb,0x4ad0,0xa4d0,0x1d0b6,0xd250,0xd520,0xdd45,
        0xb5a0,0x56d0,0x55b2,0x49b0,0xa577,0xa4b0,0xaa50,0x1b255,0x6d20,0xada0,
        0x14b63,0x9370,0x49f8,0x4970,0x64b0,0x168a6,0xea50,0x6b20,0x1a6c4,0xaae0,
        0xa2e0,0xd2e3,0xc960,0xd557,0xd4a0,0xda50,0x15d55,0x56a0,0xa6d0,0x55d4,
        0x52d0,0xa9b8,0xa950,0xb4a0,0x1b6a6,0xad50,0x55a0,0xaba4,0xa5b0,0x52b0,
        0xb273,0x6930,0x7337,0x6aa0,0xad50,0x14b55,0x4b60,0xa570,0x54e4,0xd160,
        0xe968,0xd520,0xdaa0,0x16aa6,0x56d0,0x4ae0,0xa9d4,0xa2d0,0xd150,0x1f252,
        0xd520
    ];
    
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
    
    // 标准计算：使用1900年2月19日作为基准（农历庚子年正月初一）
    // 修正：使用UTC时间计算，避免时区影响
    const baseDate = new Date(Date.UTC(1900, 1, 19)); // 1900年2月19日 UTC
    const targetDateUTC = new Date(Date.UTC(solarDate.getFullYear(), solarDate.getMonth(), solarDate.getDate()));
    let offset = Math.floor((targetDateUTC - baseDate) / 86400000);
    console.log('基准日期:', baseDate.toISOString());
    console.log('目标日期(UTC):', targetDateUTC.toISOString());
    console.log('天数差:', offset);
    
    let lunarYear, lunarMonth, lunarDay;
    let isLeap = false;
    
    // 计算年份
    console.log('\n=== 计算年份 ===');
    let daysInYear = 0;
    for (lunarYear = 1900; lunarYear < 2101; lunarYear++) {
        daysInYear = getYearDays(lunarYear);
        console.log(`年份 ${lunarYear}: 天数 ${daysInYear}, 当前offset ${offset}`);
        if (offset < daysInYear) {
            break;
        }
        offset -= daysInYear;
    }
    console.log('计算得到的农历年份:', lunarYear);
    
    // 获取当年闰月
    let leapMonth = getLeapMonth(lunarYear);
    console.log('当年闰月:', leapMonth);
    
    // 计算月份
    console.log('\n=== 计算月份 ===');
    let daysInMonth = 0;
    let monthIndex = 1;
    while (monthIndex <= 12) {
        // 检查是否需要处理闰月
        if (leapMonth > 0 && monthIndex === leapMonth && !isLeap) {
            // 先尝试闰月
            daysInMonth = getLeapDays(lunarYear);
            console.log(`尝试闰月 ${leapMonth}: 天数 ${daysInMonth}, 当前offset ${offset}`);
            if (offset < daysInMonth) {
                lunarMonth = leapMonth;
                isLeap = true;
                console.log('确定为闰月:', lunarMonth);
                break;
            }
            offset -= daysInMonth;
            console.log('跳过闰月，剩余offset:', offset);
        }
        
        daysInMonth = getMonthDays(lunarYear, monthIndex);
        console.log(`尝试月份 ${monthIndex}: 天数 ${daysInMonth}, 当前offset ${offset}`);
        if (offset < daysInMonth) {
            lunarMonth = monthIndex;
            console.log('确定为月份:', lunarMonth);
            break;
        }
        offset -= daysInMonth;
        console.log('跳过月份，剩余offset:', offset);
        monthIndex++;
    }
    
    // 确保lunarMonth有值
    if (!lunarMonth || lunarMonth < 1 || lunarMonth > 12) {
        lunarMonth = 1;
        console.log('修正月份为:', lunarMonth);
    }
    
    // 计算日期
    lunarDay = offset + 1;
    console.log('计算得到的农历日期:', lunarDay);
    
    // 确保lunarDay在有效范围内
    if (lunarDay < 1) lunarDay = 1;
    if (lunarDay > 30) lunarDay = 30;
    console.log('修正后的农历日期:', lunarDay);
    
    // 格式化输出
    const ganIndex = (lunarYear - 4) % 10;
    const zhiIndex = (lunarYear - 4) % 12;
    const ganZhi = Gan[ganIndex] + Zhi[zhiIndex];
    const animal = Animals[zhiIndex];
    const monthStr = isLeap ? '闰' + lunarMonthName[lunarMonth - 1] : lunarMonthName[lunarMonth - 1];
    const dayStr = lunarDayName[lunarDay - 1] || '初一';
    
    const result = `农历${ganZhi}（${animal}）年${monthStr}${dayStr}`;
    console.log('最终结果:', result);
    
    return result;
}

// 测试2023年1月22日
console.log('\n====================================');
console.log('测试2023年1月22日');
console.log('期望结果: 农历癸卯（兔）年正月初一');
const result = getLunarDate('2023-01-22');
console.log('实际结果:', result);
console.log('测试结果:', result === '农历癸卯（兔）年正月初一' ? '✅ 通过' : '❌ 失败');
