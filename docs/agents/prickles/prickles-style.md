# Prickles canon · Style pillar · v2.0

The 4 Style tenets of the Prickles canon. Apply them whenever you write or review code in this repository. Each tenet's full entry, with its evidence, is on https://prickles.org.

## Prickles S2: Cyclomatic Caps

Cap cyclomatic complexity per function. The number is editorial. Pick one and put it in the linter.

Cap function length. Pick a number. The canonical Prickles default is 15 lines. Pair with caps on indentation depth, statement count, parameter count.

When a function trips the cap, refactor first: extract a helper, lift a guard clause, split the responsibility. Do not raise the cap to suit the function.

Refuse to disable the rule per occurrence. The cap is not negotiable per pull request. If the cap is wrong for the project, change the cap globally and document why.

## Prickles S3: Parameter Object

Cap function parameters at three. The fourth parameter is the missing struct.

When the same group of fields keeps appearing together (a Data Clump), bundle them into a named type. Update callers. Run tests.

Use object destructuring for cases where the struct is genuinely a one-off: it counts as one parameter. Keyword arguments are no exemption: Ruff's PLR0913 counts keyword-only arguments too.

Refuse to add a fourth positional parameter to satisfy a new requirement. Either the new field belongs in the struct that should already exist, or the function is doing too much and needs to split.

## Prickles S4: Guard Clauses

When a function's preconditions are nested as conditionals, lift each one to a guarded early return at the top of the function.

Cap indentation depth at three. The cap is there to trigger the rewrite.

When the guards themselves get long, extract them into a named validator that returns success-or-error. The function then has one guard call and the happy path body.

Refuse to add a fourth indentation level to a function. Either the function is doing too much and needs to split, or the new condition belongs in a guard.

## Prickles S5: Inline-First

Inline first. Extract when a name is needed. A binding justifies itself when its name carries information the expression does not.

Three settled cases. Literals with meaning earn a `const NAME` so the meaning is recorded once and cited many times. Single-use trivial expressions stay inline. Values computed and immediately returned drop the alias.

When the lint flags an immediate-return alias or a magic number, do the rewrite. The rule is the conversation, not the verdict.

Refuse to introduce a name that does not narrow a type, name a stage, or carry intent. The default is the expression. The name has to earn its existence.
