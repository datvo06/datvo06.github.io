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
news: false           # rendered inline below (above Technical blogs)
selected_papers: true # show papers with selected={true}
social: true          # show social icons
service:              # rendered below Selected Publications
  - venue: ICML
    year: 2026
    role: Reviewer
  - venue: NeurIPS
    year: 2026
    role: Reviewer
  - venue: AAAI
    year: 2026
    role: PC Member / Reviewer
---

### Short bio
I am a **Joint Postdoctoral Fellow** at [Harvard's Programming Languages and Formal Methods groups](https://pl.seas.harvard.edu/) and the [Basis Research Institute](https://www.basis.ai/about/).

I am boardly interested in the the modeling of how we perceive the world, and the modeling of reasoning processes. To support this goal, I work in the emerging area between programming language, machine learning, and probabilistic programming language.

At Basis, I work on modeling uncertainty in symbolic world models in [MARA](https://www.basis.ai/projects/mara/), designing a robot design language that captures both morphology and control in [R-ADA](https://www.basis.ai/projects/r-ada/), and modeling LLM generation as an effect, as a framework for building agent harnesses, in [effectful](https://github.com/BasisResearch/effectful). At Harvard, I work on proof automation in Lean and causal systems for drug repurposing.

I completed my PhD doing machine learning and program synthesis-based debugging at the [University of Melbourne](https://cis.unimelb.edu.au/) and previously worked at **Cinnamon AI Lab** on visually rich document information extraction.

### Research interests
- World models: learning, evaluation, and uncertainty
- Languages and abstractions for robot design and LLM agents
- Program synthesis and probabilistic programming
- Neuro-symbolic systems modeled with LLMs, PPLs, and NNs
- Reliable, explainable ML for software, including graph-based learning for code and documents

{% include news.html %}

### [Technical blogs]({{ '/blog/' | relative_url }})
- [WorldTest: how do we know whether an AI has learned how a world works?]({{ '/blog/2026/worldtest-talk/' | relative_url }}). My TAIC'26 talk, linearized into a story, with live environments you can play.
- [Grammars that generalize]({{ '/blog/2026/neurosymbolic-dg/' | relative_url }}). Duy and I combined a small grammar with a neural network so bird recognition survives domain shift.
- [Bayesian Synthesis]({{ '/blog/2026/bayesian-synthesis/' | relative_url }}). Synthesizing probabilistic programs that model data automatically. I reproduced part of it.

### Project demos

<table style="border: none; border-collapse: collapse;">
  <tr style="border: none;">
    <td style="width: 35%; vertical-align: top; border: none; padding: 8px;">
      <img src="https://github.com/datvo06/NeuroSymbolicDG/raw/main/assets/thumbnail.png" alt="NeuroSymbolicDG" style="width:100%; height:auto; border-radius: 4px;">
    </td>
    <td style="vertical-align: top; border: none; padding: 8px;">
      <strong><a href="https://github.com/datvo06/NeuroSymbolicDG">NeuroSymbolicDG</a></strong><br>
      <em>Domain-invariant classifier head for fine-grained bird recognition, via a PCFG over spatial layouts.</em><br>
      <a href="https://github.com/datvo06/NeuroSymbolicDG">code</a> · <a href="https://arxiv.org/abs/2605.06043">paper</a> · <a href="{{ '/blog/2026/neurosymbolic-dg/' | relative_url }}">blog</a> · <a href="https://huggingface.co/datvo06/neurosymbolic-da-results">checkpoints</a>
    </td>
  </tr>
  <tr style="border: none;">
    <td style="width: 35%; vertical-align: top; border: none; padding: 8px;">
      <img src="{{ '/assets/img/worldtest_talk/autumnbench_showcase_tall.gif' | relative_url }}" alt="AutumnBench environments running live" style="width:100%; height:auto; border-radius: 4px;">
    </td>
    <td style="vertical-align: top; border: none; padding: 8px;">
      <strong><a href="https://autumn.basis.ai">Autumn.cpp</a></strong> (ICML '26)<br>
      <em><a href="https://autumn.basis.ai">Autumn</a> interpreter in C++. Powers MARA and AutumnBench. Try it live in the <a href="{{ '/playground/' | relative_url }}">playground</a>.</em><br>
      <a href="https://github.com/BasisResearch/Autumn.cpp">code</a> · <a href="https://arxiv.org/abs/2510.19788">AutumnBench paper</a> · <a href="https://www.basis.ai/blog/autumn-platform-2025/">blog</a> · <a href="{{ '/playground/' | relative_url }}">playground</a>
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
      <img src="https://github.com/datvo06/VRDSynth/raw/main/assets/VRDSynth_Animation.gif" alt="VRDSynth" style="width:100%; height:auto; border-radius: 4px;">
    </td>
    <td style="vertical-align: top; border: none; padding: 8px;">
      <strong><a href="https://github.com/datvo06/VRDSynth">VRDSynth</a></strong> (ISSTA '24)<br>
      <em>Program synthesis for multilingual document information extraction.</em><br>
      <a href="https://github.com/datvo06/VRDSynth">code</a> · <a href="https://arxiv.org/abs/2407.06826">paper</a>
    </td>
  </tr>
  <tr style="border: none;">
    <td style="width: 35%; vertical-align: top; border: none; padding: 8px;">
      <img src="{{ '/assets/img/virda_teaser.webp' | relative_url }}" alt="VirDA" style="width:100%; height:auto; border-radius: 4px;">
    </td>
    <td style="vertical-align: top; border: none; padding: 8px;">
      <strong><a href="https://github.com/Duy-Nguyen-Duc/VirDA">VirDA</a></strong> (TMLR '25)<br>
      <em>Unsupervised domain adaptation by reusing the backbone with visual reprogramming.</em><br>
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
      <em>Fine-grained fault localization for student programs.</em><br>
      <a href="https://github.com/FFL2022/FFL">code</a> · <a href="https://soarsmu.github.io/papers/2022/ICSME_FFL.pdf">paper</a>
    </td>
  </tr>
</table>

---

### Positions

<div class="timeline">
  <div class="timeline-item">
    <div class="timeline-when">2025 to present</div>
    <div class="timeline-what">
      <div class="timeline-role">Joint Post-doctoral Fellow</div>
      <div class="timeline-where"><a href="https://namin.seas.harvard.edu/">Harvard SEAS</a> &amp; <a href="https://basis.ai/">Basis Research Institute</a></div>
    </div>
  </div>
  <div class="timeline-item">
    <div class="timeline-when">2021 to 2024</div>
    <div class="timeline-what">
      <div class="timeline-role">PhD, School of Computing &amp; Information Systems</div>
      <div class="timeline-where">University of Melbourne &middot; Melbourne Research Scholarship</div>
    </div>
  </div>
  <div class="timeline-item">
    <div class="timeline-when">2016 to 2021</div>
    <div class="timeline-what">
      <div class="timeline-role">AI Research Engineer</div>
      <div class="timeline-where">Cinnamon AI Lab</div>
    </div>
  </div>
</div>

---
