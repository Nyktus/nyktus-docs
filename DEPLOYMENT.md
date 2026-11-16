# Deployment

docs.nyktus.org is published by a release, not by a merge. A change on `main` goes live only after the release pull request that [release-please](https://github.com/googleapis/release-please) keeps open has been merged:

1. Every merge to `main` updates the release pull request, which holds the next version and the changelog ([release-please.yml](.github/workflows/release-please.yml)).
2. Merging it creates the tag `nyktus-docs-vX.Y.Z` and a GitHub release.
3. The tag starts [release.yml](.github/workflows/release.yml). It checks that the tag is on `main`, runs `npm run build` and uploads `.vitepress/dist` to Hetzner Webhosting over SFTP.

The upload mirrors the folder: files that are no longer in the build are deleted on the server, except `.well-known/`. The `.htaccess` comes from `src/public/` and switches on the clean URLs of the site, which Apache does not serve by itself.

The version of the documentation is the version of the Nyktus server that it documents, `data/releases.json` names it. The sync pull request ends with `Release-As: X.Y.Z` for that version, so merging it makes the release pull request propose it. Two checks keep the rule: the check "Version of Nyktus" fails a release pull request with another version, and the release workflow refuses a tag that is not `nyktus-docs-v` and the version in `data/releases.json`. A docs-only change after a release therefore waits for the next release of Nyktus; to publish it sooner, run the workflow "Release" on `main` by hand (Actions, Run workflow), which builds and uploads `main` without a version.

## Releases of Nyktus

Pages name the versions of the server and the sensor with a placeholder, which the build fills from `data/releases.json`, the copy of the release manifest of the main repository. Once a day, [sync.yml](.github/workflows/sync.yml) looks for a new release of either. It then opens a pull request that moves the pin in `sync.json` to the release commit, which also brings the API reference and the catalog of that release. Merging the pull request, whose commit and description end with `Release-As: <version of the server>`, leads to the release pull request of the documentation with that version. Keep that line when you squash. Actions, "Sync with the main repository", Run workflow, does the same at once.

## One-time setup

**The release pull request** needs a GitHub App token, because what the default token creates starts no workflow. The app of the main repository works: install it on this repository too (contents and pull requests: write), then store its client ID as the variable `RELEASE_APP_CLIENT_ID` and its private key as the secret `RELEASE_APP_PRIVATE_KEY`.

**The upload** needs, in the environment `production` that only `main` and release tags reach, the secrets `HETZNER_SFTP_HOST`, `HETZNER_SFTP_USER`, `HETZNER_SFTP_KEY` (the private key of a pair that only the pipelines use) and `HETZNER_SFTP_KNOWN_HOSTS`, and `DEPLOY_PATH`, as a variable or a secret. The setup of the key and of the host key is the same as for the landing page; its `DEPLOYMENT.md` has the steps. In short, for the host key:

```sh
ssh-keyscan -p 22 www123.your-server.de > known_hosts
ssh-keygen -lf known_hosts
gh secret set HETZNER_SFTP_KNOWN_HOSTS --env production < known_hosts
```

Hetzner publishes no fingerprints for web hosting. Read the keys from two networks and continue only if they match. If the SFTP port is not 22, set the variable `SFTP_PORT` and pass `-p` to `ssh-keyscan`.

**The folder.** The documentation is a subdomain of the package that also holds the landing page. In konsoleH, under Settings, Subdomains, create `docs.nyktus.org` with the target directory `docs`; Hetzner creates it as `public_html/docs`. Set `DEPLOY_PATH` to `public_html/docs`. The workflow refuses any path that is not a subfolder of `public_html`, because the landing page lives in `public_html` itself and a mirror of that folder would delete it. The landing page keeps this folder with its variable `DEPLOY_KEEP=docs/`.

A new subdomain can take up to 24 hours to resolve.

## Try it without publishing

Actions, Release, Run workflow, with "List what an upload would change" checked. The run builds `main` and lists every file it would upload and delete, and changes nothing. Do this once before the first release, and check that nothing outside the documentation is on the list.
