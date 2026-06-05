---
layout: post
title: "Grammars that generalize: trying to find domain-invariant bird recognition"
date: 2026-03-21 10:00:00
description: Combining a small DSL with a neural network for image classification gives domain invariance for free.
header_image: /assets/img/neurosymbolic_dg/thumbnail.png
---

Here's a question [Duy](https://github.com/Duy-Nguyen-Duc) and I were kicking around: what if you combined a small DSL with a neural network classifier and the classifier head itself *happened* to be domain-invariant by construction? Not as a replacement for adaptation methods like CDAN, but as a much stronger starting point for them.

Turns out it works. We replaced a linear classification layer with a probabilistic context-free grammar over spatial layout programs. The grammar scores spatial relations between detected parts, and those relations don't change when you go from photos to paintings. We call this **PARSE** (Primitive-Aware Relational Structure for domain gEneralization); paper at [arXiv:2605.06043](https://arxiv.org/abs/2605.06043).

Code: [datvo06/NeuroSymbolicDG](https://github.com/datvo06/NeuroSymbolicDG). Checkpoints: [HuggingFace](https://huggingface.co/datvo06/neurosymbolic-da-results).

## The setup and the result

The benchmark is CUB-DG ([Min et al., ECCV 2022](https://arxiv.org/abs/2209.14108)): 200 bird species across 4 visual domains (Photo, Art, Cartoon, Paint). Train on 3 domains, test on the held-out one. Best published image-only method, CORAL ([Sun & Saenko, 2016](https://arxiv.org/abs/1607.01719)): 49.9% avg. Best with image+text, CITGM: 53.6%. We get **67.0%** with image only.

<img src="{{ '/assets/img/neurosymbolic_dg/fig1_cubdg_hero.png' | relative_url }}" alt="CUB-DG results comparison" style="max-width: 100%; height: auto;">

The pipeline:

```
ResNet-50
  → 1×1 conv → K=16 heatmaps
  → spatial_soft_argmax → 16 primitives {(cx, cy, bbox, conf)}
  → PCFG: ~130k enumerated productions, sparsemax weights per class
  → class scores → log-softmax
```

The concept bottleneck (1x1 conv + [spatial soft-argmax](https://kornia.readthedocs.io/en/latest/geometry.subpix.html)) forces the network to decompose its representation into K = 16 spatially localized primitives. Each primitive has a location, bounding box, and confidence. No hand-designed primitive vocabulary; the primitives emerge from end-to-end training.

Per the paper's Table 1a, CUB-DG accuracy by target domain:

<table style="border-collapse: collapse; margin: 1em 0; font-size: 0.95em;">
  <thead>
    <tr style="border-bottom: 2px solid #444;">
      <th style="text-align: left; padding: 0.4em 0.8em;">Method</th>
      <th style="padding: 0.4em 0.8em;">Photo</th>
      <th style="padding: 0.4em 0.8em;">Cartoon</th>
      <th style="padding: 0.4em 0.8em;">Art</th>
      <th style="padding: 0.4em 0.8em;">Paint</th>
      <th style="padding: 0.4em 0.8em;">Avg</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 0.4em 0.8em;">CORAL (<a href="https://arxiv.org/abs/1607.01719">Sun &amp; Saenko, 2016</a>)</td>
      <td style="text-align: center; padding: 0.4em 0.8em;">72.2</td>
      <td style="text-align: center; padding: 0.4em 0.8em;">63.5</td>
      <td style="text-align: center; padding: 0.4em 0.8em;">50.3</td>
      <td style="text-align: center; padding: 0.4em 0.8em;">35.8</td>
      <td style="text-align: center; padding: 0.4em 0.8em;">55.5</td>
    </tr>
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 0.4em 0.8em;">GVRT</td>
      <td style="text-align: center; padding: 0.4em 0.8em;">74.6</td>
      <td style="text-align: center; padding: 0.4em 0.8em;">64.2</td>
      <td style="text-align: center; padding: 0.4em 0.8em;">52.2</td>
      <td style="text-align: center; padding: 0.4em 0.8em;">37.0</td>
      <td style="text-align: center; padding: 0.4em 0.8em;">57.0</td>
    </tr>
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 0.4em 0.8em;">ERM++ (prior best)</td>
      <td style="text-align: center; padding: 0.4em 0.8em;">60.3</td>
      <td style="text-align: center; padding: 0.4em 0.8em;">61.6</td>
      <td style="text-align: center; padding: 0.4em 0.8em;">56.8</td>
      <td style="text-align: center; padding: 0.4em 0.8em;"><strong>65.8</strong></td>
      <td style="text-align: center; padding: 0.4em 0.8em;">61.1</td>
    </tr>
    <tr style="background: #f3f5fb;">
      <td style="padding: 0.4em 0.8em;"><strong>PARSE</strong></td>
      <td style="text-align: center; padding: 0.4em 0.8em;"><strong>75.7</strong></td>
      <td style="text-align: center; padding: 0.4em 0.8em;"><strong>69.1</strong></td>
      <td style="text-align: center; padding: 0.4em 0.8em;"><strong>68.2</strong></td>
      <td style="text-align: center; padding: 0.4em 0.8em;">49.3</td>
      <td style="text-align: center; padding: 0.4em 0.8em;"><strong>65.6</strong></td>
    </tr>
  </tbody>
</table>

+4.5pp over ERM++ on average. The gain concentrates on the harder stylistic domains (Photo, Cartoon, Art); Paint regresses (PARSE 49.3 vs ERM++ 65.8), which I discuss later. Now let me explain what that classifier head actually is.

Same backbone, same data, same everything. Vary the predicate arities the head can use:

<img src="{{ '/assets/img/neurosymbolic_dg/fig2_arity_ablation.png' | relative_url }}" alt="Predicate-arity ablation" style="max-width: 100%; height: auto;">

## The grammar

A standard classifier ends with a linear layer: backbone features $\to$ class logits. We replace that with a PCFG over a small layout DSL. The DSL has one unary terminal and three families of relations:

- **Existence** (unary): `has` returns the confidence that a primitive is present.
- **Binary relations** (6): `above`, `left_of`, `near`, `aligned_h`, `aligned_v`, `contains`. Score pairwise spatial constraints between two primitives.
- **Ternary relations** (2): `tri` (target interior angle of a triangle of three primitives) and `turn` (target turn angle along a primitive chain).
- **Quaternary relations** (2): `orient` (target relative orientation between two primitive-pair edges) and `eqdist` (whether the two edges have similar length, via a log-ratio).

**Binary predicates.** The six binary predicates are sigmoid (directional, containment) or Gaussian (proximity, alignment) over primitive centers and soft bounding boxes:

$$
\begin{array}{ll}
R_{\text{above}}(p_i, p_j) = \sigma\!\left(\kappa_{\uparrow} (c_j^y - c_i^y - m_{\uparrow})\right)
& R_{\text{left}}(p_i, p_j) = \sigma\!\left(\kappa_{\leftarrow} (c_j^x - c_i^x - m_{\leftarrow})\right) \\\\[0.6em]
R_{\text{h-align}}(p_i, p_j) = \exp\!\left(-\dfrac{(c_i^y - c_j^y)^2}{2\tau_h^2}\right)
& R_{\text{v-align}}(p_i, p_j) = \exp\!\left(-\dfrac{(c_i^x - c_j^x)^2}{2\tau_v^2}\right) \\\\[0.6em]
\multicolumn{2}{l}{R_{\text{near}}(p_i, p_j) = \exp\!\left(-\dfrac{\|c_i - c_j\|^2}{2\rho^2}\right)} \\\\[0.6em]
\multicolumn{2}{l}{R_{\text{contains}}(p_i, p_j) = \sigma\!\left(\kappa_{\supset} \min\!\bigl[b_j^{x_1} - b_i^{x_1},\, b_j^{y_1} - b_i^{y_1},\, b_i^{x_2} - b_j^{x_2},\, b_i^{y_2} - b_j^{y_2}\bigr]\right)}
\end{array}
$$

`R_above` and `R_left` score directional positions; `R_h-align` and `R_v-align` score whether two primitives share a horizontal or vertical line; `R_near` scores proximity; `R_contains` scores whether the soft bounding box of `p_i` encloses that of `p_j`. Sharpness `κ` and margins `m, τ, ρ` are learnable.

**Ternary predicates.** Each predicate is a soft Gaussian on a target angle of a primitive triple:

$$
\begin{array}{ll}
R_{\text{tri}}(p_i, p_j, p_k) = \exp\!\left(-\dfrac{(\alpha_{ijk} - \psi)^2}{2\beta^2}\right)
& R_{\text{turn}}(p_i, p_j, p_k) = \exp\!\left(-\dfrac{(\theta_{ijk} - \phi)^2}{2\eta^2}\right)
\end{array}
$$

where α<sub>ijk</sub> is the interior angle at p<sub>i</sub> in triangle (p<sub>i</sub>, p<sub>j</sub>, p<sub>k</sub>), and θ<sub>ijk</sub> = arccos(**v̂**<sub>ij</sub> · **v̂**<sub>jk</sub>) is the turn angle along the chain p<sub>i</sub> → p<sub>j</sub> → p<sub>k</sub>.

`R_tri` scores triangular configurations against a target interior angle ψ; `R_turn` scores chain turns against a target turn angle φ.

**Quaternary predicates.** Two primitive pairs are compared via their directed edges **v**<sub>ij</sub> = c<sub>j</sub> − c<sub>i</sub> and **v**<sub>kℓ</sub> = c<sub>ℓ</sub> − c<sub>k</sub>:

$$
\begin{array}{ll}
R_{\text{orient}}(p_i, p_j, p_k, p_\ell) = \exp\!\left(-\dfrac{(\hat{\mathbf{v}}_{ij} \cdot \hat{\mathbf{v}}_{k\ell} - \cos\varphi)^2}{2\gamma^2}\right)
& R_{\text{eqdist}}(p_i, p_j, p_k, p_\ell) = \exp\!\left(-\dfrac{1}{2\tau_d^2} \log^2\!\dfrac{\|\mathbf{v}_{ij}\|}{\|\mathbf{v}_{k\ell}\|}\right)
\end{array}
$$

`R_orient` scores whether the two edges form a target relative angle φ; `R_eqdist` scores whether the two edges have similar length (the log-ratio form makes the comparison symmetric). Both are pose-and-scale invariants by construction.

All shape parameters (sharpness &kappa;, margins m, tolerances &tau;, &rho;, target angles &psi;, &phi;, &phi;<sub>orient</sub>, and tolerances &beta;, &eta;, &gamma;, &tau;<sub>d</sub>) are learnable and jointly optimized with the rest of the network. The *form* of each predicate is locked in but the thresholds adapt.

Given K = 16 primitives and the predicate vocabulary above, the grammar enumerates all valid spatial compositions (binary applied to ordered pairs, ternary to ordered triples, quaternary to ordered quadruples):

$$
\begin{aligned}
\text{Constraint} &\to \text{has}(p_j) \\\\
\text{Constraint} &\to \text{rel}(r, p_i, p_j) \\\\
\text{Constraint} &\to \text{rel}_3(r, p_i, p_j, p_k) \\\\
\text{Constraint} &\to \text{rel}_4(r, p_i, p_j, p_k, p_\ell) \\\\
\text{Layout}_y   &\to \text{choice}\bigl(\text{score}(w_1, c_1), \ldots, \text{score}(w_M, c_M)\bigr)
\end{aligned}
$$

The total number of enumerated productions M depends on K and on how many channels each higher-arity predicate spans; for CUB-DG, M ≈ 130,000 (paper Table 2b). Each class y has its own weight vector **w**<sub>y</sub> ∈ ℝ<sup>M</sup>, normalized by **sparsemax** ([Martins & Astudillo, 2016](https://arxiv.org/abs/1602.02068)). Sparsemax produces *exact zeros*, so each class commits to a small set of active productions: on CUB-DG, structural compaction prunes 99.3% of weights and leaves ~956 active per class on average (paper Table 2b). The class score is

$$
\begin{aligned}
W_y(x) &= \sum_{p=1}^{M} \omega_{y,p} \cdot \beta_p(x) \\\\
\text{where } \omega_{y,p} &= [\text{sparsemax}(\mathbf{w}_y)]_p \quad \text{(grammar weight)} \\\\
\beta_p(x) &= \text{predicate activation for production } p
\end{aligned}
$$

If you squint, this is a linear classifier over *spatial relation features* with sparsemax forcing each class to pick a small structural explanation. Here's what that looks like on a real image, a Painted Bunting, from detected primitives through heatmaps to the grammar derivation:

<img src="{{ '/assets/img/neurosymbolic_dg/full_pipeline_viz.png' | relative_url }}" alt="Full pipeline visualization" style="max-width: 100%; height: auto;">

And the top 6 grammar rules visualized spatially with bounding boxes:

<img src="{{ '/assets/img/neurosymbolic_dg/grammar_rules_viz.png' | relative_url }}" alt="Grammar rules with bounding boxes" style="max-width: 100%; height: auto;">

Every class learns a distinct grammar. Here are 5 maximally diverse species, picked by greedy selection to minimize mutual cosine similarity:

<img src="{{ '/assets/img/neurosymbolic_dg/grammar_diversity.png' | relative_url }}" alt="Grammar diversity across 5 species" style="max-width: 100%; height: auto;">

All 200 classes have unique active production sets (0 identical pairs), with a mean pairwise cosine similarity of just 0.04:

<img src="{{ '/assets/img/neurosymbolic_dg/grammar_overlap.png' | relative_url }}" alt="Grammar overlap matrix" style="max-width: 100%; height: auto;">

The grammar learns genuinely distinct structural descriptions per species, not a one-size-fits-all template. And since the weights are per-class not per-domain, the structural recipe for each species is identical across Photo, Art, Cartoon, and Paint. Domain invariance by construction.

## Why it works

If you think about it in PL terms, the grammar weights define a *finite abstraction* of the image. You go from a continuous pixel space to a sparse vector of spatial relation scores, a very coarse summary. Domain shift is a transformation in the concrete (pixel) domain. But the grammar's abstraction is coarse enough to be invariant to it: "beak above breast" holds in photos and in oil paintings, even though the pixels are completely different.

Here's the same species across Photo, Art, and Cartoon. The heatmap patterns are consistent despite dramatic appearance changes:

<img src="{{ '/assets/img/neurosymbolic_dg/cross_domain_heatmaps.png' | relative_url }}" alt="Cross-domain heatmaps" style="max-width: 100%; height: auto;">

The grammar also discovers on its own *which* relations are domain-invariant:

<img src="{{ '/assets/img/neurosymbolic_dg/relation_usage.png' | relative_url }}" alt="Relation usage analysis" style="max-width: 100%; height: auto;">

`contains` dominates (94% of classes), `above` is second (84%), `left_of` drops to 39%. Why? `contains` (really soft overlap; the bounding boxes are too diffuse for true containment) is pose-invariant: two overlapping primitives stay overlapping regardless of orientation. `above` holds reliably across poses. But `left_of` is pose-dependent: a bird facing left has its beak left-of-body; facing right, it's reversed. The training data includes random horizontal flips, so the grammar learns to avoid it. Nobody told it `left_of` is unreliable. Sparsemax drove it to zero.

This is also why you can't improve it by adding alignment losses. The abstraction is already domain-invariant. Forcing additional constraints just fights with the grammar's natural behavior.

### Connection to neuro-symbolic scene understanding

This grammar is semantically similar to the visual reasoning programs in Neural-Symbolic VQA ([Yi et al., 2018](https://arxiv.org/abs/1810.02338)) and the CLEVR ecosystem ([Johnson et al., 2017](https://arxiv.org/abs/1612.06890)). Our `rel("above", p3, p1)` is not far from `relate(above, obj3, obj1)` in a CLEVR-style program. But there's a key difference:

- **CLEVR-style**: the semantics are **learned**. A neural module learns what "left_of" means. Flexible but can overfit to the training distribution.
- **Ours**: the semantics are **given differentiably**. `above(i, j) = σ(λ(cy_j - cy_i - m))` is a fixed functional form with learnable parameters. The *shape* of the relation is locked in ("above" really means "higher"), but the threshold adapts. This is what makes it domain-invariant by construction.

The tradeoff is expressiveness vs. invariance. For spatial relations between detected bird parts, the sigmoid/Gaussian forms are expressive enough, and the invariance is worth it.

## One program, three semantics

The design principle is something that'll look familiar if you've done any work with abstract interpretation: define the grammar once as an effectful program, then choose your semantics at the call site.

The grammar is implemented using [effectful](https://github.com/BasisResearch/effectful) algebraic effects. The five DSL operations (`has`, `rel`, `conj`, `choice`, `score`) are declared as algebraic effects via `@Operation.define`. The same program runs under different handlers:

```python
with handler(eval_handler):     score = grammar(class_idx)  # → Tensor
with handler(inside_handler):   table = grammar(class_idx)  # → InsideTable
with handler(symbolic_handler): tree  = grammar(class_idx)  # → DerivNode
```

The eval handler interprets the DSL in the non-negative real semiring (ℝ<sub>≥0</sub>, +, ×, 0, 1): `choice` is addition, `conj` is multiplication, `score` scales by the grammar weight. Fast scalar class score.

The inside handler interprets the same program in the *powerset semiring*, tracking which subsets of primitives each subprogram explains. This is the [inside algorithm](https://en.wikipedia.org/wiki/Inside%E2%80%93outside_algorithm) adapted from strings to sets:

$$
I(A, S) = \sum_{A \to B\;C} w \sum_{S = S_1 \uplus S_2} I(B, S_1) \cdot I(C, S_2)
$$

Exact marginals over all derivations.

The symbolic handler builds an explicit `DerivNode` tree. That's how we extract the derivation visualizations above.

Same program, three abstract domains. This is the same pattern from [my earlier post on Bayesian synthesis]({% post_url 2026-01-23-bayesian-synthesis %}): there we had MCMC over program structures with a PCFG prior. Here, the programs are spatial layout grammars and the data is images, but the birth/death/swap moves over derivation trees are the same idea.

(In practice, we bypass effectful for training via `forward_vectorized()`: pure tensor ops, ~26x faster. But the handler-based version is what makes the system compositional.)

## What doesn't work, and what that tells us

We tried several things to improve on top of the grammar. They all made it worse:

<img src="{{ '/assets/img/neurosymbolic_dg/fig10_negative_results.png' | relative_url }}" alt="Negative results" style="max-width: 100%; height: auto;">

- **Adversarial alignment** (-5.5pp): 3-way domain discriminator ([Ganin et al., 2016](https://arxiv.org/abs/1505.07818)). The grammar already captures the right invariances; forcing alignment disrupts this.
- **Deeper grammar** (-4.2pp): Hierarchical sublayouts (depth-2). Overfits to source domain structure.
- **Production score alignment** (-12.9pp): MMD ([Gretton et al., 2012](https://jmlr.org/papers/v13/gretton12a.html)) between production activations across domains. Redundant with the grammar's compositional structure.

Now let me be honest about what this all means.

**"It's just a kernel machine with hand-designed spatial features and sparsemax. Why call it a grammar?"** Partly fair. At depth-1, the PCFG is a flat weighted sum over 344 fixed productions: no recursion, no hierarchical derivation. You could rewrite the whole thing as `class_score = sparsemax(W) @ spatial_features(x)` and it would be mathematically identical. So why the grammar framing?

Two reasons. First, the *infrastructure* does more than the depth-1 config uses. The DSL, the handlers, and the inside algorithm support genuine compositionality. We tried it (depth-2) and it hurt on this benchmark, but the machinery is there for tasks where hierarchical structure matters. Second, the grammar framing is what led us to this design. "Enumerate all pairwise spatial relations and let the model pick a sparse subset per class" is a natural consequence of thinking in terms of productions. If we'd started from "let's design spatial kernel features," we might have ended up somewhere similar, but we probably wouldn't have built the handler-based architecture that makes the system extensible.

That said: if you want to call it a spatial relation feature selector with sparsemax sparsity, I won't fight you. The results don't change.

**"The depth-2 result is the most interesting finding."** I agree. Why doesn't compositionality help? The depth-1 abstraction is already coarse enough to be domain-invariant. Adding hierarchical structure introduces more parameters that overfit to source domain structure: the *specific way* parts group in photos doesn't transfer to how they group in cartoons. The flat version avoids this by not committing to any grouping. There's a sweet spot of abstraction granularity: coarse enough to transfer, fine enough to discriminate. Pairwise relations hit it for birds. Whether that generalizes is an open question.

**"The ablation confounds architecture and features."** The PCFG head operates on 344-dim spatial features with sparsemax; the linear head operates on 2048-dim backbone features with softmax. Different capacity, different regularization, different feature space. The honest claim is: this *combination* of inductive biases helps, not that the grammar alone accounts for all +15.6pp. A fairer ablation would be a linear head over the same 344 spatial features, or sparsemax without the grammar structure. We didn't run those. If someone does and the gap shrinks to 5pp, the interesting part is still which 5pp the grammar contributes and why.

**"How does this compare to concept bottleneck models?"** CBMs ([Koh et al., 2020](https://arxiv.org/abs/2007.04612)) also decompose representations into interpretable concepts. The difference is what sits on top. A CBM feeds concept activations into a linear classifier. We feed spatially localized primitives into a grammar that scores pairwise spatial relations. The CBM asks "which concepts are present?"; the grammar asks "how are the concepts spatially arranged?" For tasks where spatial structure matters (fine-grained species recognition), the arrangement is what discriminates classes, not just the presence of parts. All birds have beaks and wings. What distinguishes species is *where* they are relative to each other.

**"Show me this on CLEVR or something with real compositional structure."** Fair ask. CUB-DG has compositional structure (bird parts + spatial relations) but it's not CLEVR-style compositional reasoning (multi-step relational queries). We did test on a synthetic compositional benchmark (SCB) where the grammar's advantage is much larger: PMCMC adaptation goes from 92.5% to 100%, while the flat baseline collapses to 12.5%. But SCB is synthetic. A CLEVR-DG benchmark (CLEVR scenes with domain shift in rendering style) would be the right test for genuine compositional domain invariance. That doesn't exist yet, as far as I know.

**"The `contains` relation doesn't contain."** As discussed, the bounding boxes are too diffuse for true containment. What the model calls `contains` is better described as "asymmetric soft overlap." The name is misleading, but the function is still useful.

## What's next

The grammar works because birds are compositional: parts with consistent spatial relationships. What else is compositional enough? Documents, diagrams, multi-object scenes, maybe action recognition. The framework is general; CUB-DG happened to be the right benchmark.

The depth-2 failure is the most thought-provoking result. If flat pairwise relations already capture the right invariances, when *does* hierarchical composition become necessary? My guess: when domain shift changes the *scale* of parts (macro vs. micro photography), you'd need group-level relations to capture "these parts form a unit at this scale." That's a different benchmark.

The repo has training scripts, all ablations, and pretrained checkpoints on HuggingFace. If you have a compositional recognition task with domain shift, give it a try.
