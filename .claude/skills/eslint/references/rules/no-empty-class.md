<!-- Metadata
title: no-empty-class
-->


Disallows empty character classes in regular expressions.

**Important**

> This rule was removed in ESLint v1.0.0 and replaced by the [no-empty-character-class](no-empty-character-class) rule.

Empty character classes in regular expressions do not match anything and can result in code that may not work as intended.

```js
var foo = /^abc[]/;
```

## Rule Details

This rule is aimed at highlighting possible typos and unexpected behavior in regular expressions which may arise from the use of empty character classes.

Examples of **incorrect** code for this rule:

**Incorrect Example**

> ```js
> var foo = /^abc[]/;
>
> /^abc[]/.test(foo);
>
> bar.match(/^abc[]/);
> ```

Examples of **correct** code for this rule:

**Correct Example**

> ```js
> var foo = /^abc/;
>
> var foo = /^abc[a-z]/;
>
> var bar = new RegExp("^abc[]");
> ```
