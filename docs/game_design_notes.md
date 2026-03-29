# Game Design Notes – Sydney to Wollongong High-Speed Rail Construction Simulator

## 1) Game loop
Each quarter follows:
1. Planning: place tasks on timeline with dependency validation.
2. Execution: tasks progress, costs accrue, team occupancy updates.
3. Event: one weighted random event modifies cost/risk/morale/public/delay.
4. Review: plain-English explanation of critical path, float, and budget/risk shifts.

## 2) Recruitment system
- Two windows per in-game year (Q1 and Q3).
- Random pool of 8 candidates; player selects up to 3.
- Candidates have salary, passive skill, and emergency-only active skill.
- Active skills reduce negative event damage but never erase all consequences.

## 3) Stream system
Player selects one stream:
- Geotechnical
- Structural
- Transport
- Construction / Project Management
- Environmental / Planning

Effects:
- Discipline-weighted recruitment odds for stronger related candidates.
- Modest initial biases in risk, morale, and/or public acceptance.

## 4) Task system
- JSON-driven tasks with IDs, durations, costs, prerequisites, and team needs.
- Drag-and-drop task cards onto quarter cells.
- Invalid sequencing is blocked with explicit warnings.
- Team occupancy conflicts are checked for overlapping occupied resources.

## 5) Budget system
- Total budget is fixed for scenario start.
- Quarterly spend = active task burn + team salaries + event adjustments.
- Display shows total, spent, remaining, and staffing burn.

## 6) Event system
- Weighted random events with timing windows.
- NSW/Australian context: rainfall, heritage issues, approvals, WHS, funding, etc.
- Positive and negative events impact budget, risk, morale, public acceptance, and delays.

## 7) Review logic
Review panel explains:
- Which tasks became or ceased to be likely critical.
- Which delayed tasks appear to have float and limited end-date effect.
- Which delayed tasks likely delay completion due to longest dependency chain.
- Why budget moved this quarter.
- Current risk trend in plain English.

## 8) Scoring logic
Final score components:
- Time performance
- Budget performance
- Risk control
- Community/public acceptance
- Combined overall outcome

Possible endings:
- On time and under budget
- On time but over budget
- Delayed but technically successful
- Financially controlled but socially unpopular
- Best overall outcome
- Project failure

## 9) Future Electron packaging notes
- Keep renderer bundle static (`index.html`, `style.css`, `app.js`, `/data`, `/assets`).
- Add Electron `main.js` to open local index file.
- Optional preload API for save/load in future.
- Recommended next enhancements: save states, richer CPM graph view, animated map overlays.
