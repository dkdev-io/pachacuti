/**
 * Adds two numbers together
 * @param {number} a - First number
 * @param {number} b - Second number  
 * @returns {number} The sum of a and b
 * @throws {TypeError} If either parameter is not a number
 */
function addNumbers(a, b) {
  // Validate inputs
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new TypeError('Both parameters must be numbers');
  }
  
  // Handle special cases
  if (isNaN(a) || isNaN(b)) {
    return NaN;
  }
  
  return a + b;
}

module.exports = addNumbers;

// Example usage:
// console.log(addNumbers(5, 3)); // Output: 8
// console.log(addNumbers(-2, 7)); // Output: 5
// console.log(addNumbers(0, 0)); // Output: 0