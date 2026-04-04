---
name: rigor:py-writer
description: Use when writing or modifying Python code — new files, new functions, new modules, or significant additions to existing code. Also use when the task requires choosing between Python patterns (error handling, data modeling, async vs sync, module structure, type hints) and the codebase doesn't have an established convention. Triggers for any Python implementation work.
---

# Python Writer

## Philosophy

Python's flexibility is both its strength and its trap. The language lets you write the same logic five different ways — classes, functions, dataclasses, protocols, raw dicts — and every project picks a different subset. Your job is to identify which subset THIS project uses and stay within it. Don't bring patterns from a different Python project, a different framework, or a different era of Python.

The same core principles apply as any writer skill: follow what exists, surface what doesn't. But Python's permissiveness means you need to pay extra attention to what the codebase has chosen, because the language won't enforce consistency for you.

## Before Writing Any Code

You MUST complete these steps before producing implementation code.

### 1. Scan the Codebase

Read the code around what you're building. Python projects reveal their conventions through import style, typing usage, and framework choices more than most languages.

Look for:
- **Python version and type hints**: Is the project using type hints? How strictly? `Optional[str]` or `str | None`? Are there `py.typed` markers? Is mypy/pyright configured? Does the project use `from __future__ import annotations`?
- **Data modeling**: Dataclasses? Pydantic models? TypedDicts? NamedTuples? Plain dicts? Attrs? Each one signals a different philosophy about validation and structure.
- **Error handling**: Custom exception hierarchies? Bare raises? Exception groups? Does the project catch specific exceptions or broad `except Exception`?
- **Async vs sync**: Is the project async (asyncio, aiohttp, FastAPI)? Sync (Flask, Django)? Mixed? Don't introduce async into a sync codebase or vice versa without surfacing the decision.
- **Module structure**: Flat modules? Packages with `__init__.py`? Namespace packages? How are imports organized — absolute or relative?
- **Testing**: pytest? unittest? Both? What fixtures exist? How are mocks done — `unittest.mock`, `pytest-mock`, `monkeypatch`? What's the test file naming convention?
- **Framework**: Django, Flask, FastAPI, Starlette, or none? The framework dictates enormous amounts of convention — follow it.
- **Dependency management**: Poetry? pip with requirements.txt? pipenv? uv? This tells you about the project's maturity and tooling philosophy.

The goal is to answer: **what does idiomatic Python look like in THIS codebase?**

Use `/rigor:code-structure` for module and file placement decisions.

### 2. Identify Pattern Decisions

If the codebase has an established pattern for what you're building, follow it. Go to step 4.

If you're building something the codebase hasn't done before, surface the pattern decision. Python's flexibility means there are often 3-4 viable approaches — don't pick one because it's what you've seen most in training data.

Pattern decisions include **data model ambiguities** as well. If the task uses a vague concept that isn't concretely defined in the codebase, surface it.

### 3. Surface Pattern Options

When you need to establish a new pattern, present options.

Present:
- **What decision needs to be made**: Name the pattern category
- **The options**: With concrete code examples showing what each looks like
- **How each option composes with existing code**: Does it match the project's style?
- **Forward-looking trade-offs**: Which option scales better? Which is easier to test? Which plays well with the framework?
- **Your recommendation**: Based on this codebase — but the human decides

Common Python pattern decisions that need surfacing:
- Data modeling: dataclasses vs Pydantic vs TypedDicts vs plain classes
- Error handling: custom exceptions vs standard exceptions vs result types
- Async vs sync: introducing async to a sync project (or vice versa)
- Validation: Pydantic vs marshmallow vs cerberus vs manual
- Configuration: environment variables vs config files vs pydantic-settings
- Database access: SQLAlchemy ORM vs raw SQL vs Django ORM vs SQLModel
- Type strictness: full type hints vs partial vs untyped
- Dependency injection: manual wiring vs dependency-injector vs FastAPI Depends

