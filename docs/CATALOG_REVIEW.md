# Academic catalog migration

The release contains 35 entry/exit questions, 150 training questions, seven plans, 27 placement combinations, and nine distinct image assets. The original Markdown, workbook, and Word files remain in the repository for comparison.

## Approved placement correction

Manuel approved retaining plan D for Medium/Low/High, matching the previous importer's last-write result, and assigning plan E to the absent High/Medium/Medium combination. The generated catalog contains exactly one rule for each of the 27 combinations.

## Source normalization

- The first training Markdown file omitted original question 54 and numbered originals 55–57 as 54–56. Numbering was aligned with the original Word document, and the missing coin-group question was restored. Its numerical choices were expressed consistently as counts of individual coins. Question 56 is A and question 57 is C according to the original content.
- Training question 119 contained extraction commentary and an unrelated truncated question. The actual hardware/software argumentation question was recovered from the same source section.
- Training question 97's option D contradicted its own arithmetic. It now states that 45,000 steps over five days gives an average of 9,000.
- LaTeX delimiters were normalized, and image references were replaced with content-addressed Convex Storage assets.

The importer validates structural completeness, unique numbering, four labeled options, answer-key membership, plan membership, minima, and media presence. This is not a claim that every academic statement in all 185 questions has undergone independent subject-matter review. The question-content corrections should be included in La Salle's academic review.

## Placement and assessment behavior

Interpretation uses questions 1–12, Formulation 13–23, and Argumentation 24–35. Category levels retain the original thresholds: 0–4 low, 5–8 medium, and 9+ high. Entry and exit last 60 minutes; the server enforces and schedules the deadline. Training is untimed. Exit unlocks after the plan's minimum number of distinct answered questions. Scoring uses the questions assigned to the attempt, with blanks counted as incorrect.
