/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js,vue,jsx,tsx}",
    "./history_static/**/*.html",
  ],
  theme: {
    extend: {
      colors: {
        // 中性色（锤子风格 + LaunchFast）
        neutral: {
          0:   '#FFFFFF',
          50:  '#FAFAFA',  // 卡片背景
          100: '#F3F3F3',  // 浅灰背景
          200: '#E8E8E8',  // 分割线（锤子）
          300: '#D9D9D9',  // 边框
          400: '#BFBFBF',  // 禁用
          600: '#787887',  // 辅助文本（LaunchFast）
          700: '#666666',  // 正文（锤子）
          800: '#3C3C44',  // 标题（LaunchFast）
          900: '#1A1A1A',  // 纯黑
        },
        // 主色（统一蓝）
        primary: {
          500: '#5079D9',  // LaunchFast 链接 = 锤子蓝
          600: '#3F5FB5',  // hover
          700: '#2D4699',  // active
        },
        // 语义色（诊断状态）
        success: {
          100: '#D1FAE5',
          300: '#6EE7B7',
          500: '#10B981',  // 通过绿
          700: '#047857',
        },
        warning: {
          100: '#FEF3C7',
          300: '#FCD34D',
          500: '#F59E0B',  // 预警橙
          700: '#B45309',
        },
        danger: {
          100: '#FEE2E2',
          300: '#FCA5A5',
          500: '#EF4444',  // 失败红
          700: '#B91C1C',
        },
        info: {
          100: '#CFFAFE',
          300: '#67E8F9',
          500: '#06B6D4',  // 信息青
          700: '#0E7490',
        },
      },
      fontSize: {
        xs:   ['12px', { lineHeight: '1.5' }],
        sm:   ['14px', { lineHeight: '1.6' }],
        base: ['14px', { lineHeight: '1.6' }],
        lg:   ['16px', { lineHeight: '1.6' }],
        xl:   ['18px', { lineHeight: '1.33' }],
        '2xl': ['33.75px', { lineHeight: '1.15' }],
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
      },
      spacing: {
        xs:  '4px',
        sm:  '8px',
        md:  '16px',
        lg:  '24px',
        xl:  '32px',
        '2xl': '48px',
      },
      borderRadius: {
        sm:   '4px',
        md:   '6px',
        lg:   '8px',
        xl:   '12px',
        full: '16px',  // 药片形徽章
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0, 0, 0, 0.05)',
        md: '0 2px 8px rgba(0, 0, 0, 0.08)',
        lg: '0 4px 16px rgba(0, 0, 0, 0.1)',
        focus: '0 0 0 3px rgba(80, 121, 217, 0.1)',  // 蓝色光晕
      },
      maxWidth: {
        container: '1200px',
      },
    },
  },
  plugins: [],
}
