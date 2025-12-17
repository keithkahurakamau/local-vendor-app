/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    ],
  theme: {
    extend: {
      colors:{
        //site theme colors
        primary: {
          DEFAULT: '#FF6B35', // bold coral-orange
          light: '#FF8A5C',
          dark: '#E55A2A',
        },
        secondary: {
          DEFAULT: '#FFD166', // sunny golden yellow
          light: '#FFDC8A',
          dark: '#F5C242',
        },
        accent: {
          DEFAULT: '#118AB2', // bright sky blue
          light: '#3BA3C4',
          dark: '#0D6A87',
        },
        success: {
          DEFAULT: '#06D6A0', // fresh teal
          light: '#3CE0B3',
          dark: '#05B587',
        },
        warning: {
          DEFAULT: '#EF476F', // raspberry red 
          light: '#F36D8C',
          dark: '#D93A5E',
        },
        background: {
          DEFAULT: '#FDFDFD', //off-white
          gray: '#F5F5F5',
        },
        text: {
          DEFAULT: '#2D2D2D', // deep charcoal
          light: '#5D5D5D',
          lighter: '#8D8D8D',
        },
        neutral: {
          DEFAULT: '#E0E0E0', // light grey
          light: '#EFEFEF',
          dark: '#BDBDBD',
        },
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Poppins', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'navbar': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      },
      borderRadius: {
        'card': '1rem',
        'button': '0.5rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      maxWidth: {
        '8xl': '88rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'bounce-slow': 'bounce 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

