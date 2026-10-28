# Nyktus documentation

Source of [docs.nyktus.org](https://docs.nyktus.org), the documentation of [Nyktus](https://github.com/Nyktus/nyktus): a self-hosted platform that deploys honeytokens and honeypots to detect intruders, insider threats, data breaches and misconfigured systems.

> [!IMPORTANT]
> The documentation describes Nyktus 0.1, the first release.

## Build the site

You need Node.js (the version in `.node-version`) and npm.

```sh
npm ci
npm run dev      # development server with live reload
npm run build    # strict production build, then the check of internal links and anchors
npm run preview  # serve the production build
```

## Contributing

Corrections and additions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first. Changes to the behavior of Nyktus belong into the [main repository](https://github.com/Nyktus/nyktus), together with the matching change of this documentation.

## Security

Please do not report vulnerabilities through public issues. See [SECURITY.md](SECURITY.md).

## License

The text is licensed under [CC BY-SA 4.0](LICENSES/CC-BY-SA-4.0.txt), the code that builds the site under the [GNU Affero General Public License v3.0 or later](LICENSES/AGPL-3.0-or-later.txt). [LICENSE](LICENSE) says which applies where.

MITRE, ATT&CK and MITRE Engage are trademarks of The MITRE Corporation. Nyktus is not affiliated with or endorsed by MITRE.
