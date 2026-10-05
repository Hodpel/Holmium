import config from './blog.config.ts'

const tailwindConfig = {
    darkMode: config.appearance === 'auto' ? 'media' : 'class',
    theme: {
        extend: {
            colors: {
                light: {
                    DEFAULT: config.lightBackground || '#ffffff',
                },
                dark: {
                    DEFAULT: config.darkBackground || '#2F3437',
                },
                theme: {
                    DEFAULT: config.themeColor || '#6b69d6',
                },
            },
        },
    },
    plugins: [],
}

export default tailwindConfig