Do NOT write implementation code until pattern decisions are confirmed.

### 4. Write with the Tests Leading

Follow `/rigor:tdd`. The test comes first.

Test both the happy path and the failure modes — bad input, raised exceptions from dependencies, business rule violations. Aim for confidence that the system handles real-world failures, not coverage numbers.

Python testing conventions are project-specific:
- pytest is dominant but some projects use unittest — match what exists
- Test file naming: `test_*.py` or `*_test.py` — match what exists
- Fixture usage: project-level `conftest.py` or test-local? Match what exists
- Mock patterns: `unittest.mock.patch`, `pytest-mock`'s `mocker` fixture, or `monkeypatch` — match what exists

### 5. Python-Specific Implementation Standards

**Type hints are documentation.** If the project uses type hints, every public function should have them. Return types, parameter types, and any non-obvious variable. If the project doesn't use type hints, don't introduce them without surfacing the decision — it's a project-wide commitment, not a per-file choice.

**Be explicit about mutability.** Python's mutable defaults trap is real (`def f(items=[])`). Use `None` as default and create inside the function. Return copies when callers shouldn't mutate the internal state. If the project uses frozen dataclasses or `tuple` returns, follow that pattern.

**Use the standard library before reaching for packages.** `pathlib` over `os.path`. `dataclasses` over attrs when the project doesn't need attrs features. `typing` over runtime validation when compile-time checks suffice. Only bring in a dependency when the standard library genuinely can't do the job.

**Respect the framework.** Django has its ORM, its view conventions, its middleware. FastAPI has Depends, Pydantic models, async handlers. Flask has blueprints and extension patterns. When working within a framework, use its patterns — don't fight them with abstractions that work around the framework's design.

**Imports matter.** Follow the project's import style. If it uses absolute imports, use absolute imports. If it groups stdlib / third-party / local with blank lines (isort style), follow that. Import order inconsistency is noise that obscures real changes in diffs.

**Exceptions are the error convention.** Python idiom is to raise exceptions for errors, not return error codes or result types — unless the project has explicitly chosen otherwise. If the project has a custom exception hierarchy, use it. If it doesn't, follow the framework's exception patterns.

**Dunder methods and protocols.** Use `__str__`, `__repr__`, `__eq__`, `__hash__` when they make the type usable in standard Python patterns (printing, sets, dicts). Implement protocols (`__iter__`, `__len__`, `__contains__`) when they make the type compose with Python's built-in functions and operators. Don't add them speculatively — add them when there's a consumer.

## Anti-Patterns

| What you're doing | What you should do instead |
|---|---|
| Using `dict` for structured data when the project uses dataclasses | Use dataclasses. Follow the project's data modeling pattern. |
| Adding type hints to a project that doesn't use them | Surface the decision. Type hints are a project-wide commitment. |
| Using `async def` in a sync project | Surface the async/sync decision. Don't mix without discussion. |
| Catching `Exception` broadly | Catch specific exceptions. If you need a broad catch, re-raise after logging. |
| Using `from module import *` | Import specific names. Star imports hide dependencies. |
| Creating a class with only `__init__` and one method | Use a function. Not everything needs to be a class. |
| Using `isinstance` checks when protocols would work | Define a protocol if the project uses type hints. Otherwise, duck type. |
| Installing a new package without checking if stdlib covers it | Check the standard library first. |
| Writing bare `except:` | Always specify the exception type. |
| Silently choosing between sync and async | If the codebase is sync and the task might benefit from async, surface it. |

## Composability

This skill references:
- `/rigor:code-structure` — for module and file placement
- `/rigor:tdd` — for test-driven implementation (mandatory)
- `/rigor:code-review` — for self-review on non-trivial implementations

This skill is referenced by:
- `/rigor:debug` — when the fix requires writing new Python code
- `/rigor:refactor` — when structural changes produce new modules
