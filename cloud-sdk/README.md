# @lsky/cloud-sdk

TypeScript SDK for **lsky CLOUD** — OpenNebula orchestration over **KVM**, with **Ceph/ZFS** datastores, plus reserved surfaces for a future **auth SDK** and **server system software** (`lsky-agent`).

```
Lsky Portal (Next.js + Payload)
        │
        ▼
  @lsky/cloud-sdk
        │
        ▼
    OpenNebula XML-RPC
   ┌────┼────┐
  KVM  Ceph  VLAN/VXLAN
```

## Install

This package lives in the monorepo at `packages/cloud-sdk` and is consumed by the portal as `@lsky/cloud-sdk`.

## Quick start

```ts
import { createCloudClient, DEFAULT_PLANS, DEFAULT_REGIONS } from '@lsky/cloud-sdk'

const cloud = createCloudClient() // reads OPENNEBULA_* env; falls back to demo mode

const caps = await cloud.capabilities()
// { mode: 'demo' | 'live', hypervisor: 'kvm', storage: ['ceph', ...], ... }

const vm = await cloud.createVm({
  name: 'api-1',
  plan: DEFAULT_PLANS[1]!,
  region: DEFAULT_REGIONS[0]!,
  sshKeys: [{ name: 'laptop', publicKey: 'ssh-ed25519 AAAA...' }],
})

await cloud.action(vm.id, 'reboot')
```

## Environment

| Variable | Description |
| --- | --- |
| `OPENNEBULA_RPC_URL` | XML-RPC endpoint (`http://one:2633/RPC2`) |
| `OPENNEBULA_USER` | API user (default `oneadmin`) |
| `OPENNEBULA_TOKEN` / `OPENNEBULA_PASSWORD` | Password or token |
| `OPENNEBULA_SESSION` | Full `user:secret` session (optional) |
| `OPENNEBULA_DEMO` | Force demo mode (`true`) |

When the endpoint/session is missing, the SDK runs an in-memory **demo backend** so the portal works without a live cluster.

## Future packages

- `cloud.auth` — API keys, scoped tokens, device login
- `cloud.agent` — guest agent for Docker/sites/DB/firewall (control panel)
