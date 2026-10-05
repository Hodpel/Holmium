type PrismLanguageLoader = () => Promise<unknown>

const BUILT_IN_LANGUAGES = new Set([
    'clike',
    'css',
    'javascript',
    'json',
    'jsx',
    'markup',
    'plain',
    'tsx',
    'typescript',
])

const LANGUAGE_ALIASES: Readonly<Record<string, string>> = {
    'c#': 'csharp',
    'c++': 'cpp',
    'f#': 'fsharp',
    html: 'markup',
    'objective-c': 'objectivec',
    'plain text': 'plain',
    shell: 'bash',
    'vb.net': 'vbnet',
    'visual basic': 'visual-basic',
    webassembly: 'wasm',
    xml: 'markup',
}

// Keep every import specifier literal. A template import here makes Turbopack
// include the complete Prism components directory (including minified copies).
const LANGUAGE_LOADERS: Readonly<Record<string, PrismLanguageLoader>> = {
    abap: () => import('prismjs/components/prism-abap'),
    arduino: async () => {
        await import('prismjs/components/prism-c')
        await import('prismjs/components/prism-cpp')
        return import('prismjs/components/prism-arduino')
    },
    bash: () => import('prismjs/components/prism-bash'),
    basic: () => import('prismjs/components/prism-basic'),
    bicep: () => import('prismjs/components/prism-bicep'),
    c: () => import('prismjs/components/prism-c'),
    clojure: () => import('prismjs/components/prism-clojure'),
    coffeescript: () => import('prismjs/components/prism-coffeescript'),
    cpp: async () => {
        await import('prismjs/components/prism-c')
        return import('prismjs/components/prism-cpp')
    },
    csharp: () => import('prismjs/components/prism-csharp'),
    dart: () => import('prismjs/components/prism-dart'),
    diff: () => import('prismjs/components/prism-diff'),
    docker: () => import('prismjs/components/prism-docker'),
    elixir: () => import('prismjs/components/prism-elixir'),
    elm: () => import('prismjs/components/prism-elm'),
    erlang: () => import('prismjs/components/prism-erlang'),
    flow: () => import('prismjs/components/prism-flow'),
    fortran: () => import('prismjs/components/prism-fortran'),
    fsharp: () => import('prismjs/components/prism-fsharp'),
    gherkin: () => import('prismjs/components/prism-gherkin'),
    git: async () => {
        await import('prismjs/components/prism-diff')
        return import('prismjs/components/prism-git')
    },
    glsl: async () => {
        await import('prismjs/components/prism-c')
        return import('prismjs/components/prism-glsl')
    },
    go: () => import('prismjs/components/prism-go'),
    graphql: () => import('prismjs/components/prism-graphql'),
    groovy: () => import('prismjs/components/prism-groovy'),
    handlebars: async () => {
        await import('prismjs/components/prism-markup-templating')
        return import('prismjs/components/prism-handlebars')
    },
    haskell: () => import('prismjs/components/prism-haskell'),
    java: () => import('prismjs/components/prism-java'),
    'js-templates': () => import('prismjs/components/prism-js-templates'),
    julia: () => import('prismjs/components/prism-julia'),
    kotlin: () => import('prismjs/components/prism-kotlin'),
    latex: () => import('prismjs/components/prism-latex'),
    less: () => import('prismjs/components/prism-less'),
    lisp: () => import('prismjs/components/prism-lisp'),
    livescript: () => import('prismjs/components/prism-livescript'),
    lua: () => import('prismjs/components/prism-lua'),
    makefile: () => import('prismjs/components/prism-makefile'),
    markdown: () => import('prismjs/components/prism-markdown'),
    matlab: () => import('prismjs/components/prism-matlab'),
    nix: () => import('prismjs/components/prism-nix'),
    objectivec: async () => {
        await import('prismjs/components/prism-c')
        return import('prismjs/components/prism-objectivec')
    },
    ocaml: () => import('prismjs/components/prism-ocaml'),
    pascal: () => import('prismjs/components/prism-pascal'),
    perl: () => import('prismjs/components/prism-perl'),
    php: async () => {
        await import('prismjs/components/prism-markup-templating')
        return import('prismjs/components/prism-php')
    },
    powershell: () => import('prismjs/components/prism-powershell'),
    prolog: () => import('prismjs/components/prism-prolog'),
    protobuf: () => import('prismjs/components/prism-protobuf'),
    python: () => import('prismjs/components/prism-python'),
    r: () => import('prismjs/components/prism-r'),
    reason: () => import('prismjs/components/prism-reason'),
    ruby: () => import('prismjs/components/prism-ruby'),
    rust: () => import('prismjs/components/prism-rust'),
    sass: () => import('prismjs/components/prism-sass'),
    scala: async () => {
        await import('prismjs/components/prism-java')
        return import('prismjs/components/prism-scala')
    },
    scheme: () => import('prismjs/components/prism-scheme'),
    scss: () => import('prismjs/components/prism-scss'),
    solidity: () => import('prismjs/components/prism-solidity'),
    sql: () => import('prismjs/components/prism-sql'),
    stylus: () => import('prismjs/components/prism-stylus'),
    swift: () => import('prismjs/components/prism-swift'),
    toml: () => import('prismjs/components/prism-toml'),
    'visual-basic': () => import('prismjs/components/prism-visual-basic'),
    vbnet: async () => {
        await import('prismjs/components/prism-basic')
        return import('prismjs/components/prism-vbnet')
    },
    verilog: () => import('prismjs/components/prism-verilog'),
    vhdl: () => import('prismjs/components/prism-vhdl'),
    wasm: () => import('prismjs/components/prism-wasm'),
    yaml: () => import('prismjs/components/prism-yaml'),
}

const loadedLanguages = new Set(BUILT_IN_LANGUAGES)
const pendingLanguages = new Map<string, Promise<boolean>>()

function normalizePrismLanguage(language: string): string {
    const normalized = language.trim().toLocaleLowerCase('en-US')
    return LANGUAGE_ALIASES[normalized] ?? normalized
}

export function ensurePrismLanguage(language: string): Promise<boolean> {
    const normalized = normalizePrismLanguage(language)
    if (loadedLanguages.has(normalized)) return Promise.resolve(true)

    const loader = LANGUAGE_LOADERS[normalized]
    if (!loader) return Promise.resolve(false)

    const pending = pendingLanguages.get(normalized)
    if (pending) return pending

    const request = loader()
        .then(() => {
            loadedLanguages.add(normalized)
            return true
        })
        .catch(() => false)
        .finally(() => {
            pendingLanguages.delete(normalized)
        })

    pendingLanguages.set(normalized, request)
    return request
}
