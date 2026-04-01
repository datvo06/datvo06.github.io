---
layout: about
title: About
permalink: /
subtitle: >-
  Post‑doctoral Fellow in Computer Science, <a href="https://www.seas.harvard.edu/">Harvard SEAS</a> &nbsp;·&nbsp;
  <a href="https://www.basis.ai/">Basis Research Institute</a>
profile:
  align: right
  image: profile.jpg
  image_circular: true
  address: ""
news: true            # show the "News" block
selected_papers: true # show papers with selected={true}
social: true          # show social icons
---

### Short bio
I am a **Postdoctoral Fellow** at [Harvard's Programming Languages and Formal Methods groups](https://pl.seas.harvard.edu/) and an incoming Postdoctoral Scientist at the [Basis Research Institute](https://www.basis.ai/about/).

My research focuses on program synthesis and probabilistic programming, with a track record in graph-based learning for code and documents. I completed my PhD at the [University of Melbourne](https://cis.unimelb.edu.au/) and previously worked at **Cinnamon AI Lab** on visually rich document information extraction.

At Harvard, I work on proof automation in **Lean** and causal systems for drug repurposing. At Basis, I contribute to [MARA](https://www.basis.ai/blog/mara/) and [R-ADA](https://www.basis.ai/our-work/r-ada/).

### Research interests
- Program synthesis and probabilistic programming
- Graph-based learning for code and documents
- Neuro-symbolic systems with LLMs and SMT
- Reliable and explainable ML for software

### Technical blogs
- [Grammars that generalize]({{ '/blog/2026/neurosymbolic-dg/' | relative_url }}) -- Combining a small DSL with a neural network for domain-invariant bird recognition
- [Bayesian Synthesis]({{ '/blog/2026/bayesian-synthesis/' | relative_url }}) -- Bayesian synthesis of probabilistic programs for automatic data modeling
- [All posts]({{ '/blog/' | relative_url }})

### Project demos

<table style="border: none; border-collapse: collapse;">
  <tr style="border: none;">
    <td style="width: 35%; vertical-align: top; border: none; padding: 8px;">
      <img src="https://github.com/datvo06/NeuroSymbolicDG/raw/main/assets/thumbnail.png" alt="NeuroSymbolicDG" style="width:100%; height:auto; border-radius: 4px;">
    </td>
    <td style="vertical-align: top; border: none; padding: 8px;">
      <strong><a href="https://github.com/datvo06/NeuroSymbolicDG">NeuroSymbolicDG</a></strong><br>
      <em>PCFG over a spatial layout DSL as a domain-invariant classifier head for fine-grained bird recognition.</em><br>
      <a href="https://github.com/datvo06/NeuroSymbolicDG">code</a> · <a href="{{ '/blog/2026/neurosymbolic-dg/' | relative_url }}">blog</a> · <a href="https://huggingface.co/datvo06/neurosymbolic-da-results">checkpoints</a>
    </td>
  </tr>
  <tr style="border: none;">
    <td style="width: 35%; vertical-align: top; border: none; padding: 8px;">
      <img src="https://github.com/datvo06/VRDSynth/raw/main/assets/VRDSynth_Animation.gif" alt="VRDSynth" style="width:100%; height:auto; border-radius: 4px;">
    </td>
    <td style="vertical-align: top; border: none; padding: 8px;">
      <strong><a href="https://github.com/datvo06/VRDSynth">VRDSynth</a></strong> (ISSTA '24)<br>
      <em>Synthesizing programs for multilingual visually rich document information extraction.</em><br>
      <a href="https://github.com/datvo06/VRDSynth">code</a> · <a href="https://arxiv.org/abs/2407.06826">paper</a>
    </td>
  </tr>
  <tr style="border: none;">
    <td style="width: 35%; vertical-align: top; border: none; padding: 8px;">
      <div id="autumn-inline-wrapper" style="position: relative; width: 100%; aspect-ratio: 1; border-radius: 4px; overflow: hidden;">
        <canvas id="autumn-canvas" style="width: 100%; height: 100%; image-rendering: pixelated; image-rendering: crisp-edges; cursor: pointer; display: block;"></canvas>
      </div>
      <div style="margin-top: 6px; display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
        <select id="autumn-program-select" style="font-size: 11px; padding: 2px 4px; border-radius: 3px; border: 1px solid var(--global-divider-color, #dee2e6); background: var(--global-bg-color, #fff); color: var(--global-text-color, #000); max-width: 110px;"></select>
        <button id="autumn-reset" style="font-size: 11px; padding: 2px 6px; border-radius: 3px; border: 1px solid var(--global-divider-color, #dee2e6); background: var(--global-bg-color, #fff); color: var(--global-text-color, #000); cursor: pointer;">Reset</button>
        <button id="autumn-pause" style="font-size: 11px; padding: 2px 6px; border-radius: 3px; border: 1px solid var(--global-divider-color, #dee2e6); background: var(--global-bg-color, #fff); color: var(--global-text-color, #000); cursor: pointer;">Pause</button>
      </div>
    </td>
    <td style="vertical-align: top; border: none; padding: 8px;">
      <strong><a href="https://autumn.basis.ai">Autumn.cpp</a></strong><br>
      <em>An <a href="https://autumn.basis.ai">Autumn</a> interpreter in C++ for MARA. Try it live &larr;</em><br>
      <a href="https://github.com/BasisResearch/Autumn.cpp">code</a> · <a href="https://www.basis.ai/blog/autumn-platform-2025/">AutumnBench blog</a><br>
      <span style="font-size: 12px; color: var(--global-text-color-light, #666);">&darr; to spin droplet, click cloud &amp; sun to interact</span>
    </td>
  </tr>
  <tr style="border: none;">
    <td style="width: 35%; vertical-align: top; border: none; padding: 8px;">
      <img src="{{ '/assets/img/exopredicator_teaser.webp' | relative_url }}" alt="ExoPredicator" style="width:100%; height:auto; border-radius: 4px;">
    </td>
    <td style="vertical-align: top; border: none; padding: 8px;">
      <strong><a href="https://openreview.net/forum?id=a1zfcaNTkM">ExoPredicator</a></strong> (ICLR '26)<br>
      <em>Learning abstract models of dynamic worlds for robot planning.</em><br>
      <a href="https://arxiv.org/abs/2509.26255">paper</a> · <a href="https://openreview.net/forum?id=a1zfcaNTkM">openreview</a>
    </td>
  </tr>
  <tr style="border: none;">
    <td style="width: 35%; vertical-align: top; border: none; padding: 8px;">
      <img src="{{ '/assets/img/virda_teaser.webp' | relative_url }}" alt="VirDA" style="width:100%; height:auto; border-radius: 4px;">
    </td>
    <td style="vertical-align: top; border: none; padding: 8px;">
      <strong><a href="https://github.com/Duy-Nguyen-Duc/VirDA">VirDA</a></strong> (TMLR '25)<br>
      <em>Reusing backbone for unsupervised domain adaptation with visual reprogramming.</em><br>
      <a href="https://github.com/Duy-Nguyen-Duc/VirDA">code</a> · <a href="https://openreview.net/forum?id=Qh7or7JRFI">paper</a>
    </td>
  </tr>
  <tr style="border: none;">
    <td style="width: 35%; vertical-align: top; border: none; padding: 8px;">
      <img src="{{ '/assets/img/gnninfer_teaser.webp' | relative_url }}" alt="GNNInfer" style="width:100%; height:auto; border-radius: 4px;">
    </td>
    <td style="vertical-align: top; border: none; padding: 8px;">
      <strong>GNNInfer</strong> (ICSE '22, arXiv '24)<br>
      <em>Inferring properties of graph neural networks.</em><br>
      <a href="https://arxiv.org/abs/2401.03790">paper</a>
    </td>
  </tr>
  <tr style="border: none;">
    <td style="width: 35%; vertical-align: top; border: none; padding: 8px;">
      <img src="{{ '/assets/img/ffl_teaser.webp' | relative_url }}" alt="FFL" style="width:100%; height:auto; border-radius: 4px;">
    </td>
    <td style="vertical-align: top; border: none; padding: 8px;">
      <strong><a href="https://github.com/FFL2022/FFL">FFL</a></strong> (ICSME '22)<br>
      <em>Fine-grained fault localization for student programs via syntactic and semantic reasoning.</em><br>
      <a href="https://github.com/FFL2022/FFL">code</a> · <a href="https://soarsmu.github.io/papers/2022/ICSME_FFL.pdf">paper</a>
    </td>
  </tr>
</table>

<script type="module">
{% include autumn_player.js %}
</script>

---

### Positions

| Period | Role & Affiliation |
|--------|-------------------|
| **2025 -- present** | Post-doctoral Fellow, [Harvard SEAS](https://namin.seas.harvard.edu/) & [Basis Research Institute](https://basis.ai/) |
| **2021 -- 2024** | PhD, School of Computing & Information Systems, University of Melbourne (Melbourne Research Scholarship) |
| **2016 -- 2021** | AI Research Engineer, Cinnamon AI Lab |

---
