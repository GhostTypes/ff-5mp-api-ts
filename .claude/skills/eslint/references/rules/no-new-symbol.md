<!-- Metadata
title: no-new-symbol
rule_type: problem
handled_by_typescript: True
further_reading:
  - https://www.ecma-international.org/ecma-262/6.0/#sec-symbol-objects
-->


`Symbol` is not intended to be used with the `new` operator, but to be called as a function.

```js
var foo = new Symbol("foo");
```

This throws a `TypeError` exception.

## Rule Details

This rule is aimed at preventing the accidental calling of `Symbol` with the `new` operator.

Examples of **incorrect** code for this rule:

**Incorrect Example**

> ```js
> /*eslint no-new-symbol: "error"*/
>
> var foo = new Symbol('foo');
> ```

Examples of **correct** code for this rule:

**Correct Example**

> ```js
> /*eslint no-new-symbol: "error"*/
>
> var foo = Symbol('foo');
>
> // Ignores shadowed Symbol.
> function bar(Symbol) {
>     const baz = new Symbol("baz");
> }
>
> ```

## When Not To Use It

This rule should not be used in ES3/5 environments.
