import type { VmStatus } from './types'

/** OpenNebula VM states (one.vm.info STATE) */
export const ONE_VM_STATE = {
  INIT: 0,
  PENDING: 1,
  HOLD: 2,
  ACTIVE: 3,
  STOPPED: 4,
  SUSPENDED: 5,
  DONE: 6,
  FAILED: 7,
  POWEROFF: 8,
  UNDEPLOYED: 9,
  CLONING: 10,
  CLONING_FAILURE: 11,
} as const

export function mapVmStatus(state: number, _lcmState?: number): VmStatus {
  switch (state) {
    case ONE_VM_STATE.PENDING:
    case ONE_VM_STATE.INIT:
      return 'pending'
    case ONE_VM_STATE.HOLD:
      return 'hold'
    case ONE_VM_STATE.ACTIVE:
      return 'active'
    case ONE_VM_STATE.STOPPED:
      return 'stopped'
    case ONE_VM_STATE.SUSPENDED:
      return 'suspended'
    case ONE_VM_STATE.DONE:
      return 'done'
    case ONE_VM_STATE.FAILED:
    case ONE_VM_STATE.CLONING_FAILURE:
      return 'failed'
    case ONE_VM_STATE.POWEROFF:
      return 'poweroff'
    case ONE_VM_STATE.UNDEPLOYED:
      return 'undeployed'
    case ONE_VM_STATE.CLONING:
      return 'cloning'
    default:
      return 'unknown'
  }
}

export function buildVmTemplate(input: {
  name: string
  vcpus: number
  memoryMb: number
  diskGb: number
  imageId?: number
  networkId?: number
  sshKeys?: Array<{ publicKey: string }>
  userData?: string
  labels?: Record<string, string>
}): string {
  const lines: string[] = [
    `NAME="${escapeAttr(input.name)}"`,
    `CPU="${input.vcpus}"`,
    `VCPU="${input.vcpus}"`,
    `MEMORY="${input.memoryMb}"`,
    'HYPERVISOR="kvm"',
  ]

  if (input.imageId != null) {
    lines.push(`DISK=[ IMAGE_ID="${input.imageId}", SIZE="${input.diskGb * 1024}" ]`)
  } else {
    lines.push(`DISK=[ SIZE="${input.diskGb * 1024}", TYPE="fs", FORMAT="qcow2", DEV_PREFIX="vd" ]`)
  }

  if (input.networkId != null) {
    lines.push(`NIC=[ NETWORK_ID="${input.networkId}" ]`)
  }

  if (input.sshKeys?.length) {
    const keys = input.sshKeys.map((k) => k.publicKey.trim()).join('\\n')
    lines.push(`CONTEXT=[ NETWORK="YES", SSH_PUBLIC_KEY="${escapeAttr(keys)}" ]`)
  } else {
    lines.push('CONTEXT=[ NETWORK="YES" ]')
  }

  if (input.userData) {
    lines.push(`USER_DATA="${escapeAttr(input.userData)}"`)
  }

  if (input.labels) {
    for (const [key, value] of Object.entries(input.labels)) {
      lines.push(`LABELS_${escapeAttr(key.toUpperCase())}="${escapeAttr(value)}"`)
    }
  }

  return `${lines.join('\n')}\n`
}

function escapeAttr(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}
