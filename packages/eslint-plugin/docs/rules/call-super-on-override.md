---
description: 'Require overridden methods to call super.method in their body'
---

> 🛑 This file is source code, not the primary documentation location! 🛑
>
> See **https://typescript-eslint.io/rules/prefer-readonly** for documentation.

This rule enforces that overridden methods are calling exact super method to avoid missing super class method implementations.

## Rule Details

Examples of code for this rule:

### ❌ Incorrect

```ts
class Foo1 {
  bar(param: any): void {}

  get bar2() {
    return '1';
  }

  set bar2(val) {}
}

class Foo2 extends Foo1 {
  override bar(param: any): void {}

  override get bar2() {
    return '2';
  }

  override set bar2(val) {}
}
```

### ✅ Correct

```ts
class Foo1 {
  bar(param: any): void {}

  get bar2() {
    return '1';
  }

  set bar2(val) {}
}

class Foo2 extends Foo1 {
  override bar(param: any): void {
    super.bar(param);
  }

  override get bar2() {
    super.bar2; // at least call it
    return '2';
  }

  override set bar2(val) {
    super.bar2 = val;
  }
}
```

### Note

Class properties that have `function` value are not considered as real method override and cause `SyntaxError` on super calls:

```ts
class Foo1 {
  bar1 = function () {};

  bar2 = () => {};
}

class Foo2 extends Foo1 {
  override bar1 = function () {
    super.bar1(); // SyntaxError: 'super' keyword unexpected here
  };

  override bar2 = () => {
    super.bar2(); // SyntaxError: 'super' keyword unexpected here
  };
}
```

Above code tested with Nodejs v18.7.0.

## When Not To Use It

When you are using TypeScript < 4.3 or you did not set `noImplicitOverride: true` in `CompilerOptions`
