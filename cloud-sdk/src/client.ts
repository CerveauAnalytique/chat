import { DemoOpenNebulaBackend } from './demo'
import type {
  AuthSdkSurface,
  AuthTokenOptions,
  CloudDatastore,
  CloudHost,
  CloudVm,
  CreateVmInput,
  OpenNebulaClientOptions,
  ServerAgentSurface,
  VmPowerAction,
} from './types'
import { buildVmTemplate, mapVmStatus } from './vm-state'
import { xmlRpcCall } from './xmlrpc'

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function detectStorageBackend(tmMad: string, dsMad: string): CloudDatastore['backend'] {
  const hay = `${tmMad} ${dsMad}`.toLowerCase()
  if (hay.includes('ceph')) return 'ceph'
  if (hay.includes('zfs')) return 'zfs'
  if (hay.includes('fs') || hay.includes('ssh') || hay.includes('shared')) return 'local'
  return 'unknown'
}

function extractIps(template: Record<string, unknown>): string[] {
  const ips: string[] = []
  const nics = template.NIC
  const list = Array.isArray(nics) ? nics : nics ? [nics] : []
  for (const nic of list) {
    const rec = asRecord(nic)
    const ip = asString(rec.IP || rec.IP6 || rec.EXTERNAL_IP)
    if (ip) ips.push(ip)
  }
  return ips
}

function parseVmXmlInfo(xmlOrStruct: unknown): CloudVm {
  // OpenNebula returns XML string from one.vm.info
  if (typeof xmlOrStruct === 'string') {
    const id = Number(xmlOrStruct.match(/<ID>(\d+)<\/ID>/)?.[1] || 0)
    const name = xmlOrStruct.match(/<NAME>([^<]+)<\/NAME>/)?.[1] || `vm-${id}`
    const state = Number(xmlOrStruct.match(/<STATE>(\d+)<\/STATE>/)?.[1] || 0)
    const lcmState = Number(xmlOrStruct.match(/<LCM_STATE>(\d+)<\/LCM_STATE>/)?.[1] || 0)
    const memory = Number(xmlOrStruct.match(/<MEMORY>(\d+)<\/MEMORY>/)?.[1] || 0)
    const cpu = Number(xmlOrStruct.match(/<CPU>([0-9.]+)<\/CPU>/)?.[1] || 0)
    const vcpu = Number(xmlOrStruct.match(/<VCPU>(\d+)<\/VCPU>/)?.[1] || cpu || 1)
    const ips = Array.from(xmlOrStruct.matchAll(/<IP>([^<]+)<\/IP>/g)).map((m) => m[1]!)
    return {
      id,
      name,
      status: mapVmStatus(state, lcmState),
      state,
      lcmState,
      vcpus: vcpu || Math.max(1, Math.round(cpu)),
      memoryMb: memory,
      ips,
      hypervisor: 'kvm',
      storageBackend: 'unknown',
      raw: xmlOrStruct,
    }
  }

  const rec = asRecord(xmlOrStruct)
  const vm = asRecord(rec.VM || rec)
  const template = asRecord(vm.TEMPLATE)
  const state = asNumber(vm.STATE)
  const lcmState = asNumber(vm.LCM_STATE)
  return {
    id: asNumber(vm.ID),
    name: asString(vm.NAME, `vm-${asNumber(vm.ID)}`),
    status: mapVmStatus(state, lcmState),
    state,
    lcmState,
    vcpus: asNumber(template.VCPU || template.CPU, 1),
    memoryMb: asNumber(template.MEMORY || vm.MEMORY),
    ips: extractIps(template),
    hypervisor: 'kvm',
    storageBackend: 'unknown',
    raw: xmlOrStruct,
  }
}

export class OpenNebulaClient {
  readonly endpoint: string
  readonly session: string
  readonly demo: boolean
  private readonly timeoutMs: number
  private readonly fetchImpl?: typeof fetch
  private readonly demoBackend = new DemoOpenNebulaBackend()

  /** Auth helpers — expand into a dedicated auth SDK later */
  readonly auth: AuthSdkSurface

  /** Guest/server agent stubs — expand into system software later */
  readonly agent: ServerAgentSurface

