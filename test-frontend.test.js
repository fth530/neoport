/**
 * @jest-environment jsdom
 */

// Mock global DOM, fetch, etc.
global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve([])
}));

global.Chart = jest.fn();

// Mock Toast Container
document.body.innerHTML = '<div id="toastContainer"></div>';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

const app = require('./public/js/app.js');

describe('Frontend Utilities', () => {

    beforeEach(() => {
        // Clear mocks
        jest.clearAllMocks();
        // Reset DOM if needed
        document.body.innerHTML = '<div id="toastContainer"></div>';
    });

    test('validatePositiveNumber should validate correctly', () => {
        // Mock showToast locally if needed, but it's defined in app.js
        // valid
        expect(app.validatePositiveNumber(10)).toBe(true);
        expect(app.validatePositiveNumber("10.5")).toBe(true);

        // invalid - negative
        // We need to capture toast
        expect(app.validatePositiveNumber(-5)).toBe(false);
        const toastContainer = document.getElementById('toastContainer');
        expect(toastContainer.innerHTML).toContain('negatif olamaz');

        // invalid - text
        toastContainer.innerHTML = '';
        expect(app.validatePositiveNumber("abc")).toBe(false);
        expect(toastContainer.innerHTML).toContain('geçerli bir sayı');
    });

    test('formatCurrency should format correctly', () => {
        // Note: localeString output depends on Node environment locale. 
        // We might need to force locale or just check parts.
        // Assuming tr-TR locale is available or behavior is standard.

        const tryVal = app.formatCurrency(1234.56, 'TRY');
        expect(tryVal).toContain('₺');
        // Check for 1.234,56 or 1,234.56 depending on locale support in test env
        // Node usually supports full ICU now.

        const usdVal = app.formatCurrency(1234.56, 'USD');
        expect(usdVal).toContain('$');
    });

});
