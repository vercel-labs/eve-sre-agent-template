---
name: deep-investigation
description: Perform a deep investigation into an alert, incident, or other operational request using a hypothesis-backed approach.
---

# Evidence-Backed Investigation

Investigate a problem using a hypothesis-driven approach, grounded in available context and with a paper trail of evidence for responders to reference.

## Procedure

### 1: Context hydration

Scan the conversation for:

- alert or incident metadata
- service names, environment names, region hints
- timestamps or time ranges
- symptoms (errors, latency, downtime)
- links to external pieces of context

The goal is to get an understanding of "what went wrong" before developing hypotheses for _why_ things went wrong and _how_ to fix them. If necessary, use available tools to find any additional context that is necessary to understand what went wrong and the reason for the investigation.

Additionally, perform a quick scan using available tools to determine if the problem is related to a recent, ongoing incident.

### 2: Hypothesis generation

After identifying the problem being investigated (or in other words, "what went wrong"), generate 2-4 plausible root-cause hypotheses. Each must include:

- A short label for the hypothesis
- Reasoning behind why the hypothesis should be investigated, grounded in the context hydrated in the previous step
- A list of signals to look for to confirm or deny the hypothesis

### 3: Hypothesis validation

Investigate each hypothesis using the hypothesis validation skill and produce for each:

- Whether the hypothesis was validated, invalidated, or inconclusive
- A description of the agent's explanation, along with specific pieces of evidence, backing the conclusion for the hypothesis

Record findings as you validate. Follow the Evidence rules in the agent instructions. Call `evidence_record`, `evidence_remove`, and `evidence_list` as those rules say.

## Result

If the invoking prompt prescribes an exact output shape, follow it and fold the findings below into those sections rather than adding more headings.

Deliver one synthesis covering:

- What is happening, which services are affected, when it started, and current severity
- Related or recurring incidents, only when this turn's evidence shows them. Do not state that no related incident exists; you have no incident history to search.
- Most likely root cause, or an explicit statement that none are validated
- Blast radius
- 1-4 concrete next steps for the responder

## Boundaries

- If the task is to validate one specific hypothesis, do not generate new hypotheses. Use the hypothesis validation skill.
