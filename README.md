# SkillPath

A lightweight, client-side skill assessment experience. Learners can check a skill, see a four-band proficiency estimate, track retakes, and open short lessons matched to their result.

## Run locally

The app has no build step or runtime dependencies. From the repository root, serve the files over HTTP:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173`. Assessment results and completed lessons are stored in the browser's local storage; they are not synced to an account or server.

## Configure skills and content

Add or edit entries in `src/catalog.js`. Each skill defines its category, questions, answer keys, proficiency thresholds, and local learning resources. Resources include short takeaways and a practice prompt, so the recommendations work without an external content provider. The assessment and progress UI uses the catalog data rather than skill-specific branching.

The proficiency bands are defined in `src/catalog.js`; each skill can set its own `levelThresholds` for `Beginner`, `Developing`, `Proficient`, and `Advanced`.

## Tests

With Node.js installed, run:

```sh
npm test
```
