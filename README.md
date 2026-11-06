# dmbridge

[![version](https://img.shields.io/badge/version-2.4.1-blue)](package.json)
[![release](https://github.com/twocentinc/dmbridge/actions/workflows/release.yml/badge.svg)](https://github.com/twocentinc/dmbridge/actions/workflows/release.yml)
[![docs](https://img.shields.io/badge/docs-twocents-blue)](https://twocentinc.github.io/oss/docs/dmbridge/)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Give your agents one command-line interface for direct messages across social
platforms.

dmbridge is free and open source. It runs entirely on your machine and talks
directly to X and Instagram—no dmbridge-hosted middleman and no subscription.

**[Read the documentation](https://twocentinc.github.io/oss/docs/dmbridge/)** ·
[Download the latest release](https://github.com/twocentinc/dmbridge/releases/latest) ·
[Read the agent guide](https://twocentinc.github.io/oss/docs/dmbridge/agents/)

## Start here

- [Install dmbridge and connect an account](https://twocentinc.github.io/oss/docs/dmbridge/getting-started/)
- [Set up X](https://twocentinc.github.io/oss/docs/dmbridge/providers/x/)
- [Set up Instagram](https://twocentinc.github.io/oss/docs/dmbridge/providers/instagram/)
- [Try the five-minute X workflow](https://twocentinc.github.io/oss/docs/dmbridge/workflow/)
- [Browse the CLI reference](https://twocentinc.github.io/oss/docs/dmbridge/reference/cli/)
- [Browse the JSON schemas](https://twocentinc.github.io/oss/docs/dmbridge/reference/schemas/)
- [Develop and test dmbridge](https://twocentinc.github.io/oss/docs/dmbridge/contributing/development/)

Use `dmbridge --help` for command discovery and `doctor --schema <name>` for
machine-readable request and result contracts.

OAuth credentials normally refresh automatically. Integrations that own the
refresh-token lifecycle can instead import a complete X credential with
`refreshMode: "external"`; dmbridge will use it without refreshing it. See the
[X provider guide](https://twocentinc.github.io/oss/docs/dmbridge/providers/x/#externally-managed-oauth-credentials).

## License

MIT
