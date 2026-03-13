import { Config } from '@/lib/types'
import config from '@/blog.config'

const requireAsset = require.context('.', true, /^\.\/([\w-]+)\.json$/)

function loadLocale(lang: Config['locale']) {
    return requireAsset(`./${lang}.json`)
}

export default loadLocale(config.locale)
