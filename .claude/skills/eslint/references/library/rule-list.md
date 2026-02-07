<!-- Metadata
title: Replacement Rule list
-->


The rule list is a macro defined in `components/rule-list.macro.html`. The macro accepts a list of `ReplacedByInfo` and renders them as or-separated links.

## Usage



```html
<!-- import the macro -->


<!-- use the macro -->
{{ replacementRuleList({ specifiers: [{ rule: { name: 'global-require', url:
'...' }, plugin: { name: '@eslint-community/eslint-plugin-n', url: '...' } }] })
}}
```



## Examples



{{ replacementRuleList({ specifiers: [{ rule: { name: 'global-require', url: '...' }, plugin: { name: '@eslint-community/eslint-plugin-n', url: '...' } }] }) }}
