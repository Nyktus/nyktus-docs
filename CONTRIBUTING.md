# Contributing to the Nyktus documentation

Thank you for helping. The documentation is for people who run Nyktus or connect to it. Write for one reader and one goal per page.

## Before you start

- **Vulnerabilities** go through [SECURITY.md](SECURITY.md), never through public issues.
- **A wrong or missing statement** about how Nyktus behaves: open an issue or a pull request. If the behavior is the bug, the issue belongs into the [main repository](https://github.com/Nyktus/nyktus).
- **New pages and changes of the structure**: open an issue first and agree on the reader and the goal of the page.
- Follow the [Code of Conduct](https://github.com/Nyktus/nyktus/blob/main/CODE_OF_CONDUCT.md) of the project.

## Pull requests

- Keep a pull request focused. One topic, one pull request.
- The title follows [Conventional Commits](https://www.conventionalcommits.org/), such as `docs(honeytokens): explain the trigger address`. It becomes the commit message.
- Sign off every commit with `git commit -s`. This certifies the [Developer Certificate of Origin](https://developercertificate.org/).
- Run `npm run build` before you push. The build fails on a broken link or anchor.
- Describe what changed for the reader, and whether the page states anything about security.

The guidelines for writing are in [AGENTS.md](AGENTS.md); they apply to human authors as well.

## Releases

Merging a pull request does not publish the site. The release pull request does, see [DEPLOYMENT.md](DEPLOYMENT.md).
