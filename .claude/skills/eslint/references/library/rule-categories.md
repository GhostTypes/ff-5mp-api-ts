<!-- Metadata
title: Rule categories
-->


## Rule categories

The rule categories—namely “recommended”, “fixable”, and “hasSuggestions”—are shown in the [rules page](../rules/). They are rendered using the `ruleCategories` macro (imported from `/components/rule-categories.macro.html`). There is also an individual macro for each category type.

```html
{ % from 'components/rule-categories.macro.html' import ruleCategories % } { {
ruleCategories({ recommended: true, fixable: true, hasSuggestions: true }) } }
```

### Example



{{ ruleCategories({
        recommended: true,
        fixable: true,
        hasSuggestions: true
}) }}

## A rule category

For every rule, you can render the category it belongs to using the corresponding category shortcode:

```html
{ % recommended % } { % fixable % } { % hasSuggestions % }
```

## Examples

**Recommended**: This rule is enabled in the `eslint:recommended` configuration.
**Fixable**: Some problems can be automatically fixed by the `--fix` command line option.
**Suggestions**: This rule provides suggestions for manual fixes.
