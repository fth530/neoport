/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './index.html',
        './public/**/*.{html,js}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                dark: {
                    bg: '#111827',
                    card: '#1f2937',
                    border: '#374151'
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Poppins', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
