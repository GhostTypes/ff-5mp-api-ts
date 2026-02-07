<!-- Metadata
title: no-const-assign
rule_type: problem
handled_by_typescript: True
-->




Constant bindings cannot be modified. An attempt to modify a constant binding will raise a runtime error.

## Rule Details

This rule is aimed to flag modifying variables that are declared using `const`, `using`, or `await using` keywords.

Examples of **incorrect** code for this rule:

**Incorrect Example**

> ```js
> /*eslint no-const-assign: "error"*/
>
> const a = 0;
> a = 1;
> ```

**Incorrect Example**

> ```js
> /*eslint no-const-assign: "error"*/
>
> const a = 0;
> a += 1;
> ```

**Incorrect Example**

> ```js
> /*eslint no-const-assign: "error"*/
>
> const a = 0;
> ++a;
> ```

**Incorrect Example**

> ```js
> /*eslint no-const-assign: "error"*/
>
> if (foo) {
> 	using a = getSomething();
> 	a = somethingElse;
> }
>
> if (bar) {
> 	await using a = getSomething();
> 	a = somethingElse;
> }
> ```

Examples of **correct** code for this rule:

**Correct Example**

> ```js
> /*eslint no-const-assign: "error"*/
>
> const a = 0;
> console.log(a);
> ```

**Correct Example**

> ```js
> /*eslint no-const-assign: "error"*/
>
> if (foo) {
> 	using a = getSomething();
> 	a.execute();
> }
>
> if (bar) {
> 	await using a = getSomething();
> 	a.execute();
> }
> ```

**Correct Example**

> ```js
> /*eslint no-const-assign: "error"*/
>
> for (const a in [1, 2, 3]) { // `a` is re-defined (not modified) on each loop step.
>     console.log(a);
> }
> ```

**Correct Example**

> ```js
> /*eslint no-const-assign: "error"*/
>
> for (const a of [1, 2, 3]) { // `a` is re-defined (not modified) on each loop step.
>     console.log(a);
> }
> ```

## Options

This rule has no options.

## When Not To Use It

If you don't want to be notified about modifying variables that are declared using `const`, `using`, and `await using` keywords, you can safely disable this rule.
