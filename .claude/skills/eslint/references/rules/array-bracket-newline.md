<!-- Metadata
title: array-bracket-newline
rule_type: layout
related_rules:
  - array-bracket-spacing
-->

A number of style guides require or disallow line breaks inside of array brackets.

## Rule Details

This rule enforces line breaks after opening and before closing array brackets.

## Options

This rule has either a string option:

* `"always"` requires line breaks inside brackets
* `"never"` disallows line breaks inside brackets
* `"consistent"` requires consistent usage of linebreaks for each pair of brackets. It reports an error if one bracket in the pair has a linebreak inside it and the other bracket does not.

Or an object option (Requires line breaks if any of properties is satisfied. Otherwise, disallows line breaks):

* `"multiline": true` (default) requires line breaks if there are line breaks inside elements or between elements. If this is false, this condition is disabled.
* `"minItems": null` (default) requires line breaks if the number of elements is at least the given integer. If this is 0, this condition will act the same as the option `"always"`. If this is `null` (the default), this condition is disabled.

### always

Examples of **incorrect** code for this rule with the `"always"` option:

**Incorrect Example**

> ```js
> /*eslint array-bracket-newline: ["error", "always"]*/
>
> const a = [];
> const b = [1];
> const c = [1, 2];
> const d = [1,
>     2];
> const e = [function foo() {
>     dosomething();
> }];
> ```

Examples of **correct** code for this rule with the `"always"` option:

**Correct Example**

> ```js
> /*eslint array-bracket-newline: ["error", "always"]*/
>
> const a = [
> ];
> const b = [
>     1
> ];
> const c = [
>     1, 2
> ];
> const d = [
>     1,
>     2
> ];
> const e = [
>     function foo() {
>         dosomething();
>     }
> ];
> ```

### never

Examples of **incorrect** code for this rule with the `"never"` option:

**Incorrect Example**

> ```js
> /*eslint array-bracket-newline: ["error", "never"]*/
>
> const a = [
> ];
> const b = [
>     1
> ];
> const c = [
>     1, 2
> ];
> const d = [
>     1,
>     2
> ];
> const e = [
>     function foo() {
>         dosomething();
>     }
> ];
> ```

Examples of **correct** code for this rule with the `"never"` option:

**Correct Example**

> ```js
> /*eslint array-bracket-newline: ["error", "never"]*/
>
> const a = [];
> const b = [1];
> const c = [1, 2];
> const d = [1,
>     2];
> const e = [function foo() {
>     dosomething();
> }];
> ```

### consistent

Examples of **incorrect** code for this rule with the `"consistent"` option:

**Incorrect Example**

> ```js
> /*eslint array-bracket-newline: ["error", "consistent"]*/
>
> const a = [1
> ];
> const b = [
>     1];
> const c = [function foo() {
>     dosomething();
> }
> ]
> const d = [
>     function foo() {
>         dosomething();
>     }]
> ```

Examples of **correct** code for this rule with the `"consistent"` option:

**Correct Example**

> ```js
> /*eslint array-bracket-newline: ["error", "consistent"]*/
>
> const a = [];
> const b = [
> ];
> const c = [1];
> const d = [
>     1
> ];
> const e = [function foo() {
>     dosomething();
> }];
> const f = [
>     function foo() {
>         dosomething();
>     }
> ];
> ```

### multiline

Examples of **incorrect** code for this rule with the default `{ "multiline": true }` option:

**Incorrect Example**

> ```js
> /*eslint array-bracket-newline: ["error", { "multiline": true }]*/
>
> const a = [
> ];
> const b = [
>     1
> ];
> const c = [
>     1, 2
> ];
> const d = [1,
>     2];
> const e = [function foo() {
>     dosomething();
> }];
> ```

Examples of **correct** code for this rule with the default `{ "multiline": true }` option:

**Correct Example**

> ```js
> /*eslint array-bracket-newline: ["error", { "multiline": true }]*/
>
> const a = [];
> const b = [1];
> const c = [1, 2];
> const d = [
>     1,
>     2
> ];
> const e = [
>     function foo() {
>         dosomething();
>     }
> ];
> ```

### minItems

Examples of **incorrect** code for this rule with the `{ "minItems": 2 }` option:

**Incorrect Example**

> ```js
> /*eslint array-bracket-newline: ["error", { "minItems": 2 }]*/
>
> const a = [
> ];
> const b = [
>     1
> ];
> const c = [1, 2];
> const d = [1,
>     2];
> const e = [
>   function foo() {
>     dosomething();
>   }
> ];
> ```

Examples of **correct** code for this rule with the `{ "minItems": 2 }` option:

**Correct Example**

> ```js
> /*eslint array-bracket-newline: ["error", { "minItems": 2 }]*/
>
> const a = [];
> const b = [1];
> const c = [
>     1, 2
> ];
> const d = [
>     1,
>     2
> ];
> const e = [function foo() {
>     dosomething();
> }];
> ```

### multiline and minItems

Examples of **incorrect** code for this rule with the `{ "multiline": true, "minItems": 2 }` options:

**Incorrect Example**

> ```js
> /*eslint array-bracket-newline: ["error", { "multiline": true, "minItems": 2 }]*/
>
> const a = [
> ];
> const b = [
>     1
> ];
> const c = [1, 2];
> const d = [1,
>     2];
> const e = [function foo() {
>     dosomething();
> }];
> ```

Examples of **correct** code for this rule with the `{ "multiline": true, "minItems": 2 }` options:

**Correct Example**

> ```js
> /*eslint array-bracket-newline: ["error", { "multiline": true, "minItems": 2 }]*/
>
> const a = [];
> const b = [1];
> const c = [
>     1, 2
> ];
> const d = [
>     1,
>     2
> ];
> const e = [
>     function foo() {
>         dosomething();
>     }
> ];
> ```

## When Not To Use It

If you don't want to enforce line breaks after opening and before closing array brackets, don't enable this rule.

## Compatibility

* **JSCS:** [validateNewlineAfterArrayElements](https://jscs-dev.github.io/rule/validateNewlineAfterArrayElements)