  constructor(options: OpenNebulaClientOptions) {
    this.endpoint = options.endpoint
    this.session = options.session
    this.timeoutMs = options.timeoutMs ?? 30_000
    this.fetchImpl = options.fetchImpl
    this.demo = Boolean(options.demo || !options.endpoint)

    this.auth = {
      createSession: async (user, password) => `${user}:${password}`,
      createLoginToken: async (opts: AuthTokenOptions) => {
        if (this.demo) {
          return `${opts.user}:demo-token-${opts.expire ?? 3600}`
        }
        const result = await this.call('one.user.login', [
          opts.user,
          opts.password,
          '',
          -1,
          opts.expire ?? 3600,
        ])
        return `${opts.user}:${String(result)}`
      },
      validateSession: async (session) => {
        if (this.demo) return session.includes(':')
        try {
          await this.call('one.userinfo', [-1])
          return Boolean(session)
        } catch {
          return false
        }
      },
    }

    this.agent = {
      ping: async () => ({
        ok: false,
        version: undefined,
      }),
      exec: async () => {
        throw new Error('Server agent not installed on this droplet yet')
      },
      installStack: async (_host, _token, stack) => ({
        jobId: `pending-${stack}`,
      }),
    }
  }

  static fromEnv(
    env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
  ): OpenNebulaClient {
    const endpoint = env.OPENNEBULA_RPC_URL || env.ONE_XMLRPC || ''
    const user = env.OPENNEBULA_USER || 'oneadmin'
    const token = env.OPENNEBULA_TOKEN || env.OPENNEBULA_PASSWORD || ''
    const session = env.OPENNEBULA_SESSION || (token ? `${user}:${token}` : '')
    const demo = env.OPENNEBULA_DEMO === 'true' || !endpoint || !session

    return new OpenNebulaClient({
      endpoint,
      session,
      demo,
      timeoutMs: env.OPENNEBULA_TIMEOUT_MS ? Number(env.OPENNEBULA_TIMEOUT_MS) : undefined,
    })
  }

  private async call(method: string, params: unknown[]): Promise<unknown> {
    if (this.demo) {
      throw new Error(`Demo mode cannot call ${method}`)
    }

    const response = await xmlRpcCall(this.endpoint, method, [this.session, ...params], {
      timeoutMs: this.timeoutMs,
      fetchImpl: this.fetchImpl,
    })

    const success = Boolean(response[0])
    if (!success) {
      const message = typeof response[1] === 'string' ? response[1] : 'OpenNebula API error'
      const code = response[2]
      throw new Error(code != null ? `${message} (code ${code})` : message)
    }
    return response[1]
  }

  async listVms(filterUser = -2): Promise<CloudVm[]> {
    if (this.demo) return this.demoBackend.listVms()

    // filterUser -2 = all VMs user can see; start=-1 end=-1 state=-1
    const xml = await this.call('one.vmpool.info', [filterUser, -1, -1, -1])
    if (typeof xml !== 'string') return []

    const blocks = xml.split(/<VM>/).slice(1)
    return blocks.map((block) => parseVmXmlInfo(`<VM>${block.split('</VM>')[0]}</VM>`))
  }

  async getVm(id: number): Promise<CloudVm> {
    if (this.demo) return this.demoBackend.getVm(id)
    const xml = await this.call('one.vm.info', [id])
    return parseVmXmlInfo(xml)
  }

  async createVm(input: CreateVmInput): Promise<CloudVm> {
    if (this.demo) return this.demoBackend.createVm(input)

    const extra = buildVmTemplate({
      name: input.name,
      vcpus: input.plan.vcpus,
      memoryMb: input.plan.memoryMb,
      diskGb: input.plan.diskGb,
      imageId: input.imageId,
      networkId: input.region.networkId,
      sshKeys: input.sshKeys,
      userData: input.userData,
      labels: {
        region: input.region.slug,
        ...input.labels,
      },
    })

    const vmId = asNumber(
      await this.call('one.template.instantiate', [
        input.plan.templateId,
        input.name,
        false,
        extra,
        false,
      ]),
    )

    return this.getVm(vmId)
  }

