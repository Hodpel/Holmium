import { config } from './blog.config.ts'

export default {
    darkMode: 'class',
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
