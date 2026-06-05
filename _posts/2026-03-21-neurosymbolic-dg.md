---
layout: post
title: "Grammars that generalize: implementation notes on PARSE"
date: 2026-03-21 10:00:00
description: A PCFG + algebraic-effects implementation of the PARSE primitive-relation model for domain-generalized image recognition.
header_image: /assets/img/neurosymbolic_dg/thumbnail.png
---

This post is implementation notes for our paper **PARSE: Domain Generalization through Spatial Relation Induction over Visual Primitives** ([Nguyen & Nguyen, 2026](https://arxiv.org/abs/2605.06043)), written with [Duy](https://github.com/Duy-Nguyen-Duc). The paper introduces PARSE: a recognition head that decomposes an image into a small set of learned visual primitives and scores soft predicates (unary, binary, ternary, quaternary) over their coordinates as a structural inductive bias for domain generalization. Read the paper for the model and the experiments. This post is about the code: the PCFG + algebraic-effects implementation that makes the predicate machinery composable, the synthetic compositional benchmark we ship for stress-testing, and the things we tried that did not help.

Code: [datvo06/NeuroSymbolicDA](https://github.com/datvo06/NeuroSymbolicDA) (branch `concentration-robustness-theory`). Checkpoints: [HuggingFace](https://huggingface.co/datvo06/neurosymbolic-da-results).

## What PARSE does, and the numbers

PARSE replaces the linear classification head of a standard recognition backbone with a primitive-relation head: a small concept bottleneck that decodes K visual primitives plus a sparse weighted sum of soft predicates over their spatial arrangement. The headline benchmark is **CUB-DG** ([Min et al., ECCV 2022](https://arxiv.org/abs/2209.14108)): 200 bird species across 4 visual domains (Photo, Art, Cartoon, Paint), trained on three and tested on the held-out one.

On CUB-DG, the paper reports:

| Method | Photo | Cartoon | Art | Paint | Avg |
|--------|-------|---------|-----|-------|-----|
| CORAL ([Sun & Saenko, 2016](https://arxiv.org/abs/1607.01719)) | | | | | 55.5% |
| GVRT | | | | | 57.0% |
| ERM++ (prior best) | 67.1 | 61.6 | 56.8 | 65.8 | 61.1% |
| **PARSE** | **75.7** | **69.1** | **68.2** | 49.3 | **65.6%** |

+4.5pp over ERM++ on average, with the gain concentrated on the harder stylistic domains (Cartoon, Art) and a real regression on Paint that we discuss later. The paper also reports DomainBed numbers (PARSE 66.7% avg across PACS, VLCS, OfficeHome, TerraIncognita, DomainNet, beating GVRT by 1.4pp and best on TerraIncognita); see Table 1b in the paper.

<img src="{{ '/assets/img/neurosymbolic_dg/fig1_cubdg_hero.png' | relative_url }}" alt="CUB-DG results comparison" style="max-width: 100%; height: auto;">

The rest of this post is about *how* the implementation is put together. None of it is required to reproduce the paper numbers, but it is what makes the system extensible.

## The pipeline, as implemented

```
backbone (ResNet-50)
  → 1×1 conv → K heatmaps
  → temperature softmax + coord expectation → K primitives (cx, cy, presence, extent)
  → predicate evaluation → activation vector β(x) ∈ R^M
  → sparsemax-weighted PCFG head → class scores
```

The concept bottleneck (1×1 conv + differentiable soft-argmax with learnable temperature, following [Nibali et al., 2018](https://arxiv.org/abs/1801.07372)) forces the network to decompose its representation into K spatially localized primitives. Each primitive has a 2D location, a presence score (sigmoid of max heatmap activation), and an extent (twice the coordinate standard deviation). No hand-designed primitive vocabulary; the primitives emerge from end-to-end training.

The released CUB-DG configs use **K = 8 primitives** (`scripts/train_dg.py:380`, `scripts/reproduce.py:143,149`). The paper discusses K = 16 as the headline setting; the released code's default is K = 8, which is what we used for the runs whose checkpoints are on HuggingFace. The K-sweep ablation in the paper (8 / 12 / 24 / 32, on DomainNet/Sketch) is at `scripts/k_sweep.py`.

## The predicate vocabulary

This is the thing PARSE actually gives you that a plain linear head does not: a set of soft predicates over primitive coordinates, evaluated end-to-end and learnable. The full predicate set as implemented in `neurosymbolic_da/dsl/`:

| Arity | Predicate | File |
|---|---|---|
| 1 | `has(j)` | `dsl/ops.py:18` |
| 2 | `above`, `left_of`, `aligned_h`, `aligned_v`, `near`, `contains`, `dist_ratio`, `overlap`, `relative_scale` | `dsl/relations.py:17` |
| 3 | `triplet_rel`, `chain_rel`, `betweenness` | `dsl/ops.py:78, 89, 100` |
| 4 | `angle_rel`, `same_distance`, `cross_ratio`, `group_rel` | `dsl/ops.py:52, 69, 110, 120` |

Each binary predicate is a sigmoid or Gaussian over coordinate differences:

$$
\begin{aligned}
\texttt{above}(i, j) &= \sigma\bigl(\lambda_1 (cy_j - cy_i - m_1)\bigr) \\
\texttt{near}(i, j) &= \exp\bigl(-\|c_i - c_j\|^2 / 2\rho^2\bigr) \\
\texttt{aligned\_h}(i, j) &= \exp\bigl(-(cy_i - cy_j)^2 / 2\tau_1^2\bigr) \\
\texttt{contains}(i, j) &= \sigma\bigl(\lambda_3 \min(\text{margin}_{ij})\bigr)
\end{aligned}
$$

The higher-arity predicates are similar in spirit: `triplet_rel` checks an interior angle, `chain_rel` checks a turn angle along a primitive chain, `same_distance` checks log-ratio of two edge lengths, `cross_ratio` is the four-point projective invariant. All thresholds $(\lambda, m, \tau, \rho)$ are learnable and jointly optimized; the *shape* of each relation is locked in but the threshold adapts.

The point of the higher-arity predicates is that they are pose-and-scale invariants in a way that pairwise predicates cannot easily express. `cross_ratio` over four primitives is, by construction, invariant under projective transformations of the layout. `same_distance` is scale-invariant. These are exactly the kinds of invariants you want for cross-domain matching.

## The grammar: a PCFG over the predicate set

Given K primitives and the predicate vocabulary above, `dsl/grammar.py:189 _enumerate_productions` builds a finite production set: one rule per `has(j)`, one rule per `rel(r, i, j)` for each ordered pair `(i, j)` and each binary relation, plus higher-arity productions for each ternary/quaternary predicate active in the config. The number of productions is configurable (it depends on K, which predicates you enable, and how many channels each higher-arity predicate spans); for the released CUB-DG config it sits in the few hundreds.

Each class $y$ has its own production weight vector $\mathbf{w}_y$, normalized by **sparsemax** ([Martins & Astudillo, 2016](https://arxiv.org/abs/1602.02068)). Unlike softmax, sparsemax produces exact zeros, so each class commits to a small set of active productions. The class score:

$$W_y(x) = \sum_{p} \underbrace{[\text{sparsemax}(\mathbf{w}_y)]_p}_{\text{grammar weight}} \cdot \underbrace{\beta_p(x)}_{\text{predicate activation}}$$

If you squint, this is a linear classifier over predicate-activation features with sparsemax forcing each class to pick a small structural explanation. Two things complicate that picture and are why we keep the grammar framing in the code:

1. The infrastructure supports genuine compositionality. The DSL, the handlers (below), and the inside algorithm all support recursive productions (`max_depth > 1`). At depth 1 the model is flat, but the same code runs depth-N.
2. The grammar framing is what produced this design. "Enumerate predicates as productions and pick a sparse subset per class" is a natural move once you are thinking in PCFG terms.

Per-image, this looks like:

<img src="{{ '/assets/img/neurosymbolic_dg/full_pipeline_viz.png' | relative_url }}" alt="Full pipeline visualization" style="max-width: 100%; height: auto;">

And the top-6 active productions for one species, drawn on bounding boxes:

<img src="{{ '/assets/img/neurosymbolic_dg/grammar_rules_viz.png' | relative_url }}" alt="Grammar rules with bounding boxes" style="max-width: 100%; height: auto;">

Per-class grammars are distinct (mean pairwise cosine similarity ≈ 0.04, no identical pairs across 200 classes):

<img src="{{ '/assets/img/neurosymbolic_dg/grammar_overlap.png' | relative_url }}" alt="Grammar overlap matrix" style="max-width: 100%; height: auto;">

## One program, several semantics: the `effectful` handlers

The grammar is implemented using the [`effectful`](https://github.com/BasisResearch/effectful) algebraic-effects library. The DSL operations (`has`, `rel`, `conj`, `choice`, `score`, plus the higher-arity ops `angle_rel`, `same_distance`, `triplet_rel`, `chain_rel`, `betweenness`, `cross_ratio`, `group_rel`) are declared with `@Operation.define` in `dsl/ops.py`. The same program runs under different handlers:

```python
with handler(eval_handler):     score = grammar(class_idx)  # → Tensor
with handler(inside_handler):   table = grammar(class_idx)  # → InsideTable
with handler(symbolic_handler): tree  = grammar(class_idx)  # → DerivNode
with handler(abstract_handler): bound = grammar(class_idx)  # → IntervalBound
```

The handlers live in `dsl/handlers/`: `eval.py`, `inside.py`, `symbolic.py`, `abstract.py`, plus `cad_eval.py` / `cad_symbolic.py` for the CAD-style sub-language. Quick tour:

- **`eval`**: non-negative real semiring $(\mathbb{R}_{\geq 0}, +, \times, 0, 1)$. `choice` is addition, `conj` is multiplication, `score` scales by the grammar weight. Fast scalar class score.
- **`inside`**: the [inside algorithm](https://en.wikipedia.org/wiki/Inside%E2%80%93outside_algorithm) adapted from strings to sets, $I(A, S) = \sum_{A \to B\;C} w \sum_{S = S_1 \uplus S_2} I(B, S_1) \cdot I(C, S_2)$. Exact marginals over derivations.
- **`symbolic`**: builds an explicit `DerivNode` tree. The visualizations above are extracted from this handler.
- **`abstract`**: interval-bound semiring for the concentration / robustness experiments on the same branch name.

There is also a `forward_vectorized` fast path on `dsl/grammar.py:838` (and its construction-grammar twin at `construction_grammar.py:133`) that bypasses effectful entirely and runs the depth-1 evaluation as pure tensor ops. The code comment at `scripts/train_hybrid.py:108` says "same as inside algorithm but ~26x faster via tensor ops." We use the vectorized path for training and the handler-based path for analysis. The handler version is what lets the system stay compositional; the vectorized version is what makes it tractable to train.

This is the same algebraic-effects pattern as in my [Bayesian synthesis post]({% post_url 2026-01-23-bayesian-synthesis %}). Different domain, same machinery: a fixed program (here, the grammar), several semantic readings (eval / inside / symbolic / abstract).

## What the grammar discovers

Same species across Photo, Art, and Cartoon. The heatmap patterns are consistent across domains even though the pixels look nothing alike:

<img src="{{ '/assets/img/neurosymbolic_dg/cross_domain_heatmaps.png' | relative_url }}" alt="Cross-domain heatmaps" style="max-width: 100%; height: auto;">

Binary-predicate usage across classes:

<img src="{{ '/assets/img/neurosymbolic_dg/relation_usage.png' | relative_url }}" alt="Relation usage analysis" style="max-width: 100%; height: auto;">

`contains` dominates, `above` is second, `left_of` is much rarer. The story: `contains` is really soft asymmetric overlap (the bounding boxes are too diffuse for true containment), which is pose-invariant. `above` is reliable across poses. `left_of` is pose-dependent (a bird facing left has its beak left-of-body; facing right, reversed) and the training data has random horizontal flips, so sparsemax drives it to zero. The grammar discovers on its own which relations transfer.

The Paint regression in the CUB-DG table (PARSE 49.3% vs ERM++ 65.8%) is the honest counter-evidence: when the source primitives themselves are unreliable in the target domain (Paint has heavier stylization than Cartoon and Art on average in this dataset), the structural prior cannot save you. The grammar is only as good as the primitives feeding it.

## SCB: a synthetic compositional benchmark

CUB-DG has some compositional structure (parts with consistent spatial relationships) but is not a stress test for hierarchical composition. So we built one. **SCB** (Synthetic Compositional Benchmark, `neurosymbolic_da/data/scb.py`) generates layouts under three conditions (A, B, C) that vary the depth of compositional structure and the cross-domain transformations applied. The PMCMC adaptation method (`neurosymbolic_da/training/pmcmc.py`) does Bayesian inference over derivation-tree structures using birth/death/swap moves on the grammar, an idea taken directly from the [Bayesian synthesis post]({% post_url 2026-01-23-bayesian-synthesis %}).

On SCB hierarchical conditions, the grammar-with-PMCMC variant strongly outperforms the gradient-only baseline. The paper figure is at `scripts/plot_paper_figures.py:267 fig7_scb_validation`. We do not claim SCB is a strong external benchmark; it is a controlled diagnostic that confirms the compositional infrastructure does what we want when the data demands it.

## What doesn't work, and what that tells us

A handful of things we tried on top of PARSE made it worse on CUB-DG. Directionally:

<img src="{{ '/assets/img/neurosymbolic_dg/fig10_negative_results.png' | relative_url }}" alt="Negative results" style="max-width: 100%; height: auto;">

- **Adversarial alignment** ([Ganin et al., 2016](https://arxiv.org/abs/1505.07818)): adding a 3-way domain discriminator on top hurts. The grammar already captures the invariances; forcing alignment fights with it.
- **Deeper grammar (max_depth = 2)**: hierarchical sublayouts overfit to source-domain part-grouping. The depth-1 abstraction is already coarse enough to transfer; depth-2 commits to specific groupings that do not transfer.
- **Production-score alignment** ([MMD, Gretton et al., 2012](https://jmlr.org/papers/v13/gretton12a.html)) on top of the grammar: redundant with the grammar's own compositional structure, and introduces extra optimization pressure that hurts target accuracy.

Of these, the depth-2 failure is the most interesting to us. Why doesn't compositionality help here? Our best guess: the depth-1 abstraction is already at the right granularity for birds. Adding hierarchical structure introduces parameters that overfit to the *specific way* parts group in photos, which does not transfer to cartoons. There is a sweet spot of abstraction granularity, and pairwise predicates seem to hit it for this benchmark. Whether that generalizes is an open question.

## Honest caveats

A few things I want to be upfront about, since reviewers will land on them:

**"At depth 1 this is a kernel machine with sparsemax sparsity."** Mathematically, yes. The depth-1 PCFG head is equivalent to `class_score = sparsemax(W) @ predicate_features(x)`. The grammar framing is what produced the design and what supports depth-N extension, but if you want to call this a sparse linear classifier over engineered relation features, you would not be wrong, and the results would not change. The interesting object is the *predicate vocabulary*, not the PCFG wrapper around it.

**"The ablation confounds architecture and features."** Yes. PARSE operates on a few hundred predicate-activation features with sparsemax; the linear-head baseline operates on 2048-dim backbone features with softmax. Different capacity, different regularization, different feature space. The honest claim is that *this combination* of inductive biases helps. A linear head over the same predicate features would be a cleaner ablation.

**"Show me CLEVR or genuinely compositional reasoning."** Fair. CUB-DG has compositional structure (bird parts plus spatial relations) but is not CLEVR-style multi-step relational reasoning. SCB is our internal stand-in but it is synthetic. A CLEVR-DG (CLEVR scenes with domain shift in rendering style) does not exist yet, as far as I know.

**"`contains` does not contain."** Correct. The bounding boxes are too diffuse for true containment; what the predicate computes is asymmetric soft overlap. The name is misleading and the function is still useful.

## What's next

The framework is more general than birds. Anything with reusable compositional structure and a known cross-domain transformation, documents, diagrams, multi-object scenes, maybe action recognition, is a candidate. The interesting question is when hierarchical composition starts paying off: depth-2 hurt here because depth-1 was already invariant enough, but for tasks with multi-scale structure (macro vs micro) you would need group-level relations.

The repo has training scripts, all ablations, the SCB generator, and pretrained checkpoints on HuggingFace. If you have a compositional recognition task with domain shift, give it a try. Issues and PRs welcome.
