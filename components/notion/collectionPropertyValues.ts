import React from 'react'

type CollectionPropertyProps = {
    data?: unknown
    schema?: { name?: string }
}

export function CollectionCheckboxValue(props: CollectionPropertyProps) {
    const data = props.data
    const isChecked = Array.isArray(data) && Array.isArray(data[0]) && data[0][0] === 'Yes'

    return React.createElement(
        'div',
        { className: 'notion-property-checkbox-container' },
        React.createElement(
            'span',
            { className: 'notion-property notion-property-checkbox', 'aria-hidden': true },
            isChecked
                ? React.createElement(
                      'div',
                      { className: 'notion-property-checkbox-checked' },
                      React.createElement(
                          'svg',
                          { viewBox: '0 0 14 14' },
                          React.createElement('path', { d: 'M5.5 12L14 3.5 12.5 2l-7 7-4-4.003L0 6.499z' }),
                      ),
                  )
                : React.createElement('div', { className: 'notion-property-checkbox-unchecked' }),
        ),
        React.createElement('span', { className: 'notion-property-checkbox-text' }, props.schema?.name),
    )
}