  async allocateVm(input: CreateVmInput): Promise<CloudVm> {
    if (this.demo) return this.demoBackend.createVm(input)

    const template = buildVmTemplate({
      name: input.name,
      vcpus: input.plan.vcpus,
      memoryMb: input.plan.memoryMb,
      diskGb: input.plan.diskGb,
      imageId: input.imageId,
      networkId: input.region.networkId,
      sshKeys: input.sshKeys,
      userData: input.userData,
      labels: input.labels,
    })

    const vmId = asNumber(await this.call('one.vm.allocate', [template, false]))
    return this.getVm(vmId)
  }

  async action(id: number, action: VmPowerAction): Promise<CloudVm> {
    if (this.demo) return this.demoBackend.action(id, action)
    await this.call('one.vm.action', [action, id])
    if (action === 'terminate' || action === 'terminate-hard') {
      return {
        id,
        name: `vm-${id}`,
        status: 'done',
        state: 6,
        lcmState: 0,
        vcpus: 0,
        memoryMb: 0,
        ips: [],
        hypervisor: 'kvm',
      }
    }
    return this.getVm(id)
  }

  async listHosts(): Promise<CloudHost[]> {
    if (this.demo) return this.demoBackend.listHosts()
    const xml = await this.call('one.hostpool.info', [])
    if (typeof xml !== 'string') return []
    const blocks = xml.split(/<HOST>/).slice(1)
    return blocks.map((block) => {
      const chunk = block.split('</HOST>')[0] || ''
      return {
        id: Number(chunk.match(/<ID>(\d+)<\/ID>/)?.[1] || 0),
        name: chunk.match(/<NAME>([^<]+)<\/NAME>/)?.[1] || 'host',
        state: Number(chunk.match(/<STATE>(\d+)<\/STATE>/)?.[1] || 0),
        imMad: chunk.match(/<IM_MAD>([^<]+)<\/IM_MAD>/)?.[1] || 'kvm',
        vmMad: chunk.match(/<VM_MAD>([^<]+)<\/VM_MAD>/)?.[1] || 'kvm',
      }
    })
  }

  async listDatastores(): Promise<CloudDatastore[]> {
    if (this.demo) return this.demoBackend.listDatastores()
    const xml = await this.call('one.datastorepool.info', [])
    if (typeof xml !== 'string') return []
    const blocks = xml.split(/<DATASTORE>/).slice(1)
    return blocks.map((block) => {
      const chunk = block.split('</DATASTORE>')[0] || ''
      const tmMad = chunk.match(/<TM_MAD>([^<]+)<\/TM_MAD>/)?.[1] || ''
      const dsMad = chunk.match(/<DS_MAD>([^<]+)<\/DS_MAD>/)?.[1] || ''
      return {
        id: Number(chunk.match(/<ID>(\d+)<\/ID>/)?.[1] || 0),
        name: chunk.match(/<NAME>([^<]+)<\/NAME>/)?.[1] || 'datastore',
        type: chunk.match(/<TYPE>([^<]+)<\/TYPE>/)?.[1] || '',
        tmMad,
        dsMad,
        freeMb: Number(chunk.match(/<FREE_MB>(\d+)<\/FREE_MB>/)?.[1] || 0),
        totalMb: Number(chunk.match(/<TOTAL_MB>(\d+)<\/TOTAL_MB>/)?.[1] || 0),
        backend: detectStorageBackend(tmMad, dsMad),
      }
    })
  }

  /** Health / capability probe for the portal */
  async capabilities(): Promise<{
    mode: 'live' | 'demo'
    hypervisor: 'kvm'
    storage: Array<'ceph' | 'zfs' | 'local' | 'unknown'>
    hosts: number
    datastores: number
  }> {
    const [hosts, datastores] = await Promise.all([this.listHosts(), this.listDatastores()])
    return {
      mode: this.demo ? 'demo' : 'live',
      hypervisor: 'kvm',
      storage: Array.from(new Set(datastores.map((d) => d.backend))),
      hosts: hosts.length,
      datastores: datastores.length,
    }
  }
}

export function createCloudClient(
  options?: Partial<OpenNebulaClientOptions> & { env?: Record<string, string | undefined> },
): OpenNebulaClient {
  if (!options || (!options.endpoint && !options.session)) {
    return OpenNebulaClient.fromEnv(options?.env)
  }
  return new OpenNebulaClient({
    endpoint: options.endpoint || '',
    session: options.session || '',
    demo: options.demo,
    timeoutMs: options.timeoutMs,
    fetchImpl: options.fetchImpl,
  })
}
