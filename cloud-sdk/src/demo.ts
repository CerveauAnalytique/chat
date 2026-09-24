import type { CloudDatastore, CloudHost, CloudVm, CreateVmInput, VmPowerAction } from './types'
import { mapVmStatus, ONE_VM_STATE } from './vm-state'

let nextId = 100

const demoVms = new Map<number, CloudVm>([
  [
    1,
    {
      id: 1,
      name: 'lsky-vps-ams-01',
      status: 'active',
      state: ONE_VM_STATE.ACTIVE,
      lcmState: 3,
      vcpus: 2,
      memoryMb: 4096,
      diskGb: 80,
      ips: ['192.168.1.100'],
      region: 'ams',
      hypervisor: 'kvm',
      storageBackend: 'ceph',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      templateId: 1,
    },
  ],
  [
    2,
    {
      id: 2,
      name: 'lsky-vps-fra-02',
      status: 'active',
      state: ONE_VM_STATE.ACTIVE,
      lcmState: 3,
      vcpus: 4,
      memoryMb: 8192,
      diskGb: 160,
      ips: ['192.168.2.120'],
      region: 'fra',
      hypervisor: 'kvm',
      storageBackend: 'ceph',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      templateId: 2,
    },
  ],
  [
    3,
    {
      id: 3,
      name: 'lsky-vps-sto-01',
      status: 'poweroff',
      state: ONE_VM_STATE.POWEROFF,
      lcmState: 0,
      vcpus: 2,
      memoryMb: 4096,
      diskGb: 80,
      ips: ['192.168.3.150'],
      region: 'sto',
      hypervisor: 'kvm',
      storageBackend: 'zfs',
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      templateId: 1,
    },
  ],
])

export class DemoOpenNebulaBackend {
  async listVms(): Promise<CloudVm[]> {
    return Array.from(demoVms.values())
  }

  async getVm(id: number): Promise<CloudVm> {
    const vm = demoVms.get(id)
    if (!vm) throw new Error(`VM ${id} not found`)
    return { ...vm }
  }

  async createVm(input: CreateVmInput): Promise<CloudVm> {
    const id = nextId++
    const vm: CloudVm = {
      id,
      name: input.name,
      status: 'pending',
      state: ONE_VM_STATE.PENDING,
      lcmState: 0,
      vcpus: input.plan.vcpus,
      memoryMb: input.plan.memoryMb,
      diskGb: input.plan.diskGb,
      ips: [`10.${(id % 200) + 1}.0.${(id % 250) + 1}`],
      region: input.region.slug,
      hypervisor: 'kvm',
      storageBackend: 'ceph',
      createdAt: new Date().toISOString(),
      templateId: input.plan.templateId,
    }
    demoVms.set(id, vm)

    // Simulate boot
    setTimeout(() => {
      const current = demoVms.get(id)
      if (current && current.state === ONE_VM_STATE.PENDING) {
        current.state = ONE_VM_STATE.ACTIVE
        current.status = 'active'
        current.lcmState = 3
        demoVms.set(id, current)
      }
    }, 1500)

    return { ...vm }
  }

  async action(id: number, action: VmPowerAction): Promise<CloudVm> {
    const vm = await this.getVm(id)
    switch (action) {
      case 'resume':
        vm.state = ONE_VM_STATE.ACTIVE
        break
      case 'poweroff':
      case 'poweroff-hard':
        vm.state = ONE_VM_STATE.POWEROFF
        break
      case 'reboot':
      case 'reboot-hard':
        vm.state = ONE_VM_STATE.ACTIVE
        break
      case 'stop':
        vm.state = ONE_VM_STATE.STOPPED
        break
      case 'suspend':
        vm.state = ONE_VM_STATE.SUSPENDED
        break
      case 'terminate':
      case 'terminate-hard':
        vm.state = ONE_VM_STATE.DONE
        demoVms.delete(id)
        vm.status = mapVmStatus(vm.state)
        return vm
      default:
        break
    }
    vm.status = mapVmStatus(vm.state)
    demoVms.set(id, vm)
    return { ...vm }
  }

  async listHosts(): Promise<CloudHost[]> {
    return [
      { id: 0, name: 'kvm-ams-01', state: 2, imMad: 'kvm', vmMad: 'kvm', cpuUsage: 22, memUsage: 41 },
      { id: 1, name: 'kvm-fra-01', state: 2, imMad: 'kvm', vmMad: 'kvm', cpuUsage: 18, memUsage: 35 },
    ]
  }

  async listDatastores(): Promise<CloudDatastore[]> {
    return [
      {
        id: 1,
        name: 'ceph-system',
        type: 'SYSTEM_DS',
        tmMad: 'ceph',
        dsMad: 'ceph',
        freeMb: 12_000_000,
        totalMb: 40_000_000,
        backend: 'ceph',
      },
      {
        id: 2,
        name: 'zfs-images',
        type: 'IMAGE_DS',
        tmMad: 'fs_lvm',
        dsMad: 'fs',
        freeMb: 4_000_000,
        totalMb: 8_000_000,
        backend: 'zfs',
      },
    ]
  }
}
