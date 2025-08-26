const addNumbers = require('../src/addNumbers');

describe('addNumbers function', () => {
  test('should add two positive numbers correctly', () => {
    expect(addNumbers(5, 3)).toBe(8);
  });

  test('should add negative numbers correctly', () => {
    expect(addNumbers(-2, -3)).toBe(-5);
  });

  test('should handle zero correctly', () => {
    expect(addNumbers(0, 5)).toBe(5);
    expect(addNumbers(0, 0)).toBe(0);
  });

  test('should handle decimal numbers correctly', () => {
    expect(addNumbers(2.5, 3.7)).toBe(6.2);
  });

  test('should throw TypeError for non-number inputs', () => {
    expect(() => addNumbers('5', 3)).toThrow(TypeError);
    expect(() => addNumbers(5, null)).toThrow(TypeError);
    expect(() => addNumbers(undefined, 5)).toThrow(TypeError);
  });

  test('should return NaN for NaN inputs', () => {
    expect(addNumbers(NaN, 5)).toBeNaN();
    expect(addNumbers(5, NaN)).toBeNaN();
  });
});