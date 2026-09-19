import { describe, expect, it } from 'vitest';
import { dateLabel, fmt, fmt1 } from './format';

describe('fmt', () => {
  it('60秒未満は 秒.1/100秒', () => {
    expect(fmt(0)).toBe('0.00');
    expect(fmt(1234)).toBe('1.23');
    expect(fmt(59_999)).toBe('59.99');
  });

  it('切り上げずに捨てる', () => {
    expect(fmt(1239)).toBe('1.23');
  });

  it('60秒以上は 分:秒.1/100秒', () => {
    expect(fmt(60_000)).toBe('1:00.00');
    expect(fmt(125_450)).toBe('2:05.45');
    expect(fmt(3_600_000)).toBe('60:00.00');
  });

  it('値が無ければハイフン', () => {
    expect(fmt(null)).toBe('-');
    expect(fmt(undefined)).toBe('-');
    expect(fmt(NaN)).toBe('-');
  });
});

describe('fmt1', () => {
  it('小数1桁', () => {
    expect(fmt1(5200)).toBe('5.2');
    expect(fmt1(0)).toBe('0.0');
    expect(fmt1(null)).toBe('-');
  });
});

describe('dateLabel', () => {
  it('月/日 時:分', () => {
    expect(dateLabel(new Date(2026, 8, 19, 9, 5).toISOString())).toBe('9/19 09:05');
  });

  it('壊れた値はハイフン', () => {
    expect(dateLabel('not a date')).toBe('-');
  });
});
