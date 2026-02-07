<!-- Metadata
title: no-spaced-func
rule_type: layout
-->


While it's possible to have whitespace between the name of a function and the parentheses that execute it, such patterns tend to look more like errors.

## Rule Details

This rule disallows spacing between function identifiers and their applications.

Examples of **incorrect** code for this rule:

**Incorrect Example**

> ```js
> /*eslint no-spaced-func: "error"*/
>
> fn ()
>
> fn
> ()
> ```

Examples of **correct** code for this rule:

**Correct Example**

> ```js
> /*eslint no-spaced-func: "error"*/
>
> fn()
> ```
