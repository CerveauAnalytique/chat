/** OpenNebula VM LCM / state helpers used by the portal */

export type VmPowerAction =
  | 'resume'
  | 'stop'
  | 'suspend'
  | 'poweroff'
  | 'poweroff-hard'
  | 'reboot'
  | 'reboot-hard'
  | 'undeploy'
  | 'undeploy-hard'
  | 'terminate'
  | 'terminate-hard'
  | 'hold'
  | 'release'

export type VmStatus =
  | 'pending'
  | 'hold'
  | 'active'
  | 'stopped'
  | 'suspended'
  | 'done'
  | 'failed'
  | 'poweroff'
  | 'undeployed'
  | 'cloning'
  | 'unknown'

export interface CloudRegion {
  id: string
  name: string
  slug: string
  location: string
  flag?: string
  /** OpenNebula cluster id */
  clusterId?: number
  /** Default VNET id for public IPv4 */
  networkId?: number
  /** System datastore (Ceph/ZFS) */
  datastoreId?: number
  available: boolean
}

export interface CloudPlan {
  id: string
  name: string
  slug: string
  description?: string
  vcpus: number
  memoryMb: number
  diskGb: number
  transferTb?: number
  priceMonthlyCents: number
  currency: string
  /** OpenNebula VM template id */
  templateId: number
  regionIds?: string[]
  featured?: boolean
}

export interface SshKeyInput {
  name: string
  publicKey: string
}

export interface CreateVmInput {
  name: string
  plan: Pick<CloudPlan, 'vcpus' | 'memoryMb' | 'diskGb' | 'templateId'>
  region: Pick<CloudRegion, 'networkId' | 'datastoreId' | 'clusterId' | 'slug'>
  sshKeys?: SshKeyInput[]
  imageId?: number
  userData?: string
  labels?: Record<string, string>
}

export interface CloudVm {
  id: number
  name: string
  status: VmStatus
  state: number
  lcmState: number
  vcpus: number
  memoryMb: number
  diskGb?: number
  ips: string[]
  region?: string
  hypervisor: 'kvm'
  storageBackend?: 'ceph' | 'zfs' | 'local' | 'unknown'
  createdAt?: string
  templateId?: number
  raw?: unknown
}

export interface CloudHost {
  id: number
  name: string
  state: number
  imMad: string
  vmMad: string
  cpuUsage?: number
  memUsage?: number
}

export interface CloudDatastore {
  id: number
  name: string
  type: string
  tmMad: string
  dsMad: string
  freeMb?: number
  totalMb?: number
  backend: 'ceph' | 'zfs' | 'local' | 'unknown'
}

export interface OpenNebulaClientOptions {
  /** XML-RPC endpoint, e.g. http://one.example:2633/RPC2 */
  endpoint: string
  /** Session string: "user:password" or "user:token" */
  session: string
  /** Request timeout in ms */
  timeoutMs?: number
  /** When true (or endpoint empty), use in-memory demo backend */
  demo?: boolean
  fetchImpl?: typeof fetch
}

export interface AuthTokenOptions {
  user: string
  password: string
  /** Token lifetime in seconds */
  expire?: number
}

/** Future auth SDK surface (API keys, OAuth device flow, scoped tokens) */
export interface AuthSdkSurface {
  createSession(user: string, password: string): Promise<string>
  createLoginToken(options: AuthTokenOptions): Promise<string>
  validateSession(session: string): Promise<boolean>
}

/** Future server system software / guest agent surface */
export interface ServerAgentSurface {
  ping(host: string, token: string): Promise<{ ok: boolean; version?: string }>
  exec(host: string, token: string, command: string): Promise<{ stdout: string; code: number }>
  installStack(host: string, token: string, stack: string): Promise<{ jobId: string }>
}
