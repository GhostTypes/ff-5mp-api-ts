<!-- Metadata
title: space-unary-word-ops
-->


Requires spaces after unary word operators.

**Important**

> This rule was removed in ESLint v0.10.0 and replaced by the [space-unary-ops](space-unary-ops) rule.

## Rule Details

Examples of **incorrect** code for this rule:

**Incorrect Example**

> ```js
> typeof!a
> ```

**Incorrect Example**

> ```js
> void{a:0}
> ```

**Incorrect Example**

> ```js
> new[a][0]
> ```

**Incorrect Example**

> ```js
> delete(a.b)
> ```

Examples of **correct** code for this rule:

**Correct Example**

> ```js
> delete a.b
> ```

**Correct Example**

> ```js
> new C
> ```

**Correct Example**

> ```js
> void 0
> ```
